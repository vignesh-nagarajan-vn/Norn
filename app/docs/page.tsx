"use client";

import AppShell from "@/components/AppShell";
import { PrefsProvider } from "@/components/Prefs";
import { Icon } from "@/components/ui";

function Code({ children }: { children: React.ReactNode }) {
  return <code className="mono rounded bg-surface-high px-1.5 py-0.5 text-[13px] text-on-surface">{children}</code>;
}

function Block({ children }: { children: string }) {
  return (
    <pre className="mono overflow-x-auto rounded-md border border-outline-variant bg-surface-low p-3 text-[12px] leading-relaxed text-on-surface">
      {children}
    </pre>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-outline-variant pt-6">
      <h2 className="mb-3 text-lg font-semibold text-on-surface">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-on-surface-variant">{children}</div>
    </section>
  );
}

const TOC = [
  ["overview", "Overview"],
  ["interpret", "Interpret a variant"],
  ["criteria", "How the classification is built"],
  ["curator", "Curator-supplied evidence"],
  ["ask", "Ask the copilot"],
  ["literature", "Literature"],
  ["batch", "Batch mode"],
  ["export", "Exports"],
  ["mcp", "MCP server"],
  ["settings", "Settings"],
  ["deploy", "Deployment"],
  ["limits", "Scope and limitations"],
];

function DocsInner() {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-20 pt-8">
      <div className="flex items-center gap-2">
        <Icon name="menu_book" className="text-secondary" />
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">Documentation</h1>
      </div>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-on-surface-variant">
        How to use Norn: interpreting variants, adding your own evidence, running batches, exporting, and connecting
        the MCP server. Norn is a research and demonstration tool, not a diagnostic device.
      </p>

      <nav className="mt-4 flex flex-wrap gap-2">
        {TOC.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-outline-variant px-3 py-1 text-xs text-on-surface-variant hover:border-secondary hover:text-secondary">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        <Section id="overview" title="Overview">
          <p>
            Norn drafts ACMG/AMP evidence for a human curator to confirm. It gathers evidence from Ensembl VEP,
            gnomAD, and ClinVar, adjudicates each criterion with Claude (or a labeled deterministic fallback when no
            API key is set), applies the ClinGen points framework in code, and runs a second Claude pass that
            critiques the draft.
          </p>
          <p>The final classification is always computed in code from the adjudicated verdicts, never taken from the model.</p>
        </Section>

        <Section id="interpret" title="Interpret a variant">
          <p>On the Interpret page, enter a variant in any of these forms:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>HGVS, for example <Code>BRCA1:c.5266dupC</Code></li>
            <li>rsID, for example <Code>rs80357906</Code></li>
            <li>Locus, for example <Code>17-43057062-A-AG</Code></li>
          </ul>
          <p>
            The pipeline lights up each stage (recode, VEP, gnomAD, ClinVar, adjudicate, review). If a public API is
            briefly unavailable, the bundled example fixtures keep the demo working. Unresolvable input returns a
            clear error rather than a misleading result.
          </p>
        </Section>

        <Section id="criteria" title="How the classification is built">
          <p>
            Norn adjudicates ten automated criteria: PVS1, PS1, PM1, PM2, PM5, PP3 (pathogenic) and BA1, BS1, BP4,
            BP7 (benign). Each maps to ClinGen Bayesian points; the total maps to a five-tier classification, with
            BA1 as a stand-alone benign override. PVS1 is firmed with gnomAD gene constraint, and PM1 is approximated
            from a local cluster of pathogenic ClinVar variants. Frequency thresholds are gene-specific where a rule
            is available.
          </p>
        </Section>

        <Section id="curator" title="Curator-supplied evidence">
          <p>
            Some criteria need evidence Norn cannot fetch (functional assays, segregation, de novo status, allelic
            phase). The report has a <strong className="text-on-surface">Curator-supplied evidence</strong> panel with
            toggles for PS2, PS3, PS4, PM3, PM6, PP1, BS3, and BS4. Applying one adds its points and the
            classification recomputes live, keeping the human in the loop.
          </p>
        </Section>

        <Section id="ask" title="Ask the copilot">
          <p>
            Each report includes a chat panel. Ask questions about that interpretation and Claude answers using only
            the report as its knowledge base, so it explains the call without inventing evidence. This needs
            <Code>ANTHROPIC_API_KEY</Code> set on the deployment.
          </p>
        </Section>

        <Section id="literature" title="Literature">
          <p>
            The Literature panel searches PubMed for the gene and protein change and lists recent papers. Norn does
            not read these itself; they help you supply criteria like PS3 and PP1.
          </p>
        </Section>

        <Section id="batch" title="Batch mode">
          <p>
            The Batch page interprets many variants at once. Paste a list (one per line) or upload a plain list, CSV,
            or VCF. Results fill a sortable worklist that you can export to CSV. Click any variant to open its full
            report.
          </p>
        </Section>

        <Section id="export" title="Exports">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-on-surface">Report PDF</strong>: a formatted report including the points meter and protein lollipop drawn as vector graphics.</li>
            <li><strong className="text-on-surface">Report JSON</strong>: the full structured report.</li>
            <li><strong className="text-on-surface">ClinVar submission (CSV)</strong>: a draft germline submission row. A starting point, not a validated submission; it requires human sign-off.</li>
          </ul>
        </Section>

        <Section id="mcp" title="MCP server">
          <p>Norn ships a Model Context Protocol server so other tools can pull its data. Tools:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><Code>interpret_variant</Code>: run the pipeline and return the report.</li>
            <li><Code>list_eval_variants</Code>: the benchmark set.</li>
            <li><Code>list_acmg_criteria</Code>: the criteria and thresholds.</li>
            <li><Code>to_clinvar_submission</Code>: a draft ClinVar submission row.</li>
          </ul>
          <p>Run it with:</p>
          <Block>{`npm install\nnpm run mcp`}</Block>
          <p>Connect from an MCP client (for example Claude Desktop):</p>
          <Block>{`{
  "mcpServers": {
    "norn": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/absolute/path/to/Norn",
      "env": { "ANTHROPIC_API_KEY": "sk-ant-..." }
    }
  }
}`}</Block>
        </Section>

        <Section id="settings" title="Settings">
          <p>
            Settings (in the sidebar) switch the classification colors between the design palette (pathogenic teal)
            and the clinical convention (pathogenic red), and toggle the per-criterion model reasoning. Preferences
            persist in your browser.
          </p>
        </Section>

        <Section id="deploy" title="Deployment">
          <p>Norn deploys on Vercel with no database. Set these environment variables, then redeploy:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><Code>ANTHROPIC_API_KEY</Code> (required for the Claude passes and the Ask panel).</li>
            <li><Code>ANTHROPIC_MODEL</Code> (optional, defaults to <Code>claude-opus-4-8</Code>).</li>
            <li><Code>NCBI_API_KEY</Code> (optional, raises ClinVar and PubMed rate limits).</li>
          </ul>
          <p>Vercel does not apply new environment variables to an existing deployment until you redeploy.</p>
        </Section>

        <Section id="limits" title="Scope and limitations">
          <p>
            Norn implements a subset of ACMG/AMP criteria automatically and leaves the evidence-dependent criteria to
            the curator. Thresholds and PM1 clustering are demonstration approximations. Computational evidence uses
            SIFT and PolyPhen concordance, not calibrated meta-predictors. Norn is not a diagnostic device and must
            not be used for clinical decisions.
          </p>
        </Section>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <PrefsProvider>
      <AppShell active="docs">
        <DocsInner />
      </AppShell>
    </PrefsProvider>
  );
}
