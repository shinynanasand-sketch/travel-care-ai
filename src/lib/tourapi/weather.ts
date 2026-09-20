import { getCached, setCache } from '@/lib/cache/redis';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/keys';
import type { WeatherInfo } from '@/types/tourapi.types';

/**
 * TourAPI 관광기상 실연동 전 고정 참고값.
 * 코스 폭염 분기(isHot)가 실데이터로 오인되지 않도록 source: stub 유지.
 */
export async function getWeather(areaCode: string): Promise<WeatherInfo> {
  const cacheKey = buildCacheKey('tourapi', 'weather', { areaCode, v: 'stub1' });
  const cached = await getCached<WeatherInfo>(cacheKey);
  if (cached) return cached;

  const weather: WeatherInfo = {
    areaCode,
    date: new Date().toISOString().split('T')[0],
    temperature: 22,
    humidity: 65,
    description: '맑음 (참고용 고정값 · 실기상 아님)',
    source: 'stub',
  };

  await setCache(cacheKey, weather, CACHE_TTL.weather);
  return weather;
}
