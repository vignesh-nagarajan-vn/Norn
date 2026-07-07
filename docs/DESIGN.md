# Design notes

This records the decisions behind Norn that are not obvious from the code.

## Named user first

Norn is scoped to one person: a molecular geneticist or genetic counselor doing variant curation. Every screen answers a question that person actually asks (what is the consequence, how rare is it, what do neighbors look like, what does the evidence add up to, what should I check). Features that did not serve that user were left out.

## The model justifies, the engine decides

The final classification is computed in code from the adjudicated verdicts. The model is never asked for the label. This keeps the output reproducible and auditable: given the same verdicts, the classification and points are always the same. The model's job is to read messy evidence and return a clean per-criterion verdict with reasoning, which is what language models are good at. The combining rules are arithmetic, which code should own.

To make the model's verdicts trustworthy, Norn first computes objective signals in code (frequency against thresholds, computational concordance, loss-of-function consequence, ClinVar neighbor presence) and passes them to the adjudicator as strong priors. Norn then compares the model's verdict to the signal and flags any disagreement, so a model that drifts from the data is caught rather than trusted blindly.

## Anti-circularity

A variant's own ClinVar classification is deliberately excluded from adjudication. If Norn fed a variant's ClinVar call into the evidence, the whole exercise would collapse into echoing ClinVar. ClinVar is used only for neighboring-residue evidence (PS1 and PM5, which are about other variants at the same position) and as the ground-truth label in the eval set. The eval enforces the same exclusion so the agreement numbers are not circular.

## PVS1 is provisional on purpose

PVS1 in the ACMG guideline requires both a predicted null variant and that loss of function is an established disease mechanism for the gene. Norn detects the first from VEP but cannot verify the second without a curated gene-mechanism resource. Rather than quietly assume it, Norn applies PVS1 for the consequence, marks it provisional in the scorecard, and makes the reviewer checklist always ask a human to confirm the mechanism when PVS1 is met. This is the honest version of a hard criterion.

## PM2 at supporting strength

PM2 is nominally Moderate (+2) in ACMG 2015, but the ClinGen Sequence Variant Interpretation working group recommends applying it at Supporting strength. Norn follows the current guidance and assigns +1. A direct consequence is that a single loss-of-function variant that is also rare totals +9 (PVS1 +8, PM2 +1), which is Likely Pathogenic rather than Pathogenic. This is correct under the point system, and it is documented in the UI and README so it does not read as a bug.

## Points system over the decision-tree combining rules

Norn uses the Tavtigian point system rather than the original combining-rule table because points compose cleanly, are easy to display on a single meter, and make the distance to a category boundary meaningful for a confidence estimate. Thresholds: Pathogenic 10 or more, Likely Pathogenic 6 to 9, Uncertain 0 to 5, Likely Benign -6 to -1, Benign -7 or less. BA1 overrides to Benign.

## Streaming pipeline for a legible demo

The interpret route streams newline-delimited JSON, one event per stage, then a final result object. The client lights up each stage as it completes. This makes the evidence-gathering visible instead of a spinner, which matters for a tool whose value is transparency. Streaming also fits the serverless model: the function runs to completion within `maxDuration = 60` and the client reads the body as it arrives.

## gnomAD lookup by rsID first

gnomAD's GraphQL `variant` field accepts an rsID directly. Looking up by rsID is more reliable than building a chrom-pos-ref-alt id, especially for indels where minimal-representation normalization is easy to get wrong. Norn prefers the rsID (from variant_recoder) and falls back to a constructed variant id. A genuine "not found" from gnomAD is treated as absent (which supports PM2); a network or lookup error is treated as unknown, so a failed lookup never masquerades as a rare-variant signal.

## Resilient demo path

The three example chips are backed by bundled fixtures. Norn always tries the live public APIs first. If annotation fails (for example Ensembl is briefly unreachable), the pipeline falls back to the fixture for that variant and uses the fixture's frequency and ClinVar data together, so the report stays internally consistent rather than mixing fixture annotation with live lookups on mismatched coordinates. Reports built with fixture data are marked as such. This guarantees the demo produces a complete report on stage while keeping live data as the default.

## Eval is client-orchestrated

The eval page runs each variant through the same `/api/interpret` route, one request per variant with a small concurrency pool, and aggregates on the client. This keeps every serverless invocation inside the 60-second limit instead of trying to run 20 variants in one function call, and it lets the table and running agreement fill in live.

## No database

Everything is either computed on request or read from a static JSON file in the repo. Caching is in-memory per warm instance. This meets the goal of deploying on Vercel with only `ANTHROPIC_API_KEY` set and nothing else to provision.
