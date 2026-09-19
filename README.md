# JetBlack Docs

A player-facing reference site for [Pokémon JetBlack](https://www.pokecommunity.com/threads/introducing-pokemon-jetblack-a-romhack-of-pokemon-black.535562/), a rom hack of Pokémon Black by EstrethAthema. Built to be looked up mid-playthrough, mostly on a phone: Pokédex, wild encounters, trainer rosters, item locations, move changes, evolutions, legendaries, Nuzlocke level caps, and version history.

## How it's built

Two independent stages:

```
data-source/*.txt  →  pipeline (parsers)  →  src/data/*.generated.json  →  Vite/Preact site  →  GitHub Pages
```

The `.txt` files in `data-source/` are the author's own documentation, dropped in as-is. The pipeline in `pipeline/` parses them into structured JSON committed to `src/data/`; the site in `src/` reads that JSON. The two never talk to each other directly — you can regenerate the data without touching the site, and vice versa.

## Updating to a new hack version

When a new JetBlack version comes out with updated documentation:

1. Replace the files in `data-source/` with the new version's `.txt` files (any filename — each parser identifies its file by content, not name).
2. Run:
   ```bash
   npm run build:data
   ```
   This regenerates every `src/data/*.generated.json` file and prints a summary with a diff against what was previously committed (species/routes/trainers counts, etc.) — a quick sanity check that the update actually picked up real content.
3. If a parser throws instead of finishing, it names the exact source file, line number, and the line's text. That means the new version's `.txt` changed some formatting the parser didn't expect — open `pipeline/parsers/`, find the parser named after the doc, and adjust its pattern. Each parser is intentionally strict about the shape it expects, specifically so drift like this surfaces immediately instead of silently producing wrong data.
4. Spot-check a few pages with `npm run dev`.
5. Commit (the generated JSON is checked in — its diff in `git log` doubles as a changelog of what the data pipeline actually picked up) and push to `main`. The GitHub Actions workflow rebuilds and republishes automatically.

## Project layout

```
data-source/            Raw .txt docs from the hack author (replace these to update)
pipeline/
  parsers/               One parser per source file, all sharing lib/text.ts + lib/errors.ts
  indices.ts             Cross-reference indexes built after parsing (Pokémon ↔ location, ↔ trainer)
  build.ts               Orchestrator — run via `npm run build:data`
  types.ts               Shapes shared between the pipeline and the frontend
src/
  data/*.generated.json  Pipeline output — commit this
  components/            Shared UI: nav, cards, stat bars, search, the split-flap header
  pages/                 One file per route
  lib/                   Small frontend-only helpers (data loading, search filter)
  styles/                Design tokens (tokens.css) and global styles
.github/workflows/deploy.yml   Builds and publishes to GitHub Pages on push to main
```

## Local development

```bash
npm install
npm run dev      # regenerates data, then starts Vite on localhost:5173
npm run build    # regenerates data, type-checks, builds dist/ for production
npm run preview  # serves the built dist/ locally
```

## Deploying

Push to `main` — the included GitHub Actions workflow builds the site and publishes it to GitHub Pages automatically. It assumes a **project page** (served at `https://<user>.github.io/<repo-name>/`); the workflow sets Vite's `base` from the repository name automatically, no manual config needed. In your repo settings, under **Pages**, set the source to **GitHub Actions**.

If you're instead publishing at the root of a `<user>.github.io` user/org page, remove the `BASE_PATH` env line in `.github/workflows/deploy.yml` and set `segmentCount = 0` in `public/404.html` (see the comment there — GitHub Pages has no server-side routing, so deep links like `/pokedex/serperior` need a small client-side redirect trick to work, and that trick needs to know how many path segments are the "base").

## Design notes

The visual identity leans on the hack's own name and content — "JetBlack" as an airport departure-board aesthetic (Mistralton City, the hack's airport city, gets its own sequence in-game) rather than a generic dark UI. Pokémon and trainer entries are styled as boarding-pass-style tickets; section headers do a one-time split-flap animation on load (respecting `prefers-reduced-motion`); the bottom navigation on mobile is a fixed 5-item bar with a "More" sheet for the rest, specifically to avoid the horizontal-tab-overflow problem common on similar community doc sites at phone width.
