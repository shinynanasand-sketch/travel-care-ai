import { createHash } from 'crypto';

export function buildCacheKey(
  service: string,
  operation: string,
  params: Record<string, unknown> | object
): string {
  const hash = createHash('md5')
    .update(JSON.stringify(params))
    .digest('hex')
    .slice(0, 12);
  return `${service}:${operation}:${hash}`;
}

export const CACHE_TTL = {
  areaBasedList: 24 * 3600,
  locationBased: 1 * 3600,
  detailIntro: 24 * 3600,
  detailWithTour: 7 * 24 * 3600,
  veganSearch: 12 * 3600,
  weather: 3 * 3600,
  aiAnalysis: 24 * 3600,
  medical: 12 * 3600,
  barrierFree: 7 * 24 * 3600,
  wellness: 24 * 3600,
  veganScore: 7 * 24 * 3600,
} as const;
