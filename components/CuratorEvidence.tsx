"use client";

import { MANUAL_CRITERIA } from "@/lib/acmg";
import { acmgStrengthColor, Icon } from "./ui";

export default function CuratorEvidence({
  applied,
  onToggle,
}: {
  applied: Record<string, boolean>;
  onToggle: (code: string) => void;
}) {
  const count = Object.values(applied).filter(Boolean).length;
  return (
    <section className="card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Icon name="edit_note" className="text-secondary" fill />
        <h3 className="text-[15px] font-semibold text-on-surface">Curator-supplied evidence</h3>
        <span className="ml-auto label-caps">{count} applied</span>
      </div>
      <p className="mb-3 text-xs text-on-surface-variant">
        Add ACMG criteria that need evidence Norn cannot fetch (functional, segregation, de novo, phase). The
        classification and points update live.
      </p>
      <div className="space-y-2">
        {MANUAL_CRITERIA.map((spec) => {
          const on = Boolean(applied[spec.code]);
          const color = spec.direction === "pathogenic" ? "var(--pathogenic)" : "var(--benign)";
          return (
            <label
              key={spec.code}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-2.5 transition-colors ${
                on ? "border-secondary bg-secondary/5" : "border-outline-variant hover:bg-surface-high"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(spec.code)}
                className="mt-0.5 h-4 w-4 rounded border-outline text-secondary focus:ring-secondary"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="mono text-sm font-bold" style={{ color: on ? color : "var(--on-surface)" }}>
                    {spec.code}
                  </span>
                  <span className="label-caps" style={{ color: acmgStrengthColor(spec.strength) }}>
                    {spec.strength}
                  </span>
                  <span
                    className="mono ml-auto text-xs font-semibold"
                    style={{ color: on ? color : "var(--outline)" }}
                  >
                    {spec.points > 0 ? `+${spec.points}` : spec.points} pts
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-on-surface-variant">
                  <span className="font-medium text-on-surface">{spec.name}.</span> {spec.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
