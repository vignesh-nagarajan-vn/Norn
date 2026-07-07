"use client";

import type { ClassificationResult, ModelInfo } from "@/lib/types";
import { classColorVar, ConfidencePill } from "./ui";

const DOMAIN_MIN = -12;
const DOMAIN_MAX = 14;
const SPAN = DOMAIN_MAX - DOMAIN_MIN;

// Bands drawn left (benign) to right (pathogenic), sized by their point ranges.
const BANDS = [
  { label: "Benign", from: -12, to: -6.5, color: "var(--ben)" },
  { label: "Likely Benign", from: -6.5, to: -0.5, color: "var(--lben)" },
  { label: "VUS", from: -0.5, to: 5.5, color: "var(--vus)" },
  { label: "Likely Path.", from: 5.5, to: 9.5, color: "var(--lpath)" },
  { label: "Pathogenic", from: 9.5, to: 14, color: "var(--path)" },
];

function pct(points: number): number {
  const clamped = Math.max(DOMAIN_MIN, Math.min(DOMAIN_MAX, points));
  return ((clamped - DOMAIN_MIN) / SPAN) * 100;
}

function PointsMeter({ points }: { points: number }) {
  const markerPct = pct(points);
  return (
    <div className="w-full">
      <div className="relative h-7 w-full overflow-hidden rounded-md border border-line">
        <div className="flex h-full w-full">
          {BANDS.map((b) => (
            <div
              key={b.label}
              style={{
                width: `${((b.to - b.from) / SPAN) * 100}%`,
                background: `color-mix(in srgb, ${b.color} 20%, white)`,
              }}
              className="h-full"
            />
          ))}
        </div>
        <div
          className="absolute top-0 h-full"
          style={{ left: `${markerPct}%`, transform: "translateX(-50%)" }}
        >
          <div className="h-full w-0.5" style={{ background: "var(--ink)" }} />
        </div>
        <div
          className="absolute -top-0 flex -translate-x-1/2 items-center"
          style={{ left: `${markerPct}%` }}
        >
          <span className="mono rounded bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {points > 0 ? `+${points}` : points}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex w-full justify-between text-[10px] text-faint">
        {BANDS.map((b) => (
          <span key={b.label} className="flex-1 text-center">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ClassificationHeader({
  result,
  model,
  variantLabel,
}: {
  result: ClassificationResult;
  model: ModelInfo;
  variantLabel: string;
}) {
  const color = classColorVar(result.classification);
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label-tiny">Classification</div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-2xl font-semibold tracking-tight" style={{ color }}>
              {result.classification}
            </span>
            <ConfidencePill confidence={result.confidence} />
          </div>
          <div className="mono mt-1 text-sm text-muted">{variantLabel}</div>
        </div>
        <div className="text-right">
          <div className="label-tiny">ClinGen points</div>
          <div className="mono text-2xl font-semibold" style={{ color }}>
            {result.points > 0 ? `+${result.points}` : result.points}
          </div>
          <div className="text-[11px] text-faint">
            +{result.pathogenicPoints} pathogenic / {result.benignPoints} benign
          </div>
        </div>
      </div>

      <div className="mt-5">
        <PointsMeter points={result.points} />
      </div>

      <p className="mt-4 text-sm text-muted">{result.confidenceRationale}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        {result.ba1Override && (
          <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: "color-mix(in srgb, var(--ben) 12%, white)", color: "var(--ben)" }}>
            BA1 stand-alone benign override applied
          </span>
        )}
        <span
          className="rounded-full border border-line px-2 py-0.5 text-muted"
          title={model.live ? "Two live Claude calls were used" : "Deterministic fallback; set ANTHROPIC_API_KEY for Claude"}
        >
          {model.live ? `Adjudicated by ${model.name}` : "Offline heuristic (no model key)"}
        </span>
      </div>
    </div>
  );
}
