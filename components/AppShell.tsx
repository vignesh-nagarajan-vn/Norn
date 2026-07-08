"use client";

import Link from "next/link";
import { useState } from "react";
import { usePrefs } from "./Prefs";
import { Icon } from "./ui";

type SidebarKey = "interpretation" | "evidence" | "checklist" | "metrics";

function TopNavLink({
  href,
  active,
  children,
  external,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls = active
    ? "text-secondary border-b-2 border-secondary pb-1"
    : "text-on-surface-variant hover:text-secondary border-b-2 border-transparent pb-1 transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

function SidebarItem({
  icon,
  label,
  href,
  active,
  onClick,
  external,
}: {
  icon: string;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  external?: boolean;
}) {
  const base = "flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors";
  const cls = active
    ? `${base} bg-secondary text-on-secondary font-semibold`
    : `${base} text-on-surface-variant hover:bg-surface-high`;
  const inner = (
    <>
      <Icon name={icon} size={20} />
      <span>{label}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} text-left`}>
        {inner}
      </button>
    );
  }
  if (external && href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href ?? "#"} className={cls}>
      {inner}
    </Link>
  );
}

export default function AppShell({
  topActive,
  sidebarActive = "interpretation",
  onNew,
  onSearch,
  children,
}: {
  topActive: "search" | "eval";
  sidebarActive?: SidebarKey;
  onNew?: () => void;
  onSearch?: (variant: string) => void;
  children: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const { openSettings } = usePrefs();

  // Evidence and Checklist scroll to their sections in the report. The report
  // scrolls inside <main>, not the window, so use scrollIntoView directly
  // rather than a hash link (which the App Router router does not resolve here).
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Top app bar */}
      <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-extrabold tracking-tight text-primary">
            Norn
          </Link>
          <nav className="hidden items-center gap-5 text-[15px] font-semibold md:flex">
            <TopNavLink href="/" active={topActive === "search"}>
              Search
            </TopNavLink>
            <TopNavLink href="/eval" active={topActive === "eval"}>
              Evaluation
            </TopNavLink>
            <TopNavLink href="https://github.com/vignesh-nagarajan-vn/Norn" external>
              GitHub
            </TopNavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {onSearch && (
            <form
              className="relative hidden sm:block"
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) onSearch(q.trim());
              }}
            >
              <Icon
                name="search"
                size={18}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search genes, variants..."
                spellCheck={false}
                className="mono w-52 rounded-md border border-outline-variant bg-surface-low py-1.5 pl-8 pr-3 text-xs text-on-surface outline-none focus:border-secondary"
              />
            </form>
          )}
          <span className="hidden items-center gap-1.5 rounded-full border border-error/25 bg-error/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-caps text-error md:inline-flex">
            <Icon name="warning" size={14} />
            Not for clinical use
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="z-20 hidden w-64 shrink-0 flex-col border-r border-outline-variant bg-background px-3 py-6 md:flex">
          <div className="mb-6 px-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-on-primary">
                N
              </div>
              <div>
                <div className="text-[15px] font-bold leading-tight text-primary">Copilot</div>
                <div className="text-xs text-on-surface-variant">ACMG Assistant</div>
              </div>
            </div>
            <Link
              href="/"
              onClick={onNew}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              <Icon name="add" size={18} />
              New Interpretation
            </Link>
          </div>

          <nav className="flex-1 space-y-1">
            <SidebarItem
              icon="clinical_notes"
              label="Interpretation"
              href="/"
              active={sidebarActive === "interpretation"}
            />
            <SidebarItem icon="biotech" label="Evidence" onClick={() => scrollToSection("evidence")} />
            <SidebarItem icon="fact_check" label="Checklist" onClick={() => scrollToSection("checklist")} />
            <SidebarItem
              icon="analytics"
              label="Metrics"
              href="/eval"
              active={sidebarActive === "metrics"}
            />
          </nav>

          <div className="mt-auto space-y-1 border-t border-outline-variant pt-4">
            <SidebarItem icon="settings" label="Settings" onClick={openSettings} />
            <SidebarItem
              icon="help"
              label="Support"
              href="https://github.com/vignesh-nagarajan-vn/Norn/issues"
              external
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto scroll-smooth bg-surface">{children}</main>
      </div>
    </div>
  );
}
