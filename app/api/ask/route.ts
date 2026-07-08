import type { NextRequest } from "next/server";
import { askAboutReport, hasApiKey, modelName, type AskMessage } from "@/lib/anthropic";
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
      needsKey: true,
      answer:
        "The assistant needs ANTHROPIC_API_KEY set to answer questions about this interpretation. The report itself is still fully available above.",
    });
  }

  try {
    const answer = await askAboutReport(reportToContext(report), question, body.history ?? []);
    return Response.json({ live: true, answer });
  } catch (err) {
    // The key IS set but the call failed. The most common cause is that
    // ANTHROPIC_MODEL is not a model this key can access (a 404), so say so
    // instead of blaming a missing key.
    const message = (err as Error).message;
    return Response.json({
      live: false,
      needsKey: false,
      error: message,
      answer:
        `The Claude call failed: ${message}. The API key is set, so this usually means ANTHROPIC_MODEL (currently ${modelName()}) ` +
        "is not a model this key can access, or the deployment was not redeployed after the variables changed. " +
        "Set ANTHROPIC_MODEL to a model your key can use (for example claude-sonnet-4-6) and redeploy.",
    });
  }
}
