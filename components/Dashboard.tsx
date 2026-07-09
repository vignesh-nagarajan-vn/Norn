"use client";

import { useMemo, useState } from "react";
import { classify, MANUAL_CRITERIA } from "@/lib/acmg";
import { exportReportPdf } from "@/lib/pdf";
import { submissionCsv } from "@/lib/submission";
import type { ClassificationResult, CriterionResult, NornReport, Verdict } from "@/lib/types";
import AskPanel from "./AskPanel";
import CuratorEvidence from "./CuratorEvidence";
import LiteraturePanel from "./LiteraturePanel";
import LollipopPlot from "./LollipopPlot";
import Structure3D from "./Structure3D";
import { usePrefs } from "./Prefs";
import {
  acmgStrengthColor,
  ClaudeChip,
  Icon,
  NornMark,
  StatusBadge,
  VerdictChip,
  classColorVar,
} from "./ui";

function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtAf(af: number | null | undefined): string {
  if (af == null) return "n/a";
  if (af === 0) return "0 (absent)";
  if (af < 0.001) return af.toExponential(2);
  return `${(af * 100).toFixed(4)}%`;
}

// Points meter domain, matching lib/acmg band midpoints.
const DMIN = -12;
const DMAX = 14;
const BANDS = [
  { label: "Benign", range: "-7 or less", from: -12, to: -6.5, color: "var(--ben)" },
  { label: "Likely Benign", range: "-6 to -1", from: -6.5, to: -0.5, color: "var(--lben)" },
  { label: "VUS", range: "0 to 5", from: -0.5, to: 5.5, color: "var(--vus)" },
  { label: "Likely Path.", range: "6 to 9", from: 5.5, to: 9.5, color: "var(--lpath)" },
  { label: "Pathogenic", range: "10+", from: 9.5, to: 14, color: "var(--path)" },
];

function activeBandIndex(points: number): number {
  if (points >= 9.5) return 4;
  if (points >= 5.5) return 3;
  if (points >= -0.5) return 2;
  if (points >= -6.5) return 1;
  return 0;
}

function PointAggregation({ result }: { result: ClassificationResult }) {
  const { points, classification } = result;
  const color = classColorVar(classification);
  const fillPct = ((Math.max(DMIN, Math.min(DMAX, points)) - DMIN) / (DMAX - DMIN)) * 100;
  const active = activeBandIndex(points);

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-on-surface">
          <NornMark size={16} className="text-secondary" strokeWidth={2.4} /> ACMG point aggregation
        </h2>
        <span className="mono text-2xl font-semibold" style={{ color }}>
          {points > 0 ? `+${points}` : points} pts
        </span>
      </div>

      <div className="relative flex h-6 overflow-hidden rounded border border-outline-variant bg-surface-high">
        <div
          className="absolute left-0 top-0 h-full transition-all duration-500"
          style={{ width: `${fillPct}%`, background: `color-mix(in srgb, ${color} 78%, var(--surface-bright))` }}
        />
        {[0.25, 0.5, 0.75].map((f) => (
          <div
            key={f}
            className="absolute top-0 z-10 h-full border-l border-surface/60"
            style={{ left: `${f * 100}%` }}
          />
        ))}
        {/* Position marker, always visible even when the fill is near zero. */}
        <div
          className="absolute top-0 z-20 h-full w-[3px] rounded-sm transition-all duration-500"
          style={{ left: `calc(${Math.min(99.5, Math.max(0.5, fillPct))}% - 1.5px)`, background: color }}
        />
      </div>

      <div className="mt-2 flex justify-between">
        {BANDS.map((b, i) => (
          <div key={b.label} className="flex-1 text-center">
            <div
              className="text-[11px] font-bold uppercase tracking-caps"
              style={{ color: i === active ? b.color : "var(--on-surface-variant)" }}
            >
              {b.label}
            </div>
            <div className="text-[10px] text-outline">{b.range}</div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-on-surface-variant">{result.confidenceRationale}</p>
      {result.ba1Override && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold" style={{ background: "color-mix(in srgb, var(--benign) 14%, var(--surface-bright))", color: "var(--benign)" }}>
          <Icon name="verified" size={14} /> BA1 stand-alone benign override applied
        </div>
      )}
    </section>
  );
}

function CriterionRow({ c, live }: { c: CriterionResult; live: boolean }) {
  const { showReasoning } = usePrefs();
  const met = c.verdict === "met";
  const barColor = met
    ? c.direction === "pathogenic"
      ? acmgStrengthColor(c.strength)
      : "var(--benign)"
    : "var(--outline-variant)";
  const codeColor = met
    ? c.direction === "pathogenic"
      ? acmgStrengthColor(c.strength)
      : "var(--benign)"
    : "var(--outline)";
  const ptsColor = met
    ? c.direction === "pathogenic"
      ? "var(--pathogenic)"
      : "var(--benign)"
    : "var(--outline)";

  return (
    <div
      className={`relative flex ${met ? "bg-surface-bright" : "bg-surface"} ${c.verdict === "not_met" ? "opacity-70 transition-opacity hover:opacity-100" : ""}`}
    >
      <div className="absolute bottom-0 left-0 top-0 w-1.5 shrink-0" style={{ background: barColor }} />
      <div className="grid flex-1 grid-cols-[86px_1fr_72px] items-start gap-3 p-4 pl-6 sm:grid-cols-[100px_1fr_80px] sm:gap-4">
        <div>
          <div className="mono text-[15px] font-bold" style={{ color: codeColor }}>
            {c.code}
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-caps" style={{ color: codeColor }}>
            {c.strength}
          </div>
          {c.provisional && <div className="mt-1 text-[10px] font-medium text-vus">provisional</div>}
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <VerdictChip verdict={c.verdict} direction={c.direction} />
            {live && met && <ClaudeChip label="Claude" />}
            {c.signalDisagreement && (
              <span className="text-[10px] font-medium text-vus" title="Model verdict differs from the computed signal">
                signal mismatch
              </span>
            )}
          </div>
          <p className="text-sm text-on-surface-variant">{c.evidence}</p>
          {showReasoning && c.reasoning && c.reasoning !== "No reasoning provided." && (
            <p className="mt-0.5 text-[13px] italic text-outline">{c.reasoning}</p>
          )}
          <p className="mono mt-1 text-xs text-outline">
            Source: {c.source}
            {c.sourceUrl && (
              <>
                {" "}
                <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="link">
                  view
                </a>
              </>
            )}
          </p>
        </div>
        <div className="mono text-right text-[15px] font-bold" style={{ color: ptsColor }}>
          {met ? `${c.appliedPoints > 0 ? "+" : ""}${c.appliedPoints} pts` : "0 pts"}
        </div>
      </div>
    </div>
  );
}

function CriteriaList({ report }: { report: NornReport }) {
  const met = report.result.criteria.filter((c) => c.verdict === "met").length;
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-6 py-3">
        <h2 className="text-[15px] font-semibold text-on-surface">Criteria Adjudication</h2>
        <span className="label-caps">{met} met / {report.result.criteria.length} evaluated</span>
      </div>
      <div className="divide-y divide-outline-variant/60">
        {report.result.criteria.map((c) => (
          <CriterionRow key={c.code} c={c} live={report.model.live} />
        ))}
      </div>
    </section>
  );
}

function KeyVal({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex justify-between border-b border-outline-variant/50 pb-1">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-semibold" style={accent ? { color: accent } : { color: "var(--on-surface)" }}>
        {value ?? "n/a"}
      </span>
    </div>
  );
}

function GenomicCards({ report }: { report: NornReport }) {
  const { consequence: c, frequency: f, normalized: n, sourceStatus, constraint, thresholds } = report.evidence;
  return (
    <section id="evidence" className="scroll-mt-20 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2 text-on-surface">
            <Icon name="public" className="text-outline" size={20} />
            <h3 className="text-[15px] font-semibold">Population Frequency</h3>
          </div>
          <div className="mono space-y-2 text-xs">
            <KeyVal label="gnomAD v4 (representative)" value={fmtAf(f.representativeAf)} />
            <KeyVal label="Genome AF" value={fmtAf(f.genomeAf)} />
            <KeyVal label="Exome AF" value={fmtAf(f.exomeAf)} />
            <KeyVal
              label="Popmax"
              value={f.popmaxAf != null ? `${fmtAf(f.popmaxAf)}${f.popmaxPopulation ? ` (${f.popmaxPopulation})` : ""}` : "n/a"}
            />
            <KeyVal label="Allele count / number" value={f.ac != null ? `${f.ac} / ${f.an ?? "?"}` : "n/a"} />
            <KeyVal label="Thresholds" value={thresholds.source} />
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2 text-on-surface">
            <Icon name="dns" className="text-outline" size={20} />
            <h3 className="text-[15px] font-semibold">Molecular Consequence</h3>
          </div>
          <div className="mono space-y-2 text-xs">
            <KeyVal label="Type" value={c.mostSevereConsequence} accent="var(--acmg-vs)" />
            <KeyVal label="Protein change" value={c.hgvsp} />
            <KeyVal label="Transcript" value={c.transcriptId} />
            <KeyVal label="SIFT / PolyPhen" value={`${c.siftPrediction ?? "n/a"} / ${c.polyphenPrediction ?? "n/a"}`} />
            <KeyVal
              label="Constraint pLI / LOEUF"
              value={
                constraint.available
                  ? `${constraint.pli?.toFixed(2) ?? "n/a"} / ${constraint.loeuf?.toFixed(2) ?? "n/a"}${constraint.lofIntolerant ? " (LOF-intol.)" : ""}`
                  : "n/a"
              }
            />
            <KeyVal label="rsID" value={n.rsid} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(["recode", "vep", "gnomad", "clinvar"] as const).map((s) => {
          const state = sourceStatus[s] ?? "unavailable";
          const color = state === "ok" ? "var(--pathogenic)" : state === "empty" ? "var(--vus)" : "var(--risk-high)";
          return (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-2 py-0.5 text-[11px] text-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              {s}: {state === "ok" ? "ok" : state === "empty" ? "no data" : "unavailable"}
            </span>
          );
        })}
      </div>
      <p className="text-[11px] leading-relaxed text-outline">
        ClinVar is used only for neighboring-residue evidence (PS1, PM5). This variant&apos;s own ClinVar
        classification is never fed into adjudication.
        {report.evidence.fixtureUsed && " One or more sources used Norn demo fixture data because the live API was unavailable."}
      </p>
    </section>
  );
}

function CopilotSummary({ report }: { report: NornReport }) {
  const risk = report.review.overcallRisk;
  const riskColor = risk === "high" ? "var(--risk-high)" : risk === "moderate" ? "var(--vus)" : "var(--pathogenic)";
  return (
    <section className="relative overflow-hidden rounded-lg border border-outline-variant bg-surface-low p-5">
      <NornMark size={54} className="absolute right-3 top-3 text-secondary opacity-[0.12]" strokeWidth={2.4} />
      <div className="relative z-10 mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <NornMark size={18} className="shrink-0 text-secondary" strokeWidth={2.4} />
          <h3 className="whitespace-nowrap text-[15px] font-semibold text-on-surface">Reviewer critique</h3>
        </div>
        <span
          className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: `color-mix(in srgb, ${riskColor} 14%, var(--surface-bright))`, color: riskColor }}
        >
          {risk} risk
        </span>
      </div>
      <div className="relative z-10 space-y-3 text-sm text-on-surface-variant">
        <p>{report.review.critique}</p>
        {report.review.conflicts.length > 0 && (
          <div className="mt-2 flex items-start gap-2 rounded border border-vus/30 bg-surface-bright p-3 text-vus">
            <Icon name="info" size={18} className="mt-0.5 shrink-0" />
            <ul className="space-y-1 text-[13px]">
              {report.review.conflicts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[11px] text-outline">
          {report.model.live ? `Adjudicated and reviewed by ${report.model.name}.` : "Offline heuristic (set ANTHROPIC_API_KEY for Claude)."}
        </p>
      </div>
    </section>
  );
}

function CuratorChecklist({ report }: { report: NornReport }) {
  const items = report.review.checklist;
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  const doneCount = checked.filter(Boolean).length;

  const questions = report.result.criteria
    .filter((c) => c.verdict === "unknown")
    .map((c) => `${c.code}: ${c.name}`);

  return (
    <section id="checklist" className="card scroll-mt-20 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-on-surface">Curator Checklist</h3>
        <span className="mono text-xs text-on-surface-variant">
          {doneCount}/{items.length}
        </span>
      </div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)))}
              className="mt-1 h-4 w-4 rounded border-outline text-secondary focus:ring-secondary"
            />
            <span className={`text-sm ${checked[i] ? "text-on-surface-variant line-through opacity-70" : "text-on-surface"}`}>
              {item}
            </span>
          </li>
        ))}
      </ul>
      {questions.length > 0 && (
        <div className="mt-4 border-t border-outline-variant pt-3">
          <div className="label-caps mb-2">Open questions from unknown criteria</div>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-on-surface-variant">
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DashboardHeader({ report, result }: { report: NornReport; result: ClassificationResult }) {
  const [signed, setSigned] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { consequence: c, normalized: n } = report.evidence;
  const liveReport: NornReport = { ...report, result };
  const base = `norn-${report.input.replace(/[^a-z0-9]+/gi, "_")}`;
  const subtitle = [
    c.transcriptId,
    "GRCh38",
    n.chrom && n.pos ? `chr${n.chrom}:${n.pos}` : null,
    n.ref && n.alt ? `${n.ref}>${n.alt}` : null,
  ]
    .filter(Boolean)
    .join("  •  ");

  const exportJson = () => download(`${base}.json`, JSON.stringify(liveReport, null, 2), "application/json");
  const exportSubmission = () =>
    download(`${base}-clinvar-submission.csv`, submissionCsv(liveReport), "text/csv;charset=utf-8");

  return (
    <header className="flex flex-col justify-between gap-4 border-b border-outline-variant pb-6 md:flex-row md:items-start">
      <div>
        <div className="eyebrow mb-2">
          <NornMark size={14} className="text-secondary" strokeWidth={2.4} /> Drafted interpretation
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="mono text-[26px] font-bold tracking-tight text-on-surface">{report.input}</h1>
          <StatusBadge classification={result.classification} />
          {signed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-pathogenic/10 px-2.5 py-1 text-xs font-semibold text-pathogenic">
              <Icon name="check_circle" size={14} fill /> Signed off
            </span>
          )}
        </div>
        <div className="mono mt-1 text-sm text-on-surface-variant">{subtitle || report.input}</div>
      </div>
      <div className="flex gap-2">
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="btn-outline">
            <Icon name="download" size={18} /> Export Report
            <Icon name="expand_more" size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-md border border-outline-variant bg-surface shadow-lift">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    void exportReportPdf(liveReport).catch(() => {});
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-high"
                >
                  <Icon name="picture_as_pdf" size={18} className="text-risk-high" /> Report PDF (with graphs)
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    exportJson();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-high"
                >
                  <Icon name="data_object" size={18} className="text-secondary" /> Report JSON
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    exportSubmission();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-high"
                >
                  <Icon name="table_view" size={18} className="text-pathogenic" /> ClinVar submission (CSV)
                </button>
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setSigned((s) => !s)}
          className="btn-primary"
          title="Records that a human curator has reviewed this draft"
        >
          {signed ? "Undo Sign-off" : "Finalize Sign-off"}
        </button>
      </div>
    </header>
  );
}

export default function Dashboard({ report }: { report: NornReport; onNew?: () => void }) {
  const c = report.evidence.consequence;
  const queryLabel =
    c.aminoAcids && c.proteinPosition ? `${c.refAa ?? ""}${c.proteinPosition}${c.altAa ?? ""}` : "query";

  // Curator-supplied criteria toggle state; the classification recomputes live.
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const manualCriteria = useMemo<CriterionResult[]>(
    () =>
      MANUAL_CRITERIA.map((spec) => ({
        ...spec,
        verdict: (applied[spec.code] ? "met" : "not_met") as Verdict,
        evidence: applied[spec.code] ? "Applied by the curator." : "Not applied by the curator.",
        reasoning: "",
        source: "Curator",
        appliedPoints: applied[spec.code] ? spec.points : 0,
        manual: true,
      })),
    [applied],
  );
  const result = useMemo(
    () => classify([...report.result.criteria, ...manualCriteria]),
    [report, manualCriteria],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 pb-16">
      <DashboardHeader report={report} result={result} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <PointAggregation result={result} />
          <CriteriaList report={report} />
          <CuratorEvidence
            applied={applied}
            onToggle={(code) => setApplied((a) => ({ ...a, [code]: !a[code] }))}
          />
          <GenomicCards report={report} />
          <div className="card p-5">
            <LollipopPlot
              gene={report.evidence.consequence.geneSymbol ?? report.input}
              variants={report.evidence.clinvar.geneVariants}
              queryPosition={report.evidence.consequence.proteinPosition ?? null}
              queryLabel={queryLabel}
            />
          </div>
          <Structure3D
            gene={report.evidence.consequence.geneSymbol ?? null}
            proteinPosition={report.evidence.consequence.proteinPosition ?? null}
            queryLabel={queryLabel}
          />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-4">
          <CopilotSummary report={report} />
          <AskPanel report={report} />
          <LiteraturePanel gene={c.geneSymbol ?? null} proteinChange={c.hgvsp ?? null} />
          <CuratorChecklist report={report} />
          {report.warnings.length > 0 && (
            <details className="card px-5 py-3 text-sm text-on-surface-variant">
              <summary className="cursor-pointer text-[13px] font-medium text-on-surface">
                Run notes ({report.warnings.length})
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px]">
                {report.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-outline">
                Completed in {(report.elapsedMs / 1000).toFixed(1)}s. Model: {report.model.name}.
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
