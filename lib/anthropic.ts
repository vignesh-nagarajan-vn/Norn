// The two server-side Claude passes.
//
//   1. Adjudicator: given all gathered evidence plus the code-computed signals,
//      returns a verdict (met / not_met / unknown) for each of the eight
//      criteria with a one-sentence justification.
//   2. Reviewer: given the draft classification, critiques it, flags conflicts
//      or overcalls, and produces the "curator should double-check" checklist.
//
// The final label is never taken from the model; it is computed in code from
// the adjudicated verdicts (see lib/acmg.ts). The model justifies criteria.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CRITERIA } from "./acmg";
import type {
  AdjudicatedCriterion,
  ClassificationResult,
  EvidenceBundle,
  ReviewResult,
} from "./types";

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function modelName(): string {
  return process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
}

class ModelError extends Error {}

function extractText(msg: Anthropic.Message): string {
  return msg.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

function extractJson(raw: string): unknown {
  let text = raw.trim();
  // Strip accidental markdown fences.
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new ModelError("Model response contained no JSON object.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function callModel(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // No `temperature`: Claude Opus 4.8 / 4.7 (the default model) reject sampling
  // parameters with a 400 ("temperature is deprecated for this model"). The final
  // label is computed in code regardless, so the model's own sampling is fine.
  const msg = await client.messages.create({
    model: modelName(),
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return extractText(msg);
}

// Compact, factual summary handed to the model so it reasons over concrete
// numbers rather than raw API payloads.
function summarize(bundle: EvidenceBundle) {
  const { normalized: n, consequence: c, frequency: f, clinvar: cv, signals: s } = bundle;
  return {
    variant: {
      input: bundle.input,
      gene: c.geneSymbol,
      transcript: c.transcriptId,
      hgvsc: c.hgvsc,
      hgvsp: c.hgvsp,
      rsid: n.rsid,
      mostSevereConsequence: c.mostSevereConsequence,
      consequenceTerms: c.consequenceTerms,
      isPredictedLof: c.isLof,
      lofType: c.lofType,
      proteinPosition: c.proteinPosition,
      aminoAcids: c.aminoAcids,
    },
    frequency: {
      available: bundle.sourceStatus.gnomad === "ok",
      foundInGnomad: f.found,
      representativeAf: f.representativeAf,
      genomeAf: f.genomeAf,
      exomeAf: f.exomeAf,
      popmaxAf: f.popmaxAf,
      popmaxPopulation: f.popmaxPopulation,
    },
    computational: {
      available: bundle.computational.available,
      predictor: bundle.computational.predictor,
      alphaMissenseScore: bundle.computational.alphaMissenseScore,
      alphaMissenseClass: bundle.computational.alphaMissenseClass,
      sift: c.siftPrediction,
      polyphen: c.polyphenPrediction,
      siftScore: c.siftScore,
      polyphenScore: c.polyphenScore,
    },
    clinvarNeighbors: {
      queried: cv.queried,
      sameAminoAcidChangePathogenic: cv.sameAaChange.map((x) => `${x.accession}: ${x.title} (${x.classification})`),
      differentChangeSameResiduePathogenic: cv.sameResidueDifferentAa.map((x) => `${x.accession}: ${x.title} (${x.classification})`),
      geneVariantCount: cv.geneVariants.length,
    },
    geneConstraint: {
      available: bundle.constraint.available,
      pli: bundle.constraint.pli,
      loeuf: bundle.constraint.loeuf,
      lofIntolerant: bundle.constraint.lofIntolerant,
    },
    computedSignals: s,
    thresholds: bundle.thresholds,
  };
}

const AdjudicationSchema = z.object({
  criteria: z.array(
    z.object({
      code: z.string(),
      verdict: z.enum(["met", "not_met", "unknown"]),
      evidence: z.string(),
      source: z.string(),
      reasoning: z.string(),
    }),
  ),
});

const ADJUDICATOR_SYSTEM = [
  "You are a molecular genetics curation assistant applying the ACMG/AMP 2015 variant-interpretation criteria as refined by the ClinGen Sequence Variant Interpretation working group.",
  "You adjudicate individual criteria only. You never assign a final classification; a separate deterministic engine does that from your verdicts.",
  "Use only the evidence provided. When the evidence is missing or does not decide a criterion, return \"unknown\" rather than guessing.",
  "The provided computedSignals are objective booleans derived in code from the same evidence. Treat them as strong priors and follow them unless the surrounding evidence gives a specific reason not to.",
  "Do not use a variant's own ClinVar classification as evidence; ClinVar is provided only as neighboring-residue evidence for PS1 and PM5.",
  "Respond with a single strict JSON object and no prose, no markdown, and no code fences.",
].join(" ");

function adjudicatorUser(bundle: EvidenceBundle): string {
  const criteriaDefs = CRITERIA.map((c) => ({
    code: c.code,
    name: c.name,
    direction: c.direction,
    appliedStrength: c.strength,
    points: c.points,
    rule: c.description,
  }));
  return [
    "Adjudicate each of these eight criteria for the variant.",
    "",
    "CRITERIA DEFINITIONS:",
    JSON.stringify(criteriaDefs, null, 2),
    "",
    "EVIDENCE:",
    JSON.stringify(summarize(bundle), null, 2),
    "",
    'Return JSON of the form: {"criteria":[{"code":"PVS1","verdict":"met|not_met|unknown","evidence":"the specific fact you used","source":"gnomAD v4 | ClinVar | Ensembl VEP","reasoning":"one sentence"}, ...]} with one entry per criterion code above.',
  ].join("\n");
}

export async function adjudicateWithClaude(
  bundle: EvidenceBundle,
): Promise<AdjudicatedCriterion[]> {
  const user = adjudicatorUser(bundle);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callModel(
        ADJUDICATOR_SYSTEM +
          (attempt > 0 ? " Your previous reply was not valid JSON; return only the JSON object." : ""),
        user,
        1600,
      );
      const parsed = AdjudicationSchema.parse(extractJson(raw));
      return parsed.criteria;
    } catch (err) {
      if (attempt === 1) throw new ModelError(`Adjudicator failed: ${(err as Error).message}`);
    }
  }
  throw new ModelError("Adjudicator failed.");
}

const ReviewSchema = z.object({
  critique: z.string(),
  conflicts: z.array(z.string()).default([]),
  checklist: z.array(z.string()).default([]),
  overcallRisk: z.enum(["low", "moderate", "high"]).default("moderate"),
});

const REVIEWER_SYSTEM = [
  "You are a senior variant-review scientist auditing a draft ACMG/AMP interpretation produced by an assistant.",
  "Your job is to catch overcalls, undercalls, internal conflicts (for example a benign and a pathogenic computational criterion both marked met), and criteria that lean on thin or missing evidence.",
  "You do not change the classification. You produce a concise critique and a concrete checklist of what a human curator must confirm before use.",
  "Respond with a single strict JSON object and no prose, no markdown, and no code fences.",
].join(" ");

function reviewerUser(bundle: EvidenceBundle, draft: ClassificationResult): string {
  const draftView = {
    classification: draft.classification,
    totalPoints: draft.points,
    confidence: draft.confidence,
    ba1Override: draft.ba1Override,
    criteria: draft.criteria.map((c) => ({
      code: c.code,
      verdict: c.verdict,
      appliedPoints: c.appliedPoints,
      evidence: c.evidence,
      provisional: c.provisional ?? false,
      signalDisagreement: c.signalDisagreement ?? false,
    })),
  };
  return [
    "Audit this draft interpretation.",
    "",
    "DRAFT:",
    JSON.stringify(draftView, null, 2),
    "",
    "EVIDENCE SUMMARY:",
    JSON.stringify(summarize(bundle), null, 2),
    "",
    'Return JSON: {"critique":"2-4 sentences","conflicts":["..."],"checklist":["specific action for the curator", "..."],"overcallRisk":"low|moderate|high"}.',
    "The checklist must include the caveat that PVS1 assumes loss of function is a known disease mechanism, which was not verified, whenever PVS1 is met.",
  ].join("\n");
}

export async function reviewWithClaude(
  bundle: EvidenceBundle,
  draft: ClassificationResult,
): Promise<ReviewResult> {
  const user = reviewerUser(bundle, draft);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callModel(
        REVIEWER_SYSTEM +
          (attempt > 0 ? " Your previous reply was not valid JSON; return only the JSON object." : ""),
        user,
        1200,
      );
      return ReviewSchema.parse(extractJson(raw));
    } catch (err) {
      if (attempt === 1) throw new ModelError(`Reviewer failed: ${(err as Error).message}`);
    }
  }
  throw new ModelError("Reviewer failed.");
}

export interface AskMessage {
  role: "user" | "assistant";
  content: string;
}

const ASK_SYSTEM = [
  "You are Norn's assistant, embedded in a single variant-interpretation report.",
  "Answer the curator's questions using only the interpretation provided below as your knowledge base.",
  "If a question is not covered by this interpretation, say so plainly rather than guessing, and suggest what evidence would be needed.",
  "Be concise (2 to 5 sentences). Reference ACMG criterion codes and the named sources when relevant.",
  "Never invent evidence, and never assert a different final classification than the one computed in the report.",
  "If asked for clinical or diagnostic advice, remind the user that Norn is a research and demonstration tool, not a diagnostic device.",
].join(" ");

// Answers a question grounded in a single interpretation. The reportContext is a
// compact text rendering of the report built by the caller.
export async function askAboutReport(
  reportContext: string,
  question: string,
  history: AskMessage[],
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const trimmed = history.slice(-8);
  // No `temperature` here either: Opus 4.8 / 4.7 reject it with a 400.
  const msg = await client.messages.create({
    model: modelName(),
    max_tokens: 700,
    system: `${ASK_SYSTEM}\n\nINTERPRETATION (your only knowledge base):\n${reportContext}`,
    messages: [...trimmed, { role: "user" as const, content: question }],
  });
  return extractText(msg);
}
