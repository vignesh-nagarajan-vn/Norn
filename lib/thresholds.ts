import type { GeneThresholdInfo } from "./types";
import table from "../data/gene-thresholds.json";

// Resolves the allele-frequency thresholds for a gene, using a gene-specific
// entry when available and the generic default otherwise.
export function resolveThresholds(gene: string | null | undefined): GeneThresholdInfo {
  const d = table.default;
  const entry = gene ? (table.genes as Record<string, typeof d>)[gene] : undefined;
  const t = entry ?? d;
  return {
    gene: gene ?? "unknown",
    source: t.source,
    ba1Af: t.ba1Af,
    bs1Af: t.bs1Af,
    pm2Af: t.pm2Af,
  };
}
