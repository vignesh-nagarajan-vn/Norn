"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { PrefsProvider } from "@/components/Prefs";
import { classColorVar, Icon } from "@/components/ui";
import type { Classification, NornReport, PipelineEvent } from "@/lib/types";

type RowStatus = "pending" | "running" | "done" | "error";
interface Row {
  variant: string;
  status: RowStatus;
  gene?: string;
  classification?: Classification;
  points?: number;
  confidence?: string;
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
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (idx < items.length) await worker(items[idx++]);
    }),
  );
}

// Extract variants from pasted text or an uploaded file (plain list, CSV, or VCF).
function parseVariants(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cols = line.split(/[\t,]/).map((c) => c.trim());
    // VCF-style data line: CHROM POS ID REF ALT ...
    if (cols.length >= 5 && /^(chr)?[0-9xymt]+$/i.test(cols[0]) && /^\d+$/.test(cols[1])) {
      const chrom = cols[0].replace(/^chr/i, "");
      out.push(`${chrom}-${cols[1]}-${cols[3]}-${cols[4]}`);
    } else {
      out.push(cols[0]);
    }
  }
  return Array.from(new Set(out.filter(Boolean)));
}

function BatchInner() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [sortKey, setSortKey] = useState<"variant" | "gene" | "classification" | "points">("variant");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setText((t) => (t ? t + "\n" : "") + String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const runAll = useCallback(async () => {
    if (running) return;
    const variants = parseVariants(text);
    if (variants.length === 0) return;
    setRunning(true);
    setOrder(variants);
    setRows(Object.fromEntries(variants.map((v) => [v, { variant: v, status: "pending" as RowStatus }])));
    await runPool(variants, 4, async (v) => {
      setRows((p) => ({ ...p, [v]: { ...p[v], status: "running" } }));
      try {
        const rep = await interpretOnce(v);
        setRows((p) => ({
          ...p,
          [v]: {
            variant: v,
            status: "done",
            gene: rep.evidence.consequence.geneSymbol ?? undefined,
            classification: rep.result.classification,
            points: rep.result.points,
            confidence: rep.result.confidence,
          },
        }));
      } catch {
        setRows((p) => ({ ...p, [v]: { ...p[v], status: "error" } }));
      }
    });
    setRunning(false);
  }, [text, running]);

  const done = order.filter((v) => rows[v]?.status === "done").length;

  const sorted = useMemo(() => {
    const list = order.map((v) => rows[v]).filter(Boolean);
    const strVal = (r: Row) =>
      sortKey === "gene" ? r.gene ?? "" : sortKey === "classification" ? r.classification ?? "" : r.variant;
    return [...list].sort((a, b) => {
      if (sortKey === "points") return ((a.points ?? -999) - (b.points ?? -999)) * sortDir;
      return strVal(a).localeCompare(strVal(b)) * sortDir;
    });
  }, [order, rows, sortKey, sortDir]);

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setSortDir(1);
    }
  };

  const exportCsv = () => {
    const header = "variant,gene,classification,points,confidence";
    const lines = order
      .map((v) => rows[v])
      .filter((r) => r?.status === "done")
      .map((r) => `"${r.variant}","${r.gene ?? ""}","${r.classification ?? ""}",${r.points ?? ""},"${r.confidence ?? ""}"`);
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "norn-batch.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-8">
      <h1 className="text-2xl font-bold tracking-tight text-on-surface">Batch interpretation</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-on-surface-variant">
        Paste a list of variants (one per line) or upload a file (plain list, CSV, or VCF). Norn interprets each and
        builds a sortable worklist. Each variant runs through the same pipeline as the single-variant view.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"BRCA1:c.5266dupC\nCFTR:c.1408A>G\nrs80357906\n17-43057062-A-AG"}
            spellCheck={false}
            className="mono h-40 w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm text-on-surface outline-none focus:border-secondary"
          />
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={runAll} disabled={running || !text.trim()} className="btn-primary">
            <Icon name="play_arrow" size={18} />
            {running ? `Running (${done}/${order.length})` : "Interpret all"}
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-outline">
            <Icon name="upload_file" size={18} /> Upload file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,.tsv,.vcf,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <button onClick={exportCsv} disabled={done === 0} className="btn-outline disabled:opacity-50">
            <Icon name="download" size={18} /> Export CSV
          </button>
        </div>
      </div>

      {order.length > 0 && (
        <section className="card mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left text-[11px] uppercase tracking-caps text-outline">
                {(["variant", "gene", "classification", "points"] as const).map((k) => (
                  <th key={k} className="cursor-pointer select-none px-4 py-2 font-bold hover:text-on-surface" onClick={() => toggleSort(k)}>
                    {k} {sortKey === k ? (sortDir === 1 ? "▲" : "▼") : ""}
                  </th>
                ))}
                <th className="px-4 py-2 font-bold">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.variant} className="border-b border-outline-variant last:border-0">
                  <td className="mono px-4 py-2 text-on-surface">
                    <a href={`/?v=${encodeURIComponent(r.variant)}`} className="hover:text-secondary hover:underline">{r.variant}</a>
                  </td>
                  <td className="px-4 py-2 text-on-surface-variant">{r.gene ?? ""}</td>
                  <td className="px-4 py-2">
                    {r.classification ? (
                      <span style={{ color: classColorVar(r.classification) }}>{r.classification}</span>
                    ) : r.status === "error" ? (
                      <span className="text-risk-high">error</span>
                    ) : r.status === "running" ? (
                      <span className="animate-norn-pulse text-secondary">running</span>
                    ) : (
                      <span className="text-outline">pending</span>
                    )}
                  </td>
                  <td className="mono px-4 py-2 text-on-surface-variant">{r.points != null ? (r.points > 0 ? `+${r.points}` : r.points) : ""}</td>
                  <td className="px-4 py-2 text-on-surface-variant">{r.confidence ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default function BatchPage() {
  return (
    <PrefsProvider>
      <AppShell active="batch">
        <BatchInner />
      </AppShell>
    </PrefsProvider>
  );
}
