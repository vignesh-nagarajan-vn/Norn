"use client";

import { useEffect } from "react";
import AppShell from "@/components/AppShell";
import Dashboard from "@/components/Dashboard";
import Hero, { type Example } from "@/components/Hero";
import PipelineView from "@/components/PipelineView";
import { PrefsProvider } from "@/components/Prefs";
import { Icon } from "@/components/ui";
import { useInterpret } from "@/components/useInterpret";

// The three chips are a scripted demo path: one clear pathogenic, one clear
// benign, and one VUS that a curator flips with toggles. Each note points at the
// differentiator it shows off.
const EXAMPLES: Example[] = [
  {
    input: "BRCA1:c.5266dupC",
    tag: "Pathogenic",
    color: "var(--pathogenic)",
    consequence: "Frameshift variant",
    note: "PVS1 null allele: the engine adds +8 in code, the model only justifies.",
  },
  {
    input: "CFTR:c.1408A>G",
    tag: "Benign",
    color: "var(--benign)",
    consequence: "Common missense (BA1)",
    note: "62% in gnomAD trips BA1, a stand-alone override straight to Benign.",
  },
  {
    input: "BRCA1:c.5096G>A",
    tag: "VUS",
    color: "var(--vus)",
    consequence: "Reduced-penetrance missense",
    note: "AlphaMissense drives PP3; sits at +3 (VUS). Toggle curator evidence to flip it live.",
  },
];

export default function InterpretPage() {
  const { status, stages, report, error, run, reset } = useInterpret();

  // Auto-run a variant passed as ?v= (used by the landing search and Recent links).
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    if (v) run(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PrefsProvider>
      <AppShell active="interpret" onSearch={run} onNew={reset}>
        {report ? (
          <Dashboard report={report} onNew={reset} />
        ) : (
          <>
            <Hero onSubmit={run} running={status === "running"} examples={EXAMPLES} />
            {(status === "running" || error) && (
              <div className="mx-auto max-w-5xl px-6 pb-16">
                {status === "running" && <PipelineView stages={stages} />}
                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--risk-high)", color: "var(--risk-high)", background: "color-mix(in srgb, var(--risk-high) 6%, var(--surface-bright))" }}>
                    <Icon name="error" size={18} className="mt-0.5" />
                    {error}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </AppShell>
    </PrefsProvider>
  );
}
