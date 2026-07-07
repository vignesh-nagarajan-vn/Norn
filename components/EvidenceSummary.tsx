"use client";

import type { EvidenceBundle } from "@/lib/types";

function StatusChip({ label, state }: { label: string; state: string }) {
  const color = state === "ok" ? "var(--ben)" : state === "empty" ? "var(--lpath)" : "var(--path)";
  const text = state === "ok" ? "ok" : state === "empty" ? "no data" : "unavailable";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}: {text}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-faint">{label}</span>
      <span className="mono text-right text-ink">{value ?? "n/a"}</span>
    </div>
  );
}

function fmtAf(af: number | null | undefined): string {
  if (af == null) return "n/a";
  if (af === 0) return "0 (absent)";
  if (af < 0.001) return af.toExponential(2);
  return `${(af * 100).toFixed(3)}%`;
}

export default function EvidenceSummary({ evidence }: { evidence: EvidenceBundle }) {
  const { consequence: c, frequency: f, normalized: n, sourceStatus } = evidence;
  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink">Evidence</h2>

      <div className="divide-y divide-line">
        <div className="pb-2">
          <Fact label="Gene" value={c.geneSymbol} />
          <Fact label="Transcript" value={c.transcriptId} />
          <Fact label="cDNA" value={c.hgvsc} />
          <Fact label="Protein" value={c.hgvsp} />
          <Fact label="Consequence" value={c.mostSevereConsequence} />
          <Fact label="rsID" value={n.rsid} />
        </div>
        <div className="py-2">
          <Fact label="gnomAD variant" value={f.gnomadVariantId} />
          <Fact label="Representative AF" value={fmtAf(f.representativeAf)} />
          <Fact
            label="Popmax AF"
            value={f.popmaxAf != null ? `${fmtAf(f.popmaxAf)}${f.popmaxPopulation ? ` (${f.popmaxPopulation})` : ""}` : "n/a"}
          />
        </div>
        <div className="py-2">
          <Fact label="SIFT" value={c.siftPrediction ?? "n/a"} />
          <Fact label="PolyPhen" value={c.polyphenPrediction ?? "n/a"} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StatusChip label="recode" state={sourceStatus.recode ?? "unavailable"} />
        <StatusChip label="VEP" state={sourceStatus.vep ?? "unavailable"} />
        <StatusChip label="gnomAD" state={sourceStatus.gnomad ?? "unavailable"} />
        <StatusChip label="ClinVar" state={sourceStatus.clinvar ?? "unavailable"} />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        ClinVar is used only for neighboring-residue evidence (PS1, PM5). This variant&apos;s own ClinVar
        classification is never fed into adjudication.
        {evidence.fixtureUsed && " One or more sources used Norn demo fixture data because the live API was unavailable."}
      </p>
    </div>
  );
}
