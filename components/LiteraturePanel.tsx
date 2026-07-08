"use client";

import { useState } from "react";
import type { LiteratureHit } from "@/lib/types";
import { Icon } from "./ui";

export default function LiteraturePanel({
  gene,
  proteinChange,
}: {
  gene: string | null;
  proteinChange: string | null;
}) {
  const [hits, setHits] = useState<LiteratureHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const find = async () => {
    if (!gene || loading) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/literature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gene, proteinChange }),
      });
      const data = (await res.json()) as { hits?: LiteratureHit[]; error?: string };
      if (data.error && (!data.hits || data.hits.length === 0)) setErr(data.error);
      setHits(data.hits ?? []);
    } catch {
      setErr("Request failed.");
      setHits([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="menu_book" className="text-secondary" />
        <h3 className="text-[15px] font-semibold text-on-surface">Literature</h3>
        {gene && (
          <button
            onClick={find}
            disabled={loading}
            className="ml-auto text-xs font-medium text-secondary hover:underline disabled:opacity-50"
          >
            {loading ? "Searching..." : hits ? "Refresh" : "Find on PubMed"}
          </button>
        )}
      </div>
      {hits === null ? (
        <p className="text-xs text-on-surface-variant">
          Search PubMed for papers on {gene ?? "this gene"}
          {proteinChange ? ` ${proteinChange}` : ""}. Norn does not read these itself; they support curator-supplied
          criteria like PS3 and PP1.
        </p>
      ) : hits.length === 0 ? (
        <p className="text-xs text-on-surface-variant">{err ?? "No papers found for this query."}</p>
      ) : (
        <ul className="space-y-2">
          {hits.map((h) => (
            <li key={h.pmid} className="border-b border-outline-variant/50 pb-2 last:border-0 last:pb-0">
              <a href={h.url} target="_blank" rel="noreferrer" className="text-sm text-secondary hover:underline">
                {h.title}
              </a>
              <div className="text-[11px] text-outline">
                {[h.journal, h.year].filter(Boolean).join(" ")} · PMID {h.pmid}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
