"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { PrefsProvider } from "@/components/Prefs";
import { classColorVar, Icon } from "@/components/ui";
import {
  isConcordant,
  isExactMatch,
  normalizeExpected,
  type EvalDataset,
  type EvalVariant,
} from "@/lib/eval";
import type { Classification, NornReport, PipelineEvent } from "@/lib/types";

type RowStatus = "pending" | "running" | "done" | "error";
interface Row {
  status: RowStatus;
  computed?: Classification;
  points?: number;
  heuristic?: Classification; // same evidence adjudicated by the deterministic heuristic
  mode?: "claude" | "heuristic"; // whether the live column is a real Claude pass
}

async function interpretOnce(variant: string): Promise<NornReport> {
  const res = await fetch("/api/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variant, compare: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let report: NornReport | null = null;
  const consume = (line: string) => {
    const t = line.trim();
    if (!t) return;
    const ev = JSON.parse(t) as PipelineEvent;
    if (ev.type === "result") report = ev.report;
    else if (ev.type === "error") throw new Error(ev.message);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(consume);
  }
  if (buffer.trim()) consume(buffer);
  if (!report) throw new Error("No result returned");
  return report;
}

async function runPool<T>(items: T[], concurrency: number, worker: (t: T) => Promise<void>) {
  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const current = items[idx++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="label-caps">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-on-surface">{value}</div>
      {sub && <div className="text-[11px] text-outline">{sub}</div>}
    </div>
  );
}

export default function EvalPage() {
  const [dataset, setDataset] = useState<EvalDataset | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/eval")
      .then((r) => r.json())
      .then((d: EvalDataset) => setDataset(d))
      .catch(() => setDataset(null));
  }, []);

  const runAll = useCallback(async () => {
    if (!dataset || running) return;
    setRunning(true);
    setRows(Object.fromEntries(dataset.variants.map((v) => [v.input, { status: "pending" as RowStatus }])));
    await runPool(dataset.variants, 4, async (v: EvalVariant) => {
      setRows((prev) => ({ ...prev, [v.input]: { status: "running" } }));
      try {
        const report = await interpretOnce(v.input);
        setRows((prev) => ({
          ...prev,
          [v.input]: {
            status: "done",
            computed: report.result.classification,
            points: report.result.points,
            heuristic: report.comparison?.classification,
            mode: report.model.mode,
          },
        }));
      } catch {
        setRows((prev) => ({ ...prev, [v.input]: { status: "error" } }));
      }
    });
    setRunning(false);
  }, [dataset, running]);

  const stats = useMemo(() => {
    if (!dataset)
      return { done: 0, exact: 0, concordant: 0, hExact: 0, hConcordant: 0, total: 0, claudeMode: false };
    let done = 0;
    let exact = 0;
    let concordant = 0;
    let hExact = 0;
    let hConcordant = 0;
    let claudeMode = false;
    for (const v of dataset.variants) {
      const r = rows[v.input];
      if (r?.status === "done" && r.computed) {
        done++;
        if (isExactMatch(v.expected, r.computed)) exact++;
        if (isConcordant(v.expected, r.computed)) concordant++;
        if (r.mode === "claude") claudeMode = true;
        if (r.heuristic) {
          if (isExactMatch(v.expected, r.heuristic)) hExact++;
          if (isConcordant(v.expected, r.heuristic)) hConcordant++;
        }
      }
    }
    return { done, exact, concordant, hExact, hConcordant, total: dataset.variants.length, claudeMode };
  }, [dataset, rows]);

  const pct = (n: number) => (stats.done ? Math.round((n / stats.done) * 100) : 0);
  const pctExact = pct(stats.exact);
  const pctConcordant = pct(stats.concordant);
  const pctHExact = pct(stats.hExact);
  const pctHConcordant = pct(stats.hConcordant);

  return (
    <PrefsProvider>
    <AppShell active="eval">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <h1 className="display text-3xl font-semibold tracking-tight text-on-surface">Evaluation</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-on-surface-variant">
          Norn runs its full pipeline on {dataset?.variants.length ?? "a set of"} well-established variants and
          compares its call to the expected ClinVar label, by exact five-tier agreement and by directional
          concordance. Each is also adjudicated by the deterministic heuristic on the same evidence, so you can see
          what Claude&apos;s reasoning adds over rules alone.
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-low px-4 py-3 text-[13px] text-on-surface-variant">
          <Icon name="shield" size={18} className="mt-0.5 text-secondary" />
          <span>
            <span className="font-semibold text-on-surface">Anti-circularity:</span> a variant&apos;s own ClinVar
            classification is never fed into adjudication. ClinVar is used only for neighboring-residue evidence
            (PS1, PM5). The expected label here is the comparison target, not an input to the engine.
          </span>
        </div>

        <button onClick={runAll} disabled={running || !dataset} className="btn-primary mt-4">
          <Icon name="play_arrow" size={18} />
          {running ? `Running... (${stats.done}/${stats.total})` : "Run evaluation"}
        </button>

        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Variants" value={`${stats.total}`} />
          <StatCard label="Evaluated" value={`${stats.done}`} />
          <StatCard
            label={stats.claudeMode ? "Claude directional" : "Live directional"}
            value={stats.done ? `${pctConcordant}%` : "n/a"}
            sub={stats.done ? `${stats.concordant}/${stats.done} · exact ${pctExact}%` : undefined}
          />
          <StatCard
            label="Heuristic directional"
            value={stats.done ? `${pctHConcordant}%` : "n/a"}
            sub={stats.done ? `${stats.hConcordant}/${stats.done} · exact ${pctHExact}%` : undefined}
          />
        </section>

        {stats.done > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-low px-4 py-3 text-[13px] text-on-surface-variant">
            <Icon name="balance" size={18} className="mt-0.5 text-secondary" />
            {stats.claudeMode ? (
              <span>
                <span className="font-semibold text-on-surface">Claude vs the heuristic on the same evidence:</span>{" "}
                Claude matches direction on {stats.concordant}/{stats.done} (exact {pctExact}%); the deterministic
                heuristic on {stats.hConcordant}/{stats.done} (exact {pctHExact}%). The gap is what the model&apos;s
                reasoning adds over the rules.
              </span>
            ) : (
              <span>
                No <code className="mono">ANTHROPIC_API_KEY</code> is set, so the live column is the offline heuristic
                and the two match. Set a key and rerun to measure Claude against the heuristic.
              </span>
            )}
          </div>
        )}

        <section className="card mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left text-[11px] uppercase tracking-caps text-outline">
                <th className="px-4 py-2 font-bold">Variant</th>
                <th className="px-4 py-2 font-bold">Gene</th>
                <th className="px-4 py-2 font-bold">Expected</th>
                <th className="px-4 py-2 font-bold">{/* live: Claude or offline heuristic */}Norn</th>
                <th className="px-4 py-2 font-bold">Heuristic</th>
                <th className="px-4 py-2 font-bold">Points</th>
                <th className="px-4 py-2 font-bold">Match</th>
              </tr>
            </thead>
            <tbody>
              {dataset?.variants.map((v) => {
                const r = rows[v.input];
                const computed = r?.computed;
                const exact = computed ? isExactMatch(v.expected, computed) : false;
                const conc = computed ? isConcordant(v.expected, computed) : false;
                return (
                  <tr key={v.input} className="border-b border-outline-variant last:border-0">
                    <td className="px-4 py-2">
                      <span className="mono text-[13px] text-on-surface">{v.input}</span>
                      <div className="text-[11px] text-outline">{v.note}</div>
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant">{v.gene}</td>
                    <td className="px-4 py-2">
                      <span style={{ color: classColorVar(normalizeExpected(v.expected)) }}>{v.expected}</span>
                    </td>
                    <td className="px-4 py-2">
                      {computed ? (
                        <span style={{ color: classColorVar(computed) }}>{computed}</span>
                      ) : r?.status === "error" ? (
                        <span className="text-risk-high">error</span>
                      ) : r?.status === "running" ? (
                        <span className="animate-norn-pulse text-secondary">running</span>
                      ) : (
                        <span className="text-outline">n/a</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {r?.heuristic ? (
                        <span style={{ color: classColorVar(r.heuristic) }}>{r.heuristic}</span>
                      ) : (
                        <span className="text-outline">n/a</span>
                      )}
                    </td>
                    <td className="mono px-4 py-2 text-on-surface-variant">{r?.points != null ? (r.points > 0 ? `+${r.points}` : r.points) : "n/a"}</td>
                    <td className="px-4 py-2">
                      {computed ? (
                        exact ? (
                          <span className="font-medium text-pathogenic">exact</span>
                        ) : conc ? (
                          <span className="font-medium text-vus">direction</span>
                        ) : (
                          <span className="font-medium text-risk-high">miss</span>
                        )
                      ) : (
                        <span className="text-outline">n/a</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <p className="mt-4 text-[12px] leading-relaxed text-outline">
          Norn implements ten automated criteria and applies PM2 at supporting strength, so it is deliberately
          conservative: many true-pathogenic variants land at Likely Pathogenic, not Pathogenic. Exact agreement
          runs lower than directional concordance, the more meaningful measure for triage. Disagreements are shown,
          not hidden.
        </p>
      </div>
    </AppShell>
    </PrefsProvider>
  );
}
