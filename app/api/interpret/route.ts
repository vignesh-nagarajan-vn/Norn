import type { NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import type { PipelineEvent } from "@/lib/types";

// Node runtime so the pipeline can use standard fetch, timers, and the
// Anthropic SDK. 60s is the Vercel Hobby ceiling.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Streams newline-delimited JSON: one event per pipeline stage, then a final
// {"type":"result"} object with the full report.
export async function POST(req: NextRequest) {
  let variant = "";
  try {
    const body = (await req.json()) as { variant?: unknown };
    variant = String(body?.variant ?? "").trim();
  } catch {
    // fall through to the empty-input guard
  }

  if (!variant) {
    return new Response(JSON.stringify({ error: "Provide a variant to interpret." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const report = await runPipeline(variant, { emit: send });
        send({ type: "result", report });
      } catch (err) {
        send({ type: "error", message: (err as Error).message ?? "Pipeline failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
