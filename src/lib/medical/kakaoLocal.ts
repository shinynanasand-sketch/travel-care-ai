import axios from 'axios';
import type { MedicalFacility, MedicalFacilityType } from '@/types/medical.types';
import { filterHumanMedicalFacilities } from '@/lib/medical/filters';

const KAKAO_LOCAL = 'https://dapi.kakao.com/v2/local/search/category.json';

/** Kakao Local category codes */
const CATEGORY: Record<'HOSPITAL' | 'PHARMACY', string> = {
  HOSPITAL: 'HP8',
  PHARMACY: 'PM9',
};

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

export function isKakaoLocalConfigured(): boolean {
  return Boolean(process.env.KAKAO_REST_API_KEY?.trim());
}

/**
 * Kakao Local category search near a WGS84 point.
 * Requires KAKAO_REST_API_KEY (not the JavaScript map key).
 */
export async function searchKakaoMedical(
  lat: number,
  lng: number,
  type: 'HOSPITAL' | 'PHARMACY',
  radius = 3000
): Promise<MedicalFacility[]> {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return [];

  const { data } = await axios.get(KAKAO_LOCAL, {
    headers: { Authorization: `KakaoAK ${key}` },
    params: {
      category_group_code: CATEGORY[type],
      x: lng,
      y: lat,
      radius: Math.min(Math.max(radius, 0), 20000),
      sort: 'distance',
      size: 15,
    },
    timeout: 8000,
  });

  const docs = (data?.documents ?? []) as Array<{
    place_name?: string;
    road_address_name?: string;
    address_name?: string;
    phone?: string;
    x?: string;
    y?: string;
    distance?: string;
  }>;

  const mapped = docs.map((d) => {
    const plat = parseFloat(d.y ?? '');
    const plng = parseFloat(d.x ?? '');
    const distApi = parseInt(d.distance ?? '', 10);
    return {
      name: d.place_name ?? '이름 없음',
      type: type as MedicalFacilityType,
      address: d.road_address_name || d.address_name || '',
      phone: d.phone || '전화 문의',
      coordinates: { lat: plat, lng: plng },
      distanceM: Number.isFinite(distApi)
        ? distApi
        : calcDistance(lat, lng, plat, plng),
      source: 'kakao' as const,
    };
  });

  // Pharmacies rarely need name filter; hospitals do (동물병원·치과 등)
  return type === 'HOSPITAL'
    ? filterHumanMedicalFacilities(mapped)
    : mapped;
}
