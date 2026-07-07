"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { classColorVar } from "@/components/ui";
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
  error?: string;
}

async function interpretOnce(variant: string): Promise<NornReport> {
  const res = await fetch("/api/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variant }),
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
          },
        }));
      } catch (e) {
        setRows((prev) => ({ ...prev, [v.input]: { status: "error", error: (e as Error).message } }));
      }
    });

    setRunning(false);
  }, [dataset, running]);

  const stats = useMemo(() => {
    if (!dataset) return { done: 0, exact: 0, concordant: 0, total: 0 };
    let done = 0;
    let exact = 0;
    let concordant = 0;
    for (const v of dataset.variants) {
      const r = rows[v.input];
      if (r?.status === "done" && r.computed) {
        done++;
        if (isExactMatch(v.expected, r.computed)) exact++;
        if (isConcordant(v.expected, r.computed)) concordant++;
      }
    }
    return { done, exact, concordant, total: dataset.variants.length };
  }, [dataset, rows]);

  const pctExact = stats.done ? Math.round((stats.exact / stats.done) * 100) : 0;
  const pctConcordant = stats.done ? Math.round((stats.concordant / stats.done) * 100) : 0;

  return (
    <div className="min-h-screen">
      <SiteHeader active="eval" />
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="pt-10">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Evaluation</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">
            Norn runs its full pipeline on {dataset?.variants.length ?? "a set of"} well-established variants and
            compares its computed classification to the expected ClinVar label. Two measures are reported: exact
            five-tier agreement and directional concordance (pathogenic-leaning vs uncertain vs benign-leaning).
          </p>
          <div className="mt-3 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-muted">
            <span className="font-semibold text-ink">Anti-circularity:</span> a variant&apos;s own ClinVar
            classification is never fed into adjudication. ClinVar is used only for neighboring-residue evidence
            (PS1, PM5). The expected label here is the comparison target, not an input to the engine.
          </div>

          <button onClick={runAll} disabled={running || !dataset} className="btn-primary mt-4">
            {running ? `Running... (${stats.done}/${stats.total})` : "Run evaluation"}
          </button>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Variants" value={`${stats.total}`} />
          <StatCard label="Evaluated" value={`${stats.done}`} />
          <StatCard label="Exact agreement" value={stats.done ? `${pctExact}%` : "n/a"} sub={`${stats.exact}/${stats.done}`} />
          <StatCard label="Directional concordance" value={stats.done ? `${pctConcordant}%` : "n/a"} sub={`${stats.concordant}/${stats.done}`} />
        </section>

        <section className="mt-6 card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="px-4 py-2 font-medium">Variant</th>
                <th className="px-4 py-2 font-medium">Gene</th>
                <th className="px-4 py-2 font-medium">Expected</th>
                <th className="px-4 py-2 font-medium">Norn</th>
                <th className="px-4 py-2 font-medium">Points</th>
                <th className="px-4 py-2 font-medium">Match</th>
              </tr>
            </thead>
            <tbody>
              {dataset?.variants.map((v) => {
                const r = rows[v.input];
                const computed = r?.computed;
                const exact = computed ? isExactMatch(v.expected, computed) : false;
                const conc = computed ? isConcordant(v.expected, computed) : false;
                return (
                  <tr key={v.input} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">
                      <span className="mono text-[13px] text-ink">{v.input}</span>
                      <div className="text-[11px] text-faint">{v.note}</div>
                    </td>
                    <td className="px-4 py-2 text-muted">{v.gene}</td>
                    <td className="px-4 py-2">
                      <span style={{ color: classColorVar(normalizeExpected(v.expected)) }}>{v.expected}</span>
                    </td>
                    <td className="px-4 py-2">
                      {computed ? (
                        <span style={{ color: classColorVar(computed) }}>{computed}</span>
                      ) : r?.status === "error" ? (
                        <span className="text-path">error</span>
                      ) : r?.status === "running" ? (
                        <span className="animate-norn-pulse text-brand">running</span>
                      ) : (
                        <span className="text-faint">n/a</span>
                      )}
                    </td>
                    <td className="mono px-4 py-2 text-muted">{r?.points != null ? (r.points > 0 ? `+${r.points}` : r.points) : "n/a"}</td>
                    <td className="px-4 py-2">
                      {computed ? (
                        exact ? (
                          <span className="text-ben">exact</span>
                        ) : conc ? (
                          <span className="text-lpath">direction</span>
                        ) : (
                          <span className="text-path">miss</span>
                        )
                      ) : (
                        <span className="text-faint">n/a</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <p className="mt-4 text-[12px] leading-relaxed text-faint">
          Norn implements eight criteria and applies PM2 at supporting strength, so it is deliberately
          conservative: many true-pathogenic variants land at Likely Pathogenic rather than Pathogenic. Exact
          five-tier agreement is therefore lower than directional concordance, which is the more meaningful
          measure for a triage copilot. Disagreements are shown, not hidden.
        </p>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="label-tiny">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {sub && <div className="text-[11px] text-faint">{sub}</div>}
    </div>
  );
}
