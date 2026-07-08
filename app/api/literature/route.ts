import type { NextRequest } from "next/server";
import { literatureTerm, searchLiterature } from "@/lib/pubmed";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Returns recent PubMed papers for a gene and optional protein change.
export async function POST(req: NextRequest) {
  let body: { gene?: string; proteinChange?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const gene = (body.gene ?? "").toString().trim();
  if (!gene) return Response.json({ error: "Provide a gene." }, { status: 400 });

  try {
    const hits = await searchLiterature(literatureTerm(gene, body.proteinChange ?? null));
    return Response.json({ hits });
  } catch (err) {
    return Response.json({ error: (err as Error).message, hits: [] });
  }
}
