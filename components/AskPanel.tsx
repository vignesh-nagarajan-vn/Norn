"use client";

import { useRef, useState } from "react";
import { SUGGESTED_QUESTIONS } from "@/lib/ask";
import type { NornReport } from "@/lib/types";
import { Icon } from "./ui";

type Msg = { role: "user" | "assistant"; content: string };

export default function AskPanel({ report }: { report: NornReport }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || loading) return;
    const history = messages;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, question, history }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      setMessages((m) => [...m, { role: "assistant", content: data.answer ?? data.error ?? "No answer returned." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "The request failed. Please try again." }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="forum" className="text-secondary" fill />
        <h3 className="text-[15px] font-semibold text-on-surface">Ask the copilot</h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded bg-secondary/10 px-2 py-0.5 text-[11px] font-medium text-secondary">
          <Icon name="auto_awesome" size={12} /> Claude
        </span>
      </div>

      {messages.length === 0 ? (
        <div>
          <p className="text-sm text-on-surface-variant">
            Ask about this interpretation. Claude answers using only this report as its knowledge base.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                disabled={loading}
                className="rounded-full border border-outline-variant px-3 py-1 text-xs text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-secondary/10 text-on-surface" : "bg-surface-low text-on-surface-variant"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="animate-norn-pulse rounded-lg bg-surface-low px-3 py-2 text-sm text-on-surface-variant">
                Thinking...
              </div>
            </div>
          )}
        </div>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this variant..."
          className="flex-1 rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary"
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-3">
          <Icon name="send" size={18} />
        </button>
      </form>
    </section>
  );
}
