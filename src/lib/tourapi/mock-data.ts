import { getRegionByAreaCode } from '@/lib/data/korea-regions';
import type { AttractionItem, RestaurantDetail, TourApiItem } from '@/types/tourapi.types';

const REGION_ATTRACTIONS: Record<string, { title: string; addr: string }[]> = {
  '1': [
    { title: '경복궁', addr: '서울특별시 종로구 사직로 161' },
    { title: '남산서울타워', addr: '서울특별시 용산구 남산공원길 105' },
    { title: '북촌한옥마을', addr: '서울특별시 종로구 계동길 37' },
  ],
  '6': [
    { title: '해운대해수욕장', addr: '부산광역시 해운대구 우동' },
    { title: '감천문화마을', addr: '부산광역시 사하구 감내2로 203' },
    { title: '자갈치시장', addr: '부산광역시 중구 자갈치해안로 52' },
  ],
  '39': [
    { title: '성산일출봉', addr: '제주특별자치도 서귀포시 성산읍' },
    { title: '협재해수욕장', addr: '제주특별자치도 제주시 한림읍' },
    { title: '성읍민속마을', addr: '제주특별자치도 서귀포시 표선면' },
  ],
};

function toCoords(lat: number, lng: number, offset = 0) {
  return {
    mapx: String((lng + offset) * 10000000),
    mapy: String((lat + offset) * 10000000),
  };
}

export function getMockRestaurants(
  areaCode: string,
  lat: number,
  lng: number
): TourApiItem[] {
  const region = getRegionByAreaCode(areaCode);
  const coords0 = toCoords(lat, lng);
  const coords1 = toCoords(lat, lng, 0.008);
  const coords2 = toCoords(lat, lng, 0.015);

  return [
    {
      contentid: `mock-r-${areaCode}-1`,
      title: `${region.shortName} 건강한 한식당`,
      addr1: `${region.name} 중심가`,
      ...coords0,
      dist: '200',
    },
    {
      contentid: `mock-r-${areaCode}-2`,
      title: `${region.shortName} 담백한 백반집`,
      addr1: `${region.name} 전통시장 인근`,
      ...coords1,
      dist: '450',
    },
    {
      contentid: `mock-r-${areaCode}-3`,
      title: `${region.shortName} 현미죽 전문점`,
      addr1: `${region.name} 역세권`,
      ...coords2,
      dist: '680',
    },
  ];
}

export function getMockVeganRestaurants(
  areaCode: string,
  lat: number,
  lng: number
): TourApiItem[] {
  const region = getRegionByAreaCode(areaCode);
  const coords0 = toCoords(lat, lng, 0.003);
  const coords1 = toCoords(lat, lng, 0.01);

  const coords2 = toCoords(lat, lng, 0.018);

  return [
    {
      contentid: `mock-v-${areaCode}-1`,
      title: `${region.shortName} 그린키친 비건 레스토랑`,
      addr1: `${region.name} 비건거리`,
      ...coords0,
      dist: '150',
      veganScore: 10,
      veganLevel: 'FULL_VEGAN',
    },
    {
      contentid: `mock-v-${areaCode}-2`,
      title: `${region.shortName} 채식카페`,
      addr1: `${region.name} 문화거리`,
      ...coords1,
      dist: '320',
      veganScore: 9,
      veganLevel: 'FULL_VEGAN',
    },
    {
      contentid: `mock-v-${areaCode}-3`,
      title: `${region.shortName} 사찰음식 정식`,
      addr1: `${region.name} 전통거리`,
      ...coords2,
      dist: '540',
      veganScore: 7,
      veganLevel: 'PARTIAL_VEGAN',
    },
  ];
}

export function getMockAttractions(areaCode: string): AttractionItem[] {
  const region = getRegionByAreaCode(areaCode);
  const defaults = [
    { title: `${region.shortName} 대표 관광지`, addr: `${region.name} 시내` },
    { title: `${region.shortName} 자연휴양림`, addr: `${region.name} 교외` },
  ];
  const attractions = REGION_ATTRACTIONS[areaCode] ?? defaults;

  return attractions.map((a, i) => {
    const coords = toCoords(region.lat, region.lng, i * 0.012);
    return {
      contentid: `mock-a-${areaCode}-${i + 1}`,
      title: a.title,
      addr1: a.addr,
      mapx: coords.mapx,
      mapy: coords.mapy,
    };
  });
}

export function getMockRestaurantDetail(contentId: string): RestaurantDetail | null {
  if (!contentId.startsWith('mock-')) return null;

  const isVegan = contentId.includes('-v-');
  const regionMatch = contentId.match(/mock-[rv]-(\d+)-/);
  const areaCode = regionMatch?.[1] ?? '1';
  const region = getRegionByAreaCode(areaCode);

  if (isVegan) {
    return {
      contentid: contentId,
      title: `${region.shortName} 비건 레스토랑`,
      addr1: region.name,
      mapx: String(region.lng * 10000000),
      mapy: String(region.lat * 10000000),
      firstmenu: '두부스테이크 정식',
      treatmenu: '비건 샐러드, 채소볶음밥, 버섯스프',
      opentimefood: '11:00-21:00',
    };
  }

  return {
    contentid: contentId,
    title: `${region.shortName} 한식당`,
    addr1: region.name,
    mapx: String(region.lng * 10000000),
    mapy: String(region.lat * 10000000),
    firstmenu: '현미밥 정식',
    treatmenu: '닭곰탕, 제육볶음, 된장찌개, 나물반상',
    opentimefood: '10:00-22:00',
  };
}

export function isMockContentId(contentId: string): boolean {
  return contentId.startsWith('mock-');
}
