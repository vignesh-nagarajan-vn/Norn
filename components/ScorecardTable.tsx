"use client";

import type { CriterionResult } from "@/lib/types";
import { StrengthTag, VerdictChip } from "./ui";

function CriterionRow({ c }: { c: CriterionResult }) {
  const met = c.verdict === "met";
  const accent = c.direction === "pathogenic" ? "var(--path)" : "var(--ben)";
  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-4 first:border-t-0 sm:flex-row sm:items-start">
      <div className="flex w-full items-center gap-2 sm:w-40 sm:flex-col sm:items-start">
        <div className="flex items-center gap-2">
          <span
            className="mono text-sm font-semibold"
            style={{ color: met ? accent : "var(--ink)" }}
          >
            {c.code}
          </span>
          <StrengthTag text={c.nominalStrength && c.nominalStrength !== c.strength ? `${c.strength}` : c.strength} />
        </div>
        {met && (
          <span className="mono text-[11px] font-semibold" style={{ color: accent }}>
            {c.appliedPoints > 0 ? `+${c.appliedPoints}` : c.appliedPoints} pts
          </span>
        )}
        {c.provisional && (
          <span className="text-[10px] font-medium text-lpath">provisional</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{c.name}</span>
          <VerdictChip verdict={c.verdict} direction={c.direction} />
          {c.signalDisagreement && (
            <span className="text-[10px] font-medium text-lpath" title="Model verdict differs from the code-computed signal">
              signal mismatch
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{c.evidence}</p>
        <p className="mt-1 text-[13px] italic text-faint">{c.reasoning}</p>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-faint">
          <span>{c.source}</span>
          {c.sourceUrl && (
            <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="link">
              view source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ScorecardTable({ criteria }: { criteria: CriterionResult[] }) {
  const metCount = criteria.filter((c) => c.verdict === "met").length;
  const unknownCount = criteria.filter((c) => c.verdict === "unknown").length;
  return (
    <div className="card">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">ACMG/AMP scorecard</h2>
        <span className="label-tiny">
          {metCount} met / {unknownCount} unknown / {criteria.length} total
        </span>
      </div>
      <div className="border-t border-line">
        {criteria.map((c) => (
          <CriterionRow key={c.code} c={c} />
        ))}
      </div>
    </div>
  );
}
