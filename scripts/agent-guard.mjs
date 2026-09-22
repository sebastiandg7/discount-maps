// Claude Code PreToolUse hook: blocks the shell commands that docs/agent-protocol.md
// reserves for the owner. Reads the hook JSON on stdin; exit 2 + stderr = block.
// Wired in .claude/settings.json. Test: echo '{"tool_input":{"command":"git push -f"}}' | node scripts/agent-guard.mjs
import { readFileSync } from 'node:fs';

const SOURCE_DIRS =
  /^(?:\.\/)?(supabase\/migrations|docs|apps|packages|\.git)(\/|$)/;
const BUILD_OUTPUT =
  /(^|\/)(\.next|node_modules|dist|out-tsc|\.nx|coverage|test-output)(\/|$)/;

/** `rm -rf <target>` / `Remove-Item -Recurse <target>` where a target is a source folder. */
const recursiveSourceDelete = {
  test(command) {
    const m =
      /\b(?:rm\s+-[a-z]*r[a-z]*|Remove-Item\b[^|;&]*?-Recurse)\s+([^|;&]*)/i.exec(
        command,
      );
    if (!m) return false;
    const targets = m[1]
      .split(/\s+/)
      .filter((t) => t && !t.startsWith('-'))
      .map((t) => t.replace(/^["']|["']$/g, ''));
    return targets.some((t) => SOURCE_DIRS.test(t) && !BUILD_OUTPUT.test(t));
  },
};

const RULES = [
  [
    /\bgit\s+push\b[^|;&]*\s(-f|--force|--force-with-lease)\b/,
    'force push rewrites shared history',
  ],
  [
    /\bgit\s+reset\s+--hard\b/,
    'git reset --hard discards work; use git revert',
  ],
  [
    /\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/,
    'checking out "." throws away every local change; name the files',
  ],
  [/\bgit\s+clean\b/, 'git clean deletes untracked files'],
  [
    /\bgit\s+stash(\s*$|\s+(pop|drop|clear)\b)/,
    'bare git stash / pop / drop are unsafe with shared worktrees (use `git stash push -m`, `apply`)',
  ],
  [/\bgit\s+branch\s+-D\b/, 'force-deleting a branch loses commits'],
  [
    /\bgh\s+pr\s+merge\b/,
    "merging is the owner's click (docs/agent-protocol.md § 7)",
  ],
  [/\bgh\s+repo\s+delete\b/, 'never delete the repository'],
  [/\bsupabase\b[^|;&]*\bdb\s+reset\b/, 'supabase db reset wipes a database'],
  [
    /\bsupabase\b[^|;&]*\b(projects|branches)\s+delete\b/,
    'never delete Supabase projects or branches',
  ],
  [
    /\b(drop\s+(table|schema|database|type|function|trigger|policy)|truncate\s+)/i,
    'DROP / TRUNCATE destroy data: needs a new migration reviewed by the owner',
  ],
  [
    /\bdelete\s+from\s+[\w."]+\s*(;|$|"|')/i,
    'DELETE without WHERE removes every row',
  ],
  [
    /\bdelete\s+from\s+auth\.users\b(?![\s\S]*\bwhere\b)/i,
    'DELETE from auth.users without WHERE',
  ],
  [/\brm\s+-rf?\s+(\/|~|\.)(\s|$)/, 'recursive delete of a root folder'],
  [
    recursiveSourceDelete,
    'recursive delete inside source folders (build output like .next / dist / node_modules is fine)',
  ],
  [
    /\bvault\.(update_secret|create_secret)\s*\(\s*'[^']+'/i,
    'Vault secret values are typed by the owner in the SQL editor, never by the agent',
  ],
];

let input = '';
try {
  input = readFileSync(0, 'utf8');
} catch {
  process.exit(0);
}
let command = '';
try {
  const json = JSON.parse(input);
  command = String(json?.tool_input?.command ?? '');
} catch {
  process.exit(0);
}
if (!command) process.exit(0);

for (const [pattern, reason] of RULES) {
  if (pattern.test(command)) {
    process.stderr.write(
      `[agent-guard] Blocked: ${reason}. This action is reserved for the owner (docs/agent-protocol.md § 2). Explain what you intended and ask for an explicit yes; if the owner runs it themselves, give them the exact steps.\n`,
    );
    process.exit(2);
  }
}
process.exit(0);
