<h1 align="center">skills.app</h1>

<p align="center">
  thecolab.ai's AI-Native Design System &mdash; a Next.js + shadcn/ui registry,
  plus a live explorer for Claude Code skills built over free, public New Zealand
  data sources.
</p>

<p align="center">
  <a href="#what-this-is"><strong>What this is</strong></a> ·
  <a href="#quickstart"><strong>Quickstart</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a> ·
  <a href="#the-registry"><strong>The registry</strong></a> ·
  <a href="#the-skills-explorer"><strong>Skills explorer</strong></a> ·
  <a href="#theming"><strong>Theming</strong></a> ·
  <a href="#file-structure"><strong>File structure</strong></a> ·
  <a href="#docs--recommendations"><strong>Docs</strong></a>
</p>
<br/>

## What this is

`skills.app` serves two purposes from one Next.js 16 app (App Router, Turbopack,
React 19, Tailwind v4):

1. **A shadcn/ui registry** &mdash; a themed, distributable set of UI primitives,
   branded components, and full-page blocks. Other projects (and
   [v0.dev](https://v0.dev)) install them with the `shadcn` CLI by fetching
   `/r/{name}.json` endpoints. [`registry.json`](./registry.json) is the single
   source of truth.
2. **A skills explorer** &mdash; browse, read, and **run** thecolab.ai's Claude
   Code skills. Each skill is a self-contained Python 3 CLI (standard library,
   zero dependencies) over a free, public NZ data source. Inspect the source,
   read the docs, then execute it live in a confined sandbox.

## Quickstart

One command clones the skills corpus and starts the app:

```bash
pnpm quickstart
```

This runs `pnpm install`, clones [`thecolab-ai/.skills`](https://github.com/thecolab-ai/.skills)
into a sibling `../.skills` directory (the skills explorer's data source), then
starts the dev server on [localhost:3000](http://localhost:3000). Re-running it
fast-forwards the skills to the latest commit. Requires `git`, `pnpm`, and
Python 3 (to run skills).

> Clone the skills into a different location with `SKILLS_DIR`, or point at a
> fork with `SKILLS_REPO`:
>
> ```bash
> SKILLS_REPO=https://github.com/your-org/.skills.git pnpm skills:clone
> ```

## Running locally

If you'd rather run the steps yourself:

```bash
pnpm install        # pnpm is required (packageManager: pnpm@10.x)
pnpm skills:clone   # clone/update ../.skills (the skills data source)
pnpm dev            # registry:build, then next dev on :3000
```

Your app runs on [localhost:3000](http://localhost:3000). No env vars are needed
for local dev. The skills explorer falls back to a bundled snapshot if
`../.skills` is absent, so `pnpm dev` alone still renders the UI.

| Command               | What it does                                                        |
| --------------------- | ------------------------------------------------------------------- |
| `pnpm quickstart`     | install + clone skills + `dev` (one-command setup)                  |
| `pnpm skills:clone`   | clone/update `../.skills` from `thecolab-ai/.skills`                |
| `pnpm dev`            | `registry:build`, then `next dev` on `:3000`                        |
| `pnpm build`          | `registry:build`, then `next build`                                 |
| `pnpm registry:build` | `shadcn build` &rarr; regenerates `public/r/*.json` from the registry |
| `pnpm lint`           | `biome check`                                                       |
| `pnpm lint:fix`       | `biome check --write`                                               |

> **The skills explorer reads from a sibling `../.skills/skills` directory** at
> request time (override with `SKILLS_DIR`). Without it, the app falls back to
> the bundled [`src/lib/skills-introspection.json`](./src/lib/skills-introspection.json)
> snapshot so the UI still renders.

## The registry

[`registry.json`](./registry.json) is the source of truth. `pnpm registry:build`
(the shadcn CLI) reads it and emits one JSON file per item into `public/r/`
(gitignored &mdash; always generated, never committed). Both `dev` and `build`
run this first, so `public/r/` is stale until you re-run the build after editing
`registry.json`.

Each item declares a `type` that drives where it appears and how it groups:

| `type`                | Meaning                                            |
| --------------------- | -------------------------------------------------- |
| `registry:theme`      | Design tokens / CSS vars (mirrors `globals.css`)   |
| `registry:ui`         | shadcn primitives                                  |
| `registry:component`  | Branded components                                 |
| `registry:block`      | Full-page compositions                             |

Items declare `files[]` (`path` + `target`) and `registryDependencies[]`
(absolute `/r/*.json` URLs). A block like `dashboard` lists every component it
composes as a dependency, so installing it pulls the whole tree.

### Open in v0

Each registry item exposes an **Open in v0** button. On a deployed instance it
redirects to [v0.dev](https://v0.dev) with a prepopulated prompt and a URL
pointing back to this registry's `/r/{name}.json` endpoint, giving v0 the file
content and metadata to start a chat with your component, theme, and related
code. The absolute URL is built from `VERCEL_PROJECT_PRODUCTION_URL` (auto-set on
Vercel).

## The skills explorer

The home page lists every skill discovered under `../.skills/skills`. Each skill
directory has a `SKILL.md` (frontmatter: `name`, `description`) and a Python CLI.

- **`src/lib/skills.ts`** &mdash; server-only manifest: reads skills via `fs`,
  parses frontmatter, detects required env vars / secrets, and assigns a
  category.
- **`src/lib/introspect.ts`** &mdash; discovers CLI arguments (by running
  `--help`) and caches the result.
- **`src/lib/skill-exec.ts`** &mdash; confined execution of a skill CLI.

### Execution guardrails

Running arbitrary skill CLIs is sandboxed in `skill-exec.ts`:

- Only scripts inside `<SKILLS_ROOT>/<skill>/scripts/` are ever executed.
- The skill name is validated against a strict pattern **and** must resolve to a
  real directory under `SKILLS_ROOT` (rejects path traversal / symlink escapes).
- Spawned with an argv array and `shell: false` &mdash; never an interpolated
  string.
- A minimal env is constructed (the server's secrets are **not** inherited); the
  user supplies any required keys per-run.
- Output is capped (512 KB/stream) and the process is killed on timeout (30 s) or
  buffer overflow.

### Skills API

| Route                                  | Purpose                                  |
| -------------------------------------- | ---------------------------------------- |
| `POST /api/run`                        | Start a confined skill run; returns a job id |
| `GET  /api/run/[id]`                   | Poll a run's status and accumulated output |
| `GET  /api/skills/[name]/introspect`  | Introspect a skill's CLI arguments       |

## Theming

Two places define the theme and **must be kept in sync**:
[`src/app/globals.css`](./src/app/globals.css) (Tailwind v4 `@import
"tailwindcss"` + `:root`/`.dark` oklch CSS vars &mdash; what the live site
renders) and the `theme` item's `cssVars` in [`registry.json`](./registry.json)
(what consumers receive on install). Editing one without the other makes the
shipped theme drift from the preview.

Brand palette: `brand-navy` (headings), `brand-indigo` (primary), `brand-cyan`
(links/highlights), `brand-orange` (accents). Type: Inter (body), Playfair
Display (headings), JetBrains Mono (code). Content uses British/NZ English; code
stays American.

### Authentication (optional)

To protect the `/r/:path*` JSON routes, set a `REGISTRY_AUTH_TOKEN` and add a
`middleware.ts` that checks a `token` search param:

```ts
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = { matcher: "/r/:path*" };

export function middleware(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token == null || token !== process.env.REGISTRY_AUTH_TOKEN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.next();
}
```

> This protects only the JSON routes, not the UI previews. v0 passes the token
> via the `token` search param on the `/r/{name}.json` URL.

## File structure

```
src/
  app/
    (registry)/          Public site (route group)
      page.tsx           Home — the skills browser
      skills/[name]/     Single-skill detail (read + run)
      registry/[name]/   Single registry item (install card + Open in v0)
      tokens/            Theme color & font preview
    demo/[name]/         Isolated live previews (iframe) for registry cards
    api/
      run/               Confined skill execution (start + poll)
      skills/[name]/     CLI introspection
  components/
    ui/                  shadcn/ui primitives
    registry/            Registry Starter application components
    skills/              Skills explorer UI (browser, cards, runner, viewers)
  lib/
    registry.ts          The only reader of registry.json
    skills.ts            Server-only skill manifest
    introspect.ts        CLI argument discovery
    skill-exec.ts        Confined CLI execution
    utils.ts             cn() + getPrompt() (v0 handoff)
registry/
  common/                Baseline files shipped to consumers (utils, globals, tsconfig)
  layouts/               v0 layouts referenced by registry.json
registry.json            Single source of truth for the registry
public/r/                Generated registry JSON (gitignored)
docs/recommendations/    Audits & proposed work (see below)
```

Import alias: `@/*` &rarr; `src/*`; `@/registry` &rarr; `registry.json`.

## Docs & recommendations

Project audits and proposed work live in
[`docs/recommendations/`](./docs/recommendations):

- [`upgrade-report.md`](./docs/recommendations/upgrade-report.md) &mdash; a
  prioritized, verified upgrade plan (dependencies, framework, tooling, code
  patterns), grouped into **Do now / Plan soon / Nice to have** with a batched
  execution order.

## Conventions

- **Biome** is the formatter + linter (not ESLint/Prettier): 2-space indent,
  double quotes, semicolons, trailing commas, always-parenthesized arrow params.
- shadcn config ([`components.json`](./components.json)): `new-york` style, RSC
  enabled, `lucide` icons, base color gray.
- `next.config.ts` sends `X-Robots-Tag: noindex` on all routes &mdash; this is a
  showcase/demo, intentionally not indexed.

---

Built on Vercel's [Registry Starter](https://github.com/vercel/registry-starter)
template. See [shadcn registry docs](https://ui.shadcn.com/docs/registry) for the
underlying format.
