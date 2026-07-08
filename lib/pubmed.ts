// Literature mining via NCBI PubMed E-utilities. Best-effort: returns the most
// relevant recent papers for a gene and protein change so the curator can jump
// straight to functional and case evidence Norn does not read itself.

import { cached } from "./cache";
import { fetchJson } from "./http";
import type { LiteratureHit } from "./types";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const TTL = 1000 * 60 * 60;

function authParams(): string {
  const key = process.env.NCBI_API_KEY;
  const base = "tool=norn&email=norn-app@example.com";
  return key ? `${base}&api_key=${encodeURIComponent(key)}` : base;
}

interface EsearchResp {
  esearchresult?: { idlist?: string[] };
}
interface EsummaryResp {
  result?: Record<string, { title?: string; pubdate?: string; source?: string } | string[]>;
}

export async function searchLiterature(term: string, retmax = 6): Promise<LiteratureHit[]> {
  const searchUrl =
    `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=${retmax}` +
    `&term=${encodeURIComponent(term)}&${authParams()}`;
  const search = await cached(`pubmed-search:${term}:${retmax}`, TTL, () =>
    fetchJson<EsearchResp>(searchUrl, { source: "PubMed esearch", timeoutMs: 10000 }),
  );
  const ids = search.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  const sumUrl = `${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}&${authParams()}`;
  const sum = await cached(`pubmed-summary:${ids.join(",")}`, TTL, () =>
    fetchJson<EsummaryResp>(sumUrl, { source: "PubMed esummary", timeoutMs: 10000 }),
  );
  const result = sum.result;
  if (!result) return [];

  const hits: LiteratureHit[] = [];
  for (const id of ids) {
    const rec = result[id];
    if (!rec || Array.isArray(rec)) continue;
    hits.push({
      pmid: id,
      title: rec.title ?? "(no title)",
      year: (rec.pubdate ?? "").split(" ")[0] || "",
      journal: rec.source ?? "",
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    });
  }
  return hits;
}

// Builds a focused query from a gene and an optional protein change.
export function literatureTerm(gene: string, proteinChange?: string | null): string {
  const g = `${gene}[gene]`;
  if (proteinChange) {
    const short = proteinChange.replace(/^.*:/, "").replace(/^p\./, "");
    return `${g} AND (${proteinChange} OR ${short})`;
  }
  return g;
}
