import { classColorVar } from "@/components/ui";
import type { Classification, NornReport } from "./types";

// Builds a formatted PDF of the interpretation, including the points meter and
// the protein lollipop redrawn as vector graphics from the report data (so they
// stay crisp and need no screenshotting). jsPDF is imported lazily.

function fmtAf(af: number | null | undefined): string {
  if (af == null) return "n/a";
  if (af === 0) return "0 (absent)";
  if (af < 0.001) return af.toExponential(2);
  return `${(af * 100).toFixed(4)}%`;
}

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "").trim();
  const v = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const n = parseInt(v || "666666", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten([r, g, b]: RGB, amt: number): RGB {
  return [Math.round(r + (255 - r) * amt), Math.round(g + (255 - g) * amt), Math.round(b + (255 - b) * amt)];
}

// Resolve a CSS variable (e.g. "var(--path)") to a hex string using the live
// document, so the PDF matches the current color scheme. Falls back to defaults.
function resolveVar(cssVar: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const name = cssVar.replace(/^var\(/, "").replace(/\)$/, "").trim();
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

interface Palette {
  ben: string; lben: string; vus: string; lpath: string; path: string;
  pathogenic: string; benign: string; secondary: string;
}
function readPalette(): Palette {
  return {
    ben: resolveVar("var(--ben)", "#6366f1"),
    lben: resolveVar("var(--lben)", "#818cf8"),
    vus: resolveVar("var(--vus)", "#f59e0b"),
    lpath: resolveVar("var(--lpath)", "#10b981"),
    path: resolveVar("var(--path)", "#059669"),
    pathogenic: resolveVar("var(--pathogenic)", "#10b981"),
    benign: resolveVar("var(--benign)", "#6366f1"),
    secondary: resolveVar("var(--secondary)", "#2563eb"),
  };
}
function classHex(c: Classification, p: Palette): string {
  const v = classColorVar(c);
  return resolveVar(v, p.path);
}
function lollipopHex(classification: string, p: Palette): string {
  const l = classification.toLowerCase();
  if (l.includes("pathogenic") && !l.includes("benign") && !l.includes("conflict")) return p.pathogenic;
  if (l.includes("benign") && !l.includes("conflict")) return p.benign;
  return p.vus;
}

const DMIN = -12;
const DMAX = 14;
const SPAN = DMAX - DMIN;
const BANDS = [
  { from: -12, to: -6.5, key: "ben" as const, label: "Benign" },
  { from: -6.5, to: -0.5, key: "lben" as const, label: "Lik. Benign" },
  { from: -0.5, to: 5.5, key: "vus" as const, label: "VUS" },
  { from: 5.5, to: 9.5, key: "lpath" as const, label: "Lik. Path" },
  { from: 9.5, to: 14, key: "path" as const, label: "Pathogenic" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawMeter(doc: any, x: number, y: number, w: number, report: NornReport, p: Palette): number {
  const h = 14;
  let cx = x;
  for (const b of BANDS) {
    const bw = ((b.to - b.from) / SPAN) * w;
    const [r, g, bl] = lighten(hexToRgb(p[b.key]), 0.72);
    doc.setFillColor(r, g, bl);
    doc.rect(cx, y, bw, h, "F");
    cx += bw;
  }
  const pts = Math.max(DMIN, Math.min(DMAX, report.result.points));
  const mx = x + ((pts - DMIN) / SPAN) * w;
  const [mr, mg, mb] = hexToRgb(classHex(report.result.classification, p));
  doc.setFillColor(mr, mg, mb);
  doc.rect(Math.max(x, Math.min(x + w - 2, mx - 1)), y - 2, 2.2, h + 4, "F");
  doc.setFontSize(6);
  doc.setTextColor(120, 125, 135);
  cx = x;
  for (const b of BANDS) {
    const bw = ((b.to - b.from) / SPAN) * w;
    doc.text(b.label, cx + bw / 2, y + h + 8, { align: "center" });
    cx += bw;
  }
  return h + 12;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawLollipop(doc: any, x: number, y: number, w: number, h: number, report: NornReport, p: Palette): number {
  const gv = report.evidence.clinvar.geneVariants.filter((v) => v.proteinPosition != null);
  const qpos = report.evidence.consequence.proteinPosition ?? null;
  const positions = gv.map((v) => v.proteinPosition as number);
  if (qpos != null) positions.push(qpos);
  if (positions.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(120, 125, 135);
    doc.text("No positioned ClinVar variants available for the lollipop plot.", x, y + 10);
    return 16;
  }
  let min = Math.min(...positions);
  let max = Math.max(...positions);
  if (min === max) { min -= 10; max += 10; }
  const pad = Math.max(5, Math.round((max - min) * 0.05));
  const dMin = min - pad;
  const dMax = max + pad;
  const baseline = y + h - 12;
  const sx = (pos: number) => x + ((pos - dMin) / (dMax - dMin)) * w;

  doc.setDrawColor(210, 215, 225);
  doc.setLineWidth(1.4);
  doc.line(x, baseline, x + w, baseline);

  for (const v of gv) {
    const px = sx(v.proteinPosition as number);
    const top = baseline - (16 + (v.stars ?? 0) * 4);
    const [r, g, b] = hexToRgb(lollipopHex(v.classification, p));
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.6);
    doc.line(px, baseline, px, top);
    doc.setFillColor(r, g, b);
    doc.circle(px, top, 1.5, "F");
  }
  if (qpos != null) {
    const px = sx(qpos);
    const [r, g, b] = hexToRgb(p.secondary);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.2);
    doc.line(px, baseline, px, y + 4);
    doc.setFillColor(r, g, b);
    doc.circle(px, y + 4, 2.4, "F");
  }
  doc.setFontSize(7);
  doc.setTextColor(150, 155, 165);
  doc.text(`${dMin}`, x, baseline + 9);
  doc.text(`${dMax}`, x + w, baseline + 9, { align: "right" });
  doc.text("amino acid position", x + w, y + h + 2, { align: "right" });
  return h;
}

export async function exportReportPdf(report: NornReport): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const palette = readPalette();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensure = (hgt: number) => {
    if (y + hgt > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const text = (
    s: string,
    opts: { size?: number; bold?: boolean; color?: RGB; gap?: number; indent?: number } = {},
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
    doc.setLineWidth(0.5);
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
    gap: 6,
  });

  // Points meter graph.
  ensure(30);
  y += drawMeter(doc, margin, y, contentW, report, palette);
  y += 6;
  text(r.confidenceRationale, { size: 9, color: [80, 90, 100], gap: 6 });
  rule();

  text("ACMG/AMP criteria", { size: 12, bold: true, gap: 5 });
  for (const cr of r.criteria) {
    const verdict = cr.verdict === "met" ? "MET" : cr.verdict === "not_met" ? "not met" : "unknown";
    const pts = cr.verdict === "met" ? ` (${cr.appliedPoints > 0 ? "+" : ""}${cr.appliedPoints} pts)` : "";
    const src = cr.manual ? "curator-supplied" : cr.source;
    text(`${cr.code}: ${cr.name} [${cr.strength}] ${verdict}${pts}`, { size: 10, bold: true, gap: 1 });
    if (cr.evidence) text(cr.evidence, { size: 9, color: [80, 90, 100], indent: 12, gap: 1 });
    text(`Source: ${src}`, { size: 8, color: [130, 135, 145], indent: 12, gap: 5 });
  }
  rule();

  text("Evidence", { size: 12, bold: true, gap: 5 });
  text(
    `Population frequency (gnomAD v4): ${fmtAf(f.representativeAf)}   |   popmax ${fmtAf(f.popmaxAf)}${f.popmaxPopulation ? ` (${f.popmaxPopulation})` : ""}. Thresholds: ${e.thresholds.source}.`,
    { size: 9, gap: 2 },
  );
  text(
    `Consequence: ${c.mostSevereConsequence ?? "n/a"}   |   SIFT ${c.siftPrediction ?? "n/a"} / PolyPhen ${c.polyphenPrediction ?? "n/a"}   |   gene constraint pLI ${e.constraint.pli?.toFixed(2) ?? "n/a"}, LOEUF ${e.constraint.loeuf?.toFixed(2) ?? "n/a"}.`,
    { size: 9, gap: 6 },
  );

  // Lollipop graph.
  text(`Protein context (${c.geneSymbol ?? "gene"})`, { size: 10, bold: true, gap: 3 });
  ensure(90);
  y += drawLollipop(doc, margin, y, contentW, 78, report, palette);
  y += 8;
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
