// 인증키: PUBLIC_DATA_API_KEY (공공데이터포털 통합 키, 직접 참조)
import axios from 'axios';
import { getCached, setCache } from '@/lib/cache/redis';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/keys';
import type { MedicalFacility } from '@/types/medical.types';

const HIRA_BASE =
  'https://apis.data.go.kr/B551182/MadmDtlInfoHospInfoService2';

function useMockMedical(): boolean {
  return process.env.USE_MOCK_DATA === 'true' || !isHiraApiConfigured();
}

function isHiraApiConfigured(): boolean {
  return Boolean(process.env.PUBLIC_DATA_API_KEY?.trim());
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

async function fetchMedical(
  operation: string,
  lat: number,
  lng: number,
  radius: number,
  type: MedicalFacility['type']
): Promise<MedicalFacility[]> {
  if (useMockMedical()) {
    return getMockFacilities(lat, lng, type);
  }

  const cacheKey = buildCacheKey('medical', operation, { lat, lng, radius });
  const cached = await getCached<MedicalFacility[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const { data } = await axios.get(`${HIRA_BASE}/${operation}`, {
      params: {
        serviceKey: process.env.PUBLIC_DATA_API_KEY,
        xPos: lng,
        yPos: lat,
        radius,
        _type: 'json',
        ...(type === 'HOSPITAL' ? { dgsbjtCd: '01', clCd: '31' } : {}),
      },
      timeout: 10000,
    });
    const items = data?.response?.body?.items?.item ?? [];
    const list = (Array.isArray(items) ? items : items ? [items] : []).map(
      (item: { yadmNm: string; addr: string; telno: string; XPos: string; YPos: string }) => ({
        name: item.yadmNm,
        type,
        address: item.addr,
        phone: item.telno,
        coordinates: { lat: parseFloat(item.YPos), lng: parseFloat(item.XPos) },
        distanceM: calcDistance(lat, lng, parseFloat(item.YPos), parseFloat(item.XPos)),
      })
    );
    if (list.length === 0) return getMockFacilities(lat, lng, type);
    await setCache(cacheKey, list, CACHE_TTL.medical);
    return list;
  } catch {
    return getMockFacilities(lat, lng, type);
  }
}

export async function getNearbyHospitals(
  lat: number,
  lng: number,
  radius = 3000
): Promise<MedicalFacility[]> {
  return fetchMedical('getHospBasisList', lat, lng, radius, 'HOSPITAL');
}

export async function getNearbyPharmacies(
  lat: number,
  lng: number,
  radius = 2000
): Promise<MedicalFacility[]> {
  return fetchMedical('getPharmacyBasisList', lat, lng, radius, 'PHARMACY');
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
  return [
    {
      name: `가까운 ${labels[type]}`,
      type,
      address: '광주광역시 북구 운암동 (샘플 주소)',
      phone: '062-123-4567',
      coordinates: { lat: lat + 0.002, lng: lng + 0.002 },
      distanceM: 500,
    },
    {
      name: `${labels[type]} (2호점)`,
      type,
      address: '광주광역시 북구 동림동 (샘플 주소)',
      phone: '062-234-5678',
      coordinates: { lat: lat + 0.004, lng: lng + 0.003 },
      distanceM: 800,
    },
  ];
}
