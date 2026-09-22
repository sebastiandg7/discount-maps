# Agent protocol: working for a non-technical owner

Read this before acting on any request that comes from the product owner or their team rather than from a developer. It defines what you may do alone, what needs a yes in chat, how to report, and what "done" means. The owner-facing counterpart is [owner-guide.md](owner-guide.md) (Spanish); the task catalogue is [recipes.md](recipes.md).

## 1. Who you are talking to

Assume the person cannot read code, does not know git, and will judge the work by the running product and by your summary. Consequences:

- Answer in the language they write in (usually Spanish). Product copy is always es-CO, code and docs English.
- Never ask them to run commands, edit files, or read diffs. If something only they can do (paste a secret, click in a dashboard, merge), give numbered click-by-click steps.
- Every technical term you cannot avoid gets a five-word gloss the first time ("PR, the change proposal you approve").
- Do not offer menus of options when a sensible default exists. Pick, say why in one line, proceed. Ask only when the answers lead to materially different products (see § 3).

## 2. Risk tiers

Classify every request before touching anything. When in doubt, go one tier up.

| Tier                                                                              | Examples                                                                                                                                                                                                              | You may                                                                                                                                                                 |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Green** — reversible, no data or money impact                                   | UI copy, colours, layout, icons, contact links, new read-only page, docs                                                                                                                                              | Do it end to end, ship a PR, report                                                                                                                                     |
| **Yellow** — changes behaviour or data shape, reversible with care                | New form field, new category, subscription price, trial length, coupon limits, push copy, a new migration that only **adds**                                                                                          | Do it, but state the rule change in plain words in the summary and cover it with tests (unit + pgTAP when SQL changes)                                                  |
| **Red** — destroys data, moves money, changes who can do what, or is hard to undo | Deleting users or businesses, refunds or manual charges, changing billing retry rules, migrations that drop or rewrite columns, auth/role gates, secrets, merging to `main`, anything on the production Wompi account | Explain what will happen and what cannot be undone, show the exact action, and **wait for an explicit "yes" in chat** before executing. One approval covers one action. |

The command guard (`scripts/agent-guard.mjs`, wired as a Claude Code hook) hard-blocks the worst red actions (force push, `git reset --hard`, `supabase db reset`, `DROP`/`TRUNCATE`, `DELETE` without `WHERE`, `gh pr merge`). A blocked command is not a bug to route around: it means "ask the owner".

## 3. When to stop and ask

Stop only when proceeding under any assumption would waste the work or harm data:

- The request conflicts with a rule in [product-rules.md](product-rules.md) (e.g. "let businesses publish with 2 coupons"). Explain the rule and its reason, propose the smallest change, ask.
- Two readings of the request produce different products (e.g. "cancel the subscription" of one user vs. the feature). Ask with two concrete options and a recommendation.
- It needs an input listed in [external-dependencies.md](external-dependencies.md) (a key, a URL, a secret). Do everything that does not depend on it, then ask for the input with exact steps.
- Red tier (§ 2).

Everything else: decide, note the assumption in the summary, go.

## 4. Definition of done

A request is done only when all of these hold; report which ones you could not meet and why.

1. The change is on the feature branch (never directly on `main`), formatted, and `lint + typecheck + test + build` are green (`NX_DAEMON=false CI=true pnpm nx run-many -t lint typecheck test build`, dev servers stopped first).
2. SQL changes: new migration pushed to the cloud project, types regenerated if the shape changed, `scripts/pgtap-remote.mjs` green, advisors unchanged, a pgTAP case for the new rule.
3. Rules that exist twice (Postgres + `@org/domain`) were changed in both places with tests.
4. Verified live in the in-app browser when the change is visible (recipes in [verification-playbook.md](verification-playbook.md)); state what was clicked and what was seen.
5. Docs updated in the same commit: `mvp-plan.md` progress/decision log, plus whichever doc describes the touched area; a new recurring task gets a row in [recipes.md](recipes.md).
6. Committed with a verification summary and pushed; PR body follows `.github/pull_request_template.md`.
7. The final chat message follows § 5.

## 5. How to report

End every task with this shape, in the owner's language, no code in prose:

1. **What changed**, in product terms (what a consumer or merchant now sees or can do).
2. **What was checked**: the live clicks and the automated checks, in one or two sentences each.
3. **What you must do** (only if something is pending): numbered steps with where to click or what to paste; never the value of a secret.
4. **How to undo** if it turns out wrong: usually "ask me to revert this change" (the `undo` skill), or the dashboard toggle.
5. The PR link.

Keep it under ~200 words unless a red-tier action needs more explanation. No architecture talk unless asked.

## 6. Data safety

- Cloud fixtures (`@discountmaps.test` accounts, Vault secrets) are documented in [database.md](database.md). Do not create new ones without listing them for pre-launch cleanup.
- Never run a data-changing query against the cloud project "to see what happens". Read first, show the rows that would change, then change with a `WHERE` on ids.
- Never handle secret values: not in commands, not in chat, not in files outside the gitignored `.env.local`. When a secret is needed, tell the owner the variable name and the file, and wait.
- Do not delete or rewrite migrations that were pushed. A mistake in a migration gets a new migration.

## 7. Branch and PR hygiene

- Work happens on a feature branch; one PR per topic. Merging is the owner's click, not yours (`gh pr merge` is blocked).
- Small, reviewable commits with a "Verification:" paragraph. Amend nothing that is pushed.
- Update the PR body when you add commits: the owner reads the body, not the commits.
- If the owner asks to "undo": `git revert` the commit(s) on the branch (or a new PR reverting a merged one). Never `reset --hard`, never force-push.

## 8. Language and tone in product copy

es-CO, informal "tú", short sentences, no anglicisms when a Spanish word exists ("cupón", "sede", "suscripción"). Money via `formatCop`, dates via `formatDate`. Error messages say what to do next, not what failed internally.
