// Sync Kakao keys from .env.local → Vercel (Production + Preview), then print redeploy hint.
// Does not print secret values.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

function mask(v) {
  if (!v) return '(empty)';
  return v.slice(0, 4) + '****' + (v.length > 6 ? v.slice(-2) : '');
}

function vercel(args, input) {
  const r = spawnSync('npx', ['vercel', ...args], {
    cwd: root,
    input,
    encoding: 'utf8',
    shell: true,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

const env = loadEnv(join(root, '.env.local'));
const keys = ['NEXT_PUBLIC_KAKAO_MAP_KEY', 'KAKAO_REST_API_KEY'].filter(
  (k) => env[k] && env[k].length > 0
);

if (keys.length === 0) {
  console.error('No Kakao keys found in .env.local');
  process.exit(1);
}

const targets = ['production', 'preview'];

for (const key of keys) {
  console.log(`\n=== Sync ${key} (${mask(env[key])}) ===`);
  for (const target of targets) {
    console.log(`Removing ${key} from ${target} (if exists)...`);
    vercel(['env', 'rm', key, target, '-y']);
    console.log(`Adding ${key} to ${target}...`);
    const code = vercel(['env', 'add', key, target], env[key] + '\n');
    if (code !== 0) {
      console.error(`Failed to add ${key} to ${target}`);
      process.exit(code);
    }
  }
}

console.log('\nKakao env sync done. Redeploy next.');
