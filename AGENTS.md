# Discount Maps — agent knowledge index

This file is a proxy, not a manual. It tells a coding agent which document to load for the task at hand so context stays small. Knowledge lives in `docs/`; keep this index short and keep the docs current in the same commit as the code they describe.

## Start here, every session

1. [docs/mvp-plan.md](docs/mvp-plan.md) — the plan and the **progress checklist**. It is the source of truth for what exists, what is next and every decision taken (dated log at the bottom). Tick items and log decisions there in the same commit as the code.
2. [docs/external-dependencies.md](docs/external-dependencies.md) — inputs only the owner can provide and what to do while they are missing.

## Ground rules

- Run Nx with `NX_DAEMON=false` (the daemon hangs on this machine). No Docker, no Python here.
- Database work targets the linked Supabase cloud project; never edit an applied migration, add a new one, push it, regenerate types, run the pgTAP runner and the advisors.
- Business rules live twice: Postgres is the authority, `@org/domain` mirrors it for the UI and tests. Change both.
- Secrets are pasted by the owner into gitignored `.env.local` files; agents never handle private keys or passwords.
- UI copy is Spanish (es-CO); code is English. `CouponCard` is the only coupon rendering.
- Before committing: format, then lint + typecheck + test + build must be green; verify features live when a browser check is possible.
- Commit on the feature branch at phase boundaries with a summary of what was verified.

## Load by task

| When you are…                                                                                | Read                                                                                                          |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Running, generating or wiring anything with Nx / pnpm / TypeScript project references        | [docs/nx-guidelines.md](docs/nx-guidelines.md), [docs/workspace.md](docs/workspace.md)                        |
| Writing a migration, policy, trigger, RPC or pgTAP test; touching Supabase config or types   | [docs/database.md](docs/database.md), [docs/product-rules.md](docs/product-rules.md)                          |
| Working on login, sign-up, sessions, route gates, admin access, route groups                 | [docs/auth-and-roles.md](docs/auth-and-roles.md)                                                              |
| Building pages, forms, components, styling, uploads, server actions                          | [docs/frontend-conventions.md](docs/frontend-conventions.md), [docs/product-rules.md](docs/product-rules.md)  |
| Implementing or changing a business rule (coupons, subscriptions, QR, scoring, verification) | [docs/product-rules.md](docs/product-rules.md), [docs/mvp-plan.md § 3–4](docs/mvp-plan.md)                    |
| Verifying a feature, driving the in-app browser, replaying sessions, running cloud tests     | [docs/verification-playbook.md](docs/verification-playbook.md)                                                |
| Starting a new phase or unblocking work                                                      | [docs/mvp-plan.md § 6](docs/mvp-plan.md), [docs/external-dependencies.md](docs/external-dependencies.md)      |
| Integrating Wompi, Google Maps, Web Push, PWA (future phases)                                | [docs/mvp-plan.md § 5](docs/mvp-plan.md) (verified API facts), then add a doc here when the integration lands |

## Documents

- [docs/mvp-plan.md](docs/mvp-plan.md) — architecture, schema, rules, roadmap, progress, decision log
- [docs/workspace.md](docs/workspace.md) — layout, packages and tags, wiring rules, commands, machine constraints, env, styling, CI
- [docs/nx-guidelines.md](docs/nx-guidelines.md) — tool-generated Nx guidance (skills, generators, nx_docs)
- [docs/database.md](docs/database.md) — Supabase workflow, migration conventions, pgTAP, Vault, fixtures, gotchas
- [docs/auth-and-roles.md](docs/auth-and-roles.md) — clients, role mirroring, proxy gates, route groups, auth flows
- [docs/frontend-conventions.md](docs/frontend-conventions.md) — components, form patterns, Next 16 specifics, testing, tokens
- [docs/product-rules.md](docs/product-rules.md) — every rule and where it is enforced
- [docs/verification-playbook.md](docs/verification-playbook.md) — static, database and live verification recipes
- [docs/external-dependencies.md](docs/external-dependencies.md) — owner-provided inputs and workarounds
- [supabase/README.md](supabase/README.md) — CLI runbook for the cloud project and the (optional) local stack
