# Running Norn locally and deploying it

Norn is a Next.js 14 app with no database. Everything runs either in the browser or in server-side route handlers, and it deploys to Vercel with a single required environment variable. For an overview of the app start with the [README](../README.md); for the contributor and architecture map see [CLAUDE.md](../CLAUDE.md).

## Requirements

- Node 18.18 or newer.
- An Anthropic API key for the real Claude passes. This is optional: without it Norn uses a labeled deterministic fallback, so the app still runs end to end.

## Run it locally

```bash
git clone https://github.com/vignesh-nagarajan-vn/Norn.git
cd Norn
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000. The example chips work without any keys (they use bundled fixtures and the deterministic fallback). Setting `ANTHROPIC_API_KEY` switches the two reasoning passes to real Claude calls.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server on http://localhost:3000. |
| `npm run build` | Production build; also type-checks. Must pass before committing. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run mcp` | Start the stdio MCP server (needs the same env as the app). See [MCP.md](MCP.md). |

## Environment variables

Copy `.env.example` to `.env.local` and fill in what you need.

| Env var | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes, for real model passes | Enables the Claude adjudicator and reviewer, and the Ask panel. Without it, Norn uses the labeled deterministic fallback. |
| `ANTHROPIC_MODEL` | No | Model id. Defaults to `claude-opus-4-8`. Must be a model your key can access, or every call 404s. `claude-sonnet-4-6` is a faster, cheaper option. |
| `NCBI_API_KEY` | No | Raises NCBI E-utilities (ClinVar and PubMed) rate limits from 3 to 10 requests per second. |

Norn does not send `temperature` or the other sampling parameters, which Claude Opus 4.8 and 4.7 reject with a 400. If the live Claude calls fall back to the heuristic, confirm the key is set, the model id is one the key can access, and the deployment was redeployed after any environment change.

## Deploy on Vercel

Norn deploys on Vercel with no extra infrastructure. There is no database.

1. Import the repository into Vercel (framework preset: Next.js).
2. Set `ANTHROPIC_API_KEY`. Optionally set `ANTHROPIC_MODEL` and `NCBI_API_KEY`.
3. Deploy.

The heavy route (`/api/interpret`) runs on the Node runtime with `maxDuration = 60` and streams progress as newline-delimited JSON. Vercel does not apply new environment variables to an existing deployment until you redeploy.
