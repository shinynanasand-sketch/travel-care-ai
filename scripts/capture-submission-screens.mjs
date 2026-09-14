/**
 * 기능설명서 슬라이드 4·5용 화면 캡처
 * 실행: node scripts/capture-submission-screens.mjs
 * 필요: npx playwright install chromium
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir, tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'docs', 'screenshots');

function loadPlaywright() {
  const candidates = [
    join(root, 'package.json'),
    join(tmpdir(), 'pw-capture', 'package.json'),
    join(homedir(), 'pw-capture', 'package.json'),
  ];
  for (const pkg of candidates) {
    if (!existsSync(pkg)) continue;
    try {
      return createRequire(pkg)('playwright');
    } catch {
      /* next */
    }
  }
  throw new Error(
    'playwright 패키지를 찾을 수 없습니다. 예: TEMP/pw-capture에 npm install playwright'
  );
}

const { chromium } = loadPlaywright();
const BASE_CANDIDATES = [
  process.env.CAPTURE_BASE_URL,
  'https://travel-care-ai.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

const VIEWPORT = { width: 390, height: 844 };
const notes = [];

function log(msg) {
  console.log(msg);
  notes.push(msg);
}

async function resolveBase() {
  for (const base of BASE_CANDIDATES) {
    try {
      const res = await fetch(`${base}/`);
      if (res.ok) {
        log(`BASE: ${base}`);
        return base;
      }
    } catch {
      /* next */
    }
  }
  throw new Error('서버를 찾을 수 없습니다. Vercel 또는 npm run dev를 확인하세요.');
}

async function hideDevBanners(page) {
  await page.locator('[role="status"]').filter({ hasText: '[개발]' }).evaluateAll((els) => {
    for (const el of els) el.style.display = 'none';
  }).catch(() => {});
}

async function shot(page, name) {
  await hideDevBanners(page);
  const path = join(outDir, name);
  await page.screenshot({ path, type: 'png' });
  log(`SHOT: ${name}`);
  return path;
}

async function scrollIntoView(page, locator) {
  const el = locator.first();
  await el.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
  if (await el.count()) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const base = await resolveBase();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'ko-KR',
    geolocation: { latitude: 37.5665, longitude: 126.978 },
    permissions: ['geolocation', 'notifications'],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  // --- 01 Home ---
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '여행 속 주치의' }).waitFor();
  await shot(page, '01-home-hero.png');

  // --- 02 Profile ---
  await page.goto(`${base}/profile`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '건강·식이 프로필' }).waitFor();
  await page.getByPlaceholder('이름').fill('데모여행자');
  await page.getByRole('button', { name: /당뇨(?!1형)/ }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /당뇨(?!1형)/ }).click();
  await page.getByRole('button', { name: /비건/ }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /비건/ }).click();
  await scrollIntoView(page, page.getByText('질환·식이 유형'));
  await shot(page, '02-profile-conditions.png');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  const startBtn = page
    .getByRole('button', { name: /저장하고 여행 계획하기|시작하기/ });
  await startBtn.waitFor({ state: 'visible', timeout: 10000 });
  // 조건 선택 전에는 disabled일 수 있음
  await page.waitForFunction(
    () => {
      const buttons = [...document.querySelectorAll('button')];
      const btn = buttons.find((b) =>
        /저장하고 여행 계획하기|시작하기/.test(b.textContent || '')
      );
      return btn && !btn.disabled;
    },
    { timeout: 10000 }
  );
  await startBtn.click();
  await page.waitForURL(/\/plan/, { timeout: 20000 });

  // 배포본은 UI 저장만으로 zustand hydrate가 비는 경우가 있어 프로필 시드 보강
  await page.evaluate(() => {
    localStorage.setItem(
      'travel-care-profile',
      JSON.stringify({
        state: {
          userId: 'demo-user',
          name: '데모여행자',
          healthProfile: {
            conditions: ['DIABETES_TYPE2', 'VEGAN'],
            medications: [],
            activityLevel: 'MEDIUM',
            insulinUser: false,
            restrictions: [],
          },
        },
        version: 0,
      })
    );
  });
  await page.goto(`${base}/plan`, { waitUntil: 'domcontentloaded' });

  // --- Plan + generate ---
  await page.getByRole('heading', { name: '여행 계획' }).waitFor();
  await page.getByRole('button', { name: '서울특별시' }).click();
  const cityWide = page.getByRole('button', { name: /서울 전체/ });
  if (await cityWide.count()) await cityWide.first().click();
  const healing = page.getByRole('button', { name: /힐링/ });
  if (await healing.count()) {
    await healing.first().click();
  } else {
    log('PLAN: 여행 취향(힐링) UI 없음 — 배포본 기본값으로 진행');
  }

  log('COURSE: 생성 시작 (최대 150초)');
  const generateBtn = page.getByRole('button', { name: '안전 코스 생성하기' });
  await generateBtn.scrollIntoViewIfNeeded();
  await generateBtn.click();

  let courseOk = false;
  try {
    await page.waitForURL(/\/plan\/result/, { timeout: 150000 });
    await page.getByText(/AI 맞춤 여행 코스|안전 점수/).first().waitFor({ timeout: 20000 });
    courseOk = true;
    log('COURSE: 생성 성공');
  } catch (e) {
    log(`COURSE: UI 생성 실패 — ${e.message}`);
    const alert = page.getByRole('alert');
    if (await alert.count()) log(`COURSE error UI: ${await alert.innerText()}`);

    // API 폴백: 코스 생성 후 localStorage에 주입
    log('COURSE: API 폴백 시도');
    try {
      const start = new Date();
      const end = new Date(start.getTime() + 2 * 86400000);
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);
      const course = await page.evaluate(
        async ({ startDate, endDate }) => {
          const res = await fetch('/api/course/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: 'demo-user',
              destination: { areaCode: '1', name: '서울 전체' },
              period: { startDate, endDate, days: 3 },
              healthProfile: {
                conditions: ['DIABETES_TYPE2', 'VEGAN'],
                medications: [],
                activityLevel: 'MEDIUM',
                insulinUser: false,
                restrictions: [],
              },
              travelStyle: '힐링',
            }),
          });
          if (!res.ok) {
            const err = await res.text();
            throw new Error(`API ${res.status}: ${err.slice(0, 200)}`);
          }
          return res.json();
        },
        { startDate, endDate }
      );

      await page.evaluate((course) => {
        localStorage.setItem(
          'travel-care-plan',
          JSON.stringify({
            state: {
              course,
              destination: { areaCode: '1', name: '서울 전체' },
              period: {
                startDate: course.days?.[0]?.date,
                endDate: course.days?.[course.days.length - 1]?.date,
                days: course.days?.length ?? 3,
              },
              lastRequest: null,
              veganFilter: false,
            },
            version: 0,
          })
        );
      }, course);

      await page.goto(`${base}/plan/result`, { waitUntil: 'domcontentloaded' });
      await page.getByText(/AI 맞춤 여행 코스|안전 점수/).first().waitFor({ timeout: 20000 });
      courseOk = true;
      log('COURSE: API 폴백 성공');
    } catch (apiErr) {
      log(`COURSE: API 폴백 실패 — ${apiErr.message}`);
    }
  }

  if (courseOk) {
    await page.waitForTimeout(1200);
    await shot(page, '03-result-overview.png');

    // Restaurant + health light
    const restaurant = page.locator('text=🍽️').first();
    if (await scrollIntoView(page, restaurant)) {
      await shot(page, '04-result-restaurant-lights.png');
    } else {
      log('WARN: 식당 카드 없음 — 04 스킵에 가깝게 overview 재사용');
      await shot(page, '04-result-restaurant-lights.png');
    }

    // Vegan lights
    const veganLight = page.getByText(/완전 비건|부분 비건|확인 필요|비건 불가/).first();
    if (await scrollIntoView(page, veganLight)) {
      await shot(page, '05-result-vegan-lights.png');
      log('VEGAN: 신호등 표시됨');
    } else {
      const veganChip = page.getByText('🌱 비건 옵션').or(page.getByText('🌱 비건 식당만 보기'));
      if (await scrollIntoView(page, veganChip)) {
        await shot(page, '05-result-vegan-lights.png');
        log('VEGAN: 신호등 문구 없음 — 비건 칩/필터로 대체 촬영');
      } else {
        await shot(page, '05-result-vegan-lights.png');
        log('VEGAN: 비건 UI 미발견 — 현재 뷰포트 저장');
      }
    }

    // Day schedule
    const day = page.getByText(/^Day\s*1|Day 1/).first();
    if (await scrollIntoView(page, day)) {
      await shot(page, '06-result-day-schedule.png');
    } else {
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.waitForTimeout(300);
      await shot(page, '06-result-day-schedule.png');
    }

    // Alternatives — 없으면 「다른 곳으로」 편집 UI로 대체 촬영
    const alt = page.getByText('이런 곳은 어떠세요?');
    if (await scrollIntoView(page, alt)) {
      await shot(page, '07-result-alternatives.png');
      log('ALT: 대안 스트립 표시됨');
    } else {
      const swap = page.getByText('다른 곳으로').first();
      if (await scrollIntoView(page, swap)) {
        await shot(page, '07-result-alternatives.png');
        log('ALT: 대안 스트립 없음 — 「다른 곳으로」 장소 교체 UI로 촬영');
      } else {
        log('ALT: 대안·교체 UI 없음 — 결과 하단 촬영');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(300);
        await shot(page, '07-result-alternatives.png');
      }
    }
  } else {
    for (const name of [
      '03-result-overview.png',
      '04-result-restaurant-lights.png',
      '05-result-vegan-lights.png',
      '06-result-day-schedule.png',
      '07-result-alternatives.png',
    ]) {
      await shot(page, name);
    }
  }

  // --- 08 Travel glucose ---
  await page.goto(`${base}/travel`, { waitUntil: 'domcontentloaded' });
  await page.getByText('혈당 기록').waitFor({ timeout: 20000 });
  await page.getByPlaceholder('혈당 (mg/dL)').fill('58');
  await page.getByRole('button', { name: '기록', exact: true }).click();
  await page
    .getByText(/즉시 당 보충|즉시 119|혈당 58/)
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => log('WARN: 혈당 배너 대기 타임아웃'));
  await page.waitForTimeout(800);
  await shot(page, '08-travel-glucose.png');

  // --- 09 Nearby ---
  await page.goto(`${base}/travel/nearby`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/주변 시설/).first().waitFor({ timeout: 20000 }).catch(() => {});
  // 의료 API는 수 초~수십 초 걸릴 수 있음
  for (let i = 0; i < 25; i++) {
    const text = await page.locator('body').innerText();
    const loading = text.includes('불러오는 중');
    const hasCard =
      /청실약국|약국|의원|\d+m/.test(text) &&
      !text.includes('주변 병원 정보가 없습니다');
    if (!loading && (hasCard || text.includes('약국'))) {
      // 약국 섹션에 실제 항목이 있는지
      if (/\d+m/.test(text) || text.includes('02-')) break;
    }
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(1000);
  await shot(page, '09-nearby-medical.png');

  // --- 10 Guardian ---
  await page.goto(`${base}/guardian`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '보호자 설정' }).waitFor();
  await page.getByPlaceholder('이름').fill('김보호');
  await page.getByPlaceholder('전화번호').fill('010-1234-5678');
  await page.getByPlaceholder(/관계/).fill('자녀');
  await page.getByRole('button', { name: '보호자 저장' }).click();
  await page.getByText('보호자 정보가 저장되었습니다.').waitFor({ timeout: 5000 }).catch(() => {});
  await shot(page, '10-guardian.png');

  await browser.close();

  const reportPath = join(outDir, 'capture-log.txt');
  writeFileSync(reportPath, notes.join('\n'), 'utf8');
  log(`DONE → ${outDir}`);
  console.log('\n--- capture log ---\n' + notes.join('\n'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
