# Norn brand kit: the loom of fate

Norn is named for the Norse fates who read evidence and decree destiny. The identity leans into that without becoming fantasy: an archival, instrument-like feel that stays legible for a clinical reader. This folder holds the source assets; the live tokens are in [`app/globals.css`](../app/globals.css) and a reference copy is in [`tokens.css`](tokens.css).

## Logo

The mark is three interlocked rings, the three fates bound together. In code it is `NornMark` in [`components/ui.tsx`](../components/ui.tsx); the favicon is [`app/icon.svg`](../app/icon.svg).

| File | Use |
| --- | --- |
| [`logo/norn-mark.svg`](logo/norn-mark.svg) | primary mark, bronze on light |
| [`logo/norn-mark-ink.svg`](logo/norn-mark-ink.svg) | single-color ink (stamps, print) |
| [`logo/norn-mark-reverse.svg`](logo/norn-mark-reverse.svg) | paper mark on an ink tile (dark backgrounds) |
| [`logo/norn-wordmark.svg`](logo/norn-wordmark.svg) | mark plus "Norn" set in Fraunces |

Clear space: keep at least one ring-radius of space around the mark. Do not recolor the rings outside the palette below, do not fill them, and do not rotate the lockup.

## Color

Chrome is shared across every screen; classification colors switch by scheme (default is the clinical convention).

| Token | Hex | Role |
| --- | --- | --- |
| `--background` | `#f2ede2` | app canvas (warm vellum) |
| `--surface` / `--surface-bright` | `#fbf8f1` / `#fffdf8` | cards, insets |
| `--on-surface` | `#221d15` | ink text |
| `--on-surface-variant` | `#665d4c` | secondary text |
| `--outline-variant` | `#ddd3bf` | hairline rules |
| `--primary` | `#221d15` | ink buttons |
| `--secondary` | `#8a5a2b` | bronze thread accent (links, focus, active) |

Classification (clinical default): pathogenic `#dc2626`, VUS `#f59e0b`, benign `#16a34a`. Colorblind-safe and high-contrast schemes are in [`tokens.css`](tokens.css) and Settings.

## Type

- **Fraunces** (serif, 400 to 700) for display headings and the wordmark.
- **Inter** for UI and body.
- **JetBrains Mono** for variants, HGVS, and data.

All three load via `<link>` in [`app/layout.tsx`](../app/layout.tsx) (no `next/font`).

## Motif

A woven "thread of fate": the pipeline is beads on a thread, the points meter is a scale, and the landing has a drifting woven backdrop. Illustrations for slides and link previews:

| File | Use |
| --- | --- |
| [`illustrations/thread-weave.svg`](illustrations/thread-weave.svg) | woven backdrop panel |
| [`illustrations/rune-row.svg`](illustrations/rune-row.svg) | decorative divider (not a literal transcription) |
| [`illustrations/well-and-tree.svg`](illustrations/well-and-tree.svg) | emblem: the well of Urðr and the world tree |

## Dark mode

Dark is the default. It reverses the chrome (a warm near-black canvas, light text, a lighter bronze mark); a light theme is one toggle away, from the top bar or Settings. The theme changes chrome only; classification colors and the engine are unchanged. Tokens are in [`../app/globals.css`](../app/globals.css) under `:root[data-theme="dark"]`.

## Print and slides

The identity carries onto paper and slides:

- **One-page interpretation printout.** The PDF export ([`../lib/pdf.ts`](../lib/pdf.ts)) is a branded, clinical-standard report with the mark, a header and footer on every page, a classification chip, and vector graphs. Its chrome is fixed light so it prints the same in either theme.
- **Deck template.** [`slides/deck.html`](slides/deck.html) is a self-contained slide deck (title, what Norn is, the three fates, a sample result, closing). Open it in a browser, navigate with the arrow keys, or print to a landscape PDF. Duplicate a `.slide` to add slides. A rendered copy is served at `/deck.html` and embedded as a PDF slideshow (`public/norn-deck.pdf`) in the app's Docs tab.

## Social and icons

The Open Graph and Twitter cards, the apple-touch icon, and the maskable PWA icons are generated from these tokens and committed under [`app/`](../app) and [`public/icons/`](../public/icons). Regenerate them (and the README screenshots) whenever the identity changes; see the note in [`CLAUDE.md`](../CLAUDE.md).
