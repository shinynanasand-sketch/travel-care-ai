import { addDays, format } from 'date-fns';
import { getRegionByAreaCode } from '@/lib/data/korea-regions';
import { tourCoords } from '@/lib/tourapi/client';
import {
  getRestaurantsByLocation,
  getVeganRestaurants,
  getRestaurantDetail,
} from '@/lib/tourapi/restaurant';
import { getMockRestaurants, getMockVeganRestaurants } from '@/lib/tourapi/mock-data';
import { getAttractionsByArea } from '@/lib/tourapi/attraction';
import { getWeather } from '@/lib/tourapi/weather';
import { getNearbyHospitals, getNearbyPharmacies } from '@/lib/medical/hospital';
import { getAccessibilityInfo } from '@/lib/tourapi/barrierFree';
import { getWellnessCourse } from '@/lib/tourapi/wellness';
import { analyzeMenuForHealth, veganLevelFromAnalysis } from './menuAnalyzer';
import type {
  GenerateCourseRequest,
  DayCourse,
  Schedule,
  MenuAnalysis,
} from '@/types/course.types';
import type { MedicalFacility } from '@/types/medical.types';
import type { SafetyLevel } from '@/types/health.types';
import type {
  AccessibilityInfo,
  WellnessItem,
  RestaurantDetail,
} from '@/types/tourapi.types';

const WELLNESS_THEME_LABEL: Record<string, string> = {
  SPA: '스파·온천',
  HEALING: '힐링·명상',
  NATURE: '자연·숲',
  HANSIK: '건강 한식',
  FOOD: '맛집',
  STAY: '휴양 숙소',
};

function riskToSafety(risk: string): SafetyLevel {
  if (risk === 'HIGH') return 'RED';
  if (risk === 'MEDIUM') return 'YELLOW';
  return 'GREEN';
}

// 동시성 제한 병렬 실행 헬퍼 (Gemini 무료 등급 RPM 폭주 방지)
async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  limit: number
): Promise<void> {
  let idx = 0;
  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    async () => {
      while (idx < tasks.length) {
        const current = idx++;
        await tasks[current]();
      }
    }
  );
  await Promise.all(workers);
}

export async function generateOptimizedCourse(
  request: GenerateCourseRequest
) {
  const { destination, period, healthProfile } = request;
  const region = getRegionByAreaCode(destination.areaCode);
  const coords = { lat: region.lat, lng: region.lng };
  const isVegan = healthProfile.conditions.includes('VEGAN');

  const [
    restaurants,
    veganRestaurants,
    attractions,
    weather,
    hospitals,
    pharmacies,
    wellnessItems,
  ] = await Promise.all([
      getRestaurantsByLocation(coords.lat, coords.lng, 2000, destination.areaCode),
      isVegan
        ? getVeganRestaurants(coords.lat, coords.lng, destination.areaCode)
        : Promise.resolve([]),
      getAttractionsByArea(destination.areaCode),
      getWeather(destination.areaCode),
      getNearbyHospitals(coords.lat, coords.lng),
      getNearbyPharmacies(coords.lat, coords.lng),
      getWellnessCourse(coords.lat, coords.lng),
    ]);

  const medicalFacilities: MedicalFacility[] = [...hospitals, ...pharmacies];

  let restaurantPool = isVegan
    ? [
        ...veganRestaurants,
        ...restaurants.filter(
          (r) => !veganRestaurants.some((v) => v.contentid === r.contentid)
        ),
      ]
    : restaurants;

  if (restaurantPool.length === 0) {
    restaurantPool = isVegan
      ? [
          ...getMockVeganRestaurants(destination.areaCode, coords.lat, coords.lng),
          ...getMockRestaurants(destination.areaCode, coords.lat, coords.lng),
        ]
      : getMockRestaurants(destination.areaCode, coords.lat, coords.lng);
  }

  // ── 사전 계산: 코스에 실제 사용될 고유 식당/관광지만 병렬 분석 ──
  // 일자별 인덱싱 규칙(d%len, (d+1)%len)을 그대로 사용해 사용 집합을 먼저 수집,
  // 고유 항목만 detail+Gemini 분석/접근성 조회를 동시성 제한 병렬로 처리한다.
  type RestaurantSource = (typeof restaurantPool)[number];
  const usedRestaurants = new Map<string, RestaurantSource>();
  const usedAttractions = new Map<string, (typeof attractions)[number]>();
  for (let d = 0; d < period.days; d++) {
    const b = restaurantPool[d % restaurantPool.length];
    const l = restaurantPool[(d + 1) % restaurantPool.length];
    if (b) usedRestaurants.set(b.contentid, b);
    if (l) usedRestaurants.set(l.contentid, l);
    if (attractions.length > 0) {
      const a = attractions[d % attractions.length];
      if (a) usedAttractions.set(a.contentid, a);
    }
  }

  const restaurantAnalysis = new Map<
    string,
    { detail: RestaurantDetail | null; analysis: MenuAnalysis }
  >();
  await runWithConcurrency(
    [...usedRestaurants.values()].map((r) => async () => {
      const detail = await getRestaurantDetail(r.contentid);
      const analysis = await analyzeMenuForHealth({
        firstmenu: detail?.firstmenu ?? r.title,
        treatmenu: detail?.treatmenu ?? '',
        conditions: healthProfile.conditions,
      });
      restaurantAnalysis.set(r.contentid, { detail, analysis });
    }),
    5
  );

  const accessibilityMap = new Map<string, AccessibilityInfo | undefined>();
  await runWithConcurrency(
    [...usedAttractions.values()].map((a) => async () => {
      try {
        accessibilityMap.set(
          a.contentid,
          (await getAccessibilityInfo(a.contentid)) ?? undefined
        );
      } catch {
        accessibilityMap.set(a.contentid, undefined);
      }
    }),
    5
  );

  const days: DayCourse[] = [];
  let hasVeganOptions = false;

  for (let d = 0; d < period.days; d++) {
    const date = format(addDays(new Date(period.startDate), d), 'yyyy-MM-dd');
    const schedules: Schedule[] = [];

    const breakfastRestaurant = restaurantPool[d % restaurantPool.length];
    const lunchRestaurant = restaurantPool[(d + 1) % restaurantPool.length];
    const attraction =
      attractions.length > 0 ? attractions[d % attractions.length] : undefined;

    for (const [time, restaurant] of [
      ['08:00', breakfastRestaurant],
      ['12:00', lunchRestaurant],
    ] as const) {
      if (!restaurant) continue;

      const pre = restaurantAnalysis.get(restaurant.contentid);
      const analysis =
        pre?.analysis ??
        (await analyzeMenuForHealth({
          firstmenu: restaurant.title,
          treatmenu: '',
          conditions: healthProfile.conditions,
        }));

      // 파이프라인이 산출한 veganLevel 우선 재사용 (재분석 방지)
      const veganLevel =
        isVegan && restaurant.veganLevel
          ? restaurant.veganLevel
          : veganLevelFromAnalysis(analysis);
      if (veganLevel === 'FULL_VEGAN' || veganLevel === 'PARTIAL_VEGAN') {
        hasVeganOptions = true;
      }

      const { lat, lng } = tourCoords(restaurant.mapx, restaurant.mapy);
      schedules.push({
        time,
        type: 'RESTAURANT',
        contentId: restaurant.contentid,
        title: restaurant.title,
        address: restaurant.addr1,
        coordinates: { lat, lng },
        safetyLevel: riskToSafety(analysis.overallRisk),
        veganLevel: isVegan ? veganLevel : undefined,
        safetyReason: analysis.recommendation,
        healthTips: [analysis.postMealAdvice],
        menuAnalysis: analysis,
        nearbyMedical: medicalFacilities.slice(0, 2),
      });
    }

    if (attraction) {
      const { lat, lng } = tourCoords(attraction.mapx, attraction.mapy);
      const isHot = weather.temperature > 30 && weather.humidity > 80;

      const accessibility = accessibilityMap.get(attraction.contentid);

      const healthTips = ['충분한 수분 섭취', '그늘에서 휴식'];
      let safetyLevel: SafetyLevel = isHot ? 'YELLOW' : 'GREEN';
      let safetyReason = isHot ? '고온다습 — 실내 관광 권장' : '접근성 양호';

      if (accessibility?.level === 'LOW') {
        healthTips.push('휠체어·엘리베이터 정보 부족 — 이동 시 동행/사전 확인 권장');
        if (safetyLevel === 'GREEN') safetyLevel = 'YELLOW';
        safetyReason = '무장애 편의시설 정보 부족 — 이동 주의';
      } else if (accessibility?.level === 'HIGH') {
        healthTips.push('무장애 편의시설 우수 — 휠체어·보행 약자 이동 용이');
      }

      schedules.push({
        time: isHot ? '15:00' : '10:00',
        type: 'ATTRACTION',
        contentId: attraction.contentid,
        title: attraction.title,
        address: attraction.addr1,
        coordinates: { lat, lng },
        safetyLevel,
        safetyReason,
        healthTips,
        nearbyMedical: medicalFacilities.slice(0, 1),
        accessibility,
      });
    }

    const wellness: WellnessItem | undefined =
      wellnessItems.length > 0
        ? wellnessItems[d % wellnessItems.length]
        : undefined;
    if (wellness) {
      const { lat, lng } = tourCoords(wellness.mapx, wellness.mapy);
      const themeLabel = wellness.theme
        ? WELLNESS_THEME_LABEL[wellness.theme] ?? '힐링'
        : '힐링';
      schedules.push({
        time: '16:00',
        type: 'WELLNESS',
        contentId: wellness.contentid,
        title: wellness.title,
        address: wellness.addr1,
        coordinates: { lat, lng },
        safetyLevel: 'GREEN',
        safetyReason: `${themeLabel} 웰니스 힐링 코스 — 심신 회복`,
        healthTips: ['무리하지 않는 선에서 휴식', '수분 섭취 유지'],
        nearbyMedical: medicalFacilities.slice(0, 1),
        wellnessTheme: wellness.theme,
      });
    }

    schedules.push({
      time: '14:30',
      type: 'REST',
      contentId: 'rest',
      title: '식후 산책',
      address: destination.name,
      coordinates: coords,
      safetyLevel: 'GREEN',
      safetyReason: '식후 30분 가벼운 보행',
      healthTips: ['혈당 관리에 도움'],
      nearbyMedical: [],
    });

    days.push({ day: d + 1, date, schedules });
  }

  const safetyScores = days.flatMap((day) =>
    day.schedules.map((s) =>
      s.safetyLevel === 'GREEN' ? 100 : s.safetyLevel === 'YELLOW' ? 70 : 40
    )
  );
  const overallSafetyScore =
    safetyScores.length > 0
      ? Math.round(safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length)
      : 80;

  return {
    days,
    medicalFacilities,
    overallSafetyScore,
    hasVeganOptions: isVegan ? hasVeganOptions : false,
    warnings: healthProfile.insulinUser
      ? [{ level: 'INFO' as const, message: '인슐린 투여 중 — 식사 시간을 엄수하세요.' }]
      : [],
  };
}
