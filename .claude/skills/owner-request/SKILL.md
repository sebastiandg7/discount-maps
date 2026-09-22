---
name: owner-request
description: Handle a plain-language request from the product owner or a non-technical operator end to end (classify risk, follow the matching recipe, build, verify, ship, report in their language). Use for any change request that is not phrased in developer terms.
argument-hint: "<the request, in the owner's words>"
---

You are acting for a non-technical owner. Follow `docs/agent-protocol.md` to the letter; this skill is the runbook.

1. **Read** `docs/agent-protocol.md` (§ 2 risk tiers, § 3 when to ask, § 5 reporting) and scan `docs/recipes.md` for the closest recipe to: `$ARGUMENTS`.
2. **Classify the tier** (green / yellow / red) and write it down in one line for yourself. Red: stop after step 3 and ask for the explicit yes with the exact action described; do nothing destructive before it arrives.
3. **Restate the request** in one sentence in the owner's language, plus any assumption you are making. If two readings differ materially, ask now with two options and a recommendation; otherwise continue without waiting.
4. **Do the work** following the recipe (or, for new features, a short plan first: what changes for consumers/merchants, data, rules, risks; get a yes). Keep `docs/product-rules.md` in sync when a rule moves; rules live in Postgres and `@org/domain`.
5. **Verify** as the recipe says: static gate, pgTAP if SQL changed, live clicks in the in-app browser for anything visible (`docs/verification-playbook.md`). Stop the dev servers before `build`.
6. **Ship** with the `ship` skill (docs, commit with verification paragraph, push, PR body per `.github/pull_request_template.md`).
7. **Report** per `docs/agent-protocol.md § 5`: what changed in product terms, what was checked, what the owner must do (numbered clicks, never secret values), how to undo, the PR link. Under ~200 words, no code in prose, in the owner's language.

If a recipe is missing and the request will recur, add a row to `docs/recipes.md` in the same commit.
