---
name: undo
description: Safely undo the last change (or a named commit / PR) with git revert on the feature branch or a reverting PR - never reset or force-push. Explains what comes back and what does not (data created meanwhile, applied migrations).
argument-hint: '[commit sha | PR number | last]'
---

Target: `$ARGUMENTS` (default: the last commit on the current branch).

1. Identify what will be reverted: `git log --oneline -5` (or `gh pr view <n> --json commits`). Summarise the change in product terms and name anything that will **not** come back: rows created since, migrations already applied to the cloud project (a revert needs a new migration that undoes the schema, never editing the old one), secrets the owner pasted.
2. If the target is unmerged and on the feature branch: `git revert --no-edit <sha>` (one per commit, newest first), re-run the gate (`ship` skill steps 2–3), push, update the PR body ("Reverted: …").
3. If the target is already merged into `main`: create a branch from `main`, `git revert --no-edit <merge sha> -m 1`, push, open a PR titled "Revert: <original title>" with the template; the owner merges.
4. If a migration must be undone: write a new forward migration that restores the previous shape, push it, run pgTAP, and say so explicitly.
5. Report per `docs/agent-protocol.md § 5`, including the PR link.

Never use `git reset --hard`, `git push --force`, or history rewriting (the guard hook blocks them anyway).
