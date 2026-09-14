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
    let items = parseTourResponse<AttractionItem>(data);

    // 시군 필터가 비면 시도(lDongRegn / area)만으로 재시도
    if (items.length === 0 && sigunguCode) {
      const wideParams = tourAreaFilterParams(areaCode, undefined);
      const { data: wide } = await tourApiClient.get('/areaBasedList2', {
        params: {
          ...getCommonParams(),
          ...wideParams,
          contentTypeId: 12,
          numOfRows: 40,
          arrange: 'O',
        },
      });
      items = parseTourResponse<AttractionItem>(wide);
    }

    if (items.length === 0) return getMockAttractions(areaCode);
    await setCache(cacheKey, items, CACHE_TTL.areaBasedList);
    return items;
  } catch {
    return getMockAttractions(areaCode);
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
    let items = parseTourResponse<AttractionItem>(data);

    if (items.length === 0 && sigunguCode) {
      const wideParams = tourAreaFilterParams(areaCode, undefined);
      const { data: wide } = await tourApiClient.get('/areaBasedList2', {
        params: {
          ...getCommonParams(),
          ...wideParams,
          contentTypeId: 14,
          numOfRows: 30,
          arrange: 'O',
        },
      });
      items = parseTourResponse<AttractionItem>(wide);
    }

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
    if (items.length === 0) return getMockAttractions(areaCode);
    await setCache(cacheKey, items, CACHE_TTL.areaBasedList);
    return items;
  } catch {
    return getMockAttractions(areaCode);
  }
}
