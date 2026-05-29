# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **shadcn/ui registry** built on Next.js 16 (App Router, Turbopack, React 19, Tailwind v4). It is both a deployable
showcase website AND a distributable component registry: other projects (and v0.dev) install components from it via the
`shadcn` CLI by fetching `/r/{name}.json` endpoints. The goal is an "AI-Native Design System" — a themed set of UI
primitives, components, and blocks that can be pulled into any shadcn project.

## Commands

```bash
pnpm dev              # registry:build, then next dev on :3000
pnpm build            # registry:build, then next build
pnpm registry:build   # pnpm dlx shadcn@latest build  → regenerates public/r/*.json from registry.json
pnpm lint             # biome check
pnpm lint:fix         # biome check --write
```

- **pnpm is required** (`packageManager: pnpm@10.x`). CI (`.github/workflows/pr.yml`) runs `build` then `lint` with
  `--frozen-lockfile --strict-peer-dependencies`.
- There is **no test runner wired up** despite `@testing-library/*` and `jsdom` being installed — no `test` script
  exists. Don't assume `pnpm test` works.
- No env vars are needed for local dev. `VERCEL_PROJECT_PRODUCTION_URL` is auto-set on Vercel and used to build the
  absolute `/r/{name}.json` URLs shown in the UI / `Open in v0` links.

## The registry pipeline (most important thing to understand)

`registry.json` is the single source of truth. `pnpm registry:build` (the shadcn CLI) reads it and emits one JSON file
per item into `public/r/` (gitignored — always generated, never committed). Both `dev` and `build` run this first, so
**`public/r/` is stale until you re-run the build after editing `registry.json`.**

Each item in `registry.json` has a `type` that drives where it appears in the UI and how it's grouped:
- `registry:style` — excluded from the UI (see `src/lib/registry.ts`)
- `registry:theme` — the `theme` item; holds all design tokens / CSS vars (mirrors `src/app/globals.css`)
- `registry:ui` — shadcn primitives → `getUIPrimitives()`
- `registry:component` — branded components → `getComponents()`
- `registry:block` — full-page compositions → `getBlocks()`

Items declare `files[]` (each with `path` + `target`) and `registryDependencies[]` (absolute `/r/*.json` URLs). A
block like `dashboard` lists every component it composes as a dependency, so installing it pulls the whole tree.

`registry.json` is aliased as `@/registry` (see `tsconfig.json` paths). `src/lib/registry.ts` is the only reader.

## Source layout & the two views of every item

Every registry item exists in three coordinated places — keep them in sync when adding one:

1. **`registry.json`** — the item entry (name, type, files, dependencies). The `name` is the key everything else
   joins on.
2. **The actual source file** under `src/components/` (`/ui` = shadcn primitives, top-level = branded components) or
   `registry/layouts/`.
3. **A demo** under `src/app/demo/[name]/` — `index.tsx` maps each registry `name` → a rendered `Demo` object. The
   demo's exported object key **must match the `registry.json` name exactly** (note kebab-case keys like
   `"alert-dialog"`, and the `switch`→`switchComponent` rename to avoid the reserved word).

### Routes (`src/app/`)
- `(registry)/` route group — the public site. `page.tsx` lists items by group; `registry/[name]/` renders a single
  item's install card + `Open in v0` button; `tokens/` previews theme colors and fonts.
- `demo/[name]/` — isolated live previews used by the registry cards (rendered in an iframe via `renderer.tsx`).
  `blocks/`, `components/`, `ui/` here hold the demo wrappers (not the shippable source — that lives in
  `src/components/`).

### Other dirs
- `registry/common/` & `registry/layouts/` — files distributed as-is to consumers (e.g. `minimal-layout.tsx` /
  `shell-layout.tsx` install to a consumer's `src/app/layout.tsx`; `utils.ts`, `globals.css`, `tsconfig.json` are
  baseline files for fresh installs).
- `src/lib/` — `registry.ts` (registry queries), `products.ts` (mock data for store/dashboard blocks), `utils.ts`
  (`cn()` + `getPrompt()` for the v0 handoff).

## Theming

Two places define the theme and **must be kept in sync**: `src/app/globals.css` (what the live site renders, Tailwind
v4 `@import "tailwindcss"` + `:root`/`.dark` oklch CSS vars) and the `theme` item's `cssVars` in `registry.json` (what
consumers receive on install). Editing one without the other makes the shipped theme drift from the preview.

## Conventions

- **Biome** is the formatter + linter (not ESLint/Prettier): 2-space indent, double quotes, semicolons, trailing
  commas, always-parenthesized arrow params. `useSortedClasses` (Tailwind class sorting) is on as a warning. Biome
  ignores `components/ui` and `public/r`.
- Import alias `@/*` → `src/*`. shadcn config (`components.json`): `new-york` style, RSC enabled, `lucide` icons,
  base color gray.
- `next.config.ts` sends `X-Robots-Tag: noindex` on all routes — this is a template/demo, intentionally not indexed.
- Content uses British/NZ English; code stays American (per the monorepo root `CLAUDE.md`).
