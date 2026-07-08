"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, NornMark, StatusBadge } from "./ui";

/*
  A self-contained, auto-playing tour of one interpretation. No network: the
  data below is canned so the demo is deterministic and works offline. It walks
  the three fates (gather, weigh, decree) in about 25 seconds and can be
  replayed or skipped. Used on the landing page (button + first visit) and
  recorded to public/norn-demo.webm for the embedded video.
*/

const VARIANT = "BRCA1:c.5266dupC";

const STAGES = ["recode", "VEP", "gnomAD", "ClinVar", "adjudicate", "review"];
const LIT_BY_PHASE = [0, 4, 5, 6, 6]; // beads lit at each phase

const GATHER = [
  { icon: "biotech", label: "Ensembl VEP", fact: "Frameshift variant on BRCA1 (NM_007294)" },
  { icon: "public", label: "gnomAD v4", fact: "Absent from 730k+ genomes, supports PM2" },
  { icon: "shield", label: "gnomAD constraint", fact: "BRCA1 is loss-of-function intolerant (pLI 1.0)" },
  { icon: "history_edu", label: "ClinVar neighbors", fact: "Pathogenic variants cluster nearby" },
];

const CRITERIA = [
  { code: "PVS1", strength: "Very Strong", met: true, pts: "+8", ev: "Frameshift, predicted loss of function." },
  { code: "PM2", strength: "Supporting", met: true, pts: "+1", ev: "Absent from gnomAD v4." },
  { code: "PS1", strength: "Strong", met: false, pts: "0", ev: "No same-amino-acid pathogenic neighbor." },
  { code: "PP3", strength: "Supporting", met: false, pts: "0", ev: "Not a missense variant." },
];

const FATE = [
  { norse: "", gloss: "", title: "A 30-second read", body: "Watch Norn interpret one variant, " + VARIANT + ", end to end." },
  { norse: "Urðr", gloss: "what was", title: "Gather", body: "Norn pulls consequence, frequency, and neighbor evidence from Ensembl VEP, gnomAD v4, and ClinVar." },
  { norse: "Verðandi", gloss: "what is", title: "Weigh", body: "Claude adjudicates each ACMG criterion against code-computed signals, with one line of reasoning each." },
  { norse: "Skuld", gloss: "what shall be", title: "Decree", body: "The ClinGen points framework combines the verdicts in code. The engine owns the label, not the model." },
  { norse: "", gloss: "", title: "That's the thread", body: "The evidence drafts to Likely Pathogenic. A curator confirms it; Norn never decides alone." },
];

const DURATIONS = [2600, 8200, 8200, 6500]; // phases 0..3; phase 4 (outro) holds

function Beads({ lit }: { lit: number }) {
  return (
    <div className="flex items-center">
      {STAGES.map((s, i) => {
        const on = i < lit;
        return (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 transition-colors duration-500"
                style={{ borderColor: on ? "var(--secondary)" : "var(--outline-variant)", background: on ? "color-mix(in srgb, var(--secondary) 18%, var(--surface-bright))" : "var(--surface)" }}
              >
                {on && <span className="h-1.5 w-1.5 rounded-full bg-secondary" />}
              </span>
              <span className="mono text-[10px]" style={{ color: on ? "var(--on-surface-variant)" : "var(--outline)" }}>{s}</span>
            </div>
            {i < STAGES.length - 1 && (
              <span className="mx-1 h-0.5 flex-1 transition-colors duration-500" style={{ background: i < lit - 1 ? "var(--secondary)" : "var(--outline-variant)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DemoMeter() {
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setFill(80.8), 80);
    return () => clearTimeout(id);
  }, []);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="label-caps">ACMG point aggregation</span>
        <span className="mono text-2xl font-semibold text-lpath">+9 pts</span>
      </div>
      <div className="relative h-5 overflow-hidden rounded border border-outline-variant bg-surface-high">
        <div className="absolute inset-y-0 left-0 transition-[width] duration-[1400ms] ease-out" style={{ width: `${fill}%`, background: "color-mix(in srgb, var(--lpath) 78%, var(--surface-bright))" }} />
        <div className="absolute inset-y-0 w-[3px] rounded-sm transition-[left] duration-[1400ms] ease-out" style={{ left: `${fill}%`, background: "var(--lpath)" }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-outline">
        <span>Benign</span><span>Likely benign</span><span>VUS</span><span className="font-bold text-lpath">Likely path.</span><span>Pathogenic</span>
      </div>
    </div>
  );
}

function Stage({ phase }: { phase: number }) {
  return (
    <div className="card min-h-[260px] p-5 shadow-thread">
      <div className="mb-4 flex items-center justify-between">
        <span className="mono text-sm font-bold text-on-surface">{VARIANT}</span>
        {phase >= 3 ? <StatusBadge classification="Likely Pathogenic" /> : <span className="label-caps">BRCA1 · GRCh38</span>}
      </div>

      <Beads lit={LIT_BY_PHASE[phase]} />

      <div className="mt-5">
        {phase === 0 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <NornMark size={40} className="thread-draw text-secondary" strokeWidth={2.2} />
            <div className="mono text-lg text-on-surface">
              {VARIANT}
              <span className="animate-norn-pulse">|</span>
            </div>
            <p className="text-sm text-on-surface-variant">Reading one variant, end to end.</p>
          </div>
        )}

        {phase === 1 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {GATHER.map((g, i) => (
              <div key={g.label} className="fate-rise flex items-start gap-2 rounded-md border border-outline-variant bg-surface-bright p-2.5" style={{ animationDelay: `${i * 0.5}s` }}>
                <Icon name={g.icon} size={18} className="mt-0.5 text-secondary" />
                <div>
                  <div className="label-caps">{g.label}</div>
                  <div className="text-[13px] text-on-surface">{g.fact}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {phase === 2 && (
          <div className="overflow-hidden rounded-md border border-outline-variant">
            {CRITERIA.map((c, i) => (
              <div key={c.code} className="fate-rise relative flex border-b border-outline-variant/60 bg-surface-bright pl-3 last:border-0" style={{ animationDelay: `${i * 0.6}s` }}>
                <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: c.met ? "var(--acmg-vs)" : "var(--outline-variant)" }} />
                <div className="flex flex-1 items-center justify-between gap-3 p-2.5">
                  <div className="w-24 shrink-0">
                    <div className="mono text-sm font-bold text-on-surface">{c.code}</div>
                    <div className="label-caps">{c.strength}</div>
                  </div>
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold" style={c.met ? { background: "color-mix(in srgb, var(--pathogenic) 14%, var(--surface-bright))", color: "var(--pathogenic)" } : { background: "var(--surface-variant)", color: "var(--on-surface-variant)" }}>{c.met ? "MET" : "NOT MET"}</span>
                  <p className="flex-1 text-[12px] text-on-surface-variant">{c.ev}</p>
                  <span className="mono text-sm font-bold" style={{ color: c.met ? "var(--pathogenic)" : "var(--outline)" }}>{c.pts}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {phase >= 3 && (
          <div className="space-y-4">
            <DemoMeter />
            {phase === 4 && (
              <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant pt-4">
                <Link href="/interpret" className="btn-primary">
                  Open the Dashboard <Icon name="arrow_forward" size={18} />
                </Link>
                <span className="text-[13px] text-on-surface-variant">Run your own variant.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GuidedDemo({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!playing || phase >= 4) return;
    const id = setTimeout(() => setPhase((p) => Math.min(4, p + 1)), DURATIONS[phase]);
    return () => clearTimeout(id);
  }, [phase, playing, runKey]);

  const replay = () => {
    setPhase(0);
    setPlaying(true);
    setRunKey((k) => k + 1);
  };
  const jump = (p: number) => {
    setPhase(p);
    setPlaying(true);
    setRunKey((k) => k + 1);
  };

  const fate = FATE[phase];
  const steps = [
    { p: 1, label: "Gather", norse: "Urðr" },
    { p: 2, label: "Weigh", norse: "Verðandi" },
    { p: 3, label: "Decree", norse: "Skuld" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background/98 backdrop-blur" role="dialog" aria-modal="true" aria-label="Norn guided tour">
      {/* header */}
      <div className="flex items-center justify-between border-b border-outline-variant px-6 py-3">
        <div className="flex items-center gap-2.5">
          <NornMark size={22} className="text-secondary" />
          <span className="display text-lg font-semibold">Norn guided tour</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={replay} className="inline-flex items-center gap-1 text-sm font-medium text-on-surface-variant hover:text-on-surface">
            <Icon name="replay" size={16} /> Replay
          </button>
          <button onClick={onClose} className="inline-flex items-center gap-1 rounded-md border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-high">
            Skip <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      {/* per-phase progress */}
      <div className="h-0.5 w-full bg-outline-variant/50">
        {phase < 4 && (
          <div key={`${phase}-${runKey}`} className="h-full bg-secondary" style={{ animation: `demo-progress ${DURATIONS[phase]}ms linear forwards` }} />
        )}
        {phase === 4 && <div className="h-full w-full bg-secondary" />}
      </div>

      {/* body */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        <div className="grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <Stage phase={phase} />

          <div>
            <div className="eyebrow mb-3">
              <NornMark size={14} className="text-secondary" strokeWidth={2.4} />
              {phase === 0 ? "The thread" : phase === 4 ? "Decreed" : `Step ${phase} of 3`}
            </div>
            {fate.norse ? (
              <div className="mb-1 flex items-baseline gap-2">
                <span className="display text-3xl font-semibold">{fate.norse}</span>
                <span className="text-sm italic text-outline">{fate.gloss}</span>
              </div>
            ) : null}
            <h2 className="display text-2xl font-semibold tracking-tight">{fate.title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-on-surface-variant">{fate.body}</p>

            {/* step dots */}
            <div className="mt-8 flex items-center gap-2">
              {steps.map((s) => {
                const active = phase === s.p;
                const done = phase > s.p;
                return (
                  <button
                    key={s.p}
                    onClick={() => jump(s.p)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-secondary bg-secondary/10 text-secondary"
                        : done
                          ? "border-outline-variant text-on-surface-variant"
                          : "border-outline-variant text-outline hover:text-on-surface-variant"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: active || done ? "var(--secondary)" : "var(--outline-variant)" }} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-outline-variant px-6 py-2.5 text-center text-[11px] text-outline">
        A canned walkthrough. <span className="font-semibold text-error">Not for clinical use.</span> Norn drafts evidence for a human to confirm.
      </div>
    </div>
  );
}
