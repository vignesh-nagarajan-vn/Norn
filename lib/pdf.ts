import { classColorVar } from "@/components/ui";
import type { Classification, NornReport } from "./types";

// Builds a professional, one-to-two-page interpretation report PDF, branded with
// the Norn mark, a header and footer on every page, a classification chip, and
// the points meter and protein lollipop redrawn as vector graphics from the
// report data. jsPDF is imported lazily. The chrome (ink, bronze, greys) is
// fixed to a light print palette so the PDF looks right even in dark mode; only
// the classification colors follow the user's chosen scheme.

function fmtAf(af: number | null | undefined): string {
  if (af == null) return "n/a";
  if (af === 0) return "0 (absent)";
  if (af < 0.001) return af.toExponential(2);
  return `${(af * 100).toFixed(4)}%`;
}

type RGB = [number, number, number];

// Fixed print chrome (the loom identity on white paper).
const INK: RGB = [34, 29, 21];
const BRONZE: RGB = [138, 90, 43];
const GREY: RGB = [102, 93, 76];
const FAINT: RGB = [150, 143, 128];
const HAIR: RGB = [221, 211, 191];
const ERROR: RGB = [186, 26, 26];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "").trim();
  const v = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const n = parseInt(v || "666666", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten([r, g, b]: RGB, amt: number): RGB {
  return [Math.round(r + (255 - r) * amt), Math.round(g + (255 - g) * amt), Math.round(b + (255 - b) * amt)];
}
function readableText([r, g, b]: RGB): RGB {
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? INK : [255, 255, 255];
}

// Resolve a CSS variable (e.g. "var(--path)") to a hex string, so classification
// colors match the current scheme. Falls back to the clinical defaults.
function resolveVar(cssVar: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const name = cssVar.replace(/^var\(/, "").replace(/\)$/, "").trim();
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

interface Palette {
  ben: string; lben: string; vus: string; lpath: string; path: string;
  pathogenic: string; benign: string;
}
function readPalette(): Palette {
  return {
    ben: resolveVar("var(--ben)", "#15803d"),
    lben: resolveVar("var(--lben)", "#22c55e"),
    vus: resolveVar("var(--vus)", "#f59e0b"),
    lpath: resolveVar("var(--lpath)", "#ea580c"),
    path: resolveVar("var(--path)", "#b91c1c"),
    pathogenic: resolveVar("var(--pathogenic)", "#dc2626"),
    benign: resolveVar("var(--benign)", "#16a34a"),
  };
}
function classHex(c: Classification, p: Palette): string {
  return resolveVar(classColorVar(c), p.path);
}
function lollipopHex(classification: string, p: Palette): string {
  const l = classification.toLowerCase();
  if (l.includes("pathogenic") && !l.includes("benign") && !l.includes("conflict")) return p.pathogenic;
  if (l.includes("benign") && !l.includes("conflict")) return p.benign;
  return p.vus;
}

// The Norn mark (three interlocked rings) drawn as vector. (cx, cy) is its center.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawMark(doc: any, cx: number, cy: number, size: number, rgb: RGB) {
  const s = size / 32;
  const r = 6.6 * s;
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(Math.max(0.7, 1.7 * s));
  const rings: [number, number][] = [[16, 11.4], [10.8, 20.2], [21.2, 20.2]];
  for (const [px, py] of rings) doc.circle(cx + (px - 16) * s, cy + (py - 16) * s, r, "S");
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
  const h = 15;
  let cx = x;
  for (const b of BANDS) {
    const bw = ((b.to - b.from) / SPAN) * w;
    const [r, g, bl] = lighten(hexToRgb(p[b.key]), 0.68);
    doc.setFillColor(r, g, bl);
    doc.rect(cx, y, bw, h, "F");
    cx += bw;
  }
  doc.setDrawColor(HAIR[0], HAIR[1], HAIR[2]);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h, "S");
  const pts = Math.max(DMIN, Math.min(DMAX, report.result.points));
  const mx = x + ((pts - DMIN) / SPAN) * w;
  const [mr, mg, mb] = hexToRgb(classHex(report.result.classification, p));
  doc.setFillColor(mr, mg, mb);
  doc.rect(Math.max(x, Math.min(x + w - 2, mx - 1)), y - 2, 2.4, h + 4, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
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
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
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

  doc.setDrawColor(HAIR[0], HAIR[1], HAIR[2]);
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
    doc.setDrawColor(BRONZE[0], BRONZE[1], BRONZE[2]);
    doc.setLineWidth(1.2);
    doc.line(px, baseline, px, y + 4);
    doc.setFillColor(BRONZE[0], BRONZE[1], BRONZE[2]);
    doc.circle(px, y + 4, 2.6, "F");
  }
  doc.setFontSize(7);
  doc.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
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
  const bottom = pageH - 54; // room for the footer
  let y = margin;

  const { result: r, evidence: e, review: rev, model } = report;
  const c = e.consequence;
  const f = e.frequency;

  const ensure = (hgt: number) => {
    if (y + hgt > bottom) {
      doc.addPage();
      y = margin + 8;
    }
  };
  const text = (
    s: string,
    opts: { size?: number; bold?: boolean; font?: "helvetica" | "times" | "courier"; color?: RGB; gap?: number; indent?: number } = {},
  ) => {
    const size = opts.size ?? 10;
    doc.setFontSize(size);
    doc.setFont(opts.font ?? "helvetica", opts.bold ? "bold" : "normal");
    const col = opts.color ?? INK;
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
  const heading = (label: string) => {
    ensure(24);
    y += 4;
    doc.setFillColor(BRONZE[0], BRONZE[1], BRONZE[2]);
    doc.rect(margin, y - 9, 3, 12, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(label, margin + 10, y);
    y += 15;
  };
  const rule = () => {
    ensure(14);
    doc.setDrawColor(HAIR[0], HAIR[1], HAIR[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  // Branded header (page 1).
  drawMark(doc, margin + 11, margin + 3, 26, BRONZE);
  doc.setFont("times", "bold");
  doc.setFontSize(21);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text("Norn", margin + 30, margin + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(BRONZE[0], BRONZE[1], BRONZE[2]);
  doc.text("VARIANT INTERPRETATION REPORT", pageW - margin, margin - 1, { align: "right", charSpace: 0.6 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  doc.text(`Generated ${new Date(report.generatedAt).toLocaleString()}`, pageW - margin, margin + 11, { align: "right" });
  y = margin + 22;
  doc.setDrawColor(BRONZE[0], BRONZE[1], BRONZE[2]);
  doc.setLineWidth(1.2);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  text("Research and demonstration only. Not for clinical use. Norn drafts evidence for a human curator to confirm.", {
    size: 8.5,
    color: ERROR,
    gap: 10,
  });

  // Variant + classification chip.
  const chipLabel = r.classification;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  const chipTextW = doc.getTextWidth(chipLabel);
  const chipW = chipTextW + 22;
  const chipH = 22;
  const chipX = pageW - margin - chipW;
  const chipRgb = hexToRgb(classHex(r.classification, palette));
  doc.setFillColor(chipRgb[0], chipRgb[1], chipRgb[2]);
  doc.roundedRect(chipX, y - 4, chipW, chipH, 5, 5, "F");
  const chipText = readableText(chipRgb);
  doc.setTextColor(chipText[0], chipText[1], chipText[2]);
  doc.text(chipLabel, chipX + chipW / 2, y + 11, { align: "center" });

  doc.setFont("courier", "bold");
  doc.setFontSize(15);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(report.input, margin, y + 10);
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(`${r.points > 0 ? "+" : ""}${r.points} points  ·  ${r.confidence} confidence`, margin, y);
  y += 14;
  text([c.geneSymbol, c.transcriptId, c.hgvsc, c.hgvsp].filter(Boolean).join("   |   "), {
    size: 9,
    font: "courier",
    color: GREY,
    gap: 8,
  });

  // Points meter.
  ensure(38);
  y += drawMeter(doc, margin, y, contentW, report, palette);
  y += 10;
  text(r.confidenceRationale, { size: 9, color: GREY, gap: 4 });

  // Criteria.
  heading("ACMG/AMP criteria");
  for (const cr of r.criteria) {
    ensure(30);
    const rowY = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(cr.code, margin, rowY);
    const codeW = doc.getTextWidth(cr.code);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(cr.strength, margin + codeW + 8, rowY);
    // right: verdict + points
    const met = cr.verdict === "met";
    const verdict = met ? `MET  ${cr.appliedPoints > 0 ? "+" : ""}${cr.appliedPoints} pts` : cr.verdict === "not_met" ? "not met" : "unknown";
    const vc: RGB = met ? hexToRgb(cr.direction === "pathogenic" ? palette.pathogenic : palette.benign) : GREY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(vc[0], vc[1], vc[2]);
    doc.text(verdict, pageW - margin, rowY, { align: "right" });
    y += 13;
    if (cr.evidence) text(cr.evidence, { size: 9, color: [70, 64, 54], gap: 1 });
    text(`Source: ${cr.manual ? "curator-supplied" : cr.source}`, { size: 8, color: FAINT, gap: 6 });
  }

  // Evidence.
  heading("Evidence");
  text(
    `Population frequency (gnomAD v4): ${fmtAf(f.representativeAf)}   |   popmax ${fmtAf(f.popmaxAf)}${f.popmaxPopulation ? ` (${f.popmaxPopulation})` : ""}. Thresholds: ${e.thresholds.source}.`,
    { size: 9, gap: 2 },
  );
  text(
    `Consequence: ${c.mostSevereConsequence ?? "n/a"}   |   SIFT ${c.siftPrediction ?? "n/a"} / PolyPhen ${c.polyphenPrediction ?? "n/a"}   |   gene constraint pLI ${e.constraint.pli?.toFixed(2) ?? "n/a"}, LOEUF ${e.constraint.loeuf?.toFixed(2) ?? "n/a"}.`,
    { size: 9, gap: 8 },
  );

  // Protein context.
  heading(`Protein context (${c.geneSymbol ?? "gene"})`);
  ensure(92);
  y += drawLollipop(doc, margin, y, contentW, 78, report, palette);
  y += 8;

  // Reviewer.
  heading("Reviewer critique");
  text(rev.critique, { size: 9, color: [70, 64, 54], gap: 5 });
  if (rev.conflicts.length > 0) {
    text("Conflicts flagged:", { size: 10, bold: true, gap: 1 });
    rev.conflicts.forEach((x) => text(`•  ${x}`, { size: 9, indent: 12, gap: 1 }));
    y += 3;
  }
  text("Curator checklist:", { size: 10, bold: true, gap: 2 });
  rev.checklist.forEach((x) => text(`[ ]  ${x}`, { size: 9, indent: 12, gap: 2 }));

  // Footer on every page.
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(HAIR[0], HAIR[1], HAIR[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 34, pageW - margin, pageH - 34);
    drawMark(doc, margin + 5, pageH - 22, 11, BRONZE);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text("Norn  ·  Variant Interpretation Copilot", margin + 15, pageH - 19);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(ERROR[0], ERROR[1], ERROR[2]);
    doc.text("NOT FOR CLINICAL USE", pageW / 2, pageH - 19, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    doc.text(
      `${model.live ? model.name : "offline heuristic"}  ·  Page ${i} of ${pageCount}`,
      pageW - margin,
      pageH - 19,
      { align: "right" },
    );
  }

  doc.save(`norn-${report.input.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}
