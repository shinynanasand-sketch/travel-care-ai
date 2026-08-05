// 실 API E2E 검증 — dev 서버(http://localhost:3000) 대상 단계형 테스트
// 실행: npm run dev 로 서버 기동 후 → node scripts/test-e2e.mjs
// Gemini 할당량 보호를 위해 호출 최소화(analyze 1회 + 코스 1회, 비건 제외)

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const SEOUL = { lat: 37.5665, lng: 126.978, areaCode: '1' };
const results = [];

function isMockId(id) {
  if (!id) return false;
  return /mock|^wl-|^hp-|^ph-|^er-/i.test(String(id));
}

function record(name, pass, note) {
  results.push({ name, pass, note });
  console.log(`  ${pass ? 'PASS' : 'FAIL'} — ${name}  ${note ? '· ' + note : ''}`);
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`JSON 아님 (HTTP ${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).slice(0, 160)}`);
  }
  return data;
}

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`JSON 아님 (HTTP ${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}

async function waitForServer(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(`${BASE}/api/weather?areaCode=1`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

let sampleAttractionId = null;

async function stageA() {
  console.log('\n=== Stage A — TourAPI/의료/날씨 (Gemini 0회) ===');

  // 음식점(일반)
  try {
    const d = await getJson(`/api/restaurant/list?lat=${SEOUL.lat}&lng=${SEOUL.lng}`);
    const arr = d.restaurants || [];
    const real = arr.length > 0 && !isMockId(arr[0].contentid);
    record('restaurant/list', arr.length > 0, `${arr.length}건, ${real ? '실데이터' : 'mock'} (예: ${arr[0]?.title ?? '-'})`);
  } catch (e) {
    record('restaurant/list', false, e.message);
  }

  // 관광지
  try {
    const d = await getJson(`/api/attraction/list?lat=${SEOUL.lat}&lng=${SEOUL.lng}&areaCode=${SEOUL.areaCode}`);
    const arr = d.attractions || d.items || d.list || [];
    if (arr.length > 0) sampleAttractionId = arr[0].contentid;
    const real = arr.length > 0 && !isMockId(arr[0]?.contentid);
    record('attraction/list', arr.length > 0, `${arr.length}건, ${real ? '실데이터' : 'mock'} (id=${sampleAttractionId ?? '-'})`);
  } catch (e) {
    record('attraction/list', false, e.message);
  }

  // 무장애 접근성 (관광지 id 사용)
  try {
    const cid = sampleAttractionId || '126508';
    const d = await getJson(`/api/attraction/accessibility?contentId=${cid}`);
    const a = d.accessibility;
    record('attraction/accessibility', !!a, a ? `level=${a.level}, cid=${a.contentid}` : '데이터 없음');
  } catch (e) {
    record('attraction/accessibility', false, e.message);
  }

  // 의료 3종 (라우트 응답 키: hospital→hospitals, pharmacy→pharmacies, emergency→emergency)
  const medicalKey = { hospital: 'hospitals', pharmacy: 'pharmacies', emergency: 'emergency' };
  for (const kind of ['hospital', 'pharmacy', 'emergency']) {
    try {
      const d = await getJson(`/api/medical/${kind}?lat=${SEOUL.lat}&lng=${SEOUL.lng}&radius=3000`);
      const arr = d[medicalKey[kind]] || [];
      const list = Array.isArray(arr) ? arr : [];
      const sample = list[0]?.name ? ` (예: ${list[0].name})` : '';
      record(`medical/${kind}`, list.length > 0, `${list.length}건${sample}`);
    } catch (e) {
      record(`medical/${kind}`, false, e.message);
    }
  }

  // 날씨
  try {
    const d = await getJson(`/api/weather?areaCode=1`);
    record('weather', !!d.weather, d.weather ? `temp=${d.weather.temperature ?? '-'}` : '데이터 없음');
  } catch (e) {
    record('weather', false, e.message);
  }
}

async function stageB() {
  console.log('\n=== Stage B — 메뉴 분석 (Gemini 1회) ===');
  try {
    const d = await postJson('/api/restaurant/analyze', {
      firstmenu: '비빔밥, 된장찌개, 제육볶음',
      treatmenu: '나물반찬',
      conditions: ['DIABETES_TYPE2'],
    });
    const a = d.analysis;
    record('restaurant/analyze', !!a, a ? `safety=${a.safetyLevel ?? a.healthLevel ?? '-'}` : '분석 없음');
  } catch (e) {
    record('restaurant/analyze', false, e.message);
  }
}

async function stageC() {
  console.log('\n=== Stage C — 코스 생성 (비건 아님, Gemini 소량) ===');
  const t0 = Date.now();
  try {
    const d = await postJson('/api/course/generate', {
      userId: 'e2e-test-user',
      destination: { areaCode: '1', name: '서울' },
      period: { startDate: '2026-07-20', endDate: '2026-07-21', days: 2 },
      healthProfile: {
        conditions: ['DIABETES_TYPE2'],
        medications: [],
        activityLevel: 'MEDIUM',
        insulinUser: false,
        restrictions: [],
      },
    });
    const days = d.days || [];
    const med = d.medicalFacilities || [];
    const ok = days.length > 0;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    record(
      'course/generate',
      ok,
      `days=${days.length}, medical=${med.length}, safety=${d.overallSafetyScore ?? '-'}, vegan=${d.hasVeganOptions}, 소요=${elapsed}s`
    );
  } catch (e) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    record('course/generate', false, `${e.message} (소요=${elapsed}s)`);
  }
}

async function main() {
  console.log(`====== 실 API E2E 검증 시작 (base=${BASE}) ======`);
  console.log('서버 기동 대기 중...');
  const up = await waitForServer();
  if (!up) {
    console.error('서버에 연결할 수 없습니다. npm run dev 가 실행 중인지 확인하세요.');
    process.exit(2);
  }
  console.log('서버 연결 확인됨.');

  await stageA();
  await stageB();
  await stageC();

  console.log('\n====== 요약 ======');
  for (const r of results) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  ${r.note ? '· ' + r.note : ''}`);
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n총 ${results.length}건 중 PASS ${results.length - failed.length} / FAIL ${failed.length}`);
  console.log('Gemini 호출: analyze 1회 + course 생성 소량(코스 내 식당 수만큼)');
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
