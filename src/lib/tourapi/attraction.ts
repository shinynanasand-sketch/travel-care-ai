// 인증키: PUBLIC_DATA_API_KEY (getCommonParams 경유)
import {
  tourApiClient,
  getCommonParams,
  parseTourResponse,
} from './client';
import { getMockAttractions } from './mock-data';
import { isTourApiConfigured } from '@/lib/data/korea-regions';
import { getCached, setCache } from '@/lib/cache/redis';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/keys';
import type { AttractionItem } from '@/types/tourapi.types';

export async function getAttractionsByArea(
  areaCode: string
): Promise<AttractionItem[]> {
  if (!isTourApiConfigured()) {
    return getMockAttractions(areaCode);
  }

  const cacheKey = buildCacheKey('tourapi', 'areaBased', { areaCode });
  const cached = await getCached<AttractionItem[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const { data } = await tourApiClient.get('/areaBasedList2', {
      params: {
        ...getCommonParams(),
        areaCode,
        contentTypeId: 12,
        numOfRows: 20,
        arrange: 'C',
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
