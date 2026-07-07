import Link from "next/link";

export default function SiteHeader({ active }: { active: "home" | "eval" }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "var(--brand)" }}>
            <span className="text-sm font-bold text-white">N</span>
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Norn</span>
          <span className="hidden text-[13px] text-faint sm:inline">variant interpretation copilot</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className={active === "home" ? "font-medium text-ink" : "text-muted hover:text-ink"}>
            Interpret
          </Link>
          <Link href="/eval" className={active === "eval" ? "font-medium text-ink" : "text-muted hover:text-ink"}>
            Eval
          </Link>
          <a
            href="https://github.com/vignesh-nagarajan-vn/Norn"
            target="_blank"
            rel="noreferrer"
            className="text-muted hover:text-ink"
          >
            GitHub
          </a>
          <span className="hidden rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-lpath md:inline">
            Research use only
          </span>
        </nav>
      </div>
    </header>
  );
}
