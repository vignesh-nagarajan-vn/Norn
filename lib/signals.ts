// Derives the objective, code-computed signals from the gathered evidence.
// These booleans are handed to the adjudicator (so the model reasons over
// concrete facts) and to the deterministic fallback. Frequency-based signals
// use a null observed AF to mean "gnomAD was unavailable" versus 0 for
// "queried and genuinely absent".

import { THRESHOLDS } from "./acmg";
import type {
  ClinVarEvidence,
  ComputationalEvidence,
  ConsequenceEvidence,
  DeterministicSignals,
  FrequencyEvidence,
} from "./types";

export function computationalEvidence(
  c: ConsequenceEvidence,
): ComputationalEvidence {
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
  freqAvailable: boolean,
): DeterministicSignals {
  const af = freqAvailable ? (frequency.representativeAf ?? 0) : null;

  return {
    pvs1: { lof: consequence.isLof, consequence: consequence.lofType },
    ps1: { present: clinvar.sameAaChange.length > 0 },
    pm2: {
      rare: af != null && af < THRESHOLDS.pm2Af,
      threshold: THRESHOLDS.pm2Af,
      observedAf: af,
    },
    pm5: { present: clinvar.sameResidueDifferentAa.length > 0 },
    pp3: { damaging: computational.damagingConcordant },
    ba1: {
      common: af != null && af > THRESHOLDS.ba1Af,
      threshold: THRESHOLDS.ba1Af,
      observedAf: af,
    },
    bs1: {
      elevated: af != null && af > THRESHOLDS.bs1Af,
      threshold: THRESHOLDS.bs1Af,
      observedAf: af,
    },
    bp4: { tolerant: computational.tolerantConcordant },
  };
}
