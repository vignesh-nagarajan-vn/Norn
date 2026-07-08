# Norn MCP server

Norn ships a Model Context Protocol server so any MCP-capable client (Claude
Desktop, an agent framework, or another research platform) can pull a variant
interpretation, the benchmark set, or the ACMG criteria definitions directly
into its own workflow. This is how Norn's data gets imported into other tools.

The server is at [`mcp/server.ts`](../mcp/server.ts) and speaks stdio.

## Tools

| Tool | Arguments | Returns |
| --- | --- | --- |
| `interpret_variant` | `variant` (HGVS, rsID, or locus), optional `format` (`json` or `text`) | The full interpretation report, or a compact text summary. |
| `list_eval_variants` | none | The 20-variant benchmark set with expected ClinVar labels and accessions. |
| `list_acmg_criteria` | none | The automated and curator-supplied criteria, their ClinGen points, and the documented thresholds. |
| `to_clinvar_submission` | `variant` | A draft ClinVar germline submission row (JSON fields). A starting point, not a validated submission. |

`interpret_variant` runs the same pipeline as the web app, so it uses the two
Claude passes when `ANTHROPIC_API_KEY` is set and the labeled deterministic
fallback otherwise.

## Run it

```bash
npm install
npm run mcp        # starts the stdio server (needs the same env as the app)
```

## Connect from Claude Desktop

Add this to your Claude Desktop MCP config (adjust the path):

```json
{
  "mcpServers": {
    "norn": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/absolute/path/to/Norn",
      "env": { "ANTHROPIC_API_KEY": "sk-ant-...", "ANTHROPIC_MODEL": "claude-opus-4-8" }
    }
  }
}
```

Then ask the client to, for example, "interpret BRCA1:c.5266dupC with Norn" or
"list Norn's evaluation variants," and the results are available to that client.

## Scope

The server exposes read and interpretation tools only. It does not write to any
external database. Pushing a finalized classification into a submission format
(for example a ClinVar submission spreadsheet) or a lab system is on the roadmap
in the main README. As with the app, output is research and demonstration only.
