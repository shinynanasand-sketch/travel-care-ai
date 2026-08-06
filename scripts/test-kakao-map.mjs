// 카카오 지도 스모크 테스트 — SDK + Referer(도메인) + 페이지 HTML
// 실행: node scripts/test-kakao-map.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
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

function record(name, pass, note) {
  results.push({ name, pass, note });
  console.log(`  ${pass ? 'PASS' : 'FAIL'} — ${name}  · ${note}`);
}

async function checkSdk(appKey, referer, label) {
  const url = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
  const headers = {};
  if (referer) headers.Referer = referer;
  const res = await fetch(url, { headers });
  const text = await res.text();
  const looksLikeSdk =
    text.includes('kakao') || text.includes('maps') || text.includes('daum');
  const unauthorized =
    res.status === 401 || /Unauthorized|unauthorized/i.test(text.slice(0, 200));
  if (unauthorized) {
    record(
      label,
      false,
      `HTTP ${res.status} Unauthorized — Web 도메인 미등록 또는 키 불일치 (Referer=${referer || 'none'})`
    );
    return false;
  }
  if (res.ok && looksLikeSdk) {
    record(label, true, `HTTP ${res.status}, SDK 응답 OK (Referer=${referer || 'none'})`);
    return true;
  }
  record(label, false, `HTTP ${res.status}, SDK 형식 아님: ${text.slice(0, 80)}`);
  return false;
}

async function checkPage(base, label) {
  const url = `${base}/travel/nearby`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TravelCare-MapSmoke/1.0' },
      redirect: 'follow',
    });
    const html = await res.text();
    if (!res.ok) {
      record(label, false, `HTTP ${res.status} ${url}`);
      return;
    }
    // Next.js 클라이언트 번들에 NEXT_PUBLIC 키가 주입됐는지(페이지 HTML 또는 _next/static 단서는 제한적)
    const hasNearby = /주변 시설|KakaoMap|travel\/nearby/i.test(html) || html.includes('/_next/');
    const missingKeyHint = html.includes('카카오 지도 API 키를 설정하면');
    // "키 설정" 문구는 클라이언트 렌더라 SSR HTML에는 보통 없음 — 페이지 도달만 확인
    record(
      label,
      hasNearby && res.ok,
      `HTTP ${res.status}, HTML ${html.length}B${missingKeyHint ? ', 키미설정 문구 감지' : ''}`
    );
  } catch (e) {
    record(label, false, e.message);
  }
}

async function waitLocal(base, retries = 40) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(base);
      if (r.ok || r.status === 404) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  const env = loadEnv();
  const key = env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim();
  console.log('====== 카카오 지도 스모크 테스트 ======');
  console.log(`키=${mask(key)}`);

  if (!key) {
    record('precheck/key', false, '.env.local에 NEXT_PUBLIC_KAKAO_MAP_KEY 없음');
    process.exit(1);
  }
  record('precheck/key', true, `형식 OK (${mask(key)})`);

  console.log('\n=== Precheck — SDK + Referer(도메인) ===');
  await checkSdk(key, null, 'sdk/no-referer');
  await checkSdk(key, 'http://localhost:3000/', 'sdk/referer-localhost');
  await checkSdk(key, 'https://travel-care-ai.vercel.app/', 'sdk/referer-vercel');

  console.log('\n=== Local page ===');
  const localCandidates = [
    process.env.E2E_BASE,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);
  let localBase = null;
  for (const b of localCandidates) {
    try {
      const r = await fetch(b);
      if (r.ok || r.status === 404) {
        localBase = b;
        break;
      }
    } catch {
      /* try next */
    }
  }
  if (!localBase) {
    console.log('로컬 서버 대기 중(최대 40s)...');
    const ok = await waitLocal('http://localhost:3000');
    localBase = ok ? 'http://localhost:3000' : null;
    if (!localBase) {
      const ok2 = await waitLocal('http://localhost:3001', 5);
      localBase = ok2 ? 'http://localhost:3001' : null;
    }
  }
  if (localBase) {
    await checkPage(localBase, `page/local (${localBase})`);
  } else {
    record('page/local', false, 'dev 서버 미기동 (npm run dev 필요)');
  }

  console.log('\n=== Vercel page ===');
  await checkPage('https://travel-care-ai.vercel.app', 'page/vercel');

  console.log('\n====== 요약 ======');
  for (const r of results) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  · ${r.note}`);
  }
  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n총 ${results.length}건 중 PASS ${results.length - failed.length} / FAIL ${failed.length}`
  );
  console.log(
    '\n참고: 지도 타일·마커 시각 확인은 브라우저에서 /travel/nearby 를 열어보세요.'
  );
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
