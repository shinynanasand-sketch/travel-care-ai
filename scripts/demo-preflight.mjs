// 데모 영상 촬영 전 점검 (의료 배너 숨김·환경·페이지 응답)
// 실행: node scripts/demo-preflight.mjs

import { readFileSync, existsSync } from 'fs';
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

const checks = [];

function check(name, pass, note) {
  checks.push({ name, pass, note });
  console.log(`  ${pass ? 'OK' : '!!'} ${name}${note ? ` — ${note}` : ''}`);
}

async function main() {
  console.log('====== 데모 영상 촬영 전 점검 ======\n');
  const env = loadEnvLocal();

  check(
    '의료 진단 배너 숨김',
    env.NEXT_PUBLIC_SHOW_MEDICAL_DIAGNOSTICS !== 'true',
    'NEXT_PUBLIC_SHOW_MEDICAL_DIAGNOSTICS 미설정 또는 false'
  );
  check(
    '실연동 권장',
    env.USE_MOCK_DATA === 'false',
    env.USE_MOCK_DATA === 'false' ? 'USE_MOCK_DATA=false' : 'mock 모드 — 썸네일·대안 장소 품질 낮음'
  );
  check('Gemini 키', Boolean(env.GEMINI_API_KEY?.trim()), 'GEMINI_API_KEY');
  check('TourAPI 키', Boolean(env.PUBLIC_DATA_API_KEY?.trim()), 'PUBLIC_DATA_API_KEY');
  check('Kakao Map 키', Boolean(env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim()), 'NEXT_PUBLIC_KAKAO_MAP_KEY');

  const bases = ['http://localhost:3000', 'http://localhost:3001', 'https://travel-care-ai.vercel.app'];
  let liveBase = null;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/`);
      if (res.ok) {
        liveBase = base;
        break;
      }
    } catch {
      /* next */
    }
  }
  check('페이지 응답', !!liveBase, liveBase ?? '서버 없음 — npm run dev 또는 Vercel 확인');

  console.log('\n--- 촬영 대본 (SUBMISSION.md) ---');
  console.log('  0:00 /  0:40 /profile');
  console.log('  1:20 /plan — 서울 또는 광주 전체, 2박3일, 여행 취향 선택');
  console.log('  2:40 /plan/result — 썸네일·대안 장소·비건 신호등');
  console.log('  3:40 /travel — 혈당 58');
  console.log('  4:20 /travel/nearby — 지도');

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} 항목 준비됨`);
  if (failed.length > 0) {
    console.log('촬영 전 위 항목을 확인하세요.');
    process.exit(1);
  }
  console.log('촬영 준비 완료. 화면 녹화를 시작하세요.');
}

main();
