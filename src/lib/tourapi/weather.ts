import { getCached, setCache } from '@/lib/cache/redis';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/keys';
import type { WeatherInfo } from '@/types/tourapi.types';

export async function getWeather(areaCode: string): Promise<WeatherInfo> {
  const cacheKey = buildCacheKey('tourapi', 'weather', { areaCode });
  const cached = await getCached<WeatherInfo>(cacheKey);
  if (cached) return cached;

  const weather: WeatherInfo = {
    areaCode,
    date: new Date().toISOString().split('T')[0],
    temperature: 22,
    humidity: 65,
    description: '맑음 (참고용 고정값)',
    source: 'stub',
  };

  await setCache(cacheKey, weather, CACHE_TTL.weather);
  return weather;
}
