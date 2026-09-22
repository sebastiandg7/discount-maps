# Workspace: layout, packages, commands

Nx 23 · pnpm 11 · TypeScript project references ("TS solution" setup) · Next.js 16 · React 19 · Tailwind v4.

## Layout

| Path                         | What it is                                                                                                    | Tags                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `apps/people-web`            | Consumer PWA (port 3000)                                                                                      | `type:app`, `scope:people`    |
| `apps/business-web`          | Merchant + admin PWA (port 3001)                                                                              | `type:app`, `scope:business`  |
| `packages/domain`            | Pure business rules, zod schemas, es-CO labels. No IO. Mirrors SQL logic.                                     | `type:domain`, `scope:shared` |
| `packages/supabase`          | Typed clients (`./browser`, `./server`, `./proxy`), generated `Database` types, role + storage helpers        | `type:data`, `scope:shared`   |
| `packages/ui`                | Shared React components + `theme.css` design tokens                                                           | `type:ui`, `scope:shared`     |
| `packages/maps`              | Google Maps components (`BusinessMap`, `PlaceAutocompleteInput`), geolocation hook, navigation deep links     | `type:ui`, `scope:shared`     |
| `packages/billing-wompi`     | Server-only Wompi client, integrity signature, webhook checksum (`import 'server-only'` in its index)         | `type:server`, `scope:people` |
| `supabase/`                  | Migrations, pgTAP tests, local config                                                                         |                               |
| `scripts/pgtap-remote.mjs`   | Runs pgTAP suites against the linked cloud project without Docker                                             |                               |
| `scripts/generate-icons.mjs` | Writes both apps' PWA icons (`public/icons/`) from an inline SVG with `sharp`; re-run after changing the mark |                               |
| `docs/`                      | This knowledge base; `mvp-plan.md` is the plan + progress source of truth                                     |                               |

Module boundaries are enforced by `@nx/enforce-module-boundaries` in `eslint.config.mjs`: `domain` depends on nothing; `data`/`ui` may depend on `domain`; `server` on `domain`+`data`; apps on everything. `scope:business` must never import `@org/billing-wompi` (lint error by design).

## Package wiring rules (TS solution)

- Libraries are consumed **as source**. Each `packages/*/package.json` points `exports` at `./src/*.ts`; apps declare them as `"@org/x": "workspace:*"` and list them in `next.config.js` `transpilePackages`.
- **Never add `paths` to `tsconfig.base.json`.** Add a workspace dependency instead, then `pnpm install`.
- **Relative imports inside packages are extension-less** (`./foo`, not `./foo.js`) and package tsconfigs use `module: esnext` + `moduleResolution: bundler`. Turbopack does not map `.js` specifiers onto `.ts` sources.
- After adding a dependency between projects run `NX_DAEMON=false pnpm nx sync` (updates tsconfig `references`); the dev server refuses to start when references are stale.
- `@org/supabase` subpaths: `@org/supabase` (types + pure helpers), `@org/supabase/browser`, `@org/supabase/server` (imports `server-only`), `@org/supabase/proxy` (for `src/proxy.ts`).
- Generated jest configs for libs without specs need `passWithNoTests: true`.
- React packages (`ui`, `maps`) need `lib: ["es2022","dom","dom.iterable"]` in `tsconfig.lib.json` and `tsconfig.spec.json`.

## Commands

Always run Nx with the daemon disabled on this machine (the daemon hangs):

```sh
NX_DAEMON=false CI=true pnpm nx run-many -t lint typecheck test build
NX_DAEMON=false pnpm nx format:write
NX_DAEMON=false pnpm nx sync
NX_DAEMON=false pnpm nx dev people-web --port 3000
NX_DAEMON=false pnpm nx dev business-web --port 3001
```

Database scripts (root `package.json`): `db:push`, `db:types:linked`, `db:test` (needs Docker), and `node scripts/pgtap-remote.mjs [file]` for cloud pgTAP (set `SUPABASE_PROJECT_REF` in an unlinked worktree). See [database.md](database.md).

Git worktrees (`.claude/worktrees/*`) share `node_modules` resolution rules but not the Supabase link nor `.env.local`; recreate the env files from `.env.example` with the public URL and publishable key (`pnpm supabase projects api-keys --project-ref <ref>`).

Dev servers for the in-app browser are declared in `.claude/launch.json` (`people-web`, `business-web`).

## Dev machine constraints

- **No Docker**: `supabase start` / `supabase test db` cannot run locally. Work against the linked cloud project.
- **No Python**: use Node for scripted edits. Beware of backslash loss when writing regexes through shell-quoted Node strings; prefer editing tools for regex literals.
- pnpm 11 blocks unapproved build scripts; `nx`, `@swc/core`, `sharp`, `@parcel/watcher`, `unrs-resolver` are allow-listed in `pnpm-workspace.yaml`.
- Line endings: files are LF; git prints CRLF warnings on Windows, ignore them.

## Environment files

`apps/*/.env.example` lists every variable. Copy to `.env.local` (gitignored). Public Supabase URL and publishable key can be fetched with `pnpm supabase projects api-keys --project-ref <ref>`; secret keys are pasted by the user, never by an agent. Full matrix in [mvp-plan.md § 5](mvp-plan.md).

## Styling

Tailwind v4 via `@tailwindcss/postcss`. Tokens are defined once in `packages/ui/src/theme.css` (`@theme`) and imported by each app's `global.css`, which also `@source`s the package directories. Use token classes (`bg-brand-500`, `text-ink-muted`, `rounded-card`, `rounded-pill`, `bg-surface-muted`, `text-danger`, `bg-success`) rather than raw colors.

## CI

`.github/workflows/ci.yml`: `pnpm/action-setup` (version from `packageManager` in `package.json`), `nrwl/nx-set-shas` (correct `NX_BASE`/`NX_HEAD` for PRs and pushes), `nx format:check`, `nx sync:check`, `nx affected -t lint test typecheck build`, plus a `database` job that starts a local Supabase stack (Docker is available on the runner) and runs `supabase test db`.
