import { publicDataUrl } from '@/lib/publicData/serviceKey';

const BASE =
  process.env.TOUR_API_BASE ||
  'https://apis.data.go.kr/B551011/KorService2';

const DEFAULT_TIMEOUT_MS = 15_000;

export const TOUR_API_BASE = BASE;

export const tourApiClient = {
  get: async (
    path: string,
    config?: {
      params?: Record<string, string | number | undefined | null>;
      baseURL?: string;
      timeout?: number;
    }
  ) => {
    const data = await tourApiFetch(path, config?.params ?? {}, {
      baseUrl: config?.baseURL,
      timeoutMs: config?.timeout,
    });
    return { data };
  },
};

// 공공데이터포털 통합 인증키(PUBLIC_DATA_API_KEY)의 단일 주입 지점.
// TourAPI 계열 모듈은 이 함수를 통해 공통 파라미터를 상속받음.
export function getCommonParams() {
  return {
    MobileOS: 'ETC',
    MobileApp: 'TravelCareAI',
    _type: 'json',
  };
}

function maskTourApiUrl(url: string): string {
  return url.replace(/serviceKey=[^&]+/i, 'serviceKey=***');
}

export async function tourApiFetch<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  options?: { baseUrl?: string; timeoutMs?: number }
): Promise<T> {
  const base = (options?.baseUrl ?? BASE).replace(/\/$/, '');
  const endpoint = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const url = publicDataUrl(endpoint, {
    ...getCommonParams(),
    ...params,
  });

  console.log('API 키 존재 여부:', !!process.env.PUBLIC_DATA_API_KEY);
  console.log('TourAPI 요청 URL:', maskTourApiUrl(url));

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`TourAPI ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`TourAPI timeout (${timeoutMs}ms)`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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
