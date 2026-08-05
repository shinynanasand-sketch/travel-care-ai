// API 키 검증 스크립트 — 추가 의존성 없이 순수 Node(내장 fetch) 사용
// 실행: node scripts/test-keys.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '.env.local');

function loadEnv(path) {
  const env = {};
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    console.error(`\n[오류] .env.local 을 찾을 수 없습니다: ${path}`);
    process.exit(2);
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function mask(v) {
  if (!v) return '(비어있음)';
  if (v.length <= 8) return v.slice(0, 2) + '****';
  return v.slice(0, 4) + '****' + v.slice(-2);
}

const env = loadEnv(ENV_PATH);
const results = [];

// 앱(src/lib/ai/client.ts)이 실제 사용하는 모델만 검증 — 할당량 보호를 위해 요청 최소화
const GEMINI_FLASH_MODELS = ['gemini-2.5-flash'];

async function callGeminiModel(key, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return { status: 'PASS', note: `응답: "${text.trim().slice(0, 40)}"` };
      return { status: 'FAIL', note: '응답 텍스트 없음' };
    }
    const msg = data?.error?.message || `HTTP ${res.status}`;
    if (res.status === 429 || /quota/i.test(msg)) {
      return { status: 'QUOTA', note: '키 유효, 할당량 초과(limit 0)' };
    }
    if (res.status === 400 && /API_KEY_INVALID|api key/i.test(msg)) {
      return { status: 'KEYERR', note: '키 오류: ' + msg.slice(0, 60) };
    }
    if (res.status === 404) {
      return { status: 'NOMODEL', note: '모델 없음/미지원' };
    }
    return { status: 'FAIL', note: msg.slice(0, 80) };
  } catch (e) {
    return { status: 'FAIL', note: e.message };
  }
}

async function listGeminiFlashModels(key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    const models = (data?.models || [])
      .filter(
        (m) =>
          /flash/i.test(m.name || '') &&
          (m.supportedGenerationMethods || []).includes('generateContent')
      )
      .map((m) => (m.name || '').replace('models/', ''));
    return models;
  } catch {
    return null;
  }
}

async function testGemini() {
  const key = env.GEMINI_API_KEY;
  const name = 'Gemini (GEMINI_API_KEY)';
  console.log(`\n[1] ${name}  키=${mask(key)}`);
  if (!key) {
    results.push({ name, pass: false, note: '키가 .env.local에 비어있음' });
    console.log('  FAIL — 키 없음');
    return;
  }

  let anyPass = false;
  let anyKeyValid = false;
  const workingModels = [];
  for (const model of GEMINI_FLASH_MODELS) {
    const r = await callGeminiModel(key, model);
    console.log(`  - ${model.padEnd(22)} ${r.status.padEnd(7)} ${r.note}`);
    if (r.status === 'PASS') {
      anyPass = true;
      anyKeyValid = true;
      workingModels.push(model);
    } else if (r.status === 'QUOTA' || r.status === 'NOMODEL' || r.status === 'FAIL') {
      // QUOTA는 키가 유효함을 의미
      if (r.status === 'QUOTA') anyKeyValid = true;
    }
  }

  const flashModels = await listGeminiFlashModels(key);
  if (flashModels) {
    console.log(`  · 이 키로 접근 가능한 flash 모델: ${flashModels.length ? flashModels.join(', ') : '(없음)'}`);
  } else {
    console.log('  · 모델 목록 조회 실패');
  }

  if (anyPass) {
    results.push({ name, pass: true, note: `호출 성공 모델: ${workingModels.join(', ')}` });
    console.log(`  PASS — 사용 가능: ${workingModels.join(', ')}`);
  } else if (anyKeyValid) {
    results.push({ name, pass: false, note: '키는 유효하나 모든 Flash 모델 할당량 초과(limit 0)' });
    console.log('  FAIL — 키 유효, 그러나 모든 Flash 모델 할당량 0');
  } else {
    results.push({ name, pass: false, note: '모든 Flash 모델 호출 실패(키/모델 확인 필요)' });
    console.log('  FAIL — 모든 Flash 모델 호출 실패');
  }
}

async function testTourApi() {
  const key = env.PUBLIC_DATA_API_KEY;
  const base = env.TOUR_API_BASE || 'https://apis.data.go.kr/B551011/KorService2';
  const name = 'Tour API (PUBLIC_DATA_API_KEY)';
  console.log(`\n[2] ${name}  키=${mask(key)}`);
  if (!key) {
    results.push({ name, pass: false, note: '키가 .env.local에 비어있음' });
    console.log('  FAIL — 키 없음');
    return;
  }
  const params = new URLSearchParams({
    serviceKey: key,
    MobileOS: 'ETC',
    MobileApp: 'TravelCareAI',
    _type: 'json',
    numOfRows: '1',
    pageNo: '1',
    arrange: 'A',
  });
  const url = `${base}/areaBasedList2?${params.toString()}`;
  try {
    const res = await fetch(url);
    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch {
      // 공공데이터포털 오류는 XML로 오는 경우가 많음
      const m = bodyText.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/);
      const note = m ? m[1] : `JSON 아님 (HTTP ${res.status}): ${bodyText.slice(0, 120)}`;
      results.push({ name, pass: false, note });
      console.log(`  FAIL — ${note}`);
      return;
    }
    const header = data?.response?.header;
    const code = header?.resultCode;
    const msg = header?.resultMsg;
    if (code === '0000') {
      const total = data?.response?.body?.totalCount;
      results.push({ name, pass: true, note: `resultCode 0000 (totalCount=${total})` });
      console.log(`  PASS — resultCode 0000, totalCount=${total}`);
    } else {
      results.push({ name, pass: false, note: `resultCode ${code} (${msg})` });
      console.log(`  FAIL — resultCode ${code} (${msg})`);
    }
  } catch (e) {
    results.push({ name, pass: false, note: e.message });
    console.log(`  FAIL — ${e.message}`);
  }
}

async function testKakao() {
  const key = env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const name = 'Kakao 지도 (NEXT_PUBLIC_KAKAO_MAP_KEY)';
  console.log(`\n[3] ${name}  키=${mask(key)}`);
  console.log('  ※ JS 앱 키는 도메인 제한 브라우저 키 → 서버측은 도달성/형식 확인만 (완전 인증은 등록 도메인에서만)');
  if (!key) {
    results.push({ name, pass: false, note: '키가 .env.local에 비어있음' });
    console.log('  FAIL — 키 없음');
    return;
  }
  const url = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    const looksLikeSdk = text.includes('kakao') || text.includes('daumtools') || text.includes('maps');
    if (res.ok && looksLikeSdk) {
      results.push({ name, pass: true, note: 'SDK 로더 응답 정상 (형식/도달성 확인)' });
      console.log('  PASS(형식) — SDK 로더 정상 응답 (브라우저 도메인 검증은 별도)');
    } else {
      results.push({ name, pass: false, note: `HTTP ${res.status}, SDK 형식 아님` });
      console.log(`  FAIL — HTTP ${res.status}, SDK 형식 아님`);
    }
  } catch (e) {
    results.push({ name, pass: false, note: e.message });
    console.log(`  FAIL — ${e.message}`);
  }
}

async function main() {
  console.log('====== API 키 검증 시작 ======');
  await testGemini();
  await testTourApi();
  await testKakao();

  console.log('\n====== 요약 ======');
  for (const r of results) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  — ${r.note}`);
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n총 ${results.length}건 중 PASS ${results.length - failed.length} / FAIL ${failed.length}`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
