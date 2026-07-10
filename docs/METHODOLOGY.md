# Norn methodology and engine

The deep reference for how Norn turns one variant into a scored ACMG/AMP classification: the criteria it automates, the thresholds and scoring, the two Claude passes, the evaluation, the data sources, and the limitations. For a plain overview start with the [README](../README.md). For the visual identity see [DESIGN.md](DESIGN.md), for the MCP server see [MCP.md](MCP.md), and for the contributor and architecture map see [CLAUDE.md](../CLAUDE.md).

## The ACMG criteria Norn implements

Norn adjudicates ten criteria automatically and lets the curator supply the eight that depend on evidence it cannot fetch. Points follow the ClinGen Bayesian model (Tavtigian et al. 2018): Very Strong 8, Strong 4, Moderate 2, Supporting 1, benign criteria negative.

**Automated (adjudicated by Norn):**

| Code | Meaning | Strength (points) | Evidence source |
| --- | --- | --- | --- |
| PVS1 | Predicted loss of function (nonsense, frameshift, canonical splice) | Very Strong (+8) | Ensembl VEP, gnomAD constraint |
| PS1 | Same amino acid change as an established pathogenic variant | Strong (+4) | ClinVar |
| PM1 | Mutational hotspot or functional domain (local pathogenic cluster) | Moderate (+2) | ClinVar |
| PM2 | Absent or very rare in gnomAD | Moderate downgraded to Supporting (+1) | gnomAD v4 |
| PM5 | Different pathogenic missense at the same residue | Moderate (+2) | ClinVar |
| PP3 | Calibrated computational evidence for damage | Supporting (+1) | VEP (AlphaMissense) |
| BA1 | Allele frequency above 5% | Stand-alone benign override | gnomAD v4 |
| BS1 | Frequency greater than expected for the disorder | Strong (-4) | gnomAD v4 |
| BP4 | Calibrated computational evidence for tolerance | Supporting (-1) | VEP (AlphaMissense) |
| BP7 | Synonymous with no predicted splice impact | Supporting (-1) | Ensembl VEP |

**Curator-supplied (toggled in the report, classification recomputes live):** PS2, PS3, PS4, PM3, PM6, PP1 (pathogenic) and BS3, BS4 (benign). These need functional, segregation, de novo, or allelic-phase evidence that Norn does not fetch, so a human applies them.

Two caveats are surfaced in the report, not hidden:

- **PVS1 disease mechanism.** PVS1 also requires that loss of function is a known disease mechanism for the gene. Norn firms this with gnomAD gene constraint (pLI, LOEUF): a LOF-intolerant gene clears the provisional flag, otherwise PVS1 stays flagged for a human to confirm.
- **PM2 is applied at supporting strength (+1)**, following current ClinGen SVI guidance, even though its nominal ACMG strength is Moderate.

### Documented thresholds

Norn uses gene-specific allele-frequency thresholds where a rule is available (a small table inspired by ClinGen Variant Curation Expert Panels, in [`data/gene-thresholds.json`](../data/gene-thresholds.json)), and generic defaults otherwise. The report shows which source was used.

- Generic defaults: BA1 above 0.05 (Richards et al. 2015), BS1 above 0.01, PM2 below 0.0001 or absent.
- Gene-specific example: BRCA1/BRCA2 use much stricter thresholds (illustrative ENIGMA-style values), so a low-frequency founder allele does not clear PM2.
- Computational evidence: PP3 and BP4 are driven by AlphaMissense (Cheng et al. 2023), a calibrated missense predictor carried by the same VEP call. Its published class cutoffs map to a supporting call: `likely_pathogenic` fires PP3, `likely_benign` fires BP4, and `ambiguous` fires neither. SIFT and PolyPhen concordance is the fallback only when AlphaMissense does not cover the variant (for example indels), and both are shown for corroboration. Applied at Supporting strength.

For the benign frequency criteria (BA1, BS1), the representative allele frequency is gnomAD's faf95 (the 95% CI filtering allele frequency of the grpmax population, the ClinGen SVI recommendation), falling back to the larger of the global and popmax point estimates when a variant is too rare for an faf95. Using the filtering AF, not the raw popmax, keeps a noisy small-population estimate from overcalling BS1. For example, BRCA1 p.Arg1699Gln has a popmax of 1.19e-4 but an faf95 of 3.98e-5, so it stays a VUS rather than being called Likely Benign.

### Points to classification

The point total maps to a five-tier classification (Tavtigian et al. 2020; ClinGen SVI):

| Total points | Classification |
| --- | --- |
| 10 or more | Pathogenic |
| 6 to 9 | Likely Pathogenic |
| 0 to 5 | Uncertain Significance |
| -6 to -1 | Likely Benign |
| -7 or less | Benign |

BA1 (allele frequency above 5%) is a stand-alone override to Benign regardless of the point total. Confidence (High, Moderate, Low) is derived from how far the total sits from the nearest category boundary and how many criteria were left unknown. The exact logic is in [`lib/acmg.ts`](../lib/acmg.ts).

## How the scoring works

![Norn scoring model](scoring-model.svg)

## The Claude reasoning layer

Two server-side Anthropic calls run per variant. The API key never reaches the client.

1. **Adjudicator.** Receives the gathered evidence plus the code-computed signals and returns strict JSON with a verdict, evidence, source, and one-sentence reasoning per criterion. The response is parsed defensively and validated against a Zod schema, with one reformat retry.
2. **Reviewer.** Receives the draft classification and evidence, critiques it, catches overcalls and internal conflicts (for example a benign and a pathogenic computational criterion both marked met), and writes the "curator should double-check" checklist. This mirrors the reviewer-agent pattern in Claude Science.

If no `ANTHROPIC_API_KEY` is set, or a model call fails, Norn falls back to a deterministic heuristic that derives verdicts directly from the computed signals. The fallback is labeled clearly in the UI as an offline heuristic and is never presented as model reasoning. Norn also flags any case where a model verdict disagrees with a hard code-computed signal.

Model selection is read from `ANTHROPIC_MODEL`, default `claude-opus-4-8`. Norn does not send `temperature` or the other sampling parameters, which Opus 4.8 / 4.7 reject with a 400. The model must be one the API key can access, or every call returns 404 (interpretations fall back to the heuristic and the Ask panel reports a failed call). `claude-sonnet-4-6` is a faster, cheaper alternative for the same pipeline.

## Anti-circularity

A variant's own ClinVar classification is never fed into adjudication. ClinVar is used only for two things: neighboring-residue evidence for PS1 and PM5, and the ground-truth labels in the eval set. This keeps the adjudication from simply echoing an existing ClinVar call.

## Evaluation

[`data/eval-variants.json`](../data/eval-variants.json) holds 20 well-established variants across BRCA1, BRCA2, CFTR, HBB, TP53, MLH1, HFE, MSH6, and APC, spanning pathogenic, benign, and uncertain, each with its generally accepted ClinVar germline classification and accession.

The `/eval` page runs the full Norn pipeline on each variant and reports two numbers:

- **Exact agreement**: the five-tier classification matches the expected label.
- **Directional concordance**: the call lands in the same direction (pathogenic-leaning, uncertain, or benign-leaning).

Because Norn applies PM2 at supporting strength, exact agreement is lower than directional concordance, which is the more meaningful measure for a triage copilot. Disagreements are shown, not hidden.

## Data sources

- **Ensembl VEP and variant_recoder** (REST): molecular consequence, transcript, protein change, in-silico scores (AlphaMissense, SIFT, PolyPhen), and input normalization. https://rest.ensembl.org
- **gnomAD v4** (GraphQL): population allele frequency including the faf95 filtering AF, and gene constraint (pLI, LOEUF). https://gnomad.broadinstitute.org
- **ClinVar** (NCBI E-utilities): neighboring-residue evidence and eval ground truth. https://www.ncbi.nlm.nih.gov/clinvar/
- **PubMed** (NCBI E-utilities): literature search for the gene and protein change. https://pubmed.ncbi.nlm.nih.gov
- **AlphaFold** (via UniProt): the predicted protein structure for the optional 3D view, fetched through a same-origin proxy. https://alphafold.ebi.ac.uk

Every external call has a timeout, one retry, and graceful degradation. If a source is unavailable, the affected criteria are marked unknown rather than failing the whole request. In-memory caching keeps repeated lookups within a warm serverless instance cheap.

## Scope and limitations

- Norn automates 10 of the 28 ACMG/AMP criteria and leaves 8 evidence-dependent ones (functional, segregation, de novo, allelic) to the curator; it does not curate literature itself.
- PVS1 does not verify that loss of function is a disease mechanism for the gene. It is flagged provisional.
- Frequency thresholds are generic defaults, not gene- and disease-specific.
- Computational evidence (PP3/BP4) uses the calibrated AlphaMissense score at its published class cutoffs, with SIFT and PolyPhen concordance as the fallback for variants it does not cover. It is applied at a single Supporting strength rather than the full tiered (Supporting/Moderate/Strong) calibration.
- The gnomAD variant lookup for complex indels can miss if coordinate normalization does not match gnomAD's minimal representation. The affected criteria degrade to unknown.
- The protein lollipop shows a sample of ClinVar variants for the gene and is best-effort. It falls back cleanly when protein positions are unavailable.
- Norn is not a diagnostic device and must not be used for clinical decisions.

## Roadmap

Still ahead for the product:

- **Calibrated predictors.** PP3 and BP4 now use AlphaMissense at its published class cutoffs (delivered). Still ahead: additional meta-predictors (REVEL, BayesDel) and the full tiered strength calibration (Pejaver et al. 2022), so a very high or very low score can reach Moderate or Strong rather than only Supporting.
- **Audit trail.** A server-side store of interpretations and sign-off history so a lab can track who reviewed what and when.
- **Confidence calibration.** Score Norn against a larger labeled set and report calibrated confidence per classification.

Presentation and craft (how Norn is built and shown, not the product itself):

- **A living style guide with visual-regression snapshots.** A `/style` page documenting the design tokens, the loom motif, and the criterion and verdict components, backed by the Playwright screenshot pass in CI so a future redesign cannot silently regress the views in the README.

The branded PDF report and the deck template in [`design/`](../design) (delivered) already carry the identity into what a lab hands around.

## References

- Richards S, et al. Standards and guidelines for the interpretation of sequence variants: a joint consensus recommendation of the ACMG and AMP. Genet Med. 2015. (ACMG/AMP criteria)
- Tavtigian SV, et al. Modeling the ACMG/AMP variant classification guidelines as a Bayesian classification framework. Genet Med. 2018. (points framework)
- Tavtigian SV, et al. Fitting a naturally scaled point system to the ACMG/AMP variant classification guidelines. Hum Mutat. 2020. (point thresholds)
- ClinGen Sequence Variant Interpretation working group recommendations (PM2 supporting, calibrated criteria).
- Cheng J, et al. Accurate proteome-wide missense variant effect prediction with AlphaMissense. Science. 2023. (PP3/BP4 predictor)
- Karczewski KJ, et al. gnomAD. (population frequency, v4)
- Landrum MJ, et al. ClinVar. (variant classifications)
- McLaren W, et al. The Ensembl Variant Effect Predictor. Genome Biol. 2016.
