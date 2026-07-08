"use client";

import { STAGES, type StageState } from "./useInterpret";
import { NornMark } from "./ui";
import type { StageName } from "@/lib/types";

function dotColor(status: StageState["status"]): string {
  switch (status) {
    case "done":
      return "var(--pathogenic)";
    case "start":
      return "var(--secondary)";
    case "error":
      return "var(--risk-high)";
    case "skipped":
      return "var(--vus)";
    default:
      return "var(--outline-variant)";
  }
}

function StageNode({ state }: { state: StageState & { label: string; sub: string } }) {
  const running = state.status === "start";
  const done = state.status === "done";
  const color = dotColor(state.status);
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${running ? "animate-norn-pulse" : ""}`}
        style={{
          borderColor: color,
          background: done || running ? `color-mix(in srgb, ${color} 16%, var(--surface-bright))` : "var(--surface)",
        }}
      >
        {done ? (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M5 10.5l3 3 7-7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : state.status === "error" ? (
          <span style={{ color }} className="text-sm font-bold">!</span>
        ) : (
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        )}
      </div>
      <div className="mt-2 text-sm font-medium text-on-surface">{state.label}</div>
      <div className="text-[11px] text-outline">{state.detail ?? state.sub}</div>
    </div>
  );
}

export default function PipelineView({
  stages,
}: {
  stages: Record<StageName, StageState>;
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <NornMark size={16} className="text-secondary" strokeWidth={2.4} /> Weaving the thread
        </h2>
        <span className="label-caps">6 stages</span>
      </div>
      <div className="flex items-start gap-2">
        {STAGES.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-start">
            <StageNode state={{ ...stages[s.key], label: s.label, sub: s.sub }} />
            {i < STAGES.length - 1 && (
              <div className="mt-4 h-0.5 w-full flex-1 self-start" style={{ background: "color-mix(in srgb, var(--secondary) 35%, var(--outline-variant))" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
