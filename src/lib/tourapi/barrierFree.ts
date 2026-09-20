// 인증키: PUBLIC_DATA_API_KEY (getCommonParams 경유)
import { parseTourResponse, tourApiFetch } from './client';
import { isTourApiConfigured } from '@/lib/data/korea-regions';
import { getCached, setCache } from '@/lib/cache/redis';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/keys';
import type { AccessibilityInfo, AccessibilityLevel } from '@/types/tourapi.types';

// 무장애 여행 정보 — 한국관광공사 KorWithService2
const BARRIER_FREE_BASE = 'https://apis.data.go.kr/B551011/KorWithService2';

interface DetailWithTourRaw {
  contentid?: string;
  wheelchair?: string;
  elevator?: string;
  restroom?: string;
  route?: string;
  parking?: string;
  exit?: string;
  publictransport?: string;
  stroller?: string;
  braileblock?: string;
  audioguide?: string;
}

function hasFeature(value?: string): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v.length === 0) return false;
  return !['없음', '불가', '미제공', 'N'].some((neg) => v.includes(neg));
}

export function computeAccessibilityLevel(
  info: Omit<AccessibilityInfo, 'level'>
): AccessibilityLevel {
  // 이동 편의 핵심 필드(휠체어 접근 관점)를 우선 가중
  const stepFree = [info.wheelchair, info.exit, info.elevator].filter(hasFeature)
    .length;
  const support = [
    info.restroom,
    info.parking,
    info.route,
    info.publictransport,
  ].filter(hasFeature).length;
  const total = stepFree + support;

  if (stepFree >= 1 && total >= 3) return 'HIGH';
  if (total >= 1) return 'MEDIUM';
  return 'LOW';
}

export async function getAccessibilityInfo(
  contentId: string,
  contentTypeId = 12
): Promise<AccessibilityInfo | null> {
  if (!isTourApiConfigured()) {
    return getMockAccessibility(contentId);
  }

  const cacheKey = buildCacheKey('tourapi', 'detailWithTour2', { contentId });
  const cached = await getCached<AccessibilityInfo>(cacheKey);
  if (cached) return cached;

  try {
    const data = await tourApiFetch(
      '/detailWithTour2',
      {
        contentId,
        contentTypeId,
      },
      { baseUrl: BARRIER_FREE_BASE }
    );
    const items = parseTourResponse<DetailWithTourRaw>(data);
    const raw = items[0];
    if (!raw) return null;

    const base: Omit<AccessibilityInfo, 'level'> = {
      contentid: raw.contentid ?? contentId,
      wheelchair: raw.wheelchair,
      elevator: raw.elevator,
      restroom: raw.restroom,
      route: raw.route,
      parking: raw.parking,
      exit: raw.exit,
      publictransport: raw.publictransport,
      stroller: raw.stroller,
      braileblock: raw.braileblock,
      audioguide: raw.audioguide,
    };
    const info: AccessibilityInfo = {
      ...base,
      level: computeAccessibilityLevel(base),
    };
    await setCache(cacheKey, info, CACHE_TTL.barrierFree);
    return info;
  } catch {
    return null;
  }
}

/** 로컬·mock 전용 — TourAPI 미설정일 때만 사용. HIGH로 과장하지 않음. */
function getMockAccessibility(contentId: string): AccessibilityInfo {
  const base = {
    contentid: contentId,
    wheelchair: '샘플·확인 필요',
    elevator: undefined,
    restroom: undefined,
    route: undefined,
    parking: undefined,
    exit: undefined,
    publictransport: undefined,
    braileblock: undefined,
    audioguide: undefined,
  };
  return {
    ...base,
    level: 'LOW',
  };
}
