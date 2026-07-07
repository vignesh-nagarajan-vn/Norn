"use client";

import ClassificationHeader from "@/components/ClassificationHeader";
import CuratorPanel from "@/components/CuratorPanel";
import EvidenceSummary from "@/components/EvidenceSummary";
import LollipopPlot from "@/components/LollipopPlot";
import PipelineView from "@/components/PipelineView";
import ScorecardTable from "@/components/ScorecardTable";
import SiteHeader from "@/components/SiteHeader";
import VariantInput, { type Example } from "@/components/VariantInput";
import { useInterpret } from "@/components/useInterpret";

const EXAMPLES: Example[] = [
  { input: "BRCA1:c.5266dupC", label: "BRCA1 frameshift", expect: "Pathogenic", color: "var(--path)" },
  { input: "BRCA1:c.5096G>A", label: "BRCA1 p.Arg1699Gln", expect: "VUS", color: "var(--vus)" },
  { input: "CFTR:c.1408A>G", label: "CFTR p.Met470Val", expect: "Benign", color: "var(--ben)" },
];

export default function Home() {
  const { status, stages, report, error, run } = useInterpret();

  const variantLabel = report
    ? [
        report.evidence.consequence.geneSymbol,
        report.evidence.consequence.hgvsp ?? report.evidence.consequence.hgvsc ?? report.input,
      ]
        .filter(Boolean)
        .join("  ")
    : "";

  return (
    <div className="min-h-screen">
      <SiteHeader active="home" />

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="pt-10">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink">
            Draft the ACMG evidence, then let a curator confirm it.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            Norn is a variant-interpretation copilot for a clinical molecular geneticist or genetic counselor.
            It pulls evidence from Ensembl VEP, gnomAD, and ClinVar, adjudicates eight ACMG/AMP criteria with
            Claude, applies the ClinGen points framework in code, and runs a second Claude pass that critiques
            the draft. Every verdict shows its evidence and source.
          </p>

          <div className="mt-6 max-w-3xl">
            <VariantInput onSubmit={run} running={status === "running"} examples={EXAMPLES} />
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-muted">
            <span className="mt-0.5 font-semibold text-lpath">Not for clinical use.</span>
            <span>
              Norn is a research and demonstration tool. It drafts evidence for a human to confirm and is not a
              diagnostic device. Do not use it to make patient-care decisions.
            </span>
          </div>
        </section>

        {(status === "running" || status === "done" || report) && (
          <section className="mt-8">
            <PipelineView stages={stages} />
          </section>
        )}

        {error && (
          <div className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--path)", color: "var(--path)", background: "color-mix(in srgb, var(--path) 6%, white)" }}>
            {error}
          </div>
        )}

        {report && (
          <section className="mt-6 space-y-6">
            <ClassificationHeader
              result={report.result}
              model={report.model}
              variantLabel={variantLabel || report.input}
            />

            <LollipopPlot
              gene={report.evidence.consequence.geneSymbol ?? report.input}
              variants={report.evidence.clinvar.geneVariants}
              queryPosition={report.evidence.consequence.proteinPosition ?? null}
              queryLabel={
                report.evidence.consequence.aminoAcids && report.evidence.consequence.proteinPosition
                  ? `${report.evidence.consequence.refAa ?? ""}${report.evidence.consequence.proteinPosition}${report.evidence.consequence.altAa ?? ""}`
                  : "query"
              }
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ScorecardTable criteria={report.result.criteria} />
              </div>
              <div className="space-y-6">
                <EvidenceSummary evidence={report.evidence} />
                <CuratorPanel review={report.review} criteria={report.result.criteria} />
              </div>
            </div>

            {report.warnings.length > 0 && (
              <details className="card px-5 py-3 text-sm text-muted">
                <summary className="cursor-pointer text-[13px] font-medium text-ink">
                  Run notes ({report.warnings.length})
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px]">
                  {report.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-faint">
                  Completed in {(report.elapsedMs / 1000).toFixed(1)}s. Model: {report.model.name}.
                </p>
              </details>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
