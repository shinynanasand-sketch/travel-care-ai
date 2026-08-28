// 실연동 리허설 — 키 검증 + E2E API 스모크 (SUBMISSION.md 대본 사전 점검)
// 실행: npm run dev 기동 후 → node scripts/rehearsal-live.mjs
// USE_MOCK_DATA=false + .env.local 키 필요

import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvLocal() {
  const path = join(root, '.env.local');
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function runNode(script, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, 'scripts', script)], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

async function detectBase() {
  for (const port of [3000, 3001]) {
    try {
      const res = await fetch(`http://localhost:${port}/api/weather?areaCode=1`);
      if (res.ok) return `http://localhost:${port}`;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function main() {
  console.log('====== Travel Care AI — 실연동 리허설 ======\n');
  const env = loadEnvLocal();
  const mock = env.USE_MOCK_DATA ?? process.env.USE_MOCK_DATA ?? 'true';

  if (mock === 'true') {
    console.warn('⚠ USE_MOCK_DATA=true — 실연동 리허설을 위해 .env.local에서 false로 설정하세요.\n');
  } else {
    console.log('✓ USE_MOCK_DATA=false\n');
  }

  console.log('--- 1/2 API 키 검증 (test-keys.mjs) ---');
  const keysCode = await runNode('test-keys.mjs');
  if (keysCode !== 0) {
    console.warn('\n⚠ 로컬 키 검증 일부 실패 — Vercel 배포 환경에서 E2E를 계속 시도합니다.\n');
  }

  const localBase = await detectBase();
  const base =
    localBase ||
    process.env.E2E_BASE?.trim() ||
    'https://travel-care-ai.vercel.app';
  if (!localBase && !process.env.E2E_BASE) {
    console.log(`로컬 서버 없음 — Vercel 사용: ${base}`);
  } else {
    console.log(`E2E base: ${base}`);
  }
  console.log(`\n--- 2/2 E2E API 스모크 (base=${base}) ---`);
  const e2eCode = await runNode('test-e2e.mjs', { E2E_BASE: base });

  console.log('\n====== 리허설 완료 ======');
  console.log('다음: SUBMISSION.md 대본대로 브라우저에서 / → /profile → /plan → /plan/result → /travel → /travel/nearby 수동 확인');
  process.exit(e2eCode);
}

main();
