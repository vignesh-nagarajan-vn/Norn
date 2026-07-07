import type { Classification, Direction, Verdict } from "@/lib/types";

export function classColorVar(c: Classification): string {
  switch (c) {
    case "Pathogenic":
      return "var(--path)";
    case "Likely Pathogenic":
      return "var(--lpath)";
    case "Uncertain Significance":
      return "var(--vus)";
    case "Likely Benign":
      return "var(--lben)";
    case "Benign":
      return "var(--ben)";
  }
}

export function VerdictChip({
  verdict,
  direction,
}: {
  verdict: Verdict;
  direction: Direction;
}) {
  let text = "Unknown";
  let style: React.CSSProperties = {
    background: "#f1f3f7",
    color: "var(--muted)",
    border: "1px solid var(--line)",
  };
  if (verdict === "met") {
    const color = direction === "pathogenic" ? "var(--path)" : "var(--ben)";
    text = direction === "pathogenic" ? "Met (supports pathogenic)" : "Met (supports benign)";
    style = { background: `color-mix(in srgb, ${color} 12%, white)`, color, border: `1px solid color-mix(in srgb, ${color} 35%, white)` };
  } else if (verdict === "not_met") {
    text = "Not met";
    style = { background: "#f1f3f7", color: "var(--muted)", border: "1px solid var(--line)" };
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={style}
    >
      {text}
    </span>
  );
}

export function StrengthTag({ text }: { text: string }) {
  return (
    <span className="rounded border border-line bg-canvas px-1.5 py-0.5 text-[11px] font-medium text-muted">
      {text}
    </span>
  );
}

export function ConfidencePill({ confidence }: { confidence: string }) {
  const color =
    confidence === "High" ? "var(--ben)" : confidence === "Moderate" ? "var(--lpath)" : "var(--vus)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: `color-mix(in srgb, ${color} 12%, white)`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {confidence} confidence
    </span>
  );
}
