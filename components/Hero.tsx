"use client";

import { useState } from "react";
import { Icon, NornMark } from "./ui";

export interface Example {
  input: string;
  tag: string;
  color: string;
  consequence: string;
}

const FATES = [
  {
    icon: "travel_explore",
    norse: "Urðr",
    title: "Gather",
    body: "Live consequence and frequency from Ensembl VEP and gnomAD v4, with neighbor evidence from ClinVar.",
  },
  {
    icon: "balance",
    norse: "Verðandi",
    title: "Weigh",
    body: "Claude adjudicates each ACMG criterion against code-computed signals, one line of reasoning each.",
  },
  {
    icon: "gavel",
    norse: "Skuld",
    title: "Decree",
    body: "The ClinGen points framework combines the verdicts in code. The engine owns the label.",
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
        <div className="eyebrow mb-5 justify-center">
          <NornMark size={15} className="text-secondary" />
          ACMG copilot
        </div>
        <h1 className="display mb-3 text-4xl font-semibold leading-tight tracking-tight text-on-surface md:text-5xl">
          Read a variant
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Enter one variant to gather evidence across public genomics databases and draft a preliminary ACMG
          classification for a curator to confirm.
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
            className="mono w-full rounded-lg border border-outline-variant bg-surface py-4 pl-12 pr-36 text-sm text-on-surface shadow-card outline-none transition-shadow placeholder:text-outline hover:shadow-lift focus:border-secondary"
          />
          <div className="absolute inset-y-2 right-2 flex items-center">
            <button
              type="submit"
              disabled={running || !value.trim()}
              className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              {running ? "Reading" : "Interpret"}
              <Icon name="arrow_forward" size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Example variants */}
      <div className="mb-16 w-full max-w-4xl">
        <h3 className="mb-3 flex items-center gap-2 label-caps">
          <Icon name="bolt" size={16} />
          Example variants
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
              className="group relative flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface p-4 text-left transition-all hover:border-secondary hover:shadow-lift disabled:opacity-60"
            >
              <div
                className="absolute inset-y-0 left-0 w-1 transition-all group-hover:w-1.5"
                style={{ background: ex.color }}
              />
              <div className="mb-2 flex w-full items-start justify-between">
                <span
                  className="inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-caps"
                  style={{ background: `color-mix(in srgb, ${ex.color} 14%, var(--surface-bright))`, color: ex.color }}
                >
                  {ex.tag}
                </span>
                <Icon
                  name="arrow_outward"
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

      {/* The three fates */}
      <div className="w-full max-w-4xl rounded-xl border border-outline-variant bg-surface-low p-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {FATES.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface text-secondary">
                <Icon name={f.icon} size={20} />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-[15px] font-semibold text-on-surface">{f.title}</h4>
                  <span className="display text-xs italic text-outline">{f.norse}</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
