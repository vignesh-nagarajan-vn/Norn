"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PrefsProvider, ThemeToggle } from "@/components/Prefs";
import { Icon, NornMark, StatusBadge } from "@/components/ui";

/* A full-screen player for the demo video. Opened from the "Watch" buttons and ?demo=1. */
function VideoLightbox({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 sm:p-8"
      style={{ background: "rgba(18, 14, 9, 0.92)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Norn demo video"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/20 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Icon name="close" size={22} />
      </button>
      <div className="w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <video
          className="max-h-[78vh] w-full rounded-lg border border-white/15 bg-black shadow-2xl"
          src="/norn-demo.webm"
          poster="/norn-demo-poster.png"
          autoPlay
          muted
          loop
          controls
          playsInline
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-white/70">A screen recording of one real interpretation, end to end.</span>
          <Link href="/interpret" onClick={onClose} className="btn-primary bg-white text-[#17130e] hover:bg-white/90">
            Open the Dashboard <Icon name="arrow_forward" size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* A woven backdrop: threads drawn left to right, drifting slowly. */
function LoomBackdrop() {
  const threads = [18, 34, 52, 70, 88, 116, 150];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        className="thread-drift absolute -right-20 -top-24 h-[140%] w-[80%] opacity-[0.5]"
        viewBox="0 0 600 600"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {threads.map((y, i) => (
          <path
            key={y}
            className="thread-draw"
            style={{ ["--thread-len" as string]: 1400, animationDelay: `${i * 0.18}s` } as React.CSSProperties}
            d={`M-40 ${y + 40} C 160 ${y}, 300 ${y + 120}, 640 ${y + 20}`}
            stroke="var(--secondary)"
            strokeOpacity={0.16 + i * 0.02}
            strokeWidth={1.1}
          />
        ))}
        {threads.map((y, i) => (
          <path
            key={`b-${y}`}
            className="thread-draw"
            style={{ ["--thread-len" as string]: 1400, animationDelay: `${0.4 + i * 0.18}s` } as React.CSSProperties}
            d={`M-40 ${y + 260} C 200 ${y + 200}, 320 ${y + 340}, 640 ${y + 240}`}
            stroke="var(--acmg-m)"
            strokeOpacity={0.1}
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>
  );
}

function RotatingVerb() {
  const verbs = ["reads", "weighs", "decrees"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % verbs.length), 2200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span className="relative inline-block">
      <span key={i} className="fate-rise inline-block text-secondary">
        {verbs[i]}
      </span>
    </span>
  );
}

const EXAMPLES = [
  { input: "BRCA1:c.5266dupC", tag: "Pathogenic", color: "var(--pathogenic)" },
  { input: "CFTR:c.1408A>G", tag: "Benign", color: "var(--benign)" },
  { input: "BRCA1:c.5096G>A", tag: "VUS", color: "var(--vus)" },
];

const FATES = [
  {
    norse: "Urðr",
    gloss: "what was",
    title: "Gather",
    icon: "travel_explore",
    body: "Norn normalizes the input and pulls molecular consequence, population frequency, and neighboring-residue evidence from Ensembl VEP, gnomAD v4, and ClinVar.",
  },
  {
    norse: "Verðandi",
    gloss: "what is",
    title: "Weigh",
    icon: "balance",
    body: "Claude adjudicates each ACMG/AMP criterion (met, not met, or unknown) against code-computed signals, returning one line of reasoning per criterion.",
  },
  {
    norse: "Skuld",
    gloss: "what shall be",
    title: "Decree",
    icon: "gavel",
    body: "The ClinGen points framework combines the verdicts in code. The engine owns the classification; the model only justifies it.",
  },
];

const STAGES = ["recode", "VEP", "gnomAD", "ClinVar", "adjudicate", "review"];

const FEATURES = [
  { icon: "stream", title: "Live pipeline", body: "Each stage streams over newline-delimited JSON and lights up as it completes." },
  { icon: "fact_check", title: "ACMG scorecard", body: "A row per criterion with strength, verdict, evidence, and source, plus a points meter." },
  { icon: "edit_note", title: "Curator evidence", body: "Toggle the eight evidence-dependent criteria; the classification recomputes live." },
  { icon: "insights", title: "Protein lollipop", body: "The query plotted against ClinVar variants at nearby residues, colored by class." },
  { icon: "forum", title: "Ask the copilot", body: "Question the call. Claude answers using only that report as its knowledge base." },
  { icon: "menu_book", title: "Literature", body: "A PubMed search surfaces functional and case evidence for the gene and change." },
  { icon: "dataset", title: "Batch mode", body: "Paste a list or upload CSV or VCF and interpret many variants into a worklist." },
  { icon: "hub", title: "MCP server", body: "The same pipeline exposed over stdio so other tools can import Norn's output." },
];

const SOURCES = ["Ensembl VEP", "variant_recoder", "gnomAD v4", "ClinVar", "PubMed", "NCBI E-utilities"];

function SampleReport() {
  return (
    <div className="card overflow-hidden shadow-thread">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-3">
        <span className="mono text-sm font-bold text-on-surface">BRCA1:c.5266dupC</span>
        <StatusBadge classification="Likely Pathogenic" />
      </div>
      <div className="space-y-4 p-5">
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="label-caps">ACMG point aggregation</span>
            <span className="mono text-lg font-semibold text-lpath">+9 pts</span>
          </div>
          <div className="relative h-4 overflow-hidden rounded border border-outline-variant bg-surface-high">
            <div className="absolute inset-y-0 left-0 rounded-l" style={{ width: "80%", background: "color-mix(in srgb, var(--lpath) 78%, var(--surface-bright))" }} />
            <div className="absolute inset-y-0 w-[3px] rounded-sm" style={{ left: "80%", background: "var(--lpath)" }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-outline">
            <span>Benign</span><span>Likely benign</span><span>VUS</span><span className="font-bold text-lpath">Likely path.</span><span>Pathogenic</span>
          </div>
        </div>
        <div className="divide-y divide-outline-variant/60 overflow-hidden rounded-md border border-outline-variant">
          {[
            { code: "PVS1", strength: "Very Strong", pts: "+8", ev: "Frameshift in a loss-of-function-intolerant gene." },
            { code: "PM2", strength: "Supporting", pts: "+1", ev: "Absent from gnomAD v4." },
          ].map((r) => (
            <div key={r.code} className="relative flex bg-surface-bright pl-4">
              <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: "var(--acmg-vs)" }} />
              <div className="flex flex-1 items-center justify-between gap-3 p-3">
                <div>
                  <div className="mono text-sm font-bold text-on-surface">{r.code}</div>
                  <div className="label-caps">{r.strength}</div>
                </div>
                <p className="flex-1 text-xs text-on-surface-variant">{r.ev}</p>
                <span className="mono text-sm font-bold text-pathogenic">{r.pts}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-outline">
          A preview. PM2 is applied at supporting strength, so a classic loss-of-function variant lands at Likely
          Pathogenic on automated evidence alone. Open the Dashboard to run a real variant.
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <PrefsProvider>
      <Landing />
    </PrefsProvider>
  );
}

function Landing() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [videoOpen, setVideoOpen] = useState(false);

  // Deep link straight into the demo video with ?demo=1.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") === "1") setVideoOpen(true);
  }, []);

  const go = (variant: string) => {
    const v = variant.trim();
    router.push(v ? `/interpret?v=${encodeURIComponent(v)}` : "/interpret");
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-outline-variant bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Norn home">
            <NornMark size={26} className="text-secondary" />
            <span className="display text-2xl font-semibold tracking-tight">Norn</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-on-surface-variant md:flex">
            <a href="#fates" className="transition-colors hover:text-on-surface">How it works</a>
            <a href="#features" className="transition-colors hover:text-on-surface">Features</a>
            <Link href="/docs" className="transition-colors hover:text-on-surface">Docs</Link>
            <a href="https://github.com/vignesh-nagarajan-vn/Norn" target="_blank" rel="noreferrer" className="transition-colors hover:text-on-surface">GitHub</a>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-error/30 bg-error/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-caps text-error lg:inline-flex">
              <Icon name="warning" size={14} /> Not for clinical use
            </span>
            <ThemeToggle />
            <Link href="/interpret" className="btn-primary">
              Open the Dashboard <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-outline-variant">
        <LoomBackdrop />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="eyebrow fate-rise mb-6">
              <NornMark size={16} className="text-secondary" /> Built with Claude · Life Sciences
            </div>
            <h1 className="display fate-rise text-[42px] font-semibold leading-[1.05] tracking-tight md:text-6xl" style={{ animationDelay: "0.05s" }}>
              Read the evidence.
              <br />
              Draft the verdict.
            </h1>
            <p className="fate-rise mt-6 max-w-2xl text-lg leading-relaxed text-on-surface-variant" style={{ animationDelay: "0.12s" }}>
              Norn is a variant-interpretation copilot. Paste one genetic variant and it gathers evidence from public
              genomics databases, adjudicates each ACMG/AMP criterion with Claude, and computes a transparent
              classification for a curator to confirm.
            </p>
            <p className="fate-rise mt-3 text-[15px] text-on-surface-variant" style={{ animationDelay: "0.16s" }}>
              The Norse fates read evidence and decree destiny. A variant classifier does the same: Norn{" "}
              <RotatingVerb /> the evidence, then a human decides.
            </p>

            <div className="fate-rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.2s" }}>
              <Link href="/interpret" className="btn-primary px-5 py-2.5 text-[15px]">
                Open the Dashboard <Icon name="arrow_forward" size={18} />
              </Link>
              <button type="button" onClick={() => setVideoOpen(true)} className="btn-outline px-5 py-2.5 text-[15px]">
                <Icon name="play_circle" size={18} /> Watch the 30-second demo
              </button>
              <Link href="/docs" className="px-2 py-2.5 text-[15px] font-semibold text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline">
                Read the docs
              </Link>
            </div>

            {/* Functional search that deep-links straight into the Dashboard. */}
            <form
              className="fate-rise mt-8 max-w-2xl"
              style={{ animationDelay: "0.24s" }}
              onSubmit={(e) => {
                e.preventDefault();
                go(q);
              }}
            >
              <div className="label-caps mb-2">Or read a variant now</div>
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="BRCA1:c.5266dupC · rs80357906 · 17-43057062-A-AG"
                  spellCheck={false}
                  autoComplete="off"
                  className="mono w-full rounded-lg border border-outline-variant bg-surface py-3.5 pl-12 pr-32 text-sm shadow-card outline-none transition-shadow placeholder:text-outline hover:shadow-lift focus:border-secondary"
                />
                <button
                  type="submit"
                  className="absolute inset-y-1.5 right-1.5 flex items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
                >
                  Interpret <Icon name="arrow_forward" size={16} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.input}
                    type="button"
                    onClick={() => go(ex.input)}
                    className="group inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs transition-colors hover:border-secondary"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: ex.color }} />
                    <span className="mono text-on-surface-variant group-hover:text-on-surface">{ex.input}</span>
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* The three fates */}
      <section id="fates" className="border-b border-outline-variant bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-3 eyebrow">The three fates</div>
          <h2 className="display max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Gather, weigh, decree.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
            Norn is named for the Norse fates who sit at the well beneath the world tree and weave the threads of
            destiny. Its pipeline follows the same three movements.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {FATES.map((f) => (
              <div key={f.title} className="relative rounded-lg border border-outline-variant bg-surface-bright p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant bg-surface text-secondary">
                  <Icon name={f.icon} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="display text-xl font-semibold">{f.norse}</span>
                  <span className="text-xs italic text-outline">{f.gloss}</span>
                </div>
                <div className="mt-1 label-caps text-secondary">{f.title}</div>
                <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* See it in motion */}
      <section id="demo" className="border-b border-outline-variant">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-3 eyebrow">See it in motion</div>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-center">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                aria-label="Play the demo full screen"
                className="group relative block w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-bright text-left shadow-thread"
              >
                <video
                  className="w-full"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/norn-demo-poster.png"
                  aria-hidden
                >
                  <source src="/norn-demo.webm" type="video/webm" />
                </video>
                <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover:bg-ink/10">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-on-primary opacity-90 shadow-lift transition-transform group-hover:scale-110">
                    <Icon name="play_arrow" size={30} fill />
                  </span>
                </span>
              </button>
              <p className="text-[13px] leading-relaxed text-on-surface-variant">
                This shows the interpretation feature only. Norn also has a{" "}
                <Link href="/batch" className="link">Batch</Link> worklist and an{" "}
                <Link href="/eval" className="link">Evaluation</Link> benchmark.
              </p>
            </div>
            <div>
              <h2 className="display text-3xl font-semibold tracking-tight md:text-4xl">
                Thirty seconds, one variant.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-on-surface-variant">
                Norn gathers the evidence, weighs each ACMG criterion with Claude, and lets the engine decree the
                classification. Play the recording full screen, or open the Dashboard and run your own.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => setVideoOpen(true)} className="btn-primary px-5 py-2.5 text-[15px]">
                  <Icon name="fullscreen" size={18} /> Play full screen
                </button>
                <Link href="/interpret" className="btn-outline px-5 py-2.5 text-[15px]">
                  Open the Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Principle */}
      <section className="border-b border-outline-variant">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
            <div>
              <div className="mb-3 eyebrow">One principle</div>
              <h2 className="display text-3xl font-semibold tracking-tight md:text-4xl">
                The model justifies.
                <br />
                The engine decides.
              </h2>
            </div>
            <p className="text-[15px] leading-relaxed text-on-surface-variant">
              Claude returns a per-criterion verdict with one sentence of reasoning. It never returns the final label.
              The classification is always computed in code from the adjudicated verdicts, so the same evidence always
              yields the same call. A second Claude pass then critiques the draft and writes the curator checklist. If
              no API key is set, Norn falls back to a labeled deterministic heuristic, never presented as model
              reasoning.
            </p>
          </div>

          {/* Pipeline as beads on a thread */}
          <div className="mt-12 rounded-lg border border-outline-variant bg-surface-bright p-6">
            <div className="mb-4 label-caps">The thread, end to end</div>
            <div className="flex items-center">
              {STAGES.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-secondary bg-surface">
                      <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                    </span>
                    <span className="mono text-[11px] text-on-surface-variant">{s}</span>
                  </div>
                  {i < STAGES.length - 1 && <span className="mx-1 h-0.5 flex-1 bg-secondary/40" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sample report + features */}
      <section id="features" className="border-b border-outline-variant bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="mb-3 eyebrow">A drafted interpretation</div>
              <h2 className="display text-3xl font-semibold tracking-tight md:text-4xl">
                Transparent, sourced, and yours to confirm.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-on-surface-variant">
                Every interpretation is interactive, not a static PDF. See each criterion&apos;s evidence and source,
                add the evidence Norn cannot fetch, question the call, and export a draft ClinVar submission when a
                human has signed off.
              </p>
              <div className="mt-6">
                <SampleReport />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-lg border border-outline-variant bg-surface-bright p-5">
                  <Icon name={f.icon} className="text-secondary" />
                  <h3 className="mt-3 text-[15px] font-semibold text-on-surface">{f.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-on-surface-variant">{f.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-3 border-t border-outline-variant pt-8">
            <span className="label-caps mr-2">Evidence from</span>
            {SOURCES.map((s) => (
              <span key={s} className="mono rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs text-on-surface-variant">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-b border-outline-variant">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <NornMark size={40} className="mx-auto text-secondary" />
          <h2 className="display mx-auto mt-6 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Spend your time confirming, not gathering.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-on-surface-variant">
            Norn produces a sourced first pass in about a minute. It drafts; you decide. It is never an autonomous
            diagnostic.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/interpret" className="btn-primary px-5 py-2.5 text-[15px]">
              Open the Dashboard <Icon name="arrow_forward" size={18} />
            </Link>
            <Link href="/eval" className="btn-outline px-5 py-2.5 text-[15px]">
              <Icon name="analytics" size={18} /> See the evaluation
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <NornMark size={22} className="text-secondary" />
            <span className="display text-lg font-semibold">Norn</span>
            <span className="ml-2 text-sm text-on-surface-variant">variant interpretation copilot</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm text-on-surface-variant">
            <Link href="/interpret" className="hover:text-on-surface">Dashboard</Link>
            <Link href="/docs" className="hover:text-on-surface">Docs</Link>
            <a href="https://norn-five.vercel.app" target="_blank" rel="noreferrer" className="hover:text-on-surface">Demo</a>
            <a href="https://github.com/vignesh-nagarajan-vn/Norn" target="_blank" rel="noreferrer" className="hover:text-on-surface">GitHub</a>
          </div>
        </div>
        <div className="border-t border-outline-variant">
          <p className="mx-auto max-w-6xl px-6 py-4 text-[12px] leading-relaxed text-outline">
            <span className="font-semibold text-error">Not for clinical use.</span> Norn is a research and
            demonstration tool. It drafts evidence for a human to confirm and is not a diagnostic device. Do not use it
            to make patient-care decisions.
          </p>
        </div>
      </footer>

      {videoOpen && <VideoLightbox onClose={() => setVideoOpen(false)} />}
    </div>
  );
}
