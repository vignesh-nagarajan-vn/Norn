"use client";

import type { CriterionResult, ReviewResult } from "@/lib/types";

function questionsFromUnknowns(criteria: CriterionResult[]): string[] {
  const map: Record<string, string> = {
    PVS1: "Confirm the molecular consequence and whether loss of function is a disease mechanism for this gene.",
    PS1: "Search ClinVar and the literature for an established pathogenic variant with the same amino acid change.",
    PM2: "Obtain the gnomAD population frequency; the automated lookup did not resolve it.",
    PM5: "Check whether a different pathogenic missense change is reported at this residue.",
    PP3: "Obtain in-silico predictions (SIFT, PolyPhen, or a calibrated meta-predictor); results were missing or ambiguous.",
    BA1: "Confirm the population allele frequency to rule the variant common or rare.",
    BS1: "Confirm the maximum credible allele frequency for the specific disorder.",
    BP4: "Obtain in-silico predictions; results were missing or ambiguous.",
  };
  return criteria
    .filter((c) => c.verdict === "unknown")
    .map((c) => map[c.code])
    .filter((q): q is string => Boolean(q));
}

export default function CuratorPanel({
  review,
  criteria,
}: {
  review: ReviewResult;
  criteria: CriterionResult[];
}) {
  const riskColor =
    review.overcallRisk === "high"
      ? "var(--path)"
      : review.overcallRisk === "moderate"
        ? "var(--lpath)"
        : "var(--ben)";
  const questions = questionsFromUnknowns(criteria);

  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Reviewer critique</h2>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: `color-mix(in srgb, ${riskColor} 12%, white)`, color: riskColor }}
        >
          {review.overcallRisk} overcall risk
        </span>
      </div>
      <p className="text-sm text-muted">{review.critique}</p>

      {review.conflicts.length > 0 && (
        <div className="mt-3 rounded-lg border border-line bg-canvas p-3">
          <div className="label-tiny mb-1">Conflicts flagged</div>
          <ul className="list-disc space-y-1 pl-4 text-sm text-ink">
            {review.conflicts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <div className="label-tiny mb-2">Curator should double-check</div>
        <ul className="space-y-2">
          {review.checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink">
              <span
                className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border border-line text-[10px] text-faint"
                aria-hidden
              >
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {questions.length > 0 && (
        <div className="mt-4">
          <div className="label-tiny mb-2">Open questions from unknown criteria</div>
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
