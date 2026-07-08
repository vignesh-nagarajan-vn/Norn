// Norn MCP server (stdio).
//
// Exposes Norn's interpretation pipeline and data as Model Context Protocol
// tools, so any MCP-capable client (Claude Desktop, an agent framework, or
// another research platform) can pull a variant interpretation, the benchmark
// set, or the ACMG criteria definitions directly into its own workflow.
//
// Run with:  npm run mcp   (needs the same env as the app, e.g. ANTHROPIC_API_KEY)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CRITERIA, MANUAL_CRITERIA, THRESHOLDS } from "../lib/acmg";
import { reportToContext } from "../lib/ask";
import { runPipeline } from "../lib/pipeline";
import { toClinvarSubmission } from "../lib/submission";
import evalDataset from "../data/eval-variants.json";

const server = new McpServer({ name: "norn", version: "0.1.0" });

const asText = (text: string) => ({ content: [{ type: "text" as const, text }] });

server.registerTool(
  "interpret_variant",
  {
    title: "Interpret a variant",
    description:
      "Run Norn's ACMG/AMP pipeline on a single human variant (HGVS like BRCA1:c.5266dupC, an rsID like rs80357906, or a locus like 17-43057062-A-AG). Returns the full interpretation: classification, ClinGen points, per-criterion verdicts with evidence and sources, and the reviewer checklist. Research use only.",
    inputSchema: {
      variant: z.string().describe("HGVS, rsID, or chrom-pos-ref-alt locus"),
      format: z.enum(["json", "text"]).optional().describe("json (default) returns the full report; text returns a compact summary"),
    },
  },
  async ({ variant, format }) => {
    const report = await runPipeline(variant, {});
    return asText(format === "text" ? reportToContext(report) : JSON.stringify(report, null, 2));
  },
);

server.registerTool(
  "list_eval_variants",
  {
    title: "List evaluation variants",
    description:
      "Return Norn's benchmark set of well-established variants with their expected ClinVar germline classification and accession, for validation or import into another platform.",
    inputSchema: {},
  },
  async () => asText(JSON.stringify(evalDataset, null, 2)),
);

server.registerTool(
  "list_acmg_criteria",
  {
    title: "List ACMG criteria",
    description:
      "Return the ACMG/AMP criteria Norn implements automatically plus the curator-supplied criteria, their ClinGen point values and strengths, and the documented frequency thresholds.",
    inputSchema: {},
  },
  async () =>
    asText(JSON.stringify({ automated: CRITERIA, curatorSupplied: MANUAL_CRITERIA, thresholds: THRESHOLDS }, null, 2)),
);

server.registerTool(
  "to_clinvar_submission",
  {
    title: "Draft a ClinVar submission",
    description:
      "Interpret a variant and return a draft ClinVar germline submission row (as JSON fields). A starting point for a curator, not a validated submission; requires human sign-off.",
    inputSchema: { variant: z.string().describe("HGVS, rsID, or locus") },
  },
  async ({ variant }) => {
    const report = await runPipeline(variant, {});
    return asText(JSON.stringify(toClinvarSubmission(report), null, 2));
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Norn MCP server running on stdio.");
}

main().catch((err) => {
  console.error("Norn MCP server failed to start:", err);
  process.exit(1);
});
