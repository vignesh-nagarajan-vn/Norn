// Pure helpers for the eval page. Compares Norn's computed classification to
// the expected ClinVar label with two measures: exact five-tier match and
// directional concordance (pathogenic-leaning vs uncertain vs benign-leaning).

import type { Classification } from "./types";

export interface EvalVariant {
  input: string;
  gene: string;
  expected: string;
  accession: string;
  category: "pathogenic" | "benign" | "vus";
  note: string;
}

export interface EvalDataset {
  description: string;
  clinvarAccessedNote: string;
  variants: EvalVariant[];
}

export type Direction = "pathogenic" | "uncertain" | "benign";

const FIVE_TIER: Record<string, Classification> = {
  pathogenic: "Pathogenic",
  "likely pathogenic": "Likely Pathogenic",
  "uncertain significance": "Uncertain Significance",
  "likely benign": "Likely Benign",
  benign: "Benign",
};

export function normalizeExpected(label: string): Classification {
  const l = label.trim().toLowerCase();
  if (FIVE_TIER[l]) return FIVE_TIER[l];
  if (l.includes("conflict")) return "Uncertain Significance";
  if (l.includes("likely pathogenic")) return "Likely Pathogenic";
  if (l.includes("pathogenic")) return "Pathogenic";
  if (l.includes("likely benign")) return "Likely Benign";
  if (l.includes("benign")) return "Benign";
  return "Uncertain Significance";
}

export function directionOf(c: Classification): Direction {
  if (c === "Pathogenic" || c === "Likely Pathogenic") return "pathogenic";
  if (c === "Benign" || c === "Likely Benign") return "benign";
  return "uncertain";
}

export function isExactMatch(expected: string, computed: Classification): boolean {
  return normalizeExpected(expected) === computed;
}

export function isConcordant(expected: string, computed: Classification): boolean {
  return directionOf(normalizeExpected(expected)) === directionOf(computed);
}
