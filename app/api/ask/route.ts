import type { NextRequest } from "next/server";
import { askAboutReport, hasApiKey, type AskMessage } from "@/lib/anthropic";
import { reportToContext } from "@/lib/ask";
import type { NornReport } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Answers a curator's question about one interpretation. The report is the
// assistant's only knowledge base; nothing is persisted server-side.
export async function POST(req: NextRequest) {
  let body: { report?: NornReport; question?: string; history?: AskMessage[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = (body.question ?? "").toString().trim();
  const report = body.report;
  if (!question || !report) {
    return Response.json({ error: "Provide a report and a question." }, { status: 400 });
  }

  if (!hasApiKey()) {
    return Response.json({
      live: false,
      answer:
        "The assistant needs ANTHROPIC_API_KEY set to answer questions about this interpretation. The report itself is still fully available above.",
    });
  }

  try {
    const answer = await askAboutReport(reportToContext(report), question, body.history ?? []);
    return Response.json({ live: true, answer });
  } catch (err) {
    return Response.json({ live: false, answer: `The assistant could not answer: ${(err as Error).message}` });
  }
}
