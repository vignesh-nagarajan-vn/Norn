// gnomAD GraphQL client (dataset gnomad_r4) for population allele frequency.
// Endpoint: https://gnomad.broadinstitute.org/api
//
// Looks up a variant by rsID when available (exact, including indels) and
// otherwise by chrom-pos-ref-alt. Reads genome and exome global AF
// plus per-population counts, and derives a popmax (highest continental AF).
// The representative AF used against ACMG thresholds is the larger of the
// global and popmax values, approximating a filtering allele frequency.

import { cached } from "./cache";
import { fetchWithRetry, SourceError } from "./http";
import type { FrequencyEvidence } from "./types";

const ENDPOINT = "https://gnomad.broadinstitute.org/api";
const TTL = 1000 * 60 * 60;
const DATASET = "gnomad_r4";

// Major continental populations used for popmax.
const POPMAX_POPS = new Set(["afr", "amr", "eas", "nfe", "sas", "fin", "mid"]);

interface Populations {
  id: string;
  ac: number;
  an: number;
}
interface FreqBlock {
  ac: number | null;
  an: number | null;
  af: number | null;
  populations?: Populations[];
}
interface GnomadResponse {
  data?: {
    variant?: {
      variant_id?: string;
      genome?: FreqBlock | null;
      exome?: FreqBlock | null;
    } | null;
  };
  errors?: { message: string }[];
}

function query(byRsid: boolean): string {
  const varsDef = byRsid
    ? "$rsid: String!, $dataset: DatasetId!"
    : "$variantId: String!, $dataset: DatasetId!";
  const arg = byRsid ? "rsid: $rsid" : "variantId: $variantId";
  return `query VariantFreq(${varsDef}) {
    variant(${arg}, dataset: $dataset) {
      variant_id
      genome { ac an af populations { id ac an } }
      exome { ac an af populations { id ac an } }
    }
  }`;
}

function popmax(block: FreqBlock | null | undefined): {
  af: number | null;
  pop: string | null;
} {
  if (!block?.populations) return { af: null, pop: null };
  let best = -1;
  let bestPop: string | null = null;
  for (const p of block.populations) {
    if (!POPMAX_POPS.has(p.id)) continue;
    if (p.an > 0) {
      const af = p.ac / p.an;
      if (af > best) {
        best = af;
        bestPop = p.id;
      }
    }
  }
  return { af: best >= 0 ? best : null, pop: bestPop };
}

async function post(byRsid: boolean, value: string): Promise<GnomadResponse> {
  const body = JSON.stringify({
    query: query(byRsid),
    variables: byRsid
      ? { rsid: value, dataset: DATASET }
      : { variantId: value, dataset: DATASET },
  });
  const res = await fetchWithRetry(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    source: "gnomAD",
    timeoutMs: 12000,
    retries: 1,
  });
  return (await res.json()) as GnomadResponse;
}

function shape(json: GnomadResponse, fallbackId: string): FrequencyEvidence {
  const v = json.data!.variant!;
  const genomeAf = v.genome?.af ?? null;
  const exomeAf = v.exome?.af ?? null;
  const globalAf = Math.max(genomeAf ?? 0, exomeAf ?? 0);
  const pmGenome = popmax(v.genome);
  const pmExome = popmax(v.exome);
  const popmaxAf = Math.max(pmGenome.af ?? 0, pmExome.af ?? 0);
  const popmaxPopulation =
    (pmGenome.af ?? 0) >= (pmExome.af ?? 0) ? pmGenome.pop : pmExome.pop;
  const representativeAf = Math.max(globalAf, popmaxAf);
  return {
    found: true,
    gnomadVariantId: v.variant_id ?? fallbackId,
    genomeAf,
    exomeAf,
    globalAf,
    popmaxAf,
    popmaxPopulation,
    representativeAf,
    ac: (v.genome?.ac ?? 0) + (v.exome?.ac ?? 0),
    an: Math.max(v.genome?.an ?? 0, v.exome?.an ?? 0) || null,
  };
}

function absent(id: string): FrequencyEvidence {
  return {
    found: false,
    gnomadVariantId: id,
    genomeAf: null,
    exomeAf: null,
    globalAf: 0,
    popmaxAf: 0,
    popmaxPopulation: null,
    representativeAf: 0,
    ac: 0,
    an: null,
  };
}

export async function gnomadFrequency(ident: {
  variantId?: string | null;
  rsid?: string | null;
}): Promise<FrequencyEvidence> {
  const key = ident.rsid ?? ident.variantId;
  if (!key) throw new SourceError("gnomAD", "no identifier for gnomAD lookup");

  return cached(`gnomad:${key}`, TTL, async () => {
    // Prefer rsID; fall back to variantId on ambiguity or miss.
    const attempts: { byRsid: boolean; value: string }[] = [];
    if (ident.rsid) attempts.push({ byRsid: true, value: ident.rsid });
    if (ident.variantId) attempts.push({ byRsid: false, value: ident.variantId });

    let lastNotFoundId = ident.variantId ?? ident.rsid ?? key;
    for (const a of attempts) {
      const json = await post(a.byRsid, a.value);
      const onlyNotFound =
        json.errors && json.errors.every((e) => /not found/i.test(e.message));
      if (json.errors && !onlyNotFound) {
        // Real error (for example an ambiguous rsID); try the next attempt.
        continue;
      }
      if (json.data?.variant) {
        return shape(json, a.value);
      }
      lastNotFoundId = a.byRsid ? lastNotFoundId : a.value;
    }
    // Every attempt resolved to "not found": genuinely absent from gnomAD.
    return absent(lastNotFoundId);
  });
}

export function gnomadUrl(variantId: string): string {
  return `https://gnomad.broadinstitute.org/variant/${variantId}?dataset=${DATASET}`;
}
