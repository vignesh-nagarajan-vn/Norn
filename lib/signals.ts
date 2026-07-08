// Derives the objective, code-computed signals from the gathered evidence.
// These booleans are handed to the adjudicator (so the model reasons over
// concrete facts) and to the deterministic fallback. Frequency-based signals
// use a null observed AF to mean "gnomAD was unavailable" versus 0 for
// "queried and genuinely absent".

import type {
  ClinVarEvidence,
  ComputationalEvidence,
  ConsequenceEvidence,
  DeterministicSignals,
  FrequencyEvidence,
  GeneThresholdInfo,
} from "./types";

const PM1_WINDOW = 7; // residues on each side of the query position

function isPathogenicLabel(c: string): boolean {
  const l = c.toLowerCase();
  return l.includes("pathogenic") && !l.includes("benign") && !l.includes("conflict");
}
function isBenignLabel(c: string): boolean {
  const l = c.toLowerCase();
  return l.includes("benign") && !l.includes("pathogenic") && !l.includes("conflict");
}

export function computationalEvidence(c: ConsequenceEvidence): ComputationalEvidence {
  const sift = (c.siftPrediction ?? "").toLowerCase();
  const poly = (c.polyphenPrediction ?? "").toLowerCase();
  const siftDeleterious = sift.startsWith("deleterious");
  const siftTolerated = sift.startsWith("tolerated");
  const polyDamaging = poly === "probably_damaging";
  const polyBenign = poly === "benign";
  const available = Boolean(sift) && Boolean(poly);

  return {
    siftPrediction: c.siftPrediction ?? null,
    siftScore: c.siftScore ?? null,
    polyphenPrediction: c.polyphenPrediction ?? null,
    polyphenScore: c.polyphenScore ?? null,
    damagingConcordant: siftDeleterious && polyDamaging,
    tolerantConcordant: siftTolerated && polyBenign,
    available,
  };
}

export function computeSignals(
  consequence: ConsequenceEvidence,
  frequency: FrequencyEvidence,
  computational: ComputationalEvidence,
  clinvar: ClinVarEvidence,
  thresholds: GeneThresholdInfo,
  freqAvailable: boolean,
): DeterministicSignals {
  const af = freqAvailable ? (frequency.representativeAf ?? 0) : null;
  const pos = consequence.proteinPosition ?? null;

  // PM1: a local cluster of pathogenic variants with no benign variation.
  let pathogenicNearby = 0;
  let benignNearby = 0;
  if (pos != null) {
    for (const v of clinvar.geneVariants) {
      if (v.proteinPosition == null) continue;
      if (Math.abs(v.proteinPosition - pos) > PM1_WINDOW) continue;
      if (isPathogenicLabel(v.classification)) pathogenicNearby++;
      else if (isBenignLabel(v.classification)) benignNearby++;
    }
  }
  const hotspot = pos != null && pathogenicNearby >= 3 && benignNearby === 0;

  const consequenceTerm = consequence.mostSevereConsequence ?? "";
  const synonymous =
    consequenceTerm === "synonymous_variant" &&
    !consequence.consequenceTerms.some((t) => t.includes("splice"));

  return {
    pvs1: { lof: consequence.isLof, consequence: consequence.lofType },
    ps1: { present: clinvar.sameAaChange.length > 0 },
    pm1: { hotspot, pathogenicNearby, benignNearby, window: PM1_WINDOW },
    pm2: { rare: af != null && af < thresholds.pm2Af, threshold: thresholds.pm2Af, observedAf: af },
    pm5: { present: clinvar.sameResidueDifferentAa.length > 0 },
    pp3: { damaging: computational.damagingConcordant },
    ba1: { common: af != null && af > thresholds.ba1Af, threshold: thresholds.ba1Af, observedAf: af },
    bs1: { elevated: af != null && af > thresholds.bs1Af, threshold: thresholds.bs1Af, observedAf: af },
    bp4: { tolerant: computational.tolerantConcordant },
    bp7: { synonymous },
  };
}
