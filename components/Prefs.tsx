"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Icon } from "./ui";

export type ColorScheme = "mockup" | "clinical";

interface PrefsValue {
  colorScheme: ColorScheme;
  showReasoning: boolean;
  setColorScheme: (s: ColorScheme) => void;
  setShowReasoning: (b: boolean) => void;
  openSettings: () => void;
}

const Ctx = createContext<PrefsValue | null>(null);

export function usePrefs(): PrefsValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePrefs must be used within PrefsProvider");
  return c;
}

const STORAGE_KEY = "norn-prefs";

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("mockup");
  const [showReasoning, setShowReasoning] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.colorScheme === "mockup" || p.colorScheme === "clinical") setColorScheme(p.colorScheme);
        if (typeof p.showReasoning === "boolean") setShowReasoning(p.showReasoning);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.scheme = colorScheme;
  }, [colorScheme]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ colorScheme, showReasoning }));
    } catch {
      /* ignore */
    }
  }, [colorScheme, showReasoning, loaded]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  return (
    <Ctx.Provider value={{ colorScheme, showReasoning, setColorScheme, setShowReasoning, openSettings }}>
      {children}
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          colorScheme={colorScheme}
          setColorScheme={setColorScheme}
          showReasoning={showReasoning}
          setShowReasoning={setShowReasoning}
        />
      )}
    </Ctx.Provider>
  );
}

function Swatch({ colors }: { colors: string[] }) {
  return (
    <span className="flex gap-1">
      {colors.map((c) => (
        <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />
      ))}
    </span>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-secondary" : "bg-outline-variant"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-4" : "left-0.5"}`}
      />
    </button>
  );
}

function SettingsModal({
  onClose,
  colorScheme,
  setColorScheme,
  showReasoning,
  setShowReasoning,
}: {
  onClose: () => void;
  colorScheme: ColorScheme;
  setColorScheme: (s: ColorScheme) => void;
  showReasoning: boolean;
  setShowReasoning: (b: boolean) => void;
}) {
  const options: { key: ColorScheme; label: string; desc: string; colors: string[] }[] = [
    {
      key: "mockup",
      label: "Loom palette",
      desc: "Pathogenic teal, VUS amber, benign indigo (the Norn default).",
      colors: ["#10b981", "#f59e0b", "#6366f1"],
    },
    {
      key: "clinical",
      label: "Clinical convention",
      desc: "Pathogenic red, VUS amber, benign green (familiar to most curators).",
      colors: ["#dc2626", "#f59e0b", "#16a34a"],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-3">
          <div className="flex items-center gap-2">
            <Icon name="settings" size={20} className="text-on-surface-variant" />
            <h2 className="text-[15px] font-semibold text-on-surface">Settings</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-surface-high" aria-label="Close">
            <Icon name="close" size={20} className="text-on-surface-variant" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="label-caps mb-2">Classification colors</div>
            <div className="space-y-2">
              {options.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setColorScheme(o.key)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    colorScheme === o.key ? "border-secondary bg-secondary/5" : "border-outline-variant hover:bg-surface-high"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      colorScheme === o.key ? "border-secondary" : "border-outline"
                    }`}
                  >
                    {colorScheme === o.key && <span className="h-2 w-2 rounded-full bg-secondary" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-on-surface">{o.label}</span>
                      <Swatch colors={o.colors} />
                    </span>
                    <span className="mt-0.5 block text-xs text-on-surface-variant">{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-outline-variant pt-4">
            <div>
              <div className="text-sm font-medium text-on-surface">Show model reasoning</div>
              <div className="text-xs text-on-surface-variant">Display the one-line justification under each criterion.</div>
            </div>
            <Toggle on={showReasoning} onClick={() => setShowReasoning(!showReasoning)} />
          </div>
        </div>

        <div className="border-t border-outline-variant px-5 py-3 text-[11px] text-outline">
          Preferences are stored locally in your browser. The model id is set server-side via ANTHROPIC_MODEL.
        </div>
      </div>
    </div>
  );
}
