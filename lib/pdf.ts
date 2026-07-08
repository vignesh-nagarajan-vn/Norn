import type { NornReport } from "./types";

// Builds a clean, text-based PDF of the interpretation (not a screenshot), so it
// stays small and legible. jsPDF is dynamically imported so it is only loaded
// when the user exports.

function fmtAf(af: number | null | undefined): string {
  if (af == null) return "n/a";
  if (af === 0) return "0 (absent)";
  if (af < 0.001) return af.toExponential(2);
  return `${(af * 100).toFixed(4)}%`;
}

export async function exportReportPdf(report: NornReport): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const text = (
    s: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number; indent?: number } = {},
  ) => {
    const size = opts.size ?? 10;
    doc.setFontSize(size);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    const col = opts.color ?? [30, 35, 45];
    doc.setTextColor(col[0], col[1], col[2]);
    const indent = opts.indent ?? 0;
    const lines = doc.splitTextToSize(s, contentW - indent) as string[];
    for (const ln of lines) {
      ensure(size * 1.35);
      doc.text(ln, margin + indent, y);
      y += size * 1.35;
    }
    y += opts.gap ?? 0;
  };

  const rule = () => {
    ensure(12);
    doc.setDrawColor(222, 227, 234);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  };

  const { result: r, evidence: e, review: rev, model } = report;
  const c = e.consequence;
  const f = e.frequency;

  text("Norn variant interpretation report", { size: 18, bold: true, gap: 2 });
  text("Research and demonstration only. Not for clinical use.", { size: 9, color: [186, 26, 26], gap: 8 });
  rule();

  text(report.input, { size: 14, bold: true, gap: 2 });
  text(`Classification: ${r.classification} (${r.points > 0 ? "+" : ""}${r.points} points, ${r.confidence} confidence)`, {
    size: 11,
    bold: true,
    gap: 3,
  });
  text([c.geneSymbol, c.transcriptId, c.hgvsc, c.hgvsp].filter(Boolean).join("   |   "), {
    size: 9,
    color: [80, 90, 100],
    gap: 3,
  });
  text(r.confidenceRationale, { size: 9, color: [80, 90, 100], gap: 8 });
  rule();

  text("ACMG/AMP criteria", { size: 12, bold: true, gap: 5 });
  for (const cr of r.criteria) {
    const verdict = cr.verdict === "met" ? "MET" : cr.verdict === "not_met" ? "not met" : "unknown";
    const pts = cr.verdict === "met" ? ` (${cr.appliedPoints > 0 ? "+" : ""}${cr.appliedPoints} pts)` : "";
    text(`${cr.code}: ${cr.name} [${cr.strength}] ${verdict}${pts}`, { size: 10, bold: true, gap: 1 });
    text(cr.evidence, { size: 9, color: [80, 90, 100], indent: 12, gap: 1 });
    if (cr.reasoning && cr.reasoning !== "No reasoning provided.") {
      text(cr.reasoning, { size: 9, color: [110, 115, 125], indent: 12, gap: 1 });
    }
    text(`Source: ${cr.source}`, { size: 8, color: [130, 135, 145], indent: 12, gap: 5 });
  }
  rule();

  text("Evidence", { size: 12, bold: true, gap: 5 });
  text(
    `Population frequency (gnomAD v4): ${fmtAf(f.representativeAf)}   |   popmax ${fmtAf(f.popmaxAf)}${f.popmaxPopulation ? ` (${f.popmaxPopulation})` : ""}`,
    { size: 9, gap: 2 },
  );
  text(`Consequence: ${c.mostSevereConsequence ?? "n/a"}   |   SIFT ${c.siftPrediction ?? "n/a"} / PolyPhen ${c.polyphenPrediction ?? "n/a"}`, {
    size: 9,
    gap: 8,
  });
  rule();

  text("Reviewer critique", { size: 12, bold: true, gap: 4 });
  text(rev.critique, { size: 9, color: [80, 90, 100], gap: 5 });
  if (rev.conflicts.length > 0) {
    text("Conflicts flagged:", { size: 10, bold: true, gap: 1 });
    rev.conflicts.forEach((x) => text(`- ${x}`, { size: 9, indent: 12, gap: 1 }));
    y += 3;
  }
  text("Curator checklist:", { size: 10, bold: true, gap: 1 });
  rev.checklist.forEach((x) => text(`[ ] ${x}`, { size: 9, indent: 12, gap: 1 }));
  y += 8;
  rule();

  text(
    `Model: ${model.name} (${model.live ? "live Claude" : "offline heuristic"}). Generated ${new Date(report.generatedAt).toLocaleString()}.`,
    { size: 8, color: [130, 135, 145] },
  );

  doc.save(`norn-${report.input.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}
