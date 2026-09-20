// 인증키: PUBLIC_DATA_API_KEY (getCommonParams 경유)
import {
  tourApiClient,
  getCommonParams,
  parseTourResponse,
  deduplicateByContentId,
} from './client';
import {
  getMockRestaurants,
  getMockVeganRestaurants,
  getMockRestaurantDetail,
  isMockContentId,
} from './mock-data';
import { isTourApiConfigured } from '@/lib/data/korea-regions';
import { categoryLabel, tourAreaFilterParams } from '@/lib/data/korea-ldong';
import { getCached, setCache } from '@/lib/cache/redis';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/keys';
import {
  quickVeganScore,
  isObviousMeatOnly,
  analyzeMenuForHealth,
  sanitizeVeganAnalysis,
  veganLevelFromAnalysis,
  type VeganScoreItem,
} from '@/lib/ai/menuAnalyzer';
import type { RestaurantDetail, TourApiItem } from '@/types/tourapi.types';

const VEGAN_KEYWORDS = ['비건', '채식', 'vegan', '베지테리안', '비건카페'];

// Step 2/3 파이프라인 파라미터
const WIDE_RADIUS = 20000;
const WIDE_ROWS = 1000;
const STEP3_TOP = 50;
const STEP3_CONCURRENCY = 10;

function scoreCatInput(r: TourApiItem): VeganScoreItem {
  return {
    contentid: r.contentid,
    title: r.title,
    cat3: categoryLabel(r),
  };
}

export async function getRestaurantsByLocation(
  lat: number,
  lng: number,
  radius = 2000,
  areaCode = '1',
  numOfRows = 20
): Promise<TourApiItem[]> {
  if (!isTourApiConfigured()) {
    return getMockRestaurants(areaCode, lat, lng);
  }

  const cacheKey = buildCacheKey('tourapi', 'locationBased', {
    lat,
    lng,
    radius,
    numOfRows,
  });
  const cached = await getCached<TourApiItem[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const { data } = await tourApiClient.get('/locationBasedList2', {
      params: {
        ...getCommonParams(),
        mapX: lng,
        mapY: lat,
        radius,
        contentTypeId: 39,
        numOfRows,
        arrange: 'E',
      },
    });
    const items = parseTourResponse<TourApiItem>(data);
    if (items.length === 0) return [];
    await setCache(cacheKey, items, CACHE_TTL.locationBased);
    return items;
  } catch {
    return [];
  }
}

async function mapChunked<T, R>(
  arr: T[],
  size: number,
  fn: (t: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < arr.length; i += size) {
    const chunk = arr.slice(i, i + size);
    out.push(...(await Promise.all(chunk.map(fn))));
  }
  return out;
}

// Step 1: 키워드 검색 (비건/채식/vegan) — 정확도 높음
async function veganStep1Keyword(
  lat: number,
  lng: number,
  areaCode: string
): Promise<TourApiItem[]> {
  const results = await Promise.all(
    VEGAN_KEYWORDS.slice(0, 3).map(async (keyword) => {
      try {
        const { data } = await tourApiClient.get('/searchKeyword2', {
          params: {
            ...getCommonParams(),
            keyword,
            contentTypeId: 39,
            ...tourAreaFilterParams(areaCode),
            mapX: lng,
            mapY: lat,
            radius: WIDE_RADIUS,
            numOfRows: 30,
          },
        });
        return parseTourResponse<TourApiItem>(data);
      } catch {
        return [];
      }
    })
  );
  return deduplicateByContentId(results.flat()).map((r) => ({
    ...r,
    veganScore: 9,
  }));
}

// Step 2: 광역 수집 → 프리필터 → 배치 스코어링 → 상위 후보
async function veganStep2Scored(
  lat: number,
  lng: number,
  areaCode: string
): Promise<TourApiItem[]> {
  const wide = await getRestaurantsByLocation(
    lat,
    lng,
    WIDE_RADIUS,
    areaCode,
    WIDE_ROWS
  );
  const candidates = wide.filter(
    (r) => !isObviousMeatOnly(scoreCatInput(r))
  );
  if (candidates.length === 0) return [];

  const scoreInput: VeganScoreItem[] = candidates.map(scoreCatInput);
  const scores = await quickVeganScore(scoreInput);

  return candidates
    .map((r) => ({ ...r, veganScore: scores.get(r.contentid) ?? 0 }))
    .filter((r) => (r.veganScore ?? 0) >= 5)
    .sort((a, b) => (b.veganScore ?? 0) - (a.veganScore ?? 0))
    .slice(0, STEP3_TOP);
}

// Step 3: 상위 후보 상세 분석 → veganLevel 확정 (NOT_VEGAN 제외)
async function veganStep3Detail(
  candidates: TourApiItem[]
): Promise<TourApiItem[]> {
  const analyzed = await mapChunked(candidates, STEP3_CONCURRENCY, async (r) => {
    try {
      const detail = await getRestaurantDetail(r.contentid);
      const menuBlob = `${detail?.firstmenu ?? r.title} ${detail?.treatmenu ?? ''} ${r.title}`;
      const analysis = sanitizeVeganAnalysis(
        menuBlob,
        await analyzeMenuForHealth({
          firstmenu: detail?.firstmenu ?? r.title,
          treatmenu: detail?.treatmenu ?? '',
          conditions: ['VEGAN'],
        })
      );
      const level = veganLevelFromAnalysis(analysis);
      return { ...r, veganLevel: level };
    } catch {
      return { ...r, veganLevel: 'CHECK_NEEDED' as const };
    }
  });
  return analyzed.filter((r) => r.veganLevel !== 'NOT_VEGAN');
}

// 3단계 파이프라인 통합
export async function getVeganRestaurants(
  lat: number,
  lng: number,
  areaCode = '1'
): Promise<TourApiItem[]> {
  if (!isTourApiConfigured()) {
    return getMockVeganRestaurants(areaCode, lat, lng);
  }

  const cacheKey = buildCacheKey('vegan', 'pipeline', { lat, lng, areaCode });
  const cached = await getCached<TourApiItem[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const step1 = await veganStep1Keyword(lat, lng, areaCode);

    let step3: TourApiItem[] = [];
    try {
      const step2 = await veganStep2Scored(lat, lng, areaCode);
      step3 = await veganStep3Detail(step2);
    } catch {
      step3 = [];
    }

    const merged = deduplicateByContentId([...step1, ...step3]);
    if (merged.length === 0) return [];
    await setCache(cacheKey, merged, CACHE_TTL.veganSearch);
    return merged;
  } catch {
    return [];
  }
}

export async function getRestaurantDetail(
  contentId: string
): Promise<RestaurantDetail | null> {
  if (isMockContentId(contentId)) {
    return getMockRestaurantDetail(contentId);
  }

  if (!isTourApiConfigured()) {
    return getMockRestaurantDetail(contentId);
  }

  const cacheKey = buildCacheKey('tourapi', 'detailIntro', { contentId });
  const cached = await getCached<RestaurantDetail>(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await tourApiClient.get('/detailIntro2', {
      params: {
        ...getCommonParams(),
        contentId,
        contentTypeId: 39,
      },
    });
    const items = parseTourResponse<RestaurantDetail>(data);
    const detail = items[0] ?? null;
    if (detail) await setCache(cacheKey, detail, CACHE_TTL.detailIntro);
    return detail;
  } catch {
    return null;
  }
}
