# Discount Maps

Subscription platform that connects consumers ("Persona") with local merchants ("Empresa") publishing exclusive coupons on category-filtered interactive maps. Consumers show a rotating QR at the store; merchants scan it to confirm the subscription is active.

## Apps

| App            | Audience                                                                 | Path                |
| -------------- | ------------------------------------------------------------------------ | ------------------- |
| `people-web`   | Consumers: maps, business profiles, coupon QR, account                   | `apps/people-web`   |
| `business-web` | Merchants: onboarding, coupon management, QR scanner, admin verification | `apps/business-web` |

Both are mobile-first installable PWAs built with Next.js 16 on Supabase, Wompi (Colombia) and Google Maps. Shared code lives in `packages/*` as `@org/*` workspace packages.

## Plan, progress and knowledge base

The full architecture, database schema, business rules and phased roadmap live in [docs/mvp-plan.md](docs/mvp-plan.md). The checklist at the top of that file is the source of truth for implementation progress. Working conventions and workflows are indexed by task in [AGENTS.md](AGENTS.md).

## Common commands

```sh
pnpm install
pnpm nx run-many -t lint typecheck test build
pnpm nx dev people-web
pnpm nx dev business-web
```

Local database (requires Docker): `pnpm db:start`, `pnpm db:reset`, `pnpm db:types`, `pnpm db:test`.
