# CLAUDE.md

Guidance for AI agents (and humans) working in this repository. Read this first.

## Keeping the docs current (do this every session)

Norn documents itself in several places: this file (`CLAUDE.md`), the main `README.md`, the docs under `docs/` (`DESIGN.md`, `MCP.md`, the diagrams, and `docs/archive/`), and the brand kit under `design/` (`tokens.css`, the logo, the guide). Any change to behavior, structure, routes, commands, environment, dependencies, or the UI must update every affected document in the same change, as applicable. That includes regenerating the README screenshots and the identity assets (OG/Twitter/apple/PWA icons in `app/` and `public/`, the guided-tour video) when the UI or identity changes, keeping `design/tokens.css` in sync with `app/globals.css`, and moving superseded assets into `docs/archive/`. Treat the docs as part of the build: a change that leaves them stale is not done. When in doubt, update this file so the next session starts from the truth.

## What Norn is

Norn is a variant-interpretation copilot for a clinical molecular geneticist or genetic counselor. A user pastes one human genetic variant (HGVS like `BRCA1:c.5266dupC`, an rsID like `rs80357906`, or a locus like `17-43057062-A-AG`). Norn gathers evidence from public genomics databases, adjudicates each ACMG/AMP criterion with Claude, applies the ClinGen points framework in code, runs a second Claude "reviewer" pass, and returns a transparent report.

It was built for the "Built with Claude: Life Sciences" hackathon (partner: Gladstone Institutes). Judging weights: Demo 30, Claude Use 25, Impact 25, Depth/Execution 20. The product framing is non-negotiable: **Norn drafts evidence for a human to confirm; it is never an autonomous diagnostic.** Every screen carries a "Not for clinical use" disclaimer.

Live demo: https://norn-five.vercel.app  ·  Repo: https://github.com/vignesh-nagarajan-vn/Norn

## Core principle: the model justifies, the engine decides

The final classification is always computed in code from the adjudicated verdicts (`lib/acmg.ts` `classify`). Claude returns a per-criterion verdict (met / not_met / unknown) with reasoning; it never returns the final label. Keep this separation when changing anything: models read messy evidence, code owns the arithmetic and the label.

## Tech stack

- Next.js 14 App Router, React 18, TypeScript (strict), Tailwind CSS 3.
- No database. All external calls and all Anthropic calls happen in server-side route handlers. The API key never reaches the client.
- Deploys on Vercel with only `ANTHROPIC_API_KEY` set. Node runtime, `maxDuration = 60` on the heavy route.
- Fonts (Inter, JetBrains Mono, and Fraunces for display headings) and Material Symbols load via `<link>` in `app/layout.tsx` (no `next/font`, to avoid build-time font fetches).
- Design identity is the "loom of fate": warm vellum canvas, deep ink text, Fraunces serif display, a bronze `--secondary` thread accent, and the `NornMark` (three interlocked rings). Classification colors are engine-contract tokens read at runtime, so retuning the chrome never touched `lib/acmg.ts`, the PDF, or the eval. The default classification palette is the clinical convention, with colorblind-safe (`cvd`) and high-contrast (`contrast`) alternates in Settings. The previous "Scientific Precision" UI is archived in `docs/archive/`.
- Brand source assets (logo, illustrations, tokens, guide) live in `design/`. The favicon (`app/icon.svg`), OG/Twitter cards (`app/opengraph-image.png`, `app/twitter-image.png`), apple icon (`app/apple-icon.png`), PWA icons (`public/icons/`), and the guided-tour video (`public/norn-demo.webm` + poster) are generated with Playwright and committed. Regenerate them when the identity changes.

## Directory map

```
app/
  layout.tsx            root layout, font + icon <link>s (Inter, JetBrains Mono, Fraunces, Material Symbols)
  page.tsx              Landing page (dynamic overview of Norn, "three fates", links into the Dashboard)
  interpret/page.tsx    Dashboard: hero search + streaming pipeline + report (reads ?v= and auto-runs)
  icon.svg              the Norn mark, three interlocked rings (favicon)
  opengraph-image.png / twitter-image.png / apple-icon.png   file-based metadata (Next auto-wires)
  batch/page.tsx        Batch: paste/upload list|CSV|VCF -> sortable worklist
  eval/page.tsx         Evaluation: runs the benchmark set, agreement stats
  docs/page.tsx         In-app documentation
  api/interpret/route.ts  streaming NDJSON pipeline (one event per stage, then result)
  api/eval/route.ts       serves the static eval dataset
  api/ask/route.ts        answers questions about one report (Claude, report as context)
  api/literature/route.ts PubMed search for a gene + protein change
components/
  AppShell.tsx          top nav + sidebar shell (wordmark -> /, Interpret -> /interpret, Batch/Eval/Docs), Recent history
  Hero.tsx              the Dashboard's empty state: search, example chips, three-fates strip
  Dashboard.tsx         the report: header, PointAggregation, CriteriaList, CuratorEvidence,
                        GenomicCards, LollipopPlot, CopilotSummary, AskPanel, LiteraturePanel,
                        CuratorChecklist. Holds curator-criteria state and recomputes classify() live.
  CuratorEvidence.tsx   toggles for the 8 curator-supplied criteria
  AskPanel.tsx          "Ask the copilot" chat (posts to /api/ask)
  LiteraturePanel.tsx   PubMed panel (posts to /api/literature)
  LollipopPlot.tsx      hand-rolled SVG protein lollipop
  PipelineView.tsx      the 6 stage indicators shown while running
  GuidedDemo.tsx        auto-playing annotated tour (gather/weigh/decree), canned data, used on the landing
  Prefs.tsx             PrefsProvider + Settings modal (palette: clinical|cvd|contrast, show-reasoning), localStorage
  ui.tsx                Icon, NornMark, StatusBadge, VerdictChip, classColorVar, acmgStrengthColor, ClaudeChip
  useInterpret.ts       client hook: POSTs to /api/interpret, parses the NDJSON stream, writes history
lib/
  acmg.ts               criteria specs (CRITERIA=10 automated, MANUAL_CRITERIA=8 curator), points,
                        thresholds constants, pointsToClassification, classify, confidence
  pipeline.ts           orchestrator: recode+VEP -> gnomAD+ClinVar+constraint -> signals -> adjudicate
                        -> classify -> review. Emits stage events. Fixture fallback. Unresolvable guard.
  ensembl.ts            variant_recoder + VEP (VEP url MUST include mane=1&canonical=1&hgvs=1)
  gnomad.ts             frequency (by rsID first, then variantId) + gnomadGeneConstraint (pLI/LOEUF)
  clinvar.ts            E-utilities: PS1/PM5 neighbors (excludes the query's own cDNA) + gene-wide set
  pubmed.ts             PubMed E-utilities literature search
  signals.ts            code-computed booleans per criterion (incl. PM1 clustering, BP7 synonymous)
  thresholds.ts         resolveThresholds(gene) using data/gene-thresholds.json
  assemble.ts           builds CriterionResult[] from adjudicated verdicts + evidence strings + source URLs
  anthropic.ts          the two Claude passes (adjudicator, reviewer) + askAboutReport + summarize()
  fallback.ts           deterministic heuristic adjudicator + reviewer (used when no key or model fails)
  ask.ts                reportToContext() and suggested questions (pure, reused by MCP)
  submission.ts         toClinvarSubmission() + submissionCsv() (export + MCP tool)
  history.ts            localStorage recent-interpretation list (client)
  pdf.ts                exportReportPdf(): jsPDF, redraws meter + lollipop as vectors, reads CSS-var colors
  fixtures.ts           offline demo data for the example chips
  eval.ts               pure comparison helpers for the eval page
  types.ts              all shared types
  cache.ts, http.ts     in-memory TTL cache; fetch with timeout + retry + graceful degradation
data/
  eval-variants.json    20-variant benchmark with expected ClinVar labels
  gene-thresholds.json  illustrative gene-specific AF thresholds
docs/
  architecture.svg, scoring-model.svg, DESIGN.md, MCP.md
  ui-landing.png, ui-dashboard.png, ui-batch.png, ui-docs.png  README screenshots (regenerate on UI change)
  archive/              previous "Scientific Precision" UI screenshots + note
design/                 brand kit: logo/, illustrations/, tokens.css, README (guide)
public/                 manifest.webmanifest, icons/ (PWA), norn-demo.webm + poster
mcp/server.ts           stdio MCP server: interpret_variant, list_eval_variants,
                        list_acmg_criteria, to_clinvar_submission
```

## The ACMG engine (lib/acmg.ts, lib/signals.ts)

**Automated criteria (10), adjudicated by Norn:** PVS1 (+8), PS1 (+4), PM1 (+2), PM2 (+1, downgraded from Moderate per ClinGen SVI), PM5 (+2), PP3 (+1); BA1 (stand-alone override, -8), BS1 (-4), BP4 (-1), BP7 (-1).

**Curator-supplied criteria (8), toggled in the report:** PS2, PS3, PS4, PM3, PM6, PP1, BS3, BS4. These need functional/segregation/de-novo/phase evidence Norn cannot fetch. The Dashboard builds `CriterionResult`s for the toggled ones and calls `classify([...automated, ...manual])` **client-side** so the label recomputes live. `classify` is pure and safe to import in the browser.

**Points to classification:** >=10 Pathogenic, 6..9 Likely Pathogenic, 0..5 Uncertain Significance, -6..-1 Likely Benign, <=-7 Benign. **BA1 met overrides to Benign** regardless of total.

**Notable derivations:**
- PM1: approximated from a local cluster of pathogenic ClinVar variants (>=3 pathogenic within +/-7 residues, no benign) using the gene-wide ClinVar set.
- BP7: synonymous consequence with no splice term.
- PVS1 firming: gnomAD gene constraint. `pLI >= 0.9 or LOEUF < 0.35` => LOF-intolerant => PVS1 `provisional` flag cleared; otherwise PVS1 stays flagged for human confirmation of the disease mechanism.
- Thresholds are gene-specific when `data/gene-thresholds.json` has an entry, else generic defaults; the report shows which source was used.
- Confidence (High/Moderate/Low) is distance to the nearest band boundary, capped down when many criteria are unknown.

## Anti-circularity (important, do not break)

A variant's own ClinVar classification is NEVER fed into adjudication. ClinVar is used only for (a) neighboring-residue evidence for PS1/PM5 and (b) the eval ground-truth labels. `clinvarNeighbors` excludes any record whose cDNA change equals the query's, so PS1 cannot match the variant against itself. The eval enforces the same exclusion.

## External data sources and their quirks

- **Ensembl VEP** (`lib/ensembl.ts`): the VEP URL must include `mane=1&canonical=1&hgvs=1`. Without these, VEP does not flag the canonical/MANE transcript and the picker falls back to the wrong transcript (wrong protein position -> wrong PS1/PM5 residue). Ensembl REST is slow/flaky from some sandboxes; that is why the example chips have fixtures.
- **gnomAD** (`lib/gnomad.ts`): GraphQL. Look up frequency by rsID first (robust for indels), then by chrom-pos-ref-alt. A genuine "not found" means absent (supports PM2); a thrown error means unavailable (unknown). `gnomadGeneConstraint` returns pLI/LOEUF.
- **ClinVar / PubMed**: NCBI E-utilities (esearch + esummary). `NCBI_API_KEY` raises rate limits. ClinVar germline classification lives under `germline_classification` (new) or `clinical_significance` (legacy) - handle both.

## Resilience

- Every fetch has a timeout, one retry, and graceful degradation (a failed source marks its criteria unknown).
- The three example chips are backed by fixtures (`lib/fixtures.ts`). Live data is tried first; on failure the pipeline uses the fixture and marks `fixtureUsed`.
- Unresolvable-input guard (`pipeline.ts`): errors only when the input is unparseable (`kind === "unknown"`) or VEP explicitly returned empty (a real "not found"). A source timeout is treated as an outage, so a valid variant still returns a (degraded) report rather than an error.

## Claude usage

- Two server-side calls per variant: adjudicator and reviewer (`lib/anthropic.ts`). Plus `askAboutReport` for the Ask panel.
- Responses must be strict JSON; parsed defensively and validated with Zod, with one reformat retry.
- Model id from `ANTHROPIC_MODEL`, default `claude-opus-4-8`. NOTE: on a real Anthropic account the id must be one the account can access, or every Claude call 404s (interpretations then silently fall back to the heuristic and the Ask panel errors). If "chat doesn't work" on a live deploy, check the key is set AND the deployment was redeployed, and that the model id is valid.
- With no key (local dev), Norn uses the labeled deterministic fallback (`lib/fallback.ts`). This is expected; the UI marks it "offline heuristic".
- The Ask route (`/api/ask`) returns `needsKey: true` only when the key is missing; a failure with a key set returns `needsKey: false` plus the error, and `AskPanel` shows the "set the key" banner only for `needsKey`. So a 404 from an inaccessible `ANTHROPIC_MODEL` no longer masquerades as a missing key; the reply names the model and suggests setting an accessible one.

## Conventions

- **Color tokens:** `app/globals.css` defines each color twice: a hex var (`--pathogenic`, for inline styles / color-mix) and a channel var (`--pathogenic-rgb`, e.g. `220 38 38`). `tailwind.config.ts` maps tokens to `rgb(var(--x-rgb) / <alpha-value>)` so Tailwind opacity modifiers (`bg-x/10`) work. If you add a color used with `/opacity`, define both forms. The chrome tokens are the loom identity (vellum surfaces, ink text, bronze `--secondary`, `--font-display` Fraunces) and are shared across every scheme. The base `:root` classification colors are the clinical convention (the default); `PrefsProvider` sets `data-scheme` and `:root[data-scheme="cvd"]` / `:root[data-scheme="contrast"]` override only the classification tokens. `ColorScheme` is `clinical | cvd | contrast` (the removed `mockup`/loom palette maps to `clinical` on load). `design/tokens.css` is a reference copy; keep it in sync with `globals.css`.
- **Writing style (applies to README, UI copy, code comments, commit messages, PR text):** no em dashes or en dashes anywhere; use commas, periods, or parentheses. Avoid AI-tell filler ("delve", "seamless", "robust" as filler, unnecessary hedging). Prefer a number or a source over an adjective.
- TypeScript strict. `next.config.mjs` sets `eslint.ignoreDuringBuilds` (type errors still fail the build). ESLint is not installed.

## Build, run, verify

```bash
npm install
npm run dev         # local dev (localhost:3000)
npm run build       # production build (also type-checks; must pass before committing)
npm run typecheck   # tsc --noEmit
npm run mcp         # start the stdio MCP server (needs the same env as the app)
```

Environment variables: `ANTHROPIC_API_KEY` (required for real Claude passes and the Ask panel), `ANTHROPIC_MODEL` (optional, default `claude-opus-4-8`), `NCBI_API_KEY` (optional, raises ClinVar/PubMed rate limits). See `.env.example`.

Deploy: import into Vercel (Next.js preset), set the env vars, deploy. Vercel does not apply new env vars to an existing deployment until you redeploy.

How this repo has been verified in past sessions (no formal test suite): `tsc` + `next build`; drive the running server (`/api/*`) with curl/PowerShell; drive the UI headlessly with Playwright (installed ad hoc with `npm i playwright --no-save` + `npx playwright install chromium`); exercise the MCP server by piping JSON-RPC (initialize, notifications/initialized, tools/list, tools/call) to `node --import tsx mcp/server.ts` over stdio. The `.api/interpret` response is `application/x-ndjson`; parse it by splitting on newlines and reading the final `{"type":"result"}` line.

## Gotchas

- The interpret route STREAMS NDJSON. Read it with a reader loop, split on `\n`, ignore partial trailing lines. The last useful line is `{"type":"result","report":...}`; errors come as `{"type":"error","message":...}`.
- `classify` (lib/acmg) is imported client-side in `Dashboard.tsx` for the live curator recompute. Keep it pure (no server-only imports).
- `lib/pdf.ts` runs in the browser, dynamic-imports `jspdf`, and reads CSS variables via `getComputedStyle` so the PDF matches the current color scheme. It redraws the meter and lollipop as vectors (do not rely on html2canvas).
- Pages that use `AppShell` must be wrapped in `PrefsProvider` (AppShell calls `usePrefs`). The landing (`app/page.tsx`) does not use `AppShell`; it is its own full-page layout.
- `/` is the landing page; the working app is `/interpret`. The landing search, the sidebar "Recent" links, and the batch/eval variant links all navigate to `/interpret?v=<variant>`; `app/interpret/page.tsx` reads `?v=` on mount and auto-runs. If you add a new deep-link into a report, point it at `/interpret?v=`, not `/?v=`.
- The guided tour (`components/GuidedDemo.tsx`) is fully canned (no network). It auto-opens once per browser (`localStorage norn-tour-seen`, skipped under reduced motion) and on `?demo=1`. The landing video (`public/norn-demo.webm` + poster) is a Playwright recording of `/?demo=1`. The OG/Twitter/apple PNGs are file-based Next metadata: after regenerating them you MUST rebuild so Next re-detects the files (they are wired at build time, not served live). When capturing README screenshots, seed `localStorage norn-tour-seen=1` first so the tour does not cover the landing.

## Git workflow

Current workflow is to commit directly to `main` (the initial MVP went through a PR that is now merged). Keep the build green before committing. End commit messages with:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

## Roadmap (not yet done)

Calibrated meta-predictors for PP3/BP4 (REVEL, AlphaMissense, BayesDel - no free per-variant API), a server-side audit trail (needs a datastore), and confidence calibration against a larger labeled set. See the Roadmap section in `README.md`.
