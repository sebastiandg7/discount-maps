---
name: ship
description: Close a unit of work the Discount Maps way - docs in the same commit, full static gate with dev servers stopped, pgTAP if SQL changed, explicit-path staging, commit with a verification paragraph, push, PR body per the template, owner-language summary.
argument-hint: '[short title for the commit]'
---

Definition of done is `docs/agent-protocol.md § 4`. Run these in order and do not skip a failing step silently.

1. **Docs first**: tick / update `docs/mvp-plan.md` (progress line + a dated decision-log row for any approach change); update the doc that describes the touched area (`database.md`, `auth-and-roles.md`, `frontend-conventions.md`, `product-rules.md`, `verification-playbook.md`, `external-dependencies.md`, package READMEs); add a `docs/recipes.md` row if the task will recur.
2. **Stop dev servers** (`preview_stop` for every running preview). Building while `next dev` runs corrupts its cache.
3. **Gate**: restore any `next-env.d.ts` the dev server rewrote (`git checkout -- apps/*/next-env.d.ts`), then
   `NX_DAEMON=false pnpm nx format:write` and
   `NX_DAEMON=false CI=true pnpm nx run-many -t lint typecheck test build`. Fix and re-run until green.
4. **Database** (only if `supabase/` changed): `pnpm supabase db push --yes --linked --project-ref rurjvcrmgtrznezvwkih`, regenerate `packages/supabase/src/database.types.ts` if the shape changed, `SUPABASE_PROJECT_REF=rurjvcrmgtrznezvwkih node scripts/pgtap-remote.mjs`, `pnpm supabase db advisors --linked --project-ref rurjvcrmgtrznezvwkih --output-format json` (same warnings as before).
5. **Stage explicitly**: list real changes with `git diff --ignore-cr-at-eol --name-only` and `git ls-files --others --exclude-standard`; `git add` those paths only (autocrlf makes `git status` lie). Never `git add -A`.
6. **Commit** on the feature branch: title `$ARGUMENTS` (or a phase-style title), body with what changed and a `Verification:` paragraph, ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
7. **Push** (`git push origin <branch>`, never force) and **update the PR body** (`gh pr edit <n> --body-file <file>`) following `.github/pull_request_template.md`: "Resumen para el dueño" in the owner's language, then What changed / Verification / Owner actions / How to undo, ending with the Claude Code attribution line.
8. **Report** in chat per `docs/agent-protocol.md § 5`.
