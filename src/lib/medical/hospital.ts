// 심평원 병원정보(hospInfoServicev2) + 약국정보(pharmacyInfoService)
// 폴백: KAKAO_REST_API_KEY (Local HP8/PM9)
import axios from 'axios';
import { getCached, setCache } from '@/lib/cache/redis';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/keys';
import {
  isExcludedHiraClCd,
  isExcludedMedicalName,
} from '@/lib/medical/filters';
import {
  isKakaoLocalConfigured,
  searchKakaoMedical,
} from '@/lib/medical/kakaoLocal';
import {
  getPublicDataApiKey,
  publicDataUrl,
} from '@/lib/publicData/serviceKey';
import type {
  MedicalFacility,
  MedicalLookupMeta,
} from '@/types/medical.types';

/** Official HIRA hospital list (v2) */
const HIRA_HOSPITAL_URL =
  'https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList';

/** Official HIRA pharmacy list (API spelling: Parmacy) */
const HIRA_PHARMACY_URL =
  'https://apis.data.go.kr/B551182/pharmacyInfoService/getParmacyBasisList';

/** After 403 "등록되지 않은 서비스키", skip HIRA for a few minutes (warm instance). */
let hiraAuthBlockedUntil = 0;

function isHiraAuthBlocked(): boolean {
  return Date.now() < hiraAuthBlockedUntil;
}

function markHiraAuthBlocked(reason: string): void {
  if (
    /SERVICE_KEY_IS_NOT_REGISTERED|등록되지 않은 서비스키|returnReasonCode":"30"|returnReasonCode.:30/.test(
      reason
    )
  ) {
    hiraAuthBlockedUntil = Date.now() + 5 * 60 * 1000;
  }
}

function isHiraApiConfigured(): boolean {
  return Boolean(getPublicDataApiKey());
}

function calcDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export type MedicalFetchResult = {
  facilities: MedicalFacility[];
  meta: MedicalLookupMeta;
};

function uniqJoin(parts: (string | undefined)[]): string | undefined {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = p?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.length ? out.join(' · ') : undefined;
}

async function fetchHiraUrl(
  url: string,
  lat: number,
  lng: number,
  radius: number,
  type: MedicalFacility['type']
): Promise<{ list: MedicalFacility[]; error?: string }> {
  if (!getPublicDataApiKey()) {
    return { list: [], error: 'PUBLIC_DATA_API_KEY missing' };
  }

  if (isHiraAuthBlocked()) {
    return {
      list: [],
      error:
        'HIRA 인증키 미등록(이전에 403) — 카카오 폴백. 포털에서 병원·약국 활용신청·Decoding키 확인',
    };
  }

  try {
    // TourAPI와 동일하게 serviceKey 한 번만, URL에 직접 붙임 (axios params 이중인코딩 방지)
    const fullUrl = publicDataUrl(url, {
      pageNo: 1,
      numOfRows: 20,
      xPos: lng,
      yPos: lat,
      radius,
      _type: 'json',
    });

    const { data, status } = await axios.get(fullUrl, {
      // 병원 API는 종종 느림(약국보다). 8초면 타임아웃 → 카카오만 보임.
      timeout: type === 'HOSPITAL' ? 15000 : 10000,
      validateStatus: (s) => s < 500,
    });

    if (status >= 400) {
      const bodyHint =
        typeof data === 'string'
          ? data.slice(0, 200)
          : JSON.stringify(
              data?.OpenAPI_ServiceResponse ?? data?.response?.header ?? data
            ).slice(0, 220);
      const error = `HIRA HTTP ${status} ${bodyHint}`.trim();
      markHiraAuthBlocked(error);
      return { list: [], error };
    }

    const header = data?.response?.header;
    const resultCode = header?.resultCode ?? header?.resultcode;
    if (
      resultCode &&
      String(resultCode) !== '00' &&
      String(resultCode) !== '0000'
    ) {
      const error =
        `HIRA resultCode=${resultCode} ${header?.resultMsg ?? header?.resultmsg ?? ''}`.trim();
      markHiraAuthBlocked(error);
      return { list: [], error };
    }

    const items = data?.response?.body?.items?.item ?? [];
    const raw = (Array.isArray(items) ? items : items ? [items] : []) as Array<{
      yadmNm?: string;
      addr?: string;
      telno?: string;
      XPos?: string;
      YPos?: string;
      xPos?: string;
      yPos?: string;
      clCd?: string;
    }>;

    const mapped: MedicalFacility[] = [];
    for (const item of raw) {
      if (type === 'HOSPITAL' && isExcludedHiraClCd(item.clCd)) continue;
      const name = item.yadmNm ?? '이름 없음';
      if (type === 'HOSPITAL' && isExcludedMedicalName(name)) continue;
      const y = parseFloat(item.YPos ?? item.yPos ?? '');
      const x = parseFloat(item.XPos ?? item.xPos ?? '');
      if (!Number.isFinite(y) || !Number.isFinite(x)) continue;
      mapped.push({
        name,
        type,
        address: item.addr ?? '',
        phone: item.telno ?? '전화 문의',
        coordinates: { lat: y, lng: x },
        distanceM: calcDistance(lat, lng, y, x),
        source: 'hira',
      });
    }

    if (mapped.length === 0) {
      return { list: [], error: 'HIRA empty items (after filter)' };
    }
    return { list: mapped };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'HIRA request failed';
    return { list: [], error: msg };
  }
}

async function fetchMedicalWithFallback(
  url: string,
  cacheOp: string,
  lat: number,
  lng: number,
  radius: number,
  type: 'HOSPITAL' | 'PHARMACY'
): Promise<MedicalFetchResult> {
  if (process.env.USE_MOCK_DATA === 'true') {
    return {
      facilities: getMockFacilities(lat, lng, type),
      meta: {
        source: 'mock',
        hiraFailed: false,
        hiraMessage: 'USE_MOCK_DATA=true',
      },
    };
  }

  if (!isHiraApiConfigured()) {
    const kakao = isKakaoLocalConfigured()
      ? await searchKakaoMedical(lat, lng, type, radius).catch(() => [])
      : [];
    return {
      facilities: kakao,
      meta: {
        source: kakao.length ? 'kakao' : 'mock',
        hiraFailed: true,
        hiraMessage: 'PUBLIC_DATA_API_KEY missing',
      },
    };
  }

  const cacheKey = buildCacheKey('medical', `v4-${cacheOp}`, {
    lat,
    lng,
    radius,
  });
  const cached = await getCached<MedicalFetchResult>(cacheKey);
  if (cached?.facilities?.length && cached.meta?.source === 'hira') {
    return cached;
  }

  const hira = await fetchHiraUrl(url, lat, lng, radius, type);
  if (hira.list.length > 0) {
    const result: MedicalFetchResult = {
      facilities: hira.list,
      meta: { source: 'hira', hiraFailed: false },
    };
    await setCache(cacheKey, result, CACHE_TTL.medical);
    return result;
  }

  let kakao: MedicalFacility[] = [];
  let kakaoError = '';
  if (isKakaoLocalConfigured()) {
    try {
      kakao = await searchKakaoMedical(lat, lng, type, Math.max(radius, 2000));
    } catch (e) {
      kakaoError = e instanceof Error ? e.message : 'Kakao Local failed';
    }
  } else {
    kakaoError = 'KAKAO_REST_API_KEY missing';
  }

  const result: MedicalFetchResult = {
    facilities: kakao,
    meta: {
      source: kakao.length ? 'kakao' : 'mock',
      hiraFailed: true,
      hiraMessage:
        uniqJoin([hira.error, kakaoError]) || 'HIRA empty',
    },
  };

  // Don't cache auth failures as success — only cache Kakao hits briefly via redis
  if (kakao.length > 0 && !/SERVICE_KEY_IS_NOT_REGISTERED|등록되지 않은/.test(hira.error ?? '')) {
    await setCache(cacheKey, result, CACHE_TTL.medical);
  }
  return result;
}

export async function getNearbyHospitals(
  lat: number,
  lng: number,
  radius = 3000
): Promise<MedicalFacility[]> {
  const r = await getNearbyHospitalsWithMeta(lat, lng, radius);
  return r.facilities;
}

export async function getNearbyPharmacies(
  lat: number,
  lng: number,
  radius = 2000
): Promise<MedicalFacility[]> {
  const r = await getNearbyPharmaciesWithMeta(lat, lng, radius);
  return r.facilities;
}

export async function getNearbyHospitalsWithMeta(
  lat: number,
  lng: number,
  radius = 3000
): Promise<MedicalFetchResult> {
  return fetchMedicalWithFallback(
    HIRA_HOSPITAL_URL,
    'hosp',
    lat,
    lng,
    radius,
    'HOSPITAL'
  );
}

export async function getNearbyPharmaciesWithMeta(
  lat: number,
  lng: number,
  radius = 2000
): Promise<MedicalFetchResult> {
  return fetchMedicalWithFallback(
    HIRA_PHARMACY_URL,
    'pharm',
    lat,
    lng,
    radius,
    'PHARMACY'
  );
}

export async function getMedicalNearSpot(
  lat: number,
  lng: number,
  limit = 3
): Promise<MedicalFacility[]> {
  const r = await getMedicalNearSpotWithMeta(lat, lng, limit);
  return r.facilities;
}

export async function getMedicalNearSpotWithMeta(
  lat: number,
  lng: number,
  limit = 3
): Promise<MedicalFetchResult> {
  const [h, p] = await Promise.all([
    getNearbyHospitalsWithMeta(lat, lng, 2000),
    getNearbyPharmaciesWithMeta(lat, lng, 2000),
  ]);
  const facilities = [...h.facilities, ...p.facilities]
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
  const hiraFailed = h.meta.hiraFailed || p.meta.hiraFailed;
  const source =
    facilities[0]?.source ??
    (h.meta.source === 'hira' || p.meta.source === 'hira'
      ? 'hira'
      : h.meta.source === 'kakao' || p.meta.source === 'kakao'
        ? 'kakao'
        : 'mock');
  return {
    facilities,
    meta: {
      source,
      hiraFailed,
      hiraMessage: uniqJoin([h.meta.hiraMessage, p.meta.hiraMessage]),
    },
  };
}

function getMockFacilities(
  lat: number,
  lng: number,
  type: MedicalFacility['type']
): MedicalFacility[] {
  const labels = {
    HOSPITAL: '내과의원',
    PHARMACY: '24시 약국',
    EMERGENCY: '응급실',
  };
  const areaHint = `위도 ${lat.toFixed(3)}, 경도 ${lng.toFixed(3)} 인근 (샘플)`;
  return [
    {
      name: `[샘플] 인근 ${labels[type]}`,
      type,
      address: areaHint,
      phone: '전화 문의',
      coordinates: { lat: lat + 0.002, lng: lng + 0.002 },
      distanceM: 500,
      source: 'mock',
    },
    {
      name: `[샘플] ${labels[type]} B`,
      type,
      address: areaHint,
      phone: '전화 문의',
      coordinates: { lat: lat + 0.004, lng: lng + 0.003 },
      distanceM: 800,
      source: 'mock',
    },
  ];
}
