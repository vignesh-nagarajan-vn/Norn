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

/*
  The Norn mark: three interlocked rings, the three fates bound together,
  reused as the wordmark glyph, in the sidebar, and on the copilot summary.
  Inherits `currentColor` unless a stroke is passed.
*/
export function NornMark({
  size = 28,
  className = "",
  stroke = "currentColor",
  strokeWidth = 1.8,
}: {
  size?: number;
  className?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden className={className}>
      <g stroke={stroke} strokeWidth={strokeWidth}>
        <circle cx="16" cy="11.4" r="6.6" />
        <circle cx="10.8" cy="20.2" r="6.6" />
        <circle cx="21.2" cy="20.2" r="6.6" />
      </g>
    </svg>
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
        background: `color-mix(in srgb, ${color} 14%, var(--surface-bright))`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 32%, var(--surface-bright))`,
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
        className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold tracking-wide"
        style={{
          background: `color-mix(in srgb, ${color} 14%, var(--surface-bright))`,
          color,
          border: `1px solid color-mix(in srgb, ${color} 28%, var(--surface-bright))`,
        }}
      >
        MET
      </span>
    );
  }
  if (verdict === "not_met") {
    return (
      <span className="inline-flex items-center rounded border border-outline-variant bg-surface-variant px-2 py-0.5 text-xs font-bold tracking-wide text-on-surface-variant">
        NOT MET
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold tracking-wide"
      style={{
        background: "color-mix(in srgb, var(--vus) 14%, var(--surface-bright))",
        color: "var(--vus)",
        border: "1px solid color-mix(in srgb, var(--vus) 28%, var(--surface-bright))",
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
