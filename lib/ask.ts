import type { NornReport } from "./types";

// Renders a report into a compact text block used as the assistant's knowledge
// base. Pure, so both the /api/ask route and the MCP server can reuse it.
export function reportToContext(report: NornReport): string {
  const { result: r, evidence: e, review: rev, model } = report;
  const c = e.consequence;
  const f = e.frequency;

  const criteria = r.criteria
    .map(
      (cr) =>
        `- ${cr.code} (${cr.name}) [${cr.strength}, applied ${cr.appliedPoints} pts]: ${cr.verdict}. ` +
        `Evidence: ${cr.evidence} Reasoning: ${cr.reasoning} Source: ${cr.source}.`,
    )
    .join("\n");

  return [
    `Variant input: ${report.input}`,
    `Gene: ${c.geneSymbol ?? "n/a"}, transcript: ${c.transcriptId ?? "n/a"}, cDNA: ${c.hgvsc ?? "n/a"}, protein: ${c.hgvsp ?? "n/a"}, consequence: ${c.mostSevereConsequence ?? "n/a"}.`,
    `Classification: ${r.classification} (${r.points} points, ${r.confidence} confidence). BA1 override: ${r.ba1Override}. Rationale: ${r.confidenceRationale}`,
    `Population frequency: representative AF ${f.representativeAf}, genome ${f.genomeAf}, exome ${f.exomeAf}, popmax ${f.popmaxAf}${f.popmaxPopulation ? ` (${f.popmaxPopulation})` : ""}. gnomAD id ${f.gnomadVariantId ?? "n/a"}.`,
    `Computational: SIFT ${c.siftPrediction ?? "n/a"}, PolyPhen ${c.polyphenPrediction ?? "n/a"}.`,
    `ClinVar neighbors: PS1 same-amino-acid candidates ${e.clinvar.sameAaChange.length}, PM5 same-residue candidates ${e.clinvar.sameResidueDifferentAa.length}.`,
    "",
    "Criteria adjudication:",
    criteria,
    "",
    `Reviewer critique: ${rev.critique}`,
    `Conflicts: ${rev.conflicts.length ? rev.conflicts.join("; ") : "none"}`,
    `Curator checklist: ${rev.checklist.join(" | ")}`,
    `Model: ${model.name} (${model.live ? "live Claude" : "offline heuristic"}). Fixture data used: ${e.fixtureUsed}.`,
    report.warnings.length ? `Run notes: ${report.warnings.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const SUGGESTED_QUESTIONS = [
  "Why did this land at this classification?",
  "Which criterion contributes the most, and why?",
  "What should I double-check before signing off?",
  "How confident is this call and what would change it?",
];
