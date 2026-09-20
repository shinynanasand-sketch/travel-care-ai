// 인증키: PUBLIC_DATA_API_KEY (getCommonParams 경유)
import {
  tourApiClient,
  getCommonParams,
  parseTourResponse,
} from './client';
import { getMockAttractions } from './mock-data';
import { isTourApiConfigured } from '@/lib/data/korea-regions';
import { tourAreaFilterParams } from '@/lib/data/korea-ldong';
import { getCached, setCache } from '@/lib/cache/redis';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/keys';
import type { AttractionItem } from '@/types/tourapi.types';

export async function getAttractionsByArea(
  areaCode: string,
  sigunguCode?: string
): Promise<AttractionItem[]> {
  if (!isTourApiConfigured()) {
    return getMockAttractions(areaCode);
  }

  const cacheKey = buildCacheKey('tourapi', 'areaBased', {
    areaCode,
    sigunguCode: sigunguCode ?? '',
    v: 'ldong1',
  });
  const cached = await getCached<AttractionItem[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const areaParams = tourAreaFilterParams(areaCode, sigunguCode);

  try {
    const { data } = await tourApiClient.get('/areaBasedList2', {
      params: {
        ...getCommonParams(),
        ...areaParams,
        contentTypeId: 12,
        numOfRows: 40,
        arrange: 'O',
      },
    });
    const items = parseTourResponse<AttractionItem>(data);

    // 구 지정 시 시 전체로 확대하지 않음 — 타 구 혼입·잘못된 캐시 방지
    if (items.length === 0) return [];
    await setCache(cacheKey, items, CACHE_TTL.areaBasedList);
    return items;
  } catch {
    return [];
  }
}

/** 문화시설 (contentTypeId=14) — 웰니스 부재 시 마무리 명소 fallback 풀 */
export async function getCulturalFacilitiesByArea(
  areaCode: string,
  sigunguCode?: string
): Promise<AttractionItem[]> {
  if (!isTourApiConfigured()) {
    return [];
  }

  const cacheKey = buildCacheKey('tourapi', 'areaBased', {
    areaCode,
    sigunguCode: sigunguCode ?? '',
    contentTypeId: 14,
    v: 'ldong1',
  });
  const cached = await getCached<AttractionItem[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const areaParams = tourAreaFilterParams(areaCode, sigunguCode);

  try {
    const { data } = await tourApiClient.get('/areaBasedList2', {
      params: {
        ...getCommonParams(),
        ...areaParams,
        contentTypeId: 14,
        numOfRows: 30,
        arrange: 'O',
      },
    });
    const items = parseTourResponse<AttractionItem>(data);

    // 구 지정 시 시 전체로 확대하지 않음
    if (items.length > 0) {
      await setCache(cacheKey, items, CACHE_TTL.areaBasedList);
    }
    return items;
  } catch {
    return [];
  }
}

/** 좌표 기반 명소 — 지역코드 장애 시 보험 */
export async function getAttractionsByLocation(
  lat: number,
  lng: number,
  radius = 10000,
  areaCode = '1'
): Promise<AttractionItem[]> {
  if (!isTourApiConfigured()) {
    return getMockAttractions(areaCode);
  }

  const cacheKey = buildCacheKey('tourapi', 'attrLoc', {
    lat: lat.toFixed(3),
    lng: lng.toFixed(3),
    radius,
    v: 'ldong1',
  });
  const cached = await getCached<AttractionItem[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const { data } = await tourApiClient.get('/locationBasedList2', {
      params: {
        ...getCommonParams(),
        mapX: String(lng),
        mapY: String(lat),
        radius,
        contentTypeId: 12,
        numOfRows: 40,
        arrange: 'E',
      },
    });
    const items = parseTourResponse<AttractionItem>(data);
    if (items.length === 0) return [];
    await setCache(cacheKey, items, CACHE_TTL.areaBasedList);
    return items;
  } catch {
    return [];
  }
}
