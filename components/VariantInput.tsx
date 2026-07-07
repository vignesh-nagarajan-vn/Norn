"use client";

import { useState } from "react";

export interface Example {
  input: string;
  label: string;
  expect: string;
  color: string;
}

export default function VariantInput({
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
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(value);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste HGVS (BRCA1:c.5266dupC), rsID (rs80357906), or locus (17-43057062-A-AG)"
          className="mono flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand"
          spellCheck={false}
          autoComplete="off"
        />
        <button type="submit" className="btn-primary" disabled={running || !value.trim()}>
          {running ? "Analyzing..." : "Analyze variant"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="label-tiny mr-1">Try</span>
        {examples.map((ex) => (
          <button
            key={ex.input}
            type="button"
            onClick={() => {
              setValue(ex.input);
              onSubmit(ex.input);
            }}
            disabled={running}
            className="chip disabled:opacity-50"
            title={`${ex.label} (expected ${ex.expect})`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: ex.color }} />
            <span className="mono text-[13px]">{ex.input}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
