"use client";

import { useCallback, useRef, useState } from "react";
import { addHistory } from "@/lib/history";
import type {
  NornReport,
  PipelineEvent,
  StageName,
  StageStatus,
} from "@/lib/types";

export const STAGES: { key: StageName; label: string; sub: string }[] = [
  { key: "recode", label: "Recode", sub: "variant_recoder" },
  { key: "vep", label: "VEP", sub: "Ensembl consequence" },
  { key: "gnomad", label: "gnomAD", sub: "population frequency" },
  { key: "clinvar", label: "ClinVar", sub: "neighbor evidence" },
  { key: "adjudicate", label: "Adjudicate", sub: "Claude per criterion" },
  { key: "review", label: "Review", sub: "Claude critique" },
];

export interface StageState {
  status: StageStatus | "pending";
  detail?: string;
}

export type RunStatus = "idle" | "running" | "done" | "error";

function initialStages(): Record<StageName, StageState> {
  return {
    recode: { status: "pending" },
    vep: { status: "pending" },
    gnomad: { status: "pending" },
    clinvar: { status: "pending" },
    adjudicate: { status: "pending" },
    review: { status: "pending" },
  };
}

export function useInterpret() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [stages, setStages] = useState<Record<StageName, StageState>>(initialStages);
  const [report, setReport] = useState<NornReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const reset = useCallback(() => {
    if (running.current) return;
    setStatus("idle");
    setStages(initialStages());
    setReport(null);
    setError(null);
  }, []);

  const run = useCallback(async (variant: string) => {
    const v = variant.trim();
    if (!v || running.current) return;
    running.current = true;
    setStatus("running");
    setStages(initialStages());
    setReport(null);
    setError(null);

    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant: v }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.json().catch(() => ({ error: "Request failed." }));
        throw new Error(msg.error ?? `Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handle = (event: PipelineEvent) => {
        if (event.type === "stage") {
          setStages((prev) => ({
            ...prev,
            [event.stage]: { status: event.status, detail: event.detail },
          }));
        } else if (event.type === "result") {
          setReport(event.report);
          addHistory({
            variant: v,
            classification: event.report.result.classification,
            points: event.report.result.points,
            at: Date.now(),
          });
        } else if (event.type === "error") {
          setError(event.message);
        }
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            handle(JSON.parse(trimmed) as PipelineEvent);
          } catch {
            // ignore malformed partial line
          }
        }
      }
      if (buffer.trim()) {
        try {
          handle(JSON.parse(buffer.trim()) as PipelineEvent);
        } catch {
          // ignore trailing partial
        }
      }

      setStatus((s) => (s === "error" ? s : "done"));
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    } finally {
      running.current = false;
    }
  }, []);

  return { status, stages, report, error, run, reset };
}
