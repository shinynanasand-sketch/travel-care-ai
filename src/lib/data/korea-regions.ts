export interface KoreaRegion {
  areaCode: string;
  name: string;
  shortName: string;
  group: 'metropolitan' | 'province';
  lat: number;
  lng: number;
}

export const KOREA_REGIONS: KoreaRegion[] = [
  { areaCode: '1', name: '서울특별시', shortName: '서울', group: 'metropolitan', lat: 37.5665, lng: 126.978 },
  { areaCode: '2', name: '인천광역시', shortName: '인천', group: 'metropolitan', lat: 37.4563, lng: 126.7052 },
  { areaCode: '3', name: '대전광역시', shortName: '대전', group: 'metropolitan', lat: 36.3504, lng: 127.3845 },
  { areaCode: '4', name: '대구광역시', shortName: '대구', group: 'metropolitan', lat: 35.8714, lng: 128.6014 },
  { areaCode: '5', name: '광주광역시', shortName: '광주', group: 'metropolitan', lat: 35.1595, lng: 126.8526 },
  { areaCode: '6', name: '부산광역시', shortName: '부산', group: 'metropolitan', lat: 35.1796, lng: 129.0756 },
  { areaCode: '7', name: '울산광역시', shortName: '울산', group: 'metropolitan', lat: 35.5384, lng: 129.3114 },
  { areaCode: '8', name: '세종특별자치시', shortName: '세종', group: 'metropolitan', lat: 36.48, lng: 127.289 },
  { areaCode: '31', name: '경기도', shortName: '경기', group: 'province', lat: 37.4138, lng: 127.5183 },
  { areaCode: '32', name: '강원특별자치도', shortName: '강원', group: 'province', lat: 37.8228, lng: 128.1555 },
  { areaCode: '33', name: '충청북도', shortName: '충북', group: 'province', lat: 36.8, lng: 127.7 },
  { areaCode: '34', name: '충청남도', shortName: '충남', group: 'province', lat: 36.5184, lng: 126.8 },
  { areaCode: '35', name: '경상북도', shortName: '경북', group: 'province', lat: 36.4919, lng: 128.8889 },
  { areaCode: '36', name: '경상남도', shortName: '경남', group: 'province', lat: 35.4606, lng: 128.2132 },
  { areaCode: '37', name: '전북특별자치도', shortName: '전북', group: 'province', lat: 35.7175, lng: 127.153 },
  { areaCode: '38', name: '전라남도', shortName: '전남', group: 'province', lat: 34.8679, lng: 126.991 },
  { areaCode: '39', name: '제주특별자치도', shortName: '제주', group: 'province', lat: 33.4996, lng: 126.5312 },
];

export const METROPOLITAN_REGIONS = KOREA_REGIONS.filter((r) => r.group === 'metropolitan');
export const PROVINCE_REGIONS = KOREA_REGIONS.filter((r) => r.group === 'province');

export function getRegionByAreaCode(areaCode: string): KoreaRegion {
  return KOREA_REGIONS.find((r) => r.areaCode === areaCode) ?? KOREA_REGIONS[0];
}

// 통합 인증키 PUBLIC_DATA_API_KEY 설정 여부로 실데이터/mock 분기
export function isTourApiConfigured(): boolean {
  if (process.env.USE_MOCK_DATA === 'true') return false;
  return Boolean(process.env.PUBLIC_DATA_API_KEY?.trim());
}
