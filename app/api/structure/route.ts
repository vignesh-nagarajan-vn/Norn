import type { NextRequest } from "next/server";

// Same-origin proxy for AlphaFold predicted structures. The client (Structure3D)
// fetches /api/structure?uniprot=... so there is no cross-origin dependency, and
// this resolves the current model version via the AlphaFold API (the direct file
// URL version bumps over time, e.g. v4 -> v6). The PDB is cached per warm
// serverless instance.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const cache = new Map<string, string>();

async function get(url: string, accept?: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: accept ? { "User-Agent": UA, Accept: accept } : { "User-Agent": UA },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

const PDB_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "public, max-age=3600, s-maxage=604800",
};

export async function GET(req: NextRequest) {
  const uniprot = (new URL(req.url).searchParams.get("uniprot") || "").toUpperCase().trim();
  if (!/^[A-Z0-9]{6,10}$/.test(uniprot)) {
    return Response.json({ error: "Invalid UniProt accession." }, { status: 400 });
  }
  const cached = cache.get(uniprot);
  if (cached) return new Response(cached, { headers: PDB_HEADERS });

  try {
    // Resolve the current pdbUrl from the API; fall back to a constructed URL.
    let pdbUrl = `https://alphafold.ebi.ac.uk/files/AF-${uniprot}-F1-model_v6.pdb`;
    try {
      const api = await get(`https://alphafold.ebi.ac.uk/api/prediction/${uniprot}`, "application/json");
      const json = (await api.json()) as Array<{ pdbUrl?: string }>;
      if (Array.isArray(json) && json[0]?.pdbUrl) pdbUrl = json[0].pdbUrl;
    } catch {
      /* use the constructed URL */
    }

    const res = await get(pdbUrl);
    const text = await res.text();
    if (!text.includes("ATOM ")) throw new Error("not a PDB");
    if (cache.size > 40) cache.clear();
    cache.set(uniprot, text);
    return new Response(text, { headers: PDB_HEADERS });
  } catch (err) {
    return Response.json({ error: `No structure for ${uniprot}: ${(err as Error).message}` }, { status: 502 });
  }
}
