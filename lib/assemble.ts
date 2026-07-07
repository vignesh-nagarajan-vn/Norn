// Assembles final CriterionResult rows from the adjudicated verdicts plus the
// evidence bundle. The verdict comes from the adjudicator (model or fallback);
// the concrete evidence string, source link, points, and any signal/verdict
// disagreement are built deterministically in code.

import { appliedPointsFor, CRITERIA, THRESHOLDS } from "./acmg";
import { clinvarSearchUrl, clinvarVariantUrl } from "./clinvar";
import { gnomadUrl } from "./gnomad";
import type {
  AdjudicatedCriterion,
  CriterionResult,
  EvidenceBundle,
  Verdict,
} from "./types";

function fmtAf(af: number | null): string {
  if (af == null) return "unavailable";
  if (af === 0) return "0 (absent)";
  if (af < 0.001) return af.toExponential(2);
  return `${(af * 100).toFixed(3)}%`;
}

function ensemblTranscriptUrl(transcriptId: string | null | undefined): string {
  return transcriptId
    ? `https://www.ensembl.org/Homo_sapiens/Transcript/Summary?t=${transcriptId}`
    : "https://www.ensembl.org/info/docs/tools/vep/index.html";
}

interface Built {
  evidence: string;
  sourceUrl?: string;
  // Verdict implied purely by the objective signal, or null when the signal is
  // not decisive (so no disagreement is flagged).
  signalVerdict: Verdict | null;
}

function buildFor(code: string, b: EvidenceBundle): Built {
  const { consequence: c, frequency: f, clinvar: cv, signals: s } = b;
  const gene = c.geneSymbol ?? "the gene";
  const pos = c.proteinPosition ?? null;
  const gnomad = f.gnomadVariantId ? gnomadUrl(f.gnomadVariantId) : undefined;
  const freqAvailable = s.pm2.observedAf != null;

  switch (code) {
    case "PVS1": {
      if (c.isLof) {
        const hgvs = [c.hgvsc, c.hgvsp].filter(Boolean).join(" ");
        return {
          evidence: `${c.lofType} in ${gene} ${hgvs}. Predicted null allele.`,
          sourceUrl: ensemblTranscriptUrl(c.transcriptId),
          signalVerdict: null, // requires disease-mechanism check Norn cannot do
        };
      }
      return {
        evidence: `Most severe consequence is ${c.mostSevereConsequence ?? "unknown"}, not a predicted null allele.`,
        sourceUrl: ensemblTranscriptUrl(c.transcriptId),
        signalVerdict: "not_met",
      };
    }
    case "PS1": {
      if (cv.sameAaChange.length > 0) {
        const top = cv.sameAaChange[0];
        return {
          evidence: `ClinVar ${top.accession} reports the same amino acid change (${top.title}) classified ${top.classification}.`,
          sourceUrl: clinvarVariantUrl(top.accession),
          signalVerdict: "met",
        };
      }
      if (!cv.queried || pos == null) {
        return {
          evidence: "No protein position available to query ClinVar for a matching amino acid change.",
          signalVerdict: null,
        };
      }
      return {
        evidence: `No pathogenic ClinVar variant with the same amino acid change found at residue ${pos}.`,
        sourceUrl: clinvarSearchUrl(gene, pos),
        signalVerdict: "not_met",
      };
    }
    case "PM2": {
      if (!freqAvailable) {
        return { evidence: "gnomAD frequency unavailable.", sourceUrl: gnomad, signalVerdict: null };
      }
      const af = s.pm2.observedAf;
      return {
        evidence: `gnomAD representative AF ${fmtAf(af)} versus PM2 rare threshold ${fmtAf(THRESHOLDS.pm2Af)}.`,
        sourceUrl: gnomad,
        signalVerdict: s.pm2.rare ? "met" : "not_met",
      };
    }
    case "PM5": {
      if (cv.sameResidueDifferentAa.length > 0) {
        const top = cv.sameResidueDifferentAa[0];
        return {
          evidence: `ClinVar ${top.accession} reports a different pathogenic change at residue ${pos ?? "?"} (${top.title}, ${top.classification}).`,
          sourceUrl: clinvarVariantUrl(top.accession),
          signalVerdict: "met",
        };
      }
      if (!cv.queried || pos == null) {
        return { evidence: "No protein position available to query ClinVar neighbors.", signalVerdict: null };
      }
      return {
        evidence: `No other pathogenic missense change reported at residue ${pos}.`,
        sourceUrl: clinvarSearchUrl(gene, pos),
        signalVerdict: "not_met",
      };
    }
    case "PP3": {
      if (!b.computational.available) {
        return { evidence: "SIFT and PolyPhen predictions not available for this variant.", signalVerdict: null };
      }
      return {
        evidence: `SIFT ${c.siftPrediction ?? "n/a"}, PolyPhen ${c.polyphenPrediction ?? "n/a"}.`,
        sourceUrl: ensemblTranscriptUrl(c.transcriptId),
        signalVerdict: s.pp3.damaging ? "met" : b.computational.tolerantConcordant ? "not_met" : null,
      };
    }
    case "BA1": {
      if (!freqAvailable) {
        return { evidence: "gnomAD frequency unavailable.", sourceUrl: gnomad, signalVerdict: null };
      }
      return {
        evidence: `gnomAD representative AF ${fmtAf(s.ba1.observedAf)} versus BA1 threshold 5%.`,
        sourceUrl: gnomad,
        signalVerdict: s.ba1.common ? "met" : "not_met",
      };
    }
    case "BS1": {
      if (!freqAvailable) {
        return { evidence: "gnomAD frequency unavailable.", sourceUrl: gnomad, signalVerdict: null };
      }
      return {
        evidence: `gnomAD representative AF ${fmtAf(s.bs1.observedAf)} versus BS1 threshold 1%.`,
        sourceUrl: gnomad,
        signalVerdict: s.bs1.elevated ? "met" : "not_met",
      };
    }
    case "BP4": {
      if (!b.computational.available) {
        return { evidence: "SIFT and PolyPhen predictions not available for this variant.", signalVerdict: null };
      }
      return {
        evidence: `SIFT ${c.siftPrediction ?? "n/a"}, PolyPhen ${c.polyphenPrediction ?? "n/a"}.`,
        sourceUrl: ensemblTranscriptUrl(c.transcriptId),
        signalVerdict: s.bp4.tolerant ? "met" : b.computational.damagingConcordant ? "not_met" : null,
      };
    }
    default:
      return { evidence: "", signalVerdict: null };
  }
}

export function assembleCriteria(
  bundle: EvidenceBundle,
  adjudicated: AdjudicatedCriterion[],
): CriterionResult[] {
  const byCode = new Map(adjudicated.map((a) => [a.code, a]));
  return CRITERIA.map((spec) => {
    const adj = byCode.get(spec.code);
    const verdict: Verdict = adj?.verdict ?? "unknown";
    const built = buildFor(spec.code, bundle);
    const disagreement =
      built.signalVerdict != null &&
      verdict !== "unknown" &&
      verdict !== built.signalVerdict;

    return {
      ...spec,
      verdict,
      evidence: built.evidence,
      reasoning: adj?.reasoning ?? "No reasoning provided.",
      source: spec.dataSource,
      sourceUrl: built.sourceUrl,
      appliedPoints: appliedPointsFor(spec, verdict),
      provisional: spec.code === "PVS1" ? true : undefined,
      signalDisagreement: disagreement || undefined,
    };
  });
}
