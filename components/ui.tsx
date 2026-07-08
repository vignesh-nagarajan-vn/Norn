import type { Classification, Direction, Strength, Verdict } from "@/lib/types";

export function Icon({
  name,
  className = "",
  fill = false,
  size,
}: {
  name: string;
  className?: string;
  fill?: boolean;
  size?: number;
}) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? "ms-fill" : ""} ${className}`}
      style={size ? { fontSize: size } : undefined}
      aria-hidden
    >
      {name}
    </span>
  );
}

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

export function classIcon(c: Classification): string {
  switch (c) {
    case "Pathogenic":
    case "Likely Pathogenic":
      return "warning";
    case "Uncertain Significance":
      return "help";
    case "Likely Benign":
    case "Benign":
      return "verified";
  }
}

export function acmgStrengthColor(strength: Strength): string {
  switch (strength) {
    case "Very Strong":
      return "var(--acmg-vs)";
    case "Strong":
      return "var(--acmg-s)";
    case "Moderate":
      return "var(--acmg-m)";
    case "Supporting":
      return "var(--acmg-sup)";
    case "Stand-alone":
      return "var(--benign)";
  }
}

export function StatusBadge({ classification }: { classification: Classification }) {
  const color = classColorVar(classification);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
      style={{
        background: `color-mix(in srgb, ${color} 12%, white)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 28%, white)`,
      }}
    >
      <Icon name={classIcon(classification)} size={16} fill />
      {classification}
    </span>
  );
}

export function VerdictChip({
  verdict,
  direction,
}: {
  verdict: Verdict;
  direction: Direction;
}) {
  if (verdict === "met") {
    const color = direction === "pathogenic" ? "var(--pathogenic)" : "var(--benign)";
    return (
      <span
        className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold"
        style={{
          background: `color-mix(in srgb, ${color} 12%, white)`,
          color,
          border: `1px solid color-mix(in srgb, ${color} 25%, white)`,
        }}
      >
        MET
      </span>
    );
  }
  if (verdict === "not_met") {
    return (
      <span className="inline-flex items-center rounded border border-outline-variant bg-surface-variant px-2 py-0.5 text-xs font-bold text-on-surface-variant">
        NOT MET
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold"
      style={{
        background: "color-mix(in srgb, var(--vus) 12%, white)",
        color: "var(--vus)",
        border: "1px solid color-mix(in srgb, var(--vus) 25%, white)",
      }}
    >
      UNKNOWN
    </span>
  );
}

export function ClaudeChip({ label = "Claude" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
      <Icon name="auto_awesome" size={14} />
      {label}
    </span>
  );
}
