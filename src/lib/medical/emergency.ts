// 인증키: PUBLIC_DATA_API_KEY (공공데이터포털 통합 키, 직접 참조)
import axios from 'axios';
import type { MedicalFacility } from '@/types/medical.types';

const NMC_BASE =
  'https://apis.data.go.kr/B552657/ErmctInfoInqireService';

interface EgytRaw {
  dutyName?: string;
  dutyAddr?: string;
  dutyTel3?: string;
  wgs84Lat?: string;
  wgs84Lon?: string;
  hvec?: string;
  distance?: string;
}

function mockEmergency(lat: number, lng: number): MedicalFacility[] {
  return [
    {
      name: '응급의료센터',
      type: 'EMERGENCY',
      address: '주변 응급실',
      phone: '119',
      coordinates: { lat, lng },
      distanceM: 0,
    },
  ];
}

export async function getNearbyEmergencyRooms(
  lat: number,
  lng: number
): Promise<MedicalFacility[]> {
  try {
    // 좌표 기반 위치정보 조회 오퍼레이션(getEgytLcinfoInqire).
    // 지역 기반 getEgytListInfoInq는 WGS84 좌표를 무시하므로 사용하지 않음.
    const { data } = await axios.get(`${NMC_BASE}/getEgytLcinfoInqire`, {
      params: {
        serviceKey: process.env.PUBLIC_DATA_API_KEY,
        WGS84_LON: lng,
        WGS84_LAT: lat,
        pageNo: 1,
        numOfRows: 10,
        _type: 'json',
      },
      timeout: 10000,
    });

    // _type=json이 무시되어 XML 문자열로 오는 경우 방어
    if (typeof data === 'string') {
      return mockEmergency(lat, lng);
    }

    const rawItems = data?.response?.body?.items?.item ?? [];
    const items: EgytRaw[] = Array.isArray(rawItems) ? rawItems : [rawItems];
    const mapped = items
      .filter((item) => item && item.dutyName)
      .map((item) => ({
        name: item.dutyName as string,
        type: 'EMERGENCY' as const,
        address: item.dutyAddr ?? '',
        phone: item.dutyTel3 ?? '119',
        coordinates: {
          lat: parseFloat(item.wgs84Lat ?? String(lat)),
          lng: parseFloat(item.wgs84Lon ?? String(lng)),
        },
        distanceM: item.distance
          ? Math.round(parseFloat(item.distance) * 1000)
          : 0,
        availableBeds: item.hvec ? parseInt(item.hvec, 10) : undefined,
      }));

    // 결과가 비어도 최소 1건(119)은 보장
    return mapped.length > 0 ? mapped : mockEmergency(lat, lng);
  } catch {
    return mockEmergency(lat, lng);
  }
}
