// 인증키: PUBLIC_DATA_API_KEY (getCommonParams 경유)
import axios from 'axios';
import { getCommonParams, parseTourResponse } from './client';
import { isTourApiConfigured } from '@/lib/data/korea-regions';
import { getCached, setCache } from '@/lib/cache/redis';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/keys';
import type { WellnessItem, WellnessTheme } from '@/types/tourapi.types';

// 웰니스 관광정보 — 한국관광공사 WellnessTursmService (철자 "Tursm")
const WELLNESS_BASE = 'https://apis.data.go.kr/B551011/WellnessTursmService';

const wellnessClient = axios.create({
  baseURL: WELLNESS_BASE,
  timeout: 15000,
});

interface WellnessRaw {
  contentid: string;
  title: string;
  addr1?: string;
  mapx?: string;
  mapy?: string;
  dist?: string;
  firstimage?: string;
  tel?: string;
  cat3?: string;
}

const THEME_KEYWORDS: Array<{ theme: WellnessTheme; keywords: string[] }> = [
  { theme: 'SPA', keywords: ['스파', '온천', '찜질', '사우나', '워터'] },
  { theme: 'HEALING', keywords: ['힐링', '명상', '요가', '치유', '템플', '휴양'] },
  { theme: 'NATURE', keywords: ['숲', '수목원', '자연', '삼림', '공원', '정원', '산림'] },
  { theme: 'HANSIK', keywords: ['한식', '전통', '사찰음식', '한정식'] },
  { theme: 'FOOD', keywords: ['맛집', '음식', '카페', '레스토랑', '푸드'] },
  { theme: 'STAY', keywords: ['호텔', '리조트', '펜션', '스테이', '숙소', '한옥'] },
];

export function classifyWellnessTheme(item: {
  title?: string;
  cat3?: string;
}): WellnessTheme {
  const haystack = `${item.title ?? ''} ${item.cat3 ?? ''}`;
  for (const { theme, keywords } of THEME_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw))) return theme;
  }
  return 'HEALING';
}

function toWellnessItem(raw: WellnessRaw): WellnessItem {
  return {
    contentid: raw.contentid,
    title: raw.title,
    addr1: raw.addr1 ?? '',
    mapx: raw.mapx ?? '',
    mapy: raw.mapy ?? '',
    dist: raw.dist,
    firstimage: raw.firstimage,
    tel: raw.tel,
    cat3: raw.cat3,
    theme: classifyWellnessTheme(raw),
  };
}

export async function getWellnessCourse(
  lat: number,
  lng: number,
  radius = 10000,
  numOfRows = 10
): Promise<WellnessItem[]> {
  const mapX = String(Math.round(lng * 10000000));
  const mapY = String(Math.round(lat * 10000000));

  if (!isTourApiConfigured()) {
    return getMockWellness(lat, lng);
  }

  const cacheKey = buildCacheKey('tourapi', 'wellnessLocation', {
    mapX,
    mapY,
    radius,
    numOfRows,
  });
  const cached = await getCached<WellnessItem[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const { data } = await wellnessClient.get('/locationBasedList', {
      params: {
        ...getCommonParams(),
        langDivCd: 'KOR',
        mapX,
        mapY,
        radius,
        numOfRows,
        arrange: 'E',
      },
    });
    const raws = parseTourResponse<WellnessRaw>(data);
    if (raws.length === 0) return getMockWellness(lat, lng);
    const items = raws.map(toWellnessItem);
    await setCache(cacheKey, items, CACHE_TTL.wellness);
    return items;
  } catch {
    return getMockWellness(lat, lng);
  }
}

function getMockWellness(lat: number, lng: number): WellnessItem[] {
  const mock: Array<Omit<WellnessItem, 'theme'>> = [
    {
      contentid: 'wl-mock-1',
      title: '웰니스 힐링 스파',
      addr1: '온천·휴양 시설',
      mapx: String(Math.round((lng + 0.01) * 10000000)),
      mapy: String(Math.round((lat + 0.01) * 10000000)),
    },
    {
      contentid: 'wl-mock-2',
      title: '자연 치유의 숲',
      addr1: '삼림욕·명상 코스',
      mapx: String(Math.round((lng + 0.02) * 10000000)),
      mapy: String(Math.round((lat + 0.02) * 10000000)),
    },
    {
      contentid: 'wl-mock-3',
      title: '전통 한옥 스테이',
      addr1: '한옥 휴양 숙소',
      mapx: String(Math.round((lng - 0.01) * 10000000)),
      mapy: String(Math.round((lat - 0.01) * 10000000)),
    },
  ];
  return mock.map((m) => ({ ...m, theme: classifyWellnessTheme(m) }));
}
