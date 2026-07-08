// ACMG/AMP engine.
//
// Norn implements eight high-yield criteria and combines them with the
// ClinGen Bayesian points system (Tavtigian et al. 2018, Genet Med;
// point values from the ClinGen Sequence Variant Interpretation working group).
//
// Point values by strength:
//   Very Strong  8, Strong 4, Moderate 2, Supporting 1 (benign criteria negative).
//
// Classification from total points (Tavtigian et al. 2020; ClinGen SVI):
//   Pathogenic            total >= 10
//   Likely Pathogenic     6 to 9
//   Uncertain Significance 0 to 5
//   Likely Benign         -6 to -1
//   Benign                total <= -7
// BA1 (allele frequency > 5%) is a stand-alone benign override to Benign.

import type {
  Classification,
  ClassificationResult,
  Confidence,
  CriterionResult,
  CriterionSpec,
  Verdict,
} from "./types";

// Documented thresholds. These are demonstration defaults; real curation uses
// gene- and disease-specific values (ClinGen SVI, gene-specific VCEP rules).
export const THRESHOLDS = {
  // BA1: allele frequency too common for any Mendelian disease (Richards 2015).
  ba1Af: 0.05,
  // BS1: above the maximum credible frequency for the disorder. Generic
  // placeholder; should be disease-calibrated per ClinGen SVI.
  bs1Af: 0.01,
  // PM2: absent or very rare. Generic dominant-disease default.
  pm2Af: 0.0001,
} as const;

export const CRITERIA: CriterionSpec[] = [
  {
    code: "PVS1",
    name: "Predicted loss of function",
    direction: "pathogenic",
    strength: "Very Strong",
    points: 8,
    dataSource: "Ensembl VEP",
    description:
      "Null variant (nonsense, frameshift, canonical splice) in a gene where loss of function is a known mechanism of disease.",
  },
  {
    code: "PS1",
    name: "Same amino acid change as established pathogenic",
    direction: "pathogenic",
    strength: "Strong",
    points: 4,
    dataSource: "ClinVar",
    description:
      "Same amino acid change as a previously established pathogenic variant, regardless of nucleotide change.",
  },
  {
    code: "PM1",
    name: "Mutational hotspot or functional domain",
    direction: "pathogenic",
    strength: "Moderate",
    points: 2,
    dataSource: "ClinVar",
    description:
      "Located in a mutational hotspot or well-studied functional domain, approximated by a local cluster of pathogenic variants with no benign variation nearby.",
  },
  {
    code: "PM2",
    name: "Absent or very rare in population data",
    direction: "pathogenic",
    strength: "Supporting",
    nominalStrength: "Moderate",
    points: 1,
    dataSource: "gnomAD v4",
    description:
      "Absent or below the rare threshold in gnomAD. Applied at Supporting strength per current ClinGen SVI guidance.",
  },
  {
    code: "PM5",
    name: "Novel missense at a known pathogenic residue",
    direction: "pathogenic",
    strength: "Moderate",
    points: 2,
    dataSource: "ClinVar",
    description:
      "A different pathogenic missense change has been reported at the same residue.",
  },
  {
    code: "PP3",
    name: "Computational evidence supports damage",
    direction: "pathogenic",
    strength: "Supporting",
    points: 1,
    dataSource: "Ensembl VEP (SIFT, PolyPhen)",
    description:
      "Concordant in-silico prediction of a deleterious effect (SIFT deleterious and PolyPhen probably damaging).",
  },
  {
    code: "BA1",
    name: "Allele frequency too common (stand-alone)",
    direction: "benign",
    strength: "Stand-alone",
    points: -8,
    dataSource: "gnomAD v4",
    description:
      "Allele frequency above 5% in gnomAD. Stand-alone benign override.",
  },
  {
    code: "BS1",
    name: "Frequency greater than expected for disorder",
    direction: "benign",
    strength: "Strong",
    points: -4,
    dataSource: "gnomAD v4",
    description:
      "Allele frequency higher than the maximum credible frequency for the disorder.",
  },
  {
    code: "BP4",
    name: "Computational evidence supports a benign effect",
    direction: "benign",
    strength: "Supporting",
    points: -1,
    dataSource: "Ensembl VEP (SIFT, PolyPhen)",
    description:
      "Concordant in-silico prediction of tolerance (SIFT tolerated and PolyPhen benign).",
  },
  {
    code: "BP7",
    name: "Synonymous with no predicted splice impact",
    direction: "benign",
    strength: "Supporting",
    points: -1,
    dataSource: "Ensembl VEP",
    description:
      "Synonymous variant that is not at a conserved splice position and has no predicted effect on splicing.",
  },
];

// Criteria that depend on evidence Norn cannot fetch automatically (functional
// assays, segregation, de novo status, allelic phase, case-control data). The
// curator supplies these in the report; the classification recomputes live.
export const MANUAL_CRITERIA: CriterionSpec[] = [
  { code: "PS2", name: "De novo (confirmed parentage)", direction: "pathogenic", strength: "Strong", points: 4, dataSource: "Curator", description: "Confirmed de novo in a patient with the disease and no family history." },
  { code: "PS3", name: "Functional studies show damage", direction: "pathogenic", strength: "Strong", points: 4, dataSource: "Curator", description: "Well-established in-vitro or in-vivo functional studies support a damaging effect." },
  { code: "PS4", name: "Increased prevalence in affected", direction: "pathogenic", strength: "Strong", points: 4, dataSource: "Curator", description: "Prevalence in affected individuals is significantly higher than in controls." },
  { code: "PM3", name: "In trans with pathogenic (recessive)", direction: "pathogenic", strength: "Moderate", points: 2, dataSource: "Curator", description: "For recessive disorders, detected in trans with a pathogenic variant." },
  { code: "PM6", name: "Assumed de novo (unconfirmed)", direction: "pathogenic", strength: "Moderate", points: 2, dataSource: "Curator", description: "Assumed de novo without confirmation of parentage." },
  { code: "PP1", name: "Cosegregation with disease", direction: "pathogenic", strength: "Supporting", points: 1, dataSource: "Curator", description: "Cosegregation with disease in multiple affected family members." },
  { code: "BS3", name: "Functional studies show no damage", direction: "benign", strength: "Strong", points: -4, dataSource: "Curator", description: "Well-established functional studies show no damaging effect." },
  { code: "BS4", name: "Lack of segregation in family", direction: "benign", strength: "Strong", points: -4, dataSource: "Curator", description: "Lack of segregation in affected members of a family." },
];

export const ALL_CRITERIA: CriterionSpec[] = [...CRITERIA, ...MANUAL_CRITERIA];

export function specByCode(code: string): CriterionSpec | undefined {
  return ALL_CRITERIA.find((c) => c.code === code);
}

export function pointsToClassification(points: number): Classification {
  if (points >= 10) return "Pathogenic";
  if (points >= 6) return "Likely Pathogenic";
  if (points >= 0) return "Uncertain Significance";
  if (points >= -6) return "Likely Benign";
  return "Benign";
}

// Midpoints between adjacent classification bands, used to gauge how close a
// total sits to flipping into a neighboring category.
const BAND_EDGES = [-6.5, -0.5, 5.5, 9.5];

function distanceToNearestEdge(points: number): number {
  return Math.min(...BAND_EDGES.map((e) => Math.abs(points - e)));
}

function confidenceFrom(
  points: number,
  ba1Override: boolean,
  unknownCount: number,
): { confidence: Confidence; rationale: string } {
  if (ba1Override) {
    return {
      confidence: "High",
      rationale:
        "BA1 stand-alone benign: allele frequency above 5% rules out a Mendelian disease role.",
    };
  }
  const dist = distanceToNearestEdge(points);
  let confidence: Confidence;
  if (dist >= 3) confidence = "High";
  else if (dist >= 1.5) confidence = "Moderate";
  else confidence = "Low";

  // Many unknown criteria means thin evidence, so cap the confidence.
  if (unknownCount >= 4 && confidence === "High") confidence = "Moderate";
  if (unknownCount >= 6 && confidence !== "Low") confidence = "Low";

  const rationale =
    `Total of ${points} point${Math.abs(points) === 1 ? "" : "s"} sits ` +
    `${dist.toFixed(1)} from the nearest category boundary` +
    (unknownCount > 0 ? ` with ${unknownCount} criteria left unknown.` : ".");
  return { confidence, rationale };
}

export function classify(criteria: CriterionResult[]): ClassificationResult {
  let pathogenicPoints = 0;
  let benignPoints = 0;
  let ba1Override = false;
  let unknownCount = 0;

  for (const c of criteria) {
    if (c.verdict === "unknown") unknownCount++;
    if (c.verdict !== "met") continue;
    if (c.code === "BA1") {
      ba1Override = true;
    }
    if (c.direction === "pathogenic") pathogenicPoints += c.appliedPoints;
    else benignPoints += c.appliedPoints; // appliedPoints already negative
  }

  const points = pathogenicPoints + benignPoints;
  const classification: Classification = ba1Override
    ? "Benign"
    : pointsToClassification(points);
  const { confidence, rationale } = confidenceFrom(points, ba1Override, unknownCount);

  return {
    points,
    pathogenicPoints,
    benignPoints,
    classification,
    confidence,
    confidenceRationale: rationale,
    ba1Override,
    criteria,
  };
}

// Points a criterion contributes given its verdict.
export function appliedPointsFor(spec: CriterionSpec, verdict: Verdict): number {
  return verdict === "met" ? spec.points : 0;
}
