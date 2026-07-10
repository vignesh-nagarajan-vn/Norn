// Offline demo fixtures for the example chips. Norn always tries the live
// public APIs first. If a source is unreachable during a demo, the pipeline
// falls back to the matching portion of a fixture here and marks the report as
// using demo data. Frequencies and neighbors are realistic but illustrative.

import type {
  ClinVarEvidence,
  ClinVarNeighbor,
  ConsequenceEvidence,
  FrequencyEvidence,
  NormalizedInput,
} from "./types";

export interface VariantFixture {
  keys: string[];
  label: string;
  normalized: NormalizedInput;
  consequence: ConsequenceEvidence;
  frequency: FrequencyEvidence;
  clinvar: ClinVarEvidence;
}

function neighbor(
  accession: string,
  gene: string,
  pos: number,
  ref: string,
  alt: string,
  classification: string,
  stars: number,
): ClinVarNeighbor {
  return {
    accession,
    title: `${gene} p.${ref}${pos}${alt}`,
    classification,
    reviewStatus: null,
    stars,
    proteinPosition: pos,
    refAa: ref,
    altAa: alt,
  };
}

const BRCA1_LANDSCAPE: ClinVarNeighbor[] = [
  neighbor("VCV000017661", "BRCA1", 1699, "R", "W", "Pathogenic", 2),
  neighbor("VCV000037653", "BRCA1", 1699, "R", "Q", "Uncertain significance", 2),
  neighbor("VCV000055407", "BRCA1", 1756, "Q", "*", "Pathogenic", 3),
  neighbor("VCV000017677", "BRCA1", 1775, "M", "R", "Pathogenic", 3),
  neighbor("VCV000054621", "BRCA1", 1775, "M", "V", "Likely pathogenic", 2),
  neighbor("VCV000125742", "BRCA1", 61, "C", "G", "Pathogenic", 3),
  neighbor("VCV000267023", "BRCA1", 871, "P", "L", "Benign", 2),
  neighbor("VCV000125859", "BRCA1", 1038, "E", "G", "Benign", 2),
  neighbor("VCV000055259", "BRCA1", 1443, "E", "*", "Pathogenic", 2),
  neighbor("VCV000210361", "BRCA1", 693, "D", "N", "Uncertain significance", 1),
  neighbor("VCV000125660", "BRCA1", 1613, "S", "G", "Benign", 2),
];

const CFTR_LANDSCAPE: ClinVarNeighbor[] = [
  neighbor("VCV000007105", "CFTR", 508, "F", "del", "Pathogenic", 4),
  neighbor("VCV000053380", "CFTR", 470, "M", "V", "Benign", 2),
  neighbor("VCV000007149", "CFTR", 542, "G", "*", "Pathogenic", 3),
  neighbor("VCV000007121", "CFTR", 549, "G", "R", "Pathogenic", 3),
  neighbor("VCV000007136", "CFTR", 553, "R", "*", "Pathogenic", 3),
  neighbor("VCV000035939", "CFTR", 1092, "L", "F", "Uncertain significance", 1),
  neighbor("VCV000053445", "CFTR", 668, "V", "I", "Benign", 2),
  neighbor("VCV000007164", "CFTR", 1282, "W", "*", "Pathogenic", 3),
  neighbor("VCV000053386", "CFTR", 726, "R", "H", "Benign", 2),
  neighbor("VCV000038784", "CFTR", 27, "R", "W", "Uncertain significance", 1),
];

// MYH7 beta-myosin motor domain: pathogenic missense across the domain, with a
// pathogenic R403W at the query residue that drives PM5. This mirrors what the
// live ClinVar gene set returns, so the fixture and the live result agree
// (Uncertain Significance on automated evidence: PM5, PM2, PP3, but the local
// cluster is not dense enough to fire PM1). Illustrative accessions, real residues.
const MYH7_LANDSCAPE: ClinVarNeighbor[] = [
  neighbor("VCV000014093", "MYH7", 403, "R", "W", "Pathogenic", 2),
  neighbor("VCV000014095", "MYH7", 453, "R", "C", "Pathogenic", 3),
  neighbor("VCV000042846", "MYH7", 663, "R", "H", "Pathogenic", 2),
  neighbor("VCV000181722", "MYH7", 716, "G", "R", "Pathogenic", 2),
  neighbor("VCV000014106", "MYH7", 719, "R", "W", "Pathogenic", 3),
  neighbor("VCV000164322", "MYH7", 1100, "E", "K", "Benign", 2),
  neighbor("VCV000042900", "MYH7", 1382, "R", "Q", "Benign", 2),
];

export const FIXTURES: VariantFixture[] = [
  {
    keys: ["brca1:c.5266dupc", "rs80357906", "brca1 c.5266dupc", "brca1:c.5266dup"],
    label: "BRCA1 c.5266dupC (pathogenic frameshift)",
    normalized: {
      raw: "BRCA1:c.5266dupC",
      kind: "hgvs",
      rsid: "rs80357906",
      hgvsg: "NC_000017.11:g.43057063dup",
      hgvscList: ["NM_007294.4:c.5266dup"],
      hgvsp: "NP_009225.1:p.Gln1756ProfsTer74",
      vepInput: "NM_007294.4:c.5266dup",
      vepMode: "hgvs",
      chrom: "17",
      pos: 43057062,
      ref: "T",
      alt: "TG",
      gnomadVariantId: "17-43057062-T-TG",
    },
    consequence: {
      geneSymbol: "BRCA1",
      transcriptId: "NM_007294.4",
      mostSevereConsequence: "frameshift_variant",
      consequenceTerms: ["frameshift_variant"],
      isLof: true,
      lofType: "frameshift_variant",
      hgvsc: "NM_007294.4:c.5266dup",
      hgvsp: "NP_009225.1:p.Gln1756ProfsTer74",
      proteinPosition: 1756,
      aminoAcids: null,
      refAa: null,
      altAa: null,
      siftPrediction: null,
      siftScore: null,
      polyphenPrediction: null,
      polyphenScore: null,
      alphaMissenseScore: null, // frameshift: AlphaMissense scores missense only
      alphaMissenseClass: null,
      canonical: true,
    },
    frequency: {
      found: true,
      gnomadVariantId: "17-43057062-T-TG",
      genomeAf: 5.26e-5,
      exomeAf: 6.9e-5,
      globalAf: 6.9e-5,
      popmaxAf: 7.5e-5,
      popmaxPopulation: "nfe",
      filteringAf: null, // too rare for a robust faf95; falls back to popmax
      representativeAf: 7.5e-5,
      ac: 24,
      an: 348000,
    },
    clinvar: {
      queried: true,
      residuePosition: 1756,
      sameAaChange: [],
      sameResidueDifferentAa: [],
      geneVariants: BRCA1_LANDSCAPE,
    },
  },
  {
    keys: ["cftr:c.1408a>g", "rs213950", "cftr c.1408a>g", "cftr:p.met470val"],
    label: "CFTR c.1408A>G p.Met470Val (benign polymorphism)",
    normalized: {
      raw: "CFTR:c.1408A>G",
      kind: "hgvs",
      rsid: "rs213950",
      hgvsg: "NC_000007.14:g.117587806A>G",
      hgvscList: ["NM_000492.4:c.1408A>G"],
      hgvsp: "NP_000483.3:p.Met470Val",
      vepInput: "NM_000492.4:c.1408A>G",
      vepMode: "hgvs",
      chrom: "7",
      pos: 117559479,
      ref: "G",
      alt: "A",
      gnomadVariantId: "7-117559479-G-A",
    },
    consequence: {
      geneSymbol: "CFTR",
      transcriptId: "NM_000492.4",
      mostSevereConsequence: "missense_variant",
      consequenceTerms: ["missense_variant"],
      isLof: false,
      lofType: null,
      hgvsc: "NM_000492.4:c.1408A>G",
      hgvsp: "NP_000483.3:p.Met470Val",
      proteinPosition: 470,
      aminoAcids: "M/V",
      refAa: "M",
      altAa: "V",
      siftPrediction: "tolerated",
      siftScore: 0.34,
      polyphenPrediction: "benign",
      polyphenScore: 0.01,
      alphaMissenseScore: 0.049,
      alphaMissenseClass: "likely_benign",
      canonical: true,
    },
    frequency: {
      found: true,
      gnomadVariantId: "7-117559479-G-A",
      genomeAf: 0.5574,
      exomeAf: 0.4267,
      globalAf: 0.5574,
      popmaxAf: 0.62,
      popmaxPopulation: "eas",
      filteringAf: 0.872, // faf95 grpmax, well above BA1
      representativeAf: 0.872,
      ac: 840000,
      an: 1450000,
    },
    clinvar: {
      queried: true,
      residuePosition: 470,
      sameAaChange: [],
      sameResidueDifferentAa: [],
      geneVariants: CFTR_LANDSCAPE,
    },
  },
  {
    keys: ["brca1:c.5096g>a", "rs41293463", "brca1 c.5096g>a", "brca1:p.arg1699gln"],
    label: "BRCA1 c.5096G>A p.Arg1699Gln (reduced-penetrance VUS)",
    normalized: {
      raw: "BRCA1:c.5096G>A",
      kind: "hgvs",
      rsid: "rs41293463",
      hgvsg: "NC_000017.11:g.43063930C>T",
      hgvscList: ["NM_007294.4:c.5096G>A"],
      hgvsp: "NP_009225.1:p.Arg1699Gln",
      vepInput: "NM_007294.4:c.5096G>A",
      vepMode: "hgvs",
      chrom: "17",
      pos: 43051071,
      ref: "A",
      alt: "C",
      gnomadVariantId: "17-43051071-A-C",
    },
    consequence: {
      geneSymbol: "BRCA1",
      transcriptId: "NM_007294.4",
      mostSevereConsequence: "missense_variant",
      consequenceTerms: ["missense_variant"],
      isLof: false,
      lofType: null,
      hgvsc: "NM_007294.4:c.5096G>A",
      hgvsp: "NP_009225.1:p.Arg1699Gln",
      proteinPosition: 1699,
      aminoAcids: "R/Q",
      refAa: "R",
      altAa: "Q",
      siftPrediction: "deleterious",
      siftScore: 0.0,
      polyphenPrediction: "possibly_damaging",
      polyphenScore: 0.61,
      alphaMissenseScore: 0.734,
      alphaMissenseClass: "likely_pathogenic",
      canonical: true,
    },
    frequency: {
      found: true,
      gnomadVariantId: "17-43051071-A-C",
      genomeAf: 6.6e-6,
      exomeAf: 2.7e-6,
      globalAf: 6.6e-6,
      popmaxAf: 1.19e-4,
      popmaxPopulation: "afr",
      filteringAf: 3.98e-5, // faf95 grpmax: below BRCA1 BS1, so BS1 does not fire
      representativeAf: 3.98e-5,
      ac: 4,
      an: 610000,
    },
    clinvar: {
      queried: true,
      residuePosition: 1699,
      sameAaChange: [],
      sameResidueDifferentAa: [
        neighbor("VCV000017661", "BRCA1", 1699, "R", "W", "Pathogenic", 2),
      ],
      geneVariants: BRCA1_LANDSCAPE,
    },
  },
  {
    keys: ["myh7:c.1208g>a", "rs121913625", "myh7 c.1208g>a", "myh7:p.arg403gln"],
    label: "MYH7 c.1208G>A p.Arg403Gln (HCM motor-domain hotspot)",
    normalized: {
      raw: "MYH7:c.1208G>A",
      kind: "hgvs",
      rsid: "rs121913625",
      hgvsg: "NC_000014.9:g.23424584C>T",
      hgvscList: ["NM_000257.4:c.1208G>A"],
      hgvsp: "NP_000248.2:p.Arg403Gln",
      vepInput: "NM_000257.4:c.1208G>A",
      vepMode: "hgvs",
      chrom: "14",
      pos: 23424584,
      ref: "C",
      alt: "T",
      gnomadVariantId: "14-23424584-C-T",
    },
    consequence: {
      geneSymbol: "MYH7",
      transcriptId: "NM_000257.4",
      mostSevereConsequence: "missense_variant",
      consequenceTerms: ["missense_variant"],
      isLof: false,
      lofType: null,
      hgvsc: "NM_000257.4:c.1208G>A",
      hgvsp: "NP_000248.2:p.Arg403Gln",
      proteinPosition: 403,
      aminoAcids: "R/Q",
      refAa: "R",
      altAa: "Q",
      siftPrediction: "deleterious",
      siftScore: 0.0,
      polyphenPrediction: "probably_damaging",
      polyphenScore: 1.0,
      alphaMissenseScore: 0.998,
      alphaMissenseClass: "likely_pathogenic",
      canonical: true,
    },
    frequency: {
      found: false, // absent from gnomAD, consistent with a severe HCM allele (PM2)
      gnomadVariantId: "14-23424584-C-T",
      genomeAf: null,
      exomeAf: null,
      globalAf: 0,
      popmaxAf: 0,
      popmaxPopulation: null,
      filteringAf: null,
      representativeAf: 0,
      ac: 0,
      an: null,
    },
    clinvar: {
      queried: true,
      residuePosition: 403,
      sameAaChange: [], // R403Q itself is the query; not matched against itself
      sameResidueDifferentAa: [
        neighbor("VCV000014093", "MYH7", 403, "R", "W", "Pathogenic", 2),
      ],
      geneVariants: MYH7_LANDSCAPE,
    },
  },
];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findFixture(input: string): VariantFixture | undefined {
  const key = norm(input);
  return FIXTURES.find((f) => f.keys.some((k) => norm(k) === key));
}
