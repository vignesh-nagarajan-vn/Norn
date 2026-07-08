// Deterministic fallback for the two model passes. It runs only when no
// ANTHROPIC_API_KEY is set or a Claude call fails, so the pipeline always
// returns a full, honest report. It is labeled "heuristic" in the UI, never
// presented as model reasoning.

import type {
  AdjudicatedCriterion,
  ClassificationResult,
  EvidenceBundle,
  ReviewResult,
  Verdict,
} from "./types";

export function heuristicAdjudicate(bundle: EvidenceBundle): AdjudicatedCriterion[] {
  const { signals: s, computational: comp, clinvar: cv } = bundle;
  const freqAvailable = s.pm2.observedAf != null;
  const compAvailable = comp.available;

  const compVerdict = (damaging: boolean): Verdict => {
    if (!compAvailable) return "unknown";
    if (comp.damagingConcordant) return damaging ? "met" : "not_met";
    if (comp.tolerantConcordant) return damaging ? "not_met" : "met";
    return "unknown"; // predictions disagree, e.g. possibly_damaging
  };

  const clinvarVerdict = (present: boolean): Verdict => {
    if (present) return "met";
    return cv.queried ? "not_met" : "unknown";
  };

  const freqVerdict = (fired: boolean): Verdict => {
    if (!freqAvailable) return "unknown";
    return fired ? "met" : "not_met";
  };

  const mk = (
    code: string,
    verdict: Verdict,
    source: string,
    reasoning: string,
  ): AdjudicatedCriterion => ({ code, verdict, evidence: "", source, reasoning });

  return [
    mk(
      "PVS1",
      s.pvs1.lof ? "met" : "not_met",
      "Ensembl VEP",
      s.pvs1.lof
        ? `Predicted loss-of-function consequence (${s.pvs1.consequence}).`
        : "Consequence is not a predicted null allele.",
    ),
    mk(
      "PS1",
      clinvarVerdict(s.ps1.present),
      "ClinVar",
      s.ps1.present
        ? "A pathogenic ClinVar variant has the same amino acid change."
        : cv.queried
          ? "No matching pathogenic amino acid change found."
          : "ClinVar could not be queried for this position.",
    ),
    mk(
      "PM1",
      s.pm1.hotspot ? "met" : cv.geneVariants.length > 0 ? "not_met" : "unknown",
      "ClinVar",
      s.pm1.hotspot
        ? `${s.pm1.pathogenicNearby} pathogenic variants within ${s.pm1.window} residues and no benign variation.`
        : cv.geneVariants.length > 0
          ? `Not a pathogenic cluster (${s.pm1.pathogenicNearby} pathogenic, ${s.pm1.benignNearby} benign nearby).`
          : "Gene-wide ClinVar variants were unavailable to assess clustering.",
    ),
    mk(
      "PM2",
      freqVerdict(s.pm2.rare),
      "gnomAD v4",
      freqAvailable
        ? `Representative AF ${s.pm2.observedAf} against rare threshold ${s.pm2.threshold}.`
        : "gnomAD frequency was unavailable.",
    ),
    mk(
      "PM5",
      clinvarVerdict(s.pm5.present),
      "ClinVar",
      s.pm5.present
        ? "A different pathogenic missense change exists at this residue."
        : cv.queried
          ? "No other pathogenic change reported at this residue."
          : "ClinVar could not be queried for this position.",
    ),
    mk(
      "PP3",
      compVerdict(true),
      "Ensembl VEP",
      compAvailable
        ? `SIFT ${comp.siftPrediction}, PolyPhen ${comp.polyphenPrediction}.`
        : "Computational predictions were unavailable.",
    ),
    mk(
      "BA1",
      freqVerdict(s.ba1.common),
      "gnomAD v4",
      freqAvailable
        ? `Representative AF ${s.ba1.observedAf} against 5% threshold.`
        : "gnomAD frequency was unavailable.",
    ),
    mk(
      "BS1",
      freqVerdict(s.bs1.elevated),
      "gnomAD v4",
      freqAvailable
        ? `Representative AF ${s.bs1.observedAf} against 1% threshold.`
        : "gnomAD frequency was unavailable.",
    ),
    mk(
      "BP4",
      compVerdict(false),
      "Ensembl VEP",
      compAvailable
        ? `SIFT ${comp.siftPrediction}, PolyPhen ${comp.polyphenPrediction}.`
        : "Computational predictions were unavailable.",
    ),
    mk(
      "BP7",
      bundle.consequence.mostSevereConsequence ? (s.bp7.synonymous ? "met" : "not_met") : "unknown",
      "Ensembl VEP",
      s.bp7.synonymous
        ? "Synonymous variant with no predicted splice impact."
        : `Consequence is ${bundle.consequence.mostSevereConsequence ?? "unknown"}, not a synonymous change.`,
    ),
  ];
}

export function heuristicReview(
  bundle: EvidenceBundle,
  draft: ClassificationResult,
): ReviewResult {
  const checklist: string[] = [];
  const conflicts: string[] = [];
  const met = new Map(draft.criteria.map((c) => [c.code, c.verdict === "met"]));

  const pvs1 = draft.criteria.find((c) => c.code === "PVS1");
  if (pvs1?.verdict === "met") {
    checklist.push(
      `Confirm that loss of function is an established disease mechanism for ${bundle.consequence.geneSymbol ?? "this gene"}; PVS1 assumes this and Norn does not verify it.`,
    );
  }

  if (met.get("PP3") && met.get("BP4")) {
    conflicts.push("PP3 (damaging) and BP4 (tolerant) are both met, which is internally inconsistent.");
  }
  if (met.get("BA1") && (met.get("PVS1") || met.get("PS1") || met.get("PM5"))) {
    conflicts.push("A benign stand-alone criterion (BA1) is met alongside pathogenic evidence; recheck the frequency data.");
  }

  for (const c of draft.criteria) {
    if (c.verdict === "unknown") {
      checklist.push(`Resolve ${c.code} (${c.name}); the automated evidence was insufficient.`);
    }
    if (c.signalDisagreement) {
      checklist.push(`Recheck ${c.code}: the verdict disagrees with the computed signal.`);
    }
  }

  if (bundle.sourceStatus.gnomad !== "ok") {
    checklist.push("gnomAD was unavailable; confirm population frequency before finalizing.");
  }
  if (draft.confidence === "Low") {
    checklist.push("The point total is close to a category boundary; small evidence changes could shift the classification.");
  }
  checklist.push("Confirm the transcript and HGVS mapping, and review primary-literature functional and segregation data that Norn does not consult.");

  const overcallRisk: ReviewResult["overcallRisk"] =
    pvs1?.verdict === "met" && draft.criteria.filter((c) => c.verdict === "met").length <= 2
      ? "moderate"
      : conflicts.length > 0
        ? "high"
        : "low";

  const critique =
    `Heuristic review (no model key set). Draft is ${draft.classification} at ${draft.points} points with ${draft.confidence.toLowerCase()} confidence. ` +
    (conflicts.length > 0
      ? "Internal conflicts were detected; see below. "
      : "No internal conflicts were detected. ") +
    "This fallback derives verdicts directly from the computed signals and cannot weigh literature or functional data.";

  return { critique, conflicts, checklist, overcallRisk };
}
