"use client";

import { useEffect, useState } from "react";
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

/*
  The loading bar. A requestAnimationFrame loop eases the displayed value toward a
  moving target every frame (frame-rate independent, via an exponential approach),
  and the bar width is driven by that float value, so it glides smoothly instead of
  stepping between stage events. Isolated in its own component so the per-frame
  updates never re-render the stage nodes.
*/
function ThreadBar({
  done,
  total,
  allDone,
  anyError,
  label,
  detail,
  barColor,
}: {
  done: number;
  total: number;
  allDone: boolean;
  anyError: boolean;
  label: string;
  detail: string;
  barColor: string;
}) {
  const [display, setDisplay] = useState(4);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Respect reduced motion: snap to the meaningful value, no animation.
      setDisplay((prev) => Math.max(prev, allDone ? 100 : (done / total) * 100));
      return;
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last, 120); // clamp so a backgrounded tab does not lurch
      last = now;
      setDisplay((prev) => {
        if (anyError) return prev;
        const floor = (done / total) * 100;
        const nextMilestone = ((done + 1) / total) * 100;
        // Aim just short of the next stage while one is in flight; 100 when finished.
        const target = allDone ? 100 : Math.max(floor, nextMilestone - 1.5);
        // Cover a fixed fraction of the remaining gap per millisecond, so the bar
        // decelerates into the target rather than jumping to it.
        const k = allDone ? 0.006 : 0.0022;
        let next = prev + (target - prev) * (1 - Math.exp(-k * dt));
        if (allDone) next = next > 99.7 ? 100 : next;
        else next = Math.min(next, nextMilestone - 0.4);
        return Math.max(prev, next); // never regress
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [done, total, allDone, anyError]);

  const pct = Math.round(display);

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-on-surface-variant">
          <span className="font-semibold text-on-surface">{label}</span>
          {detail ? <span className="text-outline"> · {detail}</span> : null}
        </span>
        <span className="mono font-semibold" style={{ color: barColor }}>{pct}%</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-high">
        <div
          className="relative h-full rounded-full"
          style={{ width: `${Math.max(4, display)}%`, background: barColor }}
        >
          {!allDone && !anyError && <div className="absolute inset-0 loom-shimmer" />}
        </div>
      </div>
    </div>
  );
}

export default function PipelineView({
  stages,
}: {
  stages: Record<StageName, StageState>;
}) {
  const total = STAGES.length;
  let done = 0;
  let activeIdx = -1;
  let anyError = false;
  STAGES.forEach((s, i) => {
    const st = stages[s.key].status;
    if (st === "done" || st === "skipped") done += 1;
    if (st === "start" && activeIdx === -1) activeIdx = i;
    if (st === "error") anyError = true;
  });
  const active = activeIdx >= 0 ? STAGES[activeIdx] : null;
  const allDone = done >= total;

  const label = active ? active.label : allDone ? "Woven" : "Gathering the threads";
  const detail = active ? stages[active.key].detail ?? active.sub : "";
  const barColor = anyError ? "var(--risk-high)" : "var(--secondary)";

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <NornMark size={16} className="text-secondary" strokeWidth={2.4} /> Weaving the thread
        </h2>
        <span className="label-caps">{done}/{total} stages</span>
      </div>

      {/* Dynamic loading bar (bronze thread, matches the scheme). */}
      <ThreadBar
        done={done}
        total={total}
        allDone={allDone}
        anyError={anyError}
        label={label}
        detail={detail}
        barColor={barColor}
      />

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
