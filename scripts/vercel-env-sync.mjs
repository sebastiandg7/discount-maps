// Pushes each app's environment variables to its linked Vercel project without
// ever printing a value. Values come from apps/<app>/.env.local (owner-pasted),
// URL variables are overridden with the deployed origins.
//
//   node scripts/vercel-env-sync.mjs --people-url https://x.vercel.app --business-url https://y.vercel.app [--env production,preview] [--dry-run]
//
// Requires `pnpm vercel login` and `pnpm vercel link` inside apps/people-web and
// apps/business-web (see docs/deploy.md). Existing variables are replaced.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(
  path.dirname(
    new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  ),
  '..',
);

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const peopleUrl = (flag('--people-url') ?? '').replace(/\/$/, '');
const businessUrl = (flag('--business-url') ?? '').replace(/\/$/, '');
const environments = (flag('--env') ?? 'production,preview').split(',');
const dryRun = args.includes('--dry-run');
if (!peopleUrl || !businessUrl) {
  console.error(
    'Usage: --people-url <origin> --business-url <origin> [--env production,preview] [--dry-run]',
  );
  process.exit(1);
}

/** Names whose values are safe to show in the Vercel UI; everything else is stored as sensitive. */
const PLAIN = new Set([
  'SUBSCRIPTION_PRICE_COP',
  'WOMPI_API_URL',
  'VAPID_SUBJECT',
]);
const isSensitive = (name) =>
  !name.startsWith('NEXT_PUBLIC_') && !PLAIN.has(name);

function parseEnv(file) {
  const out = new Map();
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const eq = line.indexOf('=');
    const name = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out.set(name, value);
  }
  return out;
}

const APPS = {
  'people-web': {
    overrides: {
      NEXT_PUBLIC_APP_URL: peopleUrl,
      NEXT_PUBLIC_BUSINESS_APP_URL: businessUrl,
    },
  },
  'business-web': {
    overrides: {
      NEXT_PUBLIC_APP_URL: businessUrl,
      NEXT_PUBLIC_PEOPLE_APP_URL: peopleUrl,
    },
  },
};

/** Per-app link (`apps/<app>/.vercel/project.json`) or a repo link (`.vercel/repo.json`) that maps the directory. */
function isLinked(dir) {
  if (existsSync(path.join(dir, '.vercel', 'project.json'))) return true;
  const repoLink = path.join(root, '.vercel', 'repo.json');
  if (!existsSync(repoLink)) return false;
  const rel = path.relative(root, dir).split(path.sep).join('/');
  try {
    const { projects = [] } = JSON.parse(readFileSync(repoLink, 'utf8'));
    return projects.some((p) => p.directory === rel);
  } catch {
    return false;
  }
}

function vercel(cwd, cmdArgs, input) {
  return spawnSync('pnpm', ['exec', 'vercel', ...cmdArgs], {
    cwd,
    input,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

let failures = 0;
for (const [app, { overrides }] of Object.entries(APPS)) {
  const dir = path.join(root, 'apps', app);
  if (!isLinked(dir)) {
    console.error(
      `[${app}] not linked: run \`pnpm vercel link\` inside apps/${app} (or \`pnpm vercel link --repo\` at the root) first`,
    );
    failures++;
    continue;
  }
  const expected = [...parseEnv(path.join(dir, '.env.example')).keys()];
  const local = parseEnv(path.join(dir, '.env.local'));
  console.log(
    `\n[${app}] ${expected.length} variables → ${environments.join(', ')}`,
  );
  for (const name of expected) {
    const value = overrides[name] ?? local.get(name) ?? '';
    if (!value) {
      console.log(
        `  skip  ${name} (empty locally; set it in the Vercel dashboard)`,
      );
      continue;
    }
    for (const env of environments) {
      const label = `${name} [${env}]${isSensitive(name) ? ' (sensitive)' : ''}`;
      if (dryRun) {
        console.log(`  would set ${label}`);
        continue;
      }
      const res = vercel(
        dir,
        [
          'env',
          'add',
          name,
          env,
          '--force',
          '--yes',
          isSensitive(name) ? '--sensitive' : '--no-sensitive',
        ],
        value,
      );
      if (res.status === 0) {
        console.log(`  set   ${label}`);
      } else {
        failures++;
        const reason =
          (res.stderr || res.stdout)
            .split('\n')
            .find((l) => /error/i.test(l)) ?? 'unknown error';
        console.log(`  FAIL  ${label}: ${reason.replace(value, '***')}`);
      }
    }
  }
}
console.log(failures ? `\n${failures} problem(s)` : '\nall variables set');
process.exit(failures ? 1 : 0);
