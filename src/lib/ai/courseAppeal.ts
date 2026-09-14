import { tourCoords } from '@/lib/tourapi/client';
import { distanceMeters } from '@/lib/geo/distance';
import type { CourseProfileMode } from '@/lib/profile/healthConditions';
import type { TourApiItem } from '@/types/tourapi.types';

export type DayTheme = 'NATURE' | 'CULTURE' | 'CITY' | 'FOOD';

export const DAY_THEMES: DayTheme[] = ['CULTURE', 'NATURE', 'CITY', 'FOOD'];

const THEME_LABEL: Record<DayTheme, string> = {
  NATURE: '자연·전망',
  CULTURE: '문화·역사',
  CITY: '시티·산책',
  FOOD: '맛·골목',
};

/** Rough keyword/category hints for theme fit (TourAPI has no appeal score). */
const THEME_HINTS: Record<DayTheme, RegExp> = {
  NATURE: /산|바다|해변|호수|공원|숲|생태|수목|섬|폭포|계곡|자연|해수욕/,
  CULTURE: /궁|박물관|미술관|유적|사찰|절|성|한옥|역사|기념관|문화/,
  CITY: /거리|시장|타워|광장|마을|골목|야경|전망대|산책|로|동/,
  FOOD: /시장|맛|먹거리|거리|골목|카페|마을/,
};

const POPULAR_HINTS =
  /핫플|명소|타워|시장|거리|카페|맛집|야경|해변|궁|박물관|공원|전망|벚꽃|문화|축제|랜드마크|성곽|한옥|마을|수목원|정원|동물원|아쿠아|테마파크/;

const LOCAL_FOOD_HINTS =
  /맛집|식당|카페|베이커리|브런치|로스터리|디저트|분식|해산물|갈비|국밥|떡볶이|파스타|스시|바|pub/i;

export function themeForDay(dayIndex: number): DayTheme {
  return DAY_THEMES[dayIndex % DAY_THEMES.length];
}

export function themeLabel(theme: DayTheme): string {
  return THEME_LABEL[theme];
}

/** travelStyle → 일정 테마 (Gemini 폴백·랭킹용) */
export function travelStyleToDayTheme(style: string): DayTheme {
  switch (style) {
    case '힐링':
    case '자연·전망':
      return 'NATURE';
    case '액티비티':
      return 'CITY';
    case '문화·역사':
      return 'CULTURE';
    case '맛집·카페':
      return 'FOOD';
    case '시티·산책':
      return 'CITY';
    default:
      return 'CULTURE';
  }
}

export function itemCoords(item: { mapx: string; mapy: string }) {
  return tourCoords(item.mapx, item.mapy);
}

/** Proxy appeal score — not an official TourAPI field. */
export function scoreAttractionAppeal(
  item: TourApiItem,
  theme: DayTheme,
  anchor?: { lat: number; lng: number }
): number {
  let score = 0;
  if (item.firstimage || item.firstimage2) score += 40;
  const blob = `${item.title} ${item.addr1 ?? ''} ${item.lclsSystm3 ?? item.cat3 ?? ''}`;
  if (THEME_HINTS[theme].test(blob)) score += 35;
  // Mild boost for other themes so ranks aren't empty
  for (const t of DAY_THEMES) {
    if (t !== theme && THEME_HINTS[t].test(blob)) score += 8;
  }
  if (anchor) {
    const c = itemCoords(item);
    const m = distanceMeters(anchor, c);
    if (m < 2500) score += 20;
    else if (m < 5000) score += 10;
    else if (m > 15000) score -= 25;
  }
  return score;
}

/** 일반 여행객용 — 인기·핫플 키워드 가중 */
export function scoreGeneralAppeal(
  item: TourApiItem,
  theme: DayTheme,
  anchor?: { lat: number; lng: number }
): number {
  let score = scoreAttractionAppeal(item, theme, anchor);
  const blob = `${item.title} ${item.addr1 ?? ''} ${item.lclsSystm3 ?? item.cat3 ?? ''}`;
  if (POPULAR_HINTS.test(blob)) score += 30;
  if (item.firstimage || item.firstimage2) score += 15;
  return score;
}

export function rankAttractions(
  items: TourApiItem[],
  theme: DayTheme,
  anchor: { lat: number; lng: number },
  excludeIds: Set<string>,
  profileMode: CourseProfileMode = 'health'
): TourApiItem[] {
  const scoreFn =
    profileMode === 'general' ? scoreGeneralAppeal : scoreAttractionAppeal;

  return items
    .filter((a) => !excludeIds.has(a.contentid))
    .map((a) => ({ a, s: scoreFn(a, theme, anchor) }))
    .sort((x, y) => y.s - x.s || x.a.title.localeCompare(y.a.title, 'ko'))
    .map((x) => x.a);
}

/** Same-day second spot: stay near morning highlight. */
export function dayPairMaxMeters(areaCode: string): number {
  const metro = new Set(['1', '2', '3', '4', '5', '6', '7', '8']);
  return metro.has(areaCode) ? 4500 : 7000;
}

/**
 * City-wide: one geographic pool per day (nearby spots together).
 * District / small pools: shared list for every day.
 */
export function buildDayAttractionPools(
  items: TourApiItem[],
  dayCount: number,
  cityWide: boolean,
  cityCenter: { lat: number; lng: number },
  clusterMeters: number
): TourApiItem[][] {
  if (dayCount <= 0) return [];
  if (!cityWide || dayCount === 1 || items.length < dayCount * 2) {
    return Array.from({ length: dayCount }, () => items);
  }

  const remaining = [...items];
  const pools: TourApiItem[][] = [];
  const seedCenters: Array<{ lat: number; lng: number }> = [];
  const targetPerDay = Math.max(
    2,
    Math.ceil(items.length / dayCount)
  );

  for (let d = 0; d < dayCount; d++) {
    if (remaining.length === 0) {
      pools.push([]);
      continue;
    }

    let seedIdx = 0;
    if (d === 0) {
      let best = -Infinity;
      remaining.forEach((a, i) => {
        const c = itemCoords(a);
        const m = distanceMeters(cityCenter, c);
        const s = (a.firstimage || a.firstimage2 ? 30 : 0) - m / 500;
        if (s > best) {
          best = s;
          seedIdx = i;
        }
      });
    } else {
      let best = -Infinity;
      remaining.forEach((a, i) => {
        const c = itemCoords(a);
        const minToSeeds = Math.min(
          ...seedCenters.map((s) => distanceMeters(s, c))
        );
        const s = minToSeeds + (a.firstimage || a.firstimage2 ? 800 : 0);
        if (s > best) {
          best = s;
          seedIdx = i;
        }
      });
    }

    const seed = remaining.splice(seedIdx, 1)[0];
    const seedC = itemCoords(seed);
    seedCenters.push(seedC);

    const nearIdx: Array<{ i: number; m: number }> = [];
    remaining.forEach((a, i) => {
      const m = distanceMeters(seedC, itemCoords(a));
      if (m <= clusterMeters) nearIdx.push({ i, m });
    });
    nearIdx.sort((x, y) => x.m - y.m);

    const pickCount = Math.min(
      targetPerDay - 1,
      Math.max(1, nearIdx.length),
      remaining.length
    );
    const chosenIdx = nearIdx.slice(0, pickCount).map((x) => x.i);
    // If cluster too thin, take nearest overall
    if (chosenIdx.length < 1 && remaining.length > 0) {
      const nearest = remaining
        .map((a, i) => ({ i, m: distanceMeters(seedC, itemCoords(a)) }))
        .sort((x, y) => x.m - y.m)
        .slice(0, Math.min(targetPerDay - 1, remaining.length));
      chosenIdx.push(...nearest.map((x) => x.i));
    }

    const uniqueSorted = Array.from(new Set(chosenIdx)).sort((a, b) => b - a);
    const companions: TourApiItem[] = [];
    for (const i of uniqueSorted) {
      companions.push(remaining.splice(i, 1)[0]);
    }

    pools.push([seed, ...companions]);
  }

  // Leftovers → nearest day pool
  for (const a of remaining) {
    const c = itemCoords(a);
    let bestD = 0;
    let bestM = Infinity;
    seedCenters.forEach((s, i) => {
      const m = distanceMeters(s, c);
      if (m < bestM) {
        bestM = m;
        bestD = i;
      }
    });
    pools[bestD]?.push(a);
  }

  return pools;
}

/** Morning highlight + afternoon companion near it. */
export function pickDayAttractions(
  pool: TourApiItem[],
  theme: DayTheme,
  dayAnchor: { lat: number; lng: number },
  excludeIds: Set<string>,
  pairMaxM: number,
  profileMode: CourseProfileMode = 'health'
): { morning?: TourApiItem; afternoon?: TourApiItem } {
  const ranked = rankAttractions(pool, theme, dayAnchor, excludeIds, profileMode);
  const morning = ranked[0];
  if (!morning) return {};
  excludeIds.add(morning.contentid);
  const mC = itemCoords(morning);
  const afternoon =
    rankAttractions(pool, theme, mC, excludeIds, profileMode).find(
      (a) => distanceMeters(mC, itemCoords(a)) <= pairMaxM
    ) ??
    rankAttractions(pool, theme, mC, excludeIds, profileMode)[0];
  if (afternoon) excludeIds.add(afternoon.contentid);
  return { morning, afternoon };
}

export function attractionHookLine(
  title: string,
  theme: DayTheme,
  address?: string,
  slot: 'morning' | 'afternoon' | 'highlight' = 'highlight'
): string {
  const area = address?.split(' ').slice(0, 2).join(' ') || '이 지역';
  if (slot === 'afternoon') {
    return `이어서 「${title}」 — 오후의 한 컷`;
  }
  if (slot === 'morning') {
    switch (theme) {
      case 'NATURE':
        return `${area}에서 하루를 여는 「${title}」`;
      case 'CULTURE':
        return `오전, 「${title}」에서 시간·이야기`;
      case 'CITY':
        return `오전 산책의 출발 「${title}」`;
      case 'FOOD':
        return `맛 탐험 전, 「${title}」 주변을 둘러보기`;
      default:
        return `오전의 「${title}」`;
    }
  }
  switch (theme) {
    case 'NATURE':
      return `${area}에서 숨 고르기 좋은 「${title}」 — 오늘 하이라이트`;
    case 'CULTURE':
      return `오늘은 「${title}」에서 시간·이야기 느끼기`;
    case 'CITY':
      return `골목과 풍경이 이어지는 「${title}」 산책`;
    case 'FOOD':
      return `맛 탐험의 거점 「${title}」 주변을 돌아보기`;
    default:
      return `오늘의 추천 스팟 「${title}」`;
  }
}

export function restaurantHookLine(
  title: string,
  firstmenu?: string
): string {
  if (firstmenu) return `${title} · 대표 ${firstmenu}`;
  return `하이라이트 근처에서 여유 있게 — ${title}`;
}

/** Prefer restaurants near the day's highlight; vegan score if present. */
export function scoreRestaurantNear(
  item: TourApiItem,
  highlight: { lat: number; lng: number },
  preferVegan: boolean,
  profileMode: CourseProfileMode = 'health'
): number {
  const c = itemCoords(item);
  const m = distanceMeters(highlight, c);
  let score = 0;
  if (m < 800) score += 50;
  else if (m < 1500) score += 35;
  else if (m < 3000) score += 20;
  else if (m < 5000) score += 8;
  else score -= Math.min(40, Math.floor(m / 1000));

  if (item.firstimage || item.firstimage2) score += 10;

  if (profileMode === 'general') {
    const blob = `${item.title} ${item.addr1 ?? ''} ${item.cat3 ?? ''}`;
    if (LOCAL_FOOD_HINTS.test(blob)) score += 25;
    if (/카페|coffee|roastery/i.test(blob)) score += 15;
  }

  if (preferVegan) {
    // Soft boost only — never outweigh hard distance filter
    if (item.veganLevel === 'FULL_VEGAN') score += 15;
    else if (item.veganLevel === 'PARTIAL_VEGAN') score += 10;
    else if (item.veganLevel === 'NOT_VEGAN') score -= 80;
    else if (typeof item.veganScore === 'number') score += item.veganScore / 5;
  }
  return score;
}

/**
 * Seoul/metros: tight day cluster (traffic).
 * Provinces: slightly wider after sigungu pick.
 */
export function mealClusterMaxMeters(areaCode: string): number {
  const metro = new Set(['1', '2', '3', '4', '5', '6', '7', '8']);
  return metro.has(areaCode) ? 3000 : 5000;
}

export function rankRestaurantsNear(
  pool: TourApiItem[],
  highlight: { lat: number; lng: number },
  preferVegan: boolean,
  excludeIds: Set<string>,
  maxMeters = 5000,
  profileMode: CourseProfileMode = 'health'
): TourApiItem[] {
  const within = (limit: number) =>
    pool
      .filter((r) => !excludeIds.has(r.contentid))
      .filter((r) => {
        if (!preferVegan) return true;
        return r.veganLevel !== 'NOT_VEGAN';
      })
      .filter((r) => distanceMeters(highlight, itemCoords(r)) <= limit)
      .map((r) => ({
        r,
        s: scoreRestaurantNear(r, highlight, preferVegan, profileMode),
      }))
      .sort((x, y) => y.s - x.s)
      .map((x) => x.r);

  let ranked = within(maxMeters);
  // Soft expand once if too few (still capped — no 10km Seoul jumps)
  if (ranked.length < 3) {
    ranked = within(Math.min(Math.round(maxMeters * 1.4), metroSoftCap(maxMeters)));
  }
  return ranked;
}

function metroSoftCap(maxMeters: number): number {
  // If base was 3km (Seoul), never expand past 4.2km
  return maxMeters <= 3000 ? 4200 : Math.round(maxMeters * 1.4);
}

export function sortSchedulesByTime<T extends { time: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}
