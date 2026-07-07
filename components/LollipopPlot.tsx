"use client";

import type { ClinVarNeighbor } from "@/lib/types";

function classColor(classification: string): string {
  const c = classification.toLowerCase();
  if (c.includes("pathogenic") && !c.includes("benign") && !c.includes("conflict")) {
    return c.includes("likely") ? "var(--lpath)" : "var(--path)";
  }
  if (c.includes("benign") && !c.includes("conflict")) {
    return c.includes("likely") ? "var(--lben)" : "var(--ben)";
  }
  return "var(--vus)";
}

const W = 760;
const H = 230;
const M = { top: 28, right: 24, bottom: 40, left: 24 };
const plotW = W - M.left - M.right;
const baseline = H - M.bottom;

export default function LollipopPlot({
  gene,
  variants,
  queryPosition,
  queryLabel,
}: {
  gene: string;
  variants: ClinVarNeighbor[];
  queryPosition: number | null;
  queryLabel: string;
}) {
  const positioned = variants.filter((v) => v.proteinPosition != null);
  const positions = positioned.map((v) => v.proteinPosition as number);
  if (queryPosition != null) positions.push(queryPosition);

  if (positions.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">Protein context</h2>
        <p className="text-sm text-muted">
          No positioned ClinVar variants were available for {gene}, so the lollipop plot is not shown.
        </p>
      </div>
    );
  }

  let min = Math.min(...positions);
  let max = Math.max(...positions);
  if (min === max) {
    min -= 10;
    max += 10;
  }
  const pad = Math.max(5, Math.round((max - min) * 0.05));
  const dMin = min - pad;
  const dMax = max + pad;
  const x = (pos: number) => M.left + ((pos - dMin) / (dMax - dMin)) * plotW;
  const needle = (stars: number | null | undefined) => 34 + (stars ?? 0) * 12;

  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Protein context ({gene})</h2>
        <div className="flex flex-wrap gap-3 text-[11px] text-muted">
          <Legend color="var(--path)" label="Pathogenic" />
          <Legend color="var(--vus)" label="Uncertain" />
          <Legend color="var(--ben)" label="Benign" />
          <Legend color="var(--brand)" label="Query" ring />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`ClinVar variants in ${gene} by protein position`}>
        {/* protein track */}
        <line x1={M.left} y1={baseline} x2={W - M.right} y2={baseline} stroke="var(--line)" strokeWidth={6} strokeLinecap="round" />

        {/* axis ticks */}
        {[dMin, Math.round((dMin + dMax) / 2), dMax].map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={baseline} x2={x(t)} y2={baseline + 6} stroke="var(--faint)" strokeWidth={1} />
            <text x={x(t)} y={baseline + 20} textAnchor="middle" fontSize={11} fill="var(--faint)">
              {t}
            </text>
          </g>
        ))}
        <text x={W - M.right} y={H - 4} textAnchor="end" fontSize={10} fill="var(--faint)">
          amino acid position
        </text>

        {/* known ClinVar variants */}
        {positioned.map((v, i) => {
          const px = x(v.proteinPosition as number);
          const top = baseline - needle(v.stars);
          const color = classColor(v.classification);
          return (
            <g key={`${v.accession}-${i}`}>
              <line x1={px} y1={baseline} x2={px} y2={top} stroke={color} strokeWidth={1.5} opacity={0.7} />
              <circle cx={px} cy={top} r={4} fill={color}>
                <title>{`${v.title}, ${v.classification}${v.stars != null ? ` (${v.stars} star)` : ""}`}</title>
              </circle>
            </g>
          );
        })}

        {/* query variant */}
        {queryPosition != null && (
          <g>
            <line x1={x(queryPosition)} y1={baseline} x2={x(queryPosition)} y2={M.top} stroke="var(--brand)" strokeWidth={2} />
            <circle cx={x(queryPosition)} cy={M.top} r={7} fill="var(--brand)" stroke="white" strokeWidth={2}>
              <title>{queryLabel}</title>
            </circle>
            <text x={x(queryPosition)} y={M.top - 12} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--brand)">
              {queryLabel}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function Legend({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color, boxShadow: ring ? "0 0 0 2px white, 0 0 0 3px var(--brand)" : undefined }}
      />
      {label}
    </span>
  );
}
