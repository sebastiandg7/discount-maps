# Discount Maps — agent knowledge index

This file is a proxy, not a manual. It tells a coding agent which document to load for the task at hand so context stays small. Knowledge lives in `docs/`; keep this index short and keep the docs current in the same commit as the code they describe.

## Start here, every session

1. [docs/mvp-plan.md](docs/mvp-plan.md) — the plan and the **progress checklist**. It is the source of truth for what exists, what is next and every decision taken (dated log at the bottom). Tick items and log decisions there in the same commit as the code.
2. [docs/external-dependencies.md](docs/external-dependencies.md) — inputs only the owner can provide and what to do while they are missing.
3. [docs/agent-protocol.md](docs/agent-protocol.md) — **when the request comes from the owner or a non-technical operator** (most of them do): risk tiers, when to ask, definition of done, how to report. [docs/recipes.md](docs/recipes.md) maps their recurring requests to files and steps.

Slash commands in `.claude/skills/`: `/owner-request <text>` (full protocol for a plain-language request), `/ship` (docs → gate → commit → push → PR body), `/verify [area]`, `/status`, `/undo [target]`. A `PreToolUse` hook (`scripts/agent-guard.mjs`) blocks force pushes, hard resets, `db reset`, `DROP`/`TRUNCATE`, `DELETE` without `WHERE`, PR merges and Vault writes: a blocked command means "ask the owner", not "find another way".

## Ground rules

- Run Nx with `NX_DAEMON=false` (the daemon hangs on this machine). No Docker, no Python here.
- Database work targets the linked Supabase cloud project; never edit an applied migration, add a new one, push it, regenerate types, run the pgTAP runner and the advisors.
- Business rules live twice: Postgres is the authority, `@org/domain` mirrors it for the UI and tests. Change both.
- Secrets are pasted by the owner into gitignored `.env.local` files; agents never handle private keys or passwords.
- UI copy is Spanish (es-CO); code is English. `CouponCard` is the only coupon rendering.
- Before committing: format, then lint + typecheck + test + build must be green; verify features live when a browser check is possible.
- Commit on the feature branch at phase boundaries with a summary of what was verified.

## Load by task

| When you are…                                                                                | Read                                                                                                                                                            |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Running, generating or wiring anything with Nx / pnpm / TypeScript project references        | [docs/nx-guidelines.md](docs/nx-guidelines.md), [docs/workspace.md](docs/workspace.md)                                                                          |
| Writing a migration, policy, trigger, RPC or pgTAP test; touching Supabase config or types   | [docs/database.md](docs/database.md), [docs/product-rules.md](docs/product-rules.md)                                                                            |
| Working on login, sign-up, sessions, route gates, admin access, route groups                 | [docs/auth-and-roles.md](docs/auth-and-roles.md)                                                                                                                |
| Building pages, forms, components, styling, uploads, server actions                          | [docs/frontend-conventions.md](docs/frontend-conventions.md), [docs/product-rules.md](docs/product-rules.md)                                                    |
| Implementing or changing a business rule (coupons, subscriptions, QR, scoring, verification) | [docs/product-rules.md](docs/product-rules.md), [docs/mvp-plan.md § 3–4](docs/mvp-plan.md)                                                                      |
| Verifying a feature, driving the in-app browser, replaying sessions, running cloud tests     | [docs/verification-playbook.md](docs/verification-playbook.md)                                                                                                  |
| Starting a new phase or unblocking work                                                      | [docs/mvp-plan.md § 6](docs/mvp-plan.md), [docs/external-dependencies.md](docs/external-dependencies.md)                                                        |
| Integrating Wompi, Google Maps, Web Push, PWA                                                | [docs/mvp-plan.md § 5](docs/mvp-plan.md) (verified API facts), [docs/frontend-conventions.md](docs/frontend-conventions.md) (Payments, PWA + push, `@org/maps`) |
| Acting on a request from the owner / a non-technical operator; deciding whether to ask       | [docs/agent-protocol.md](docs/agent-protocol.md), [docs/recipes.md](docs/recipes.md)                                                                            |
| Explaining the product, the workflow or a PR to a non-technical person                       | [docs/owner-guide.md](docs/owner-guide.md) (Spanish; what they were told to expect)                                                                             |
| Closing a unit of work (docs, gate, commit, PR)                                              | `/ship` skill, [docs/agent-protocol.md § 4](docs/agent-protocol.md), `.github/pull_request_template.md`                                                         |

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
- [docs/agent-protocol.md](docs/agent-protocol.md) — risk tiers, when to ask, definition of done, reporting format, data safety
- [docs/recipes.md](docs/recipes.md) — recurring owner requests mapped to files, steps, checks and docs
- [docs/owner-guide.md](docs/owner-guide.md) — Spanish guide for the non-technical owner: how to ask, review, approve and undo
- [supabase/README.md](supabase/README.md) — CLI runbook for the cloud project and the (optional) local stack
