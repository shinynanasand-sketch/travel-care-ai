import axios from 'axios';

const BASE =
  process.env.TOUR_API_BASE ||
  'https://apis.data.go.kr/B551011/KorService2';

export const tourApiClient = axios.create({
  baseURL: BASE,
  timeout: 15000,
});

// 공공데이터포털 통합 인증키(PUBLIC_DATA_API_KEY)의 단일 주입 지점.
// TourAPI 계열 모듈은 이 함수를 통해 serviceKey를 상속받음.
export function getCommonParams() {
  return {
    serviceKey: process.env.PUBLIC_DATA_API_KEY,
    MobileOS: 'ETC',
    MobileApp: 'TravelCareAI',
    _type: 'json',
  };
}

export function parseTourResponse<T>(data: unknown): T[] {
  const response = data as {
    response?: {
      body?: {
        items?: { item?: T | T[] };
        totalCount?: number;
      };
    };
  };
  const items = response?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

/** KorService1 often used fixed-point×1e7; KorService2 usually WGS84 degrees. */
export function normalizeTourAxis(raw: string | number): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
  if (!Number.isFinite(n)) return 0;
  // Degrees are within ±180 (lng) / ±90 (lat). Larger ⇒ fixed-point integer.
  if (Math.abs(n) > 180) return n / 10_000_000;
  return n;
}

export function tourCoords(mapx: string, mapy: string) {
  return {
    lat: normalizeTourAxis(mapy),
    lng: normalizeTourAxis(mapx),
  };
}

export function deduplicateByContentId<T extends { contentid: string }>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.contentid)) return false;
    seen.add(item.contentid);
    return true;
  });
}
