---
name: status
description: Plain-language status of Discount Maps for the owner - what is done, what is in review, what is blocked on owner inputs, and the next recommended step. Reads the progress checklist, external dependencies, git and open PRs; changes nothing.
---

Produce a short status for a non-technical reader, in their language, without file names or commands.

1. Read the "Progress" section of `docs/mvp-plan.md` (phase lines and their checkboxes) and `docs/external-dependencies.md` (status column).
2. Run `git log --oneline -10`, `git status --short | head` (ignore autocrlf noise: trust `git diff --ignore-cr-at-eol --name-only`), and `gh pr list --state open --json number,title,url,isDraft` plus `gh pr checks <n>` for each open PR.
3. Answer with:
   - **Listo**: phases done, one line each in product terms (what people/merchants can do).
   - **En revisión**: open PRs with their link and whether checks pass.
   - **Depende de ti**: every "Missing" / "Not configured" row from external-dependencies, phrased as a numbered to-do with where to click; never ask for secret values in chat.
   - **Siguiente paso recomendado**: one sentence.
   - **Riesgos abiertos**: only if any (e.g. QA fixtures still on the cloud project before launch).

Keep it under ~250 words. Do not modify anything.
