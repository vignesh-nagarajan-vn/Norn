"use client";

import { useState } from "react";
import { Icon } from "./ui";

export interface Example {
  input: string;
  tag: string;
  color: string;
  consequence: string;
}

const FEATURES = [
  {
    icon: "database",
    title: "Live Integration",
    body: "Fetches real-time frequencies from gnomAD and annotations from Ensembl VEP.",
  },
  {
    icon: "history_edu",
    title: "Neighbor Evidence",
    body: "Cross-references ClinVar for pathogenic variants at the same residue (PS1, PM5).",
  },
  {
    icon: "gavel",
    title: "ACMG Guidelines",
    body: "Adjudicates each criterion with Claude, then applies the ClinGen points framework in code.",
  },
];

export default function Hero({
  onSubmit,
  running,
  examples,
}: {
  onSubmit: (variant: string) => void;
  running: boolean;
  examples: Example[];
}) {
  const [value, setValue] = useState("");

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-14 md:py-20">
      <div className="mb-14 w-full max-w-3xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-caps text-secondary">
          <Icon name="science" size={14} />
          ACMG Copilot
        </div>
        <h1 className="mb-3 text-[30px] font-extrabold leading-tight tracking-tight text-primary md:text-4xl">
          Automated Variant Curation
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Accelerate your genomic workflow. Enter a variant to instantly aggregate evidence across
          public databases and draft a preliminary ACMG classification for a curator to confirm.
        </p>

        <form
          className="relative w-full"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(value);
          }}
        >
          <Icon
            name="search"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search variant (e.g. BRCA1:c.5266dupC or rs80357906)"
            spellCheck={false}
            autoComplete="off"
            className="mono w-full rounded-lg border border-outline-variant bg-surface py-4 pl-12 pr-36 text-sm text-on-surface shadow-sm outline-none transition-shadow placeholder:text-outline hover:shadow-md focus:border-secondary focus:ring-1 focus:ring-secondary"
          />
          <div className="absolute inset-y-2 right-2 flex items-center">
            <button
              type="submit"
              disabled={running || !value.trim()}
              className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {running ? "Analyzing" : "Interpret"}
              <Icon name="arrow_forward" size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Example variants */}
      <div className="mb-16 w-full max-w-4xl">
        <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-on-surface-variant">
          <Icon name="bolt" size={18} />
          Example Variants
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {examples.map((ex) => (
            <button
              key={ex.input}
              type="button"
              disabled={running}
              onClick={() => {
                setValue(ex.input);
                onSubmit(ex.input);
              }}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface p-4 text-left transition-all hover:border-secondary hover:shadow-md disabled:opacity-60"
            >
              <div
                className="absolute inset-y-0 left-0 w-1 transition-all group-hover:w-1.5"
                style={{ background: ex.color }}
              />
              <div className="mb-2 flex w-full items-start justify-between">
                <span
                  className="inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-caps"
                  style={{ background: `color-mix(in srgb, ${ex.color} 12%, white)`, color: ex.color }}
                >
                  {ex.tag}
                </span>
                <Icon
                  name="open_in_new"
                  size={16}
                  className="text-outline transition-colors group-hover:text-secondary"
                />
              </div>
              <span className="mono text-sm text-on-surface transition-colors group-hover:text-secondary">
                {ex.input}
              </span>
              <span className="mt-1 text-xs text-on-surface-variant">{ex.consequence}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature strip */}
      <div className="w-full max-w-4xl rounded-xl border border-surface-variant bg-surface-low p-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary">
                <Icon name={f.icon} />
              </div>
              <div>
                <h4 className="mb-1 text-[15px] font-semibold text-primary">{f.title}</h4>
                <p className="text-xs leading-relaxed text-on-surface-variant">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
