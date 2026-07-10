// Orchestrates the full Norn pipeline and streams stage events so the UI can
// light up each stage as it completes. External fetches degrade gracefully:
// a failed source marks its criteria unknown and, for the demo example chips,
// falls back to a fixture rather than failing the whole request.

import { classify } from "./acmg";
import { adjudicateWithClaude, hasApiKey, modelName, reviewWithClaude } from "./anthropic";
import { assembleCriteria } from "./assemble";
import { clinvarGeneVariants, clinvarNeighbors } from "./clinvar";
import {
  classifyInput,
  parseVep,
  recode,
  vepById,
  vepByHgvs,
  vepCoords,
  type RecodeResult,
} from "./ensembl";
import { heuristicAdjudicate, heuristicReview } from "./fallback";
import { findFixture } from "./fixtures";
import { gnomadFrequency, gnomadGeneConstraint } from "./gnomad";
import { computationalEvidence, computeSignals } from "./signals";
import { resolveThresholds } from "./thresholds";
import type {
  ClinVarEvidence,
  ConsequenceEvidence,
  EvidenceBundle,
  FrequencyEvidence,
  GeneConstraint,
  HeuristicComparison,
  NormalizedInput,
  NornReport,
  PipelineEvent,
  SourceState,
  StageName,
  StageStatus,
} from "./types";

type Emit = (event: PipelineEvent) => void;

interface PipelineOptions {
  emit?: Emit;
  evalMode?: boolean;
  // When true, also adjudicate the same evidence with the deterministic heuristic
  // and attach it as report.comparison, so the eval can quantify what Claude's
  // reasoning changed versus rules alone. Adds no external calls (the heuristic is
  // free); only meaningful when a live Claude pass actually ran.
  compareHeuristic?: boolean;
}

function emptyFrequency(variantId: string | null): FrequencyEvidence {
  return {
    found: false,
    gnomadVariantId: variantId,
    genomeAf: null,
    exomeAf: null,
    globalAf: null,
    popmaxAf: null,
    popmaxPopulation: null,
    representativeAf: null,
    ac: null,
    an: null,
  };
}

const DEFAULT_CONSTRAINT: GeneConstraint = {
  available: false,
  pli: null,
  loeuf: null,
  misZ: null,
  lofIntolerant: false,
  note: "Gene constraint not available.",
};

function emptyClinvar(): ClinVarEvidence {
  return {
    queried: false,
    sameAaChange: [],
    sameResidueDifferentAa: [],
    geneVariants: [],
  };
}

export async function runPipeline(
  rawInput: string,
  opts: PipelineOptions = {},
): Promise<NornReport> {
  const started = Date.now();
  const emit: Emit = opts.emit ?? (() => {});
  const stage = (s: StageName, status: StageStatus, detail?: string) =>
    emit({ type: "stage", stage: s, status, detail });

  const warnings: string[] = [];
  const sourceStatus: Record<string, SourceState> = {};
  const fixture = findFixture(rawInput);
  let fixtureUsed = false;

  const kind = classifyInput(rawInput);

  // Stage 1 and 2: recode and VEP run concurrently for rsID and HGVS inputs.
  stage("recode", "start");
  stage("vep", "start");

  const recodeP = recode(rawInput);
  let vepP: Promise<unknown[]>;
  if (kind === "rsid") {
    vepP = vepById(rawInput);
  } else if (kind === "hgvs") {
    vepP = vepByHgvs(rawInput);
  } else {
    vepP = recodeP.then((r) => {
      const hgvs = r.hgvsg ?? r.hgvscList[0];
      if (!hgvs) throw new Error("no HGVS available to annotate");
      return vepByHgvs(hgvs);
    });
  }

  const [recodeSettled, vepSettled] = await Promise.allSettled([recodeP, vepP]);

  let recoded: RecodeResult | null = null;
  if (recodeSettled.status === "fulfilled") {
    recoded = recodeSettled.value;
    sourceStatus.recode = recoded.hgvsg || recoded.vcfString ? "ok" : "empty";
    stage("recode", sourceStatus.recode === "ok" ? "done" : "skipped");
  } else {
    sourceStatus.recode = "unavailable";
    warnings.push(`variant_recoder unavailable: ${recodeSettled.reason?.message ?? recodeSettled.reason}`);
    stage("recode", "error", "normalization unavailable");
  }

  let consequence: ConsequenceEvidence = { consequenceTerms: [], isLof: false };
  let vepData: unknown[] | null = null;
  if (vepSettled.status === "fulfilled") {
    vepData = vepSettled.value;
    consequence = parseVep(vepData);
    sourceStatus.vep = consequence.geneSymbol ? "ok" : "empty";
  } else {
    sourceStatus.vep = "unavailable";
    warnings.push(`Ensembl VEP unavailable: ${vepSettled.reason?.message ?? vepSettled.reason}`);
  }

  // Fixture fallback for annotation (the criteria downstream need the gene and
  // protein position, so a missing gene symbol triggers the fixture). When this
  // happens we also use the fixture's frequency and ClinVar data so the report
  // is internally consistent rather than mixing fixture annotation with live
  // lookups keyed on possibly-mismatched coordinates.
  let annotationFromFixture = false;
  if (!consequence.geneSymbol && fixture) {
    consequence = fixture.consequence;
    fixtureUsed = true;
    annotationFromFixture = true;
    sourceStatus.vep = "ok";
    warnings.push("Used demo fixture for annotation because live Ensembl data was unavailable.");
  }
  stage("vep", consequence.geneSymbol ? "done" : "error", consequence.geneSymbol ?? "annotation unavailable");

  const normalized: NormalizedInput = {
    raw: rawInput,
    kind,
    rsid: recoded?.rsid ?? (kind === "rsid" ? rawInput.trim() : null) ?? fixture?.normalized.rsid ?? null,
    hgvsg: recoded?.hgvsg ?? fixture?.normalized.hgvsg ?? null,
    hgvscList: recoded?.hgvscList?.length ? recoded.hgvscList : fixture?.normalized.hgvscList ?? [],
    hgvsp: recoded?.hgvsp ?? consequence.hgvsp ?? fixture?.normalized.hgvsp ?? null,
    chrom: recoded?.chrom ?? fixture?.normalized.chrom ?? null,
    pos: recoded?.pos ?? fixture?.normalized.pos ?? null,
    ref: recoded?.ref ?? fixture?.normalized.ref ?? null,
    alt: recoded?.alt ?? fixture?.normalized.alt ?? null,
    gnomadVariantId: null,
  };

  // Build a gnomAD variant id: prefer the recoder vcf_string, then VEP coords.
  const coordsFromVep = vepData ? vepCoords(vepData) : null;
  const variantId =
    recoded?.gnomadVariantId ??
    (coordsFromVep
      ? `${coordsFromVep.chrom}-${coordsFromVep.pos}-${coordsFromVep.ref}-${coordsFromVep.alt}`
      : null) ??
    fixture?.normalized.gnomadVariantId ??
    null;
  normalized.gnomadVariantId = variantId;

  // Stage 3 and 4: gnomAD and ClinVar in parallel.
  stage("gnomad", "start");
  stage("clinvar", "start");

  const rsidForGnomad = annotationFromFixture
    ? null
    : recoded?.rsid ?? normalized.rsid ?? null;

  const gnomadP: Promise<FrequencyEvidence> = (async () => {
    if (annotationFromFixture && fixture) {
      sourceStatus.gnomad = "ok";
      stage("gnomad", "done", "demo fixture");
      return fixture.frequency;
    }
    try {
      const f = await (variantId || rsidForGnomad
        ? gnomadFrequency({ variantId, rsid: rsidForGnomad })
        : Promise.reject(new Error("no identifier for gnomAD")));
      sourceStatus.gnomad = "ok";
      stage("gnomad", "done", f.found ? `AF ${f.representativeAf}` : "absent in gnomAD");
      return f;
    } catch (e) {
      if (fixture) {
        sourceStatus.gnomad = "ok";
        fixtureUsed = true;
        stage("gnomad", "done", "demo fixture");
        return fixture.frequency;
      }
      sourceStatus.gnomad = "unavailable";
      warnings.push(`gnomAD unavailable: ${(e as Error).message ?? e}`);
      stage("gnomad", "error", "frequency unavailable");
      return emptyFrequency(variantId);
    }
  })();

  const gene = consequence.geneSymbol ?? null;
  const pos = consequence.proteinPosition ?? null;
  const refAa = consequence.refAa ?? null;
  const altAa = consequence.altAa ?? null;
  const queryCdna = consequence.hgvsc?.match(/c\.[A-Za-z0-9_>+.-]+/)?.[0] ?? null;
  const thresholds = resolveThresholds(gene);
  const constraintP: Promise<GeneConstraint> = gene
    ? gnomadGeneConstraint(gene).catch(() => DEFAULT_CONSTRAINT)
    : Promise.resolve(DEFAULT_CONSTRAINT);

  const clinvarP: Promise<ClinVarEvidence> = (async () => {
    if (annotationFromFixture && fixture) {
      sourceStatus.clinvar = "ok";
      stage("clinvar", "done", "demo fixture");
      return fixture.clinvar;
    }
    const canNeighbors = Boolean(gene && pos != null && refAa);
    const [neighbors, geneVars] = await Promise.allSettled([
      canNeighbors ? clinvarNeighbors(gene!, refAa!, pos!, altAa, queryCdna) : Promise.resolve(null),
      gene ? clinvarGeneVariants(gene) : Promise.resolve([]),
    ]);

    const neighborsOk = neighbors.status === "fulfilled" && neighbors.value != null;
    const geneOk = geneVars.status === "fulfilled";
    if (!neighborsOk && !geneOk) {
      if (fixture) {
        sourceStatus.clinvar = "ok";
        fixtureUsed = true;
        stage("clinvar", "done", "demo fixture");
        return fixture.clinvar;
      }
      sourceStatus.clinvar = "unavailable";
      warnings.push("ClinVar unavailable for neighbor evidence.");
      stage("clinvar", "error", "ClinVar unavailable");
      return emptyClinvar();
    }

    const n = neighborsOk ? neighbors.value! : { sameAaChange: [], sameResidueDifferentAa: [], residuePosition: pos };
    const g = geneOk ? geneVars.value : [];
    sourceStatus.clinvar = "ok";
    const count = n.sameAaChange.length + n.sameResidueDifferentAa.length;
    stage("clinvar", "done", `${g.length} gene variants, ${count} at residue`);
    return {
      queried: canNeighbors && neighborsOk,
      residuePosition: n.residuePosition ?? pos,
      sameAaChange: n.sameAaChange,
      sameResidueDifferentAa: n.sameResidueDifferentAa,
      geneVariants: g,
    };
  })();

  const [frequency, clinvar, constraint] = await Promise.all([gnomadP, clinvarP, constraintP]);

  const computational = computationalEvidence(consequence);
  const freqAvailable = sourceStatus.gnomad === "ok";
  const signals = computeSignals(consequence, frequency, computational, clinvar, thresholds, freqAvailable);

  const bundle: EvidenceBundle = {
    input: rawInput,
    normalized,
    consequence,
    frequency,
    computational,
    clinvar,
    constraint,
    thresholds,
    signals,
    sourceStatus,
    fixtureUsed,
  };

  // Fail clearly when the input does not identify a variant: either the format
  // is unparseable, or VEP explicitly returned no annotation (a real "not
  // found"). A source timeout is treated as an outage, not a bad variant, so a
  // valid input still yields a (degraded) report rather than an error.
  const nothingResolved =
    !consequence.geneSymbol && !fixtureUsed && !frequency.found && sourceStatus.gnomad !== "ok";
  if (nothingResolved && (kind === "unknown" || sourceStatus.vep === "empty")) {
    throw new Error(
      `Could not resolve "${rawInput}". Enter HGVS (BRCA1:c.5266dupC), an rsID (rs80357906), or a locus (17-43057062-A-AG).`,
    );
  }

  // Stage 5: adjudicate (Claude or deterministic fallback).
  stage("adjudicate", "start");
  let adjudicated;
  let usedClaude = false;
  if (hasApiKey()) {
    try {
      adjudicated = await adjudicateWithClaude(bundle);
      usedClaude = true;
      stage("adjudicate", "done", "Claude adjudicator");
    } catch (e) {
      warnings.push(`Claude adjudicator failed, used deterministic fallback: ${(e as Error).message}`);
      adjudicated = heuristicAdjudicate(bundle);
      stage("adjudicate", "done", "heuristic fallback");
    }
  } else {
    adjudicated = heuristicAdjudicate(bundle);
    stage("adjudicate", "done", "heuristic (no API key)");
  }

  const criteria = assembleCriteria(bundle, adjudicated);
  const result = classify(criteria);
  for (const c of criteria) {
    if (c.signalDisagreement) {
      warnings.push(`${c.code} verdict (${c.verdict}) disagrees with the computed signal.`);
    }
  }

  // Optional: adjudicate the same evidence with the deterministic heuristic and
  // classify it, so the eval can show what Claude changed versus rules alone.
  // No extra external calls; the heuristic is free. When no model ran, the live
  // result already is the heuristic, so the comparison equals it.
  let comparison: HeuristicComparison | undefined;
  if (opts.compareHeuristic) {
    const heuristicResult = usedClaude
      ? classify(assembleCriteria(bundle, heuristicAdjudicate(bundle)))
      : result;
    comparison = {
      classification: heuristicResult.classification,
      points: heuristicResult.points,
    };
  }

  // Stage 6: reviewer critique (Claude or deterministic fallback).
  stage("review", "start");
  let review;
  if (usedClaude) {
    try {
      review = await reviewWithClaude(bundle, result);
      stage("review", "done", "Claude reviewer");
    } catch (e) {
      warnings.push(`Claude reviewer failed, used deterministic fallback: ${(e as Error).message}`);
      review = heuristicReview(bundle, result);
      stage("review", "done", "heuristic fallback");
    }
  } else {
    review = heuristicReview(bundle, result);
    stage("review", "done", "heuristic");
  }

  if (fixtureUsed) {
    warnings.push("This report uses Norn demo fixture data for one or more sources because the live API was unavailable.");
  }

  return {
    input: rawInput,
    normalized,
    evidence: bundle,
    result,
    review,
    model: {
      name: usedClaude ? modelName() : "deterministic heuristic",
      live: usedClaude,
      mode: usedClaude ? "claude" : "heuristic",
    },
    warnings,
    comparison,
    generatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
  };
}
