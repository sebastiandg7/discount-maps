# Discount Maps

Read [AGENTS.md](AGENTS.md) first. It is the knowledge index: ground rules, the progress source of truth (`docs/mvp-plan.md`), and which document to load for each kind of task. Do not duplicate knowledge here; add it to the right file under `docs/` and reference it from `AGENTS.md`.

The Nx tooling guidance that used to live in this file is now [docs/nx-guidelines.md](docs/nx-guidelines.md).

Requests usually come from a non-technical owner: follow [docs/agent-protocol.md](docs/agent-protocol.md) (risk tiers, when to ask, how to report) and use the skills in `.claude/skills/` (`/owner-request`, `/ship`, `/verify`, `/status`, `/undo`). A hook (`scripts/agent-guard.mjs`) blocks destructive commands; a block means ask the owner.
