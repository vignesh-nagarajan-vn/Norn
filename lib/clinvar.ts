// ClinVar access through NCBI E-utilities (esearch then esummary).
// Used for two purposes only:
//   (a) neighboring-variant evidence for PS1 and PM5 at the same residue, and
//   (b) a gene-wide variant set for the protein lollipop plot.
// A variant's own ClinVar classification is never fed into adjudication.
//
// Docs: https://www.ncbi.nlm.nih.gov/books/NBK25501/

import { cached } from "./cache";
import { fetchJson } from "./http";
import type { ClinVarEvidence, ClinVarNeighbor } from "./types";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const TTL = 1000 * 60 * 60;

const AA3_TO_1: Record<string, string> = {
  Ala: "A", Arg: "R", Asn: "N", Asp: "D", Cys: "C", Gln: "Q", Glu: "E",
  Gly: "G", His: "H", Ile: "I", Leu: "L", Lys: "K", Met: "M", Phe: "F",
  Pro: "P", Ser: "S", Thr: "T", Trp: "W", Tyr: "Y", Val: "V", Ter: "*",
};
const AA1_TO_3: Record<string, string> = Object.fromEntries(
  Object.entries(AA3_TO_1).map(([three, one]) => [one, three]),
);

function authParams(): string {
  const key = process.env.NCBI_API_KEY;
  const base = "tool=norn&email=norn-app@example.com";
  return key ? `${base}&api_key=${encodeURIComponent(key)}` : base;
}

function reviewStars(status: string | undefined | null): number | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes("practice guideline")) return 4;
  if (s.includes("expert panel")) return 3;
  if (s.includes("multiple submitters") && !s.includes("conflict")) return 2;
  if (s.includes("conflicting")) return 1;
  if (s.includes("single submitter")) return 1;
  if (s.includes("no assertion") || s.includes("no classification")) return 0;
  return null;
}

function isPathogenic(desc: string): boolean {
  const d = desc.toLowerCase();
  return d.includes("pathogenic") && !d.includes("conflicting") && !d.includes("benign");
}

interface EsearchResponse {
  esearchresult?: { idlist?: string[]; count?: string };
}
interface EsummaryRecord {
  accession?: string;
  title?: string;
  protein_change?: string;
  germline_classification?: { description?: string; review_status?: string };
  clinical_significance?: { description?: string; review_status?: string };
}
interface EsummaryResponse {
  result?: Record<string, EsummaryRecord | string[]>;
}

async function esearch(term: string, retmax: number): Promise<string[]> {
  const url =
    `${EUTILS}/esearch.fcgi?db=clinvar&retmode=json&retmax=${retmax}` +
    `&term=${encodeURIComponent(term)}&${authParams()}`;
  const json = await cached(`clinvar-search:${term}:${retmax}`, TTL, () =>
    fetchJson<EsearchResponse>(url, { source: "ClinVar esearch", timeoutMs: 10000 }),
  );
  return json.esearchresult?.idlist ?? [];
}

async function esummary(ids: string[]): Promise<ClinVarNeighbor[]> {
  if (ids.length === 0) return [];
  const url =
    `${EUTILS}/esummary.fcgi?db=clinvar&retmode=json` +
    `&id=${ids.join(",")}&${authParams()}`;
  const json = await cached(`clinvar-summary:${ids.join(",")}`, TTL, () =>
    fetchJson<EsummaryResponse>(url, { source: "ClinVar esummary", timeoutMs: 12000 }),
  );
  const result = json.result;
  if (!result) return [];
  const out: ClinVarNeighbor[] = [];
  for (const id of ids) {
    const rec = result[id];
    if (!rec || Array.isArray(rec)) continue;
    const cls =
      rec.germline_classification?.description ??
      rec.clinical_significance?.description ??
      "not provided";
    const review =
      rec.germline_classification?.review_status ??
      rec.clinical_significance?.review_status ??
      null;
    const parsed = parseProteinChange(rec.protein_change, rec.title);
    out.push({
      accession: rec.accession ?? id,
      title: rec.title ?? "",
      classification: cls,
      reviewStatus: review,
      stars: reviewStars(review),
      proteinPosition: parsed?.pos ?? null,
      refAa: parsed?.ref ?? null,
      altAa: parsed?.alt ?? null,
    });
  }
  return out;
}

// protein_change is single-letter (e.g. "M1775R"); title uses three-letter
// (e.g. "p.Met1775Arg"). Try the structured field first, then the title.
function parseProteinChange(
  proteinChange: string | undefined,
  title: string | undefined,
): { ref: string; pos: number; alt: string } | null {
  if (proteinChange) {
    const first = proteinChange.split(",")[0].trim();
    const m = first.match(/^([A-Z])(\d+)([A-Z*=])$/);
    if (m) return { ref: m[1], pos: Number(m[2]), alt: m[3] === "=" ? m[1] : m[3] };
  }
  if (title) {
    const m = title.match(/p\.([A-Z][a-z]{2})(\d+)([A-Z][a-z]{2}|Ter|\*|=)/);
    if (m) {
      const ref = AA3_TO_1[m[1]] ?? m[1];
      const altRaw = m[3];
      const alt =
        altRaw === "=" ? ref : (AA3_TO_1[altRaw] ?? altRaw.replace("Ter", "*"));
      return { ref, pos: Number(m[2]), alt };
    }
  }
  return null;
}

// The cDNA change from a ClinVar title, e.g. "NM_007294.4(BRCA1):c.5096G>A ...".
function parseCdna(title: string | undefined): string | null {
  if (!title) return null;
  const m = title.match(/:(c\.[A-Za-z0-9_>+.-]+)/);
  return m ? m[1] : null;
}

export async function clinvarNeighbors(
  gene: string,
  refAa: string,
  pos: number,
  altAa: string | null,
  queryCdna: string | null,
): Promise<Pick<ClinVarEvidence, "sameAaChange" | "sameResidueDifferentAa" | "residuePosition">> {
  const three = AA1_TO_3[refAa] ?? refAa;
  const term = `${gene}[gene] AND (${three}${pos} OR ${refAa}${pos})`;
  const ids = await esearch(term, 50);
  const records = await esummary(ids);

  const atResidue = records.filter((r) => r.proteinPosition === pos);
  // Exclude the query variant's own record so PS1 does not match the variant
  // against itself (anti-circularity). PS1 requires a different nucleotide
  // change that yields the same amino acid change.
  const isSelf = (r: ClinVarNeighbor) => Boolean(queryCdna) && parseCdna(r.title) === queryCdna;
  const sameAaChange = atResidue.filter(
    (r) => altAa && r.altAa === altAa && isPathogenic(r.classification) && !isSelf(r),
  );
  const sameResidueDifferentAa = atResidue.filter(
    (r) => (!altAa || r.altAa !== altAa) && isPathogenic(r.classification) && !isSelf(r),
  );
  return { residuePosition: pos, sameAaChange, sameResidueDifferentAa };
}

export async function clinvarGeneVariants(gene: string): Promise<ClinVarNeighbor[]> {
  const ids = await esearch(`${gene}[gene] AND single_gene[prop]`, 250);
  const records = await esummary(ids);
  // Keep variants with a parseable protein position for the lollipop plot.
  return records.filter((r) => r.proteinPosition != null);
}

export function clinvarVariantUrl(accession: string): string {
  return `https://www.ncbi.nlm.nih.gov/clinvar/variation/${accession.replace(/^VCV0*/i, "")}/`;
}

export function clinvarSearchUrl(gene: string, pos: number): string {
  return `https://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(`${gene}[gene] AND ${pos}`)}`;
}
