// Ensembl REST clients: variant_recoder for normalization and VEP for
// molecular consequence, transcript, protein change, and in-silico scores.
// Docs: https://rest.ensembl.org

import { cached } from "./cache";
import { fetchJson, SourceError } from "./http";
import type { ConsequenceEvidence } from "./types";

const BASE = "https://rest.ensembl.org";
const TTL = 1000 * 60 * 60; // 1 hour

// Consequence terms that count as predicted loss of function for PVS1.
const LOF_TERMS = new Set([
  "transcript_ablation",
  "splice_acceptor_variant",
  "splice_donor_variant",
  "stop_gained",
  "frameshift_variant",
  "start_lost",
  "stop_lost",
]);

export type InputKind = "rsid" | "hgvs" | "locus" | "unknown";

export function classifyInput(raw: string): InputKind {
  const s = raw.trim();
  if (/^rs\d+$/i.test(s)) return "rsid";
  if (/:[cgmnpro]\./i.test(s)) return "hgvs";
  if (/^(chr)?[0-9xym]+[-:]\d+[-: ]/i.test(s)) return "locus";
  return "unknown";
}

export interface RecodeResult {
  rsid: string | null;
  hgvsg: string | null;
  hgvscList: string[];
  hgvsp: string | null;
  vcfString: string | null;
  chrom: string | null;
  pos: number | null;
  ref: string | null;
  alt: string | null;
  gnomadVariantId: string | null;
}

function firstString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0];
  return null;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string") return [v];
  return [];
}

// The recoder returns an array of objects keyed by allele. We flatten the
// first allele record that carries HGVS fields.
export async function recode(raw: string): Promise<RecodeResult> {
  const id = encodeURIComponent(raw.trim());
  const url = `${BASE}/variant_recoder/human/${id}?content-type=application/json`;
  const data = await cached(`recode:${raw}`, TTL, () =>
    fetchJson<unknown[]>(url, { source: "Ensembl variant_recoder", timeoutMs: 8000, retries: 1 }),
  );

  const empty: RecodeResult = {
    rsid: null,
    hgvsg: null,
    hgvscList: [],
    hgvsp: null,
    vcfString: null,
    chrom: null,
    pos: null,
    ref: null,
    alt: null,
    gnomadVariantId: null,
  };
  if (!Array.isArray(data) || data.length === 0) return empty;

  for (const element of data) {
    if (!element || typeof element !== "object") continue;
    for (const value of Object.values(element as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const rec = value as Record<string, unknown>;
      if (!("hgvsg" in rec) && !("hgvsc" in rec)) continue;

      const ids = asStringArray(rec.id);
      const rsid = ids.find((x) => /^rs\d+$/i.test(x)) ?? null;
      const hgvsg = firstString(rec.hgvsg);
      const hgvscList = asStringArray(rec.hgvsc);
      const hgvsp = firstString(rec.hgvsp);
      const vcfString = firstString(rec.vcf_string);

      let chrom: string | null = null;
      let pos: number | null = null;
      let ref: string | null = null;
      let alt: string | null = null;
      let gnomadVariantId: string | null = null;
      if (vcfString) {
        const parts = vcfString.split("-");
        if (parts.length === 4) {
          chrom = parts[0].replace(/^chr/i, "");
          pos = Number(parts[1]) || null;
          ref = parts[2];
          alt = parts[3];
          gnomadVariantId = `${chrom}-${pos}-${ref}-${alt}`;
        }
      }
      return { rsid, hgvsg, hgvscList, hgvsp, vcfString, chrom, pos, ref, alt, gnomadVariantId };
    }
  }
  return empty;
}

// Request MANE and canonical flags plus HGVS notation. Without mane/canonical,
// VEP does not mark the clinical transcript, and the picker can fall back to a
// non-canonical transcript with the wrong protein position (which then queries
// ClinVar for the wrong residue in PS1/PM5).
const VEP_PARAMS = "content-type=application/json&mane=1&canonical=1&hgvs=1";

export async function vepByHgvs(hgvs: string): Promise<unknown[]> {
  const url = `${BASE}/vep/human/hgvs/${encodeURIComponent(hgvs)}?${VEP_PARAMS}`;
  return cached(`vep-hgvs:${hgvs}`, TTL, () =>
    fetchJson<unknown[]>(url, { source: "Ensembl VEP", timeoutMs: 10000, retries: 1 }),
  );
}

export async function vepById(rsid: string): Promise<unknown[]> {
  const url = `${BASE}/vep/human/id/${encodeURIComponent(rsid)}?${VEP_PARAMS}`;
  return cached(`vep-id:${rsid}`, TTL, () =>
    fetchJson<unknown[]>(url, { source: "Ensembl VEP", timeoutMs: 10000, retries: 1 }),
  );
}

interface TranscriptConsequence {
  gene_symbol?: string;
  transcript_id?: string;
  consequence_terms?: string[];
  canonical?: number;
  mane_select?: string;
  sift_prediction?: string;
  sift_score?: number;
  polyphen_prediction?: string;
  polyphen_score?: number;
  protein_start?: number;
  amino_acids?: string;
  hgvsc?: string;
  hgvsp?: string;
  biotype?: string;
}

function pickTranscript(
  consequences: TranscriptConsequence[],
  mostSevere: string | undefined,
): TranscriptConsequence | null {
  if (consequences.length === 0) return null;
  const score = (c: TranscriptConsequence): number => {
    let s = 0;
    if (c.canonical === 1) s += 4;
    if (c.mane_select) s += 3;
    if (mostSevere && (c.consequence_terms ?? []).includes(mostSevere)) s += 2;
    if (c.biotype === "protein_coding") s += 1;
    return s;
  };
  return [...consequences].sort((a, b) => score(b) - score(a))[0];
}

export function parseVep(vep: unknown[]): ConsequenceEvidence {
  const empty: ConsequenceEvidence = {
    consequenceTerms: [],
    isLof: false,
  };
  if (!Array.isArray(vep) || vep.length === 0) return empty;
  const record = vep[0] as {
    most_severe_consequence?: string;
    transcript_consequences?: TranscriptConsequence[];
  };
  const mostSevere = record.most_severe_consequence;
  const tc = pickTranscript(record.transcript_consequences ?? [], mostSevere);
  if (!tc) {
    return {
      ...empty,
      mostSevereConsequence: mostSevere ?? null,
      consequenceTerms: mostSevere ? [mostSevere] : [],
      isLof: mostSevere ? LOF_TERMS.has(mostSevere) : false,
      lofType: mostSevere && LOF_TERMS.has(mostSevere) ? mostSevere : null,
    };
  }

  const terms = tc.consequence_terms ?? [];
  const lofType = terms.find((t) => LOF_TERMS.has(t)) ?? null;
  const amino = tc.amino_acids ?? null;
  let refAa: string | null = null;
  let altAa: string | null = null;
  if (amino && amino.includes("/")) {
    const [r, a] = amino.split("/");
    refAa = r || null;
    altAa = a || null;
  } else if (amino) {
    refAa = amino;
    altAa = amino;
  }

  return {
    geneSymbol: tc.gene_symbol ?? null,
    transcriptId: tc.transcript_id ?? null,
    mostSevereConsequence: mostSevere ?? null,
    consequenceTerms: terms,
    isLof: Boolean(lofType),
    lofType,
    hgvsc: tc.hgvsc ?? null,
    hgvsp: tc.hgvsp ?? null,
    proteinPosition: tc.protein_start ?? null,
    aminoAcids: amino,
    refAa,
    altAa,
    siftPrediction: tc.sift_prediction ?? null,
    siftScore: tc.sift_score ?? null,
    polyphenPrediction: tc.polyphen_prediction ?? null,
    polyphenScore: tc.polyphen_score ?? null,
    canonical: tc.canonical === 1,
  };
}

// Best-effort chrom-pos-ref-alt from a VEP payload, used to build a gnomAD
// variant id when the recoder did not return a vcf_string. Exact for SNVs;
// indels may not match gnomAD's minimal representation.
export function vepCoords(
  vep: unknown[],
): { chrom: string; pos: number; ref: string; alt: string } | null {
  if (!Array.isArray(vep) || vep.length === 0) return null;
  const r = vep[0] as {
    seq_region_name?: string | number;
    start?: number;
    allele_string?: string;
  };
  if (r.seq_region_name == null || r.start == null || !r.allele_string) return null;
  const parts = r.allele_string.split("/");
  if (parts.length !== 2) return null;
  return {
    chrom: String(r.seq_region_name).replace(/^chr/i, ""),
    pos: r.start,
    ref: parts[0],
    alt: parts[1],
  };
}

export { SourceError };
