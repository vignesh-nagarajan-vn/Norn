"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getHistory, HISTORY_EVENT, type HistoryItem } from "@/lib/history";
import { usePrefs } from "./Prefs";
import { classColorVar, Icon, NornMark } from "./ui";
import type { Classification } from "@/lib/types";

type Page = "interpret" | "batch" | "eval" | "docs";

const NAV: { key: Page; label: string; href: string; icon: string }[] = [
  { key: "interpret", label: "Interpret", href: "/interpret", icon: "clinical_notes" },
  { key: "batch", label: "Batch", href: "/batch", icon: "dataset" },
  { key: "eval", label: "Evaluation", href: "/eval", icon: "analytics" },
  { key: "docs", label: "Docs", href: "/docs", icon: "menu_book" },
];

function TopNavLink({ href, active, children, external }: { href: string; active?: boolean; children: React.ReactNode; external?: boolean }) {
  const cls = active
    ? "text-secondary border-b-2 border-secondary pb-1"
    : "text-on-surface-variant hover:text-on-surface border-b-2 border-transparent pb-1 transition-colors";
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

function SidebarItem({ icon, label, href, active, onClick, external }: { icon: string; label: string; href?: string; active?: boolean; onClick?: () => void; external?: boolean }) {
  const base = "flex w-full items-center gap-3 rounded-md border-l-2 px-4 py-2.5 text-sm transition-colors";
  const cls = active
    ? `${base} border-secondary bg-secondary/10 font-semibold text-secondary`
    : `${base} border-transparent text-on-surface-variant hover:bg-surface-high hover:text-on-surface`;
  const inner = (<><Icon name={icon} size={20} /><span>{label}</span></>);
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} text-left`}>{inner}</button>;
  if (external && href) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
  return <Link href={href ?? "#"} className={cls}>{inner}</Link>;
}

function RecentList() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  useEffect(() => {
    const read = () => setItems(getHistory());
    read();
    window.addEventListener(HISTORY_EVENT, read);
    return () => window.removeEventListener(HISTORY_EVENT, read);
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="mt-4 px-2">
      <div className="label-caps mb-1 px-2">Recent threads</div>
      <div className="space-y-0.5">
        {items.slice(0, 6).map((it) => (
          <Link
            key={it.variant}
            href={`/interpret?v=${encodeURIComponent(it.variant)}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-on-surface-variant hover:bg-surface-high"
            title={`${it.classification} (${it.points > 0 ? "+" : ""}${it.points})`}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: classColorVar(it.classification as Classification) }} />
            <span className="mono truncate">{it.variant}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AppShell({
  active,
  onNew,
  onSearch,
  children,
}: {
  active: Page;
  onNew?: () => void;
  onSearch?: (variant: string) => void;
  children: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const { openSettings } = usePrefs();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Norn home">
            <NornMark size={26} className="text-secondary" />
            <span className="display text-2xl font-semibold tracking-tight text-on-surface">Norn</span>
          </Link>
          <nav className="hidden items-center gap-5 text-[15px] font-semibold md:flex">
            {NAV.map((n) => (
              <TopNavLink key={n.key} href={n.href} active={active === n.key}>{n.label}</TopNavLink>
            ))}
            <TopNavLink href="https://github.com/vignesh-nagarajan-vn/Norn" external>GitHub</TopNavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {onSearch && (
            <form
              className="relative hidden sm:block"
              onSubmit={(e) => { e.preventDefault(); if (q.trim()) onSearch(q.trim()); }}
            >
              <Icon name="search" size={18} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-outline" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Read a variant..."
                spellCheck={false}
                className="mono w-52 rounded-md border border-outline-variant bg-surface-low py-1.5 pl-8 pr-3 text-xs text-on-surface outline-none focus:border-secondary"
              />
            </form>
          )}
          <span className="hidden items-center gap-1.5 rounded-full border border-error/30 bg-error/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-caps text-error md:inline-flex">
            <Icon name="warning" size={14} /> Not for clinical use
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="z-20 hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-background px-3 py-6 md:flex">
          <div className="mb-6 px-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-bright text-secondary">
                <NornMark size={22} className="text-secondary" />
              </div>
              <div>
                <div className="display text-[16px] font-semibold leading-tight text-on-surface">Norn</div>
                <div className="text-xs text-on-surface-variant">ACMG copilot</div>
              </div>
            </div>
            <Link
              href="/interpret"
              onClick={onNew}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
            >
              <Icon name="add" size={18} /> New interpretation
            </Link>
          </div>

          <nav className="space-y-1">
            {NAV.map((n) => (
              <SidebarItem key={n.key} icon={n.icon} label={n.label} href={n.href} active={active === n.key} />
            ))}
          </nav>

          {active === "interpret" && (
            <div className="mt-4 px-2">
              <div className="label-caps mb-1 px-2">This report</div>
              <SidebarItem icon="biotech" label="Evidence" onClick={() => scrollToSection("evidence")} />
              <SidebarItem icon="fact_check" label="Checklist" onClick={() => scrollToSection("checklist")} />
            </div>
          )}

          <RecentList />

          <div className="mt-auto space-y-1 border-t border-outline-variant pt-4">
            <SidebarItem icon="settings" label="Settings" onClick={openSettings} />
            <SidebarItem icon="help" label="Support" href="https://github.com/vignesh-nagarajan-vn/Norn/issues" external />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto scroll-smooth bg-surface">{children}</main>
      </div>
    </div>
  );
}
