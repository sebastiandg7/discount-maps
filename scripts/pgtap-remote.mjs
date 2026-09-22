#!/usr/bin/env node
/**
 * Runs pgTAP test files against the linked Supabase project without Docker.
 *
 * `supabase db query` only returns the last result set, so each top-level
 * `select is(...)` / `lives_ok(...)` / `throws_ok(...)` statement is rewritten to
 * insert its TAP line into a temp table, which is selected right before the final
 * rollback. Usage: node scripts/pgtap-remote.mjs [supabase/tests/*.test.sql]
 *
 * Set SUPABASE_PROJECT_REF when the checkout is not linked (e.g. a git worktree):
 * the CLI then receives --project-ref in addition to --linked.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ASSERTION =
  /^select\s+(is|isnt|ok|lives_ok|throws_ok|results_eq|is_empty|isa_ok|cmp_ok)\s*\(/;

function transform(sql) {
  const lines = sql.split(/\r?\n/);
  const out = [
    'create temp table tap (n serial, line text);',
    'grant all on tap to public;',
    'grant all on sequence tap_n_seq to public;',
  ];
  let buffer = null;
  for (const line of lines) {
    if (buffer === null) {
      if (/^\s*select\s+\*\s+from\s+finish\(\)/i.test(line)) {
        out.push('insert into tap (line) select * from finish();');
        out.push('select line from tap order by n;');
        continue;
      }
      if (/^\s*rollback\s*;/i.test(line)) {
        out.push(line);
        continue;
      }
      if (ASSERTION.test(line.trim())) {
        buffer = [
          line.replace(/^(\s*)select/, '$1insert into tap (line) select'),
        ];
        if (/;\s*$/.test(line)) {
          out.push(buffer.join('\n'));
          buffer = null;
        }
        continue;
      }
      out.push(line);
    } else {
      buffer.push(line);
      if (/;\s*$/.test(line)) {
        out.push(buffer.join('\n'));
        buffer = null;
      }
    }
  }
  return out.join('\n');
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync('supabase/tests')
      .filter((f) => f.endsWith('.test.sql'))
      .map((f) => join('supabase/tests', f));

const dir = mkdtempSync(join(tmpdir(), 'pgtap-'));
let failed = 0;
for (const file of files) {
  const tmp = join(dir, file.replace(/[\\/]/g, '_'));
  writeFileSync(tmp, transform(readFileSync(file, 'utf8')));
  let raw;
  try {
    raw = execFileSync(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      [
        'supabase',
        'db',
        'query',
        '--file',
        tmp,
        '--linked',
        ...(process.env.SUPABASE_PROJECT_REF
          ? ['--project-ref', process.env.SUPABASE_PROJECT_REF]
          : []),
        '--output-format',
        'json',
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
      },
    );
  } catch (err) {
    console.log(
      `\n# ${file}\nnot ok - query failed\n${err.stdout || ''}${err.stderr || ''}`,
    );
    failed++;
    continue;
  }
  const json = JSON.parse(raw.slice(raw.indexOf('{')));
  const rows = json.rows ?? [];
  console.log(`\n# ${file}`);
  for (const r of rows) console.log(r.line);
  if (rows.some((r) => /^not ok|^# Looks like/.test(r.line))) failed++;
}
console.log(
  failed ? `\n${failed} file(s) with failures` : '\nall files passed',
);
process.exit(failed ? 1 : 0);
