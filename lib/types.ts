// Shared types for the Norn variant-interpretation pipeline.

export type Verdict = "met" | "not_met" | "unknown";
export type Direction = "pathogenic" | "benign";
export type Strength =
  | "Very Strong"
  | "Strong"
  | "Moderate"
  | "Supporting"
  | "Stand-alone";

export type Classification =
  | "Pathogenic"
  | "Likely Pathogenic"
  | "Uncertain Significance"
  | "Likely Benign"
  | "Benign";

export type Confidence = "High" | "Moderate" | "Low";

export type SourceState = "ok" | "unavailable" | "empty";

// The static definition of one ACMG/AMP criterion as Norn implements it.
export interface CriterionSpec {
  code: string;
  name: string;
  direction: Direction;
  strength: Strength; // strength applied by Norn
  nominalStrength?: Strength; // original ACMG strength when Norn downgrades it
  points: number; // signed ClinGen Bayesian points applied when met
  description: string;
  dataSource: string;
}

// A criterion after adjudication, ready to display and to combine.
export interface CriterionResult extends CriterionSpec {
  verdict: Verdict;
  evidence: string; // concrete evidence string built in code
  reasoning: string; // one-sentence justification (model or heuristic)
  source: string; // human-readable source label
  sourceUrl?: string;
  appliedPoints: number; // points actually contributed to the total
  provisional?: boolean; // caveat, e.g. PVS1 disease-mechanism not verified
  signalDisagreement?: boolean; // model verdict conflicts with a hard signal
}

export interface NormalizedInput {
  raw: string;
  kind: "hgvs" | "rsid" | "locus" | "unknown";
  rsid?: string | null;
  hgvsg?: string | null;
  hgvscList?: string[];
  hgvsp?: string | null;
  vepInput?: string | null; // value sent to VEP
  vepMode?: "hgvs" | "id";
  chrom?: string | null;
  pos?: number | null;
  ref?: string | null;
  alt?: string | null;
  gnomadVariantId?: string | null; // chrom-pos-ref-alt for gnomAD
}

export interface ConsequenceEvidence {
  geneSymbol?: string | null;
  transcriptId?: string | null;
  mostSevereConsequence?: string | null;
  consequenceTerms: string[];
  isLof: boolean; // nonsense / frameshift / canonical splice
  lofType?: string | null;
  hgvsc?: string | null;
  hgvsp?: string | null;
  proteinPosition?: number | null;
  aminoAcids?: string | null; // "R/G"
  refAa?: string | null; // single letter
  altAa?: string | null; // single letter
  siftPrediction?: string | null;
  siftScore?: number | null;
  polyphenPrediction?: string | null;
  polyphenScore?: number | null;
  canonical?: boolean;
}

export interface FrequencyEvidence {
  found: boolean;
  gnomadVariantId?: string | null;
  genomeAf?: number | null;
  exomeAf?: number | null;
  globalAf?: number | null; // max of genome / exome global AF
  popmaxAf?: number | null; // max continental-population AF
  popmaxPopulation?: string | null;
  representativeAf?: number | null; // AF used against thresholds
  ac?: number | null;
  an?: number | null;
}

export interface ComputationalEvidence {
  siftPrediction?: string | null;
  siftScore?: number | null;
  polyphenPrediction?: string | null;
  polyphenScore?: number | null;
  damagingConcordant: boolean;
  tolerantConcordant: boolean;
  available: boolean;
}

export interface ClinVarNeighbor {
  accession: string;
  title: string;
  classification: string;
  reviewStatus?: string | null;
  stars?: number | null;
  proteinPosition?: number | null;
  refAa?: string | null; // three-letter as parsed
  altAa?: string | null;
}

export interface ClinVarEvidence {
  queried: boolean;
  residuePosition?: number | null;
  sameAaChange: ClinVarNeighbor[]; // PS1 support
  sameResidueDifferentAa: ClinVarNeighbor[]; // PM5 support
  geneVariants: ClinVarNeighbor[]; // for the lollipop plot
}

export interface DeterministicSignals {
  pvs1: { lof: boolean; consequence?: string | null };
  ps1: { present: boolean };
  pm2: { rare: boolean; threshold: number; observedAf: number | null };
  pm5: { present: boolean };
  pp3: { damaging: boolean };
  ba1: { common: boolean; threshold: number; observedAf: number | null };
  bs1: { elevated: boolean; threshold: number; observedAf: number | null };
  bp4: { tolerant: boolean };
}

export interface EvidenceBundle {
  input: string;
  normalized: NormalizedInput;
  consequence: ConsequenceEvidence;
  frequency: FrequencyEvidence;
  computational: ComputationalEvidence;
  clinvar: ClinVarEvidence;
  signals: DeterministicSignals;
  sourceStatus: Record<string, SourceState>;
  fixtureUsed: boolean;
}

// The adjudicator (model or heuristic) returns one of these per criterion.
export interface AdjudicatedCriterion {
  code: string;
  verdict: Verdict;
  evidence: string;
  source: string;
  reasoning: string;
}

export interface ReviewResult {
  critique: string;
  conflicts: string[];
  checklist: string[];
  overcallRisk: "low" | "moderate" | "high" | "unknown";
}

export interface ClassificationResult {
  points: number;
  pathogenicPoints: number;
  benignPoints: number;
  classification: Classification;
  confidence: Confidence;
  confidenceRationale: string;
  ba1Override: boolean;
  criteria: CriterionResult[];
}

export interface ModelInfo {
  name: string;
  live: boolean; // true when a real Anthropic call was used
  mode: "claude" | "heuristic";
}

export interface NornReport {
  input: string;
  normalized: NormalizedInput;
  evidence: EvidenceBundle;
  result: ClassificationResult;
  review: ReviewResult;
  model: ModelInfo;
  warnings: string[];
  generatedAt: string;
  elapsedMs: number;
}

// Streamed pipeline events (NDJSON) sent to the client.
export type StageName =
  | "recode"
  | "vep"
  | "gnomad"
  | "clinvar"
  | "adjudicate"
  | "review";

export type StageStatus = "start" | "done" | "skipped" | "error";

export interface StageEvent {
  type: "stage";
  stage: StageName;
  status: StageStatus;
  detail?: string;
}

export interface ResultEvent {
  type: "result";
  report: NornReport;
}

export interface ErrorEvent {
  type: "error";
  message: string;
}

export type PipelineEvent = StageEvent | ResultEvent | ErrorEvent;
