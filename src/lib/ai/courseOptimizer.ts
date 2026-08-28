import { addDays, format } from 'date-fns';
import { getRegionByAreaCode } from '@/lib/data/korea-regions';
import { getDestinationCoords } from '@/lib/data/korea-sigungu';
import { tourCoords } from '@/lib/tourapi/client';
import {
  getRestaurantsByLocation,
  getVeganRestaurants,
  getRestaurantDetail,
} from '@/lib/tourapi/restaurant';
import { getMockRestaurants, getMockVeganRestaurants } from '@/lib/tourapi/mock-data';
import { getAttractionsByArea, getAttractionsByLocation } from '@/lib/tourapi/attraction';
import { deduplicateByContentId } from '@/lib/tourapi/client';
import { filterPlacesWithImages, pickTourImageUrl } from '@/lib/tourapi/placeFilters';
import { getWeather } from '@/lib/tourapi/weather';
import {
  getNearbyHospitalsWithMeta,
  getNearbyPharmaciesWithMeta,
  getMedicalNearSpotWithMeta,
} from '@/lib/medical/hospital';
import { getAccessibilityInfo } from '@/lib/tourapi/barrierFree';
import { getWellnessCourse } from '@/lib/tourapi/wellness';
import {
  attractionHookLine,
  itemCoords,
  mealClusterMaxMeters,
  rankRestaurantsNear,
  restaurantHookLine,
  scoreRestaurantNear,
  sortSchedulesByTime,
  themeForDay,
  themeLabel,
  travelStyleToDayTheme,
} from './courseAppeal';
import { planAttractionsByTravelStyle } from './courseStylePicker';
import { distanceMeters } from '@/lib/geo/distance';
import {
  analyzeMenuForHealth,
  sanitizeVeganAnalysis,
  veganLevelFromAnalysis,
} from './menuAnalyzer';
import type { MedicalLookupMeta } from '@/types/medical.types';
import type {
  GenerateCourseRequest,
  DayCourse,
  Schedule,
  MenuAnalysis,
  CourseAlternativePlace,
} from '@/types/course.types';
import type { MedicalFacility } from '@/types/medical.types';
import type { SafetyLevel } from '@/types/health.types';
import type {
  AccessibilityInfo,
  RestaurantDetail,
  TourApiItem,
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

async function attachNearbyMedicalBySpot(
  days: DayCourse[]
): Promise<MedicalLookupMeta | null> {
  const cache = new Map<string, MedicalFacility[]>();
  let aggMeta: MedicalLookupMeta | null = null;
  const targets: Schedule[] = [];
  for (const day of days) {
    for (const s of day.schedules) {
      if (
        s.type === 'REST' ||
        !Number.isFinite(s.coordinates?.lat) ||
        !Number.isFinite(s.coordinates?.lng)
      ) {
        continue;
      }
      if (Math.abs(s.coordinates.lat) < 0.01 && Math.abs(s.coordinates.lng) < 0.01) {
        continue;
      }
      targets.push(s);
    }
  }

  await runWithConcurrency(
    targets.map((s) => async () => {
      const key = `${s.coordinates.lat.toFixed(3)},${s.coordinates.lng.toFixed(3)}`;
      if (!cache.has(key)) {
        const result = await getMedicalNearSpotWithMeta(
          s.coordinates.lat,
          s.coordinates.lng,
          3
        );
        cache.set(key, result.facilities);
        if (!aggMeta) {
          aggMeta = result.meta;
        } else if (result.meta.hiraFailed) {
          aggMeta = {
            source:
              result.meta.source === 'kakao' || aggMeta.source === 'kakao'
                ? 'kakao'
                : aggMeta.source,
            hiraFailed: true,
            hiraMessage: [aggMeta.hiraMessage, result.meta.hiraMessage]
              .filter(Boolean)
              .join(' · '),
          };
        }
      }
      s.nearbyMedical = cache.get(key)!.slice(0, 2);
    }),
    3
  );

  return aggMeta;
}

function buildCourseAlternatives(
  attractionPool: TourApiItem[],
  restaurantPool: TourApiItem[],
  wellnessPool: Array<{ contentid: string; title: string; addr1: string; firstimage?: string; firstimage2?: string }>,
  selectedIds: Set<string>,
  limit = 16
): CourseAlternativePlace[] {
  const seen = new Set<string>();
  const out: CourseAlternativePlace[] = [];

  const tryAdd = (
    item: { contentid: string; title: string; addr1: string; firstimage?: string; firstimage2?: string },
    kind: CourseAlternativePlace['kind']
  ) => {
    if (out.length >= limit || selectedIds.has(item.contentid) || seen.has(item.contentid)) {
      return;
    }
    const imageUrl = pickTourImageUrl(item);
    if (!imageUrl) return;
    seen.add(item.contentid);
    out.push({
      contentId: item.contentid,
      title: item.title,
      address: item.addr1,
      imageUrl,
      kind,
    });
  };

  for (const a of attractionPool) tryAdd(a, 'ATTRACTION');
  for (const r of restaurantPool) tryAdd(r, 'RESTAURANT');
  for (const w of wellnessPool) tryAdd(w, 'WELLNESS');

  return out;
}

export async function generateOptimizedCourse(request: GenerateCourseRequest) {
  const { destination, period, healthProfile } = request;
  const travelStyle = request.travelStyle ?? '힐링';
  const region = getRegionByAreaCode(destination.areaCode);
  const sigunguCode = destination.sigunguCode?.trim() || undefined;
  const cityWide = !sigunguCode;
  const coords = getDestinationCoords(destination.areaCode, sigunguCode);
  const isVegan = healthProfile.conditions.includes('VEGAN');
  const placeLabel = destination.name || region.name;
  // 시 전체(구 미지정): 초기 식당 풀을 넓게 — 일별 식사는 하이라이트 클러스터로 다시 좁힘
  const restaurantRadiusM =
    cityWide && region.group === 'metropolitan' ? 10_000 : 5_000;

  console.log('TourAPI 호출 시작...', {
    destination: placeLabel,
    areaCode: destination.areaCode,
    sigunguCode: sigunguCode ?? '(시 전체)',
    restaurantRadiusM,
    isVegan,
    travelStyle,
  });

  const [
    restaurants,
    veganRestaurants,
    areaAttractions,
    locationAttractions,
    weather,
    hospitalResult,
    pharmacyResult,
    wellnessItems,
  ] = await Promise.all([
    getRestaurantsByLocation(
      coords.lat,
      coords.lng,
      restaurantRadiusM,
      destination.areaCode
    ),
    isVegan
      ? getVeganRestaurants(coords.lat, coords.lng, destination.areaCode)
      : Promise.resolve([]),
    getAttractionsByArea(destination.areaCode, sigunguCode),
    getAttractionsByLocation(
      coords.lat,
      coords.lng,
      cityWide && region.group === 'metropolitan' ? 12_000 : 8_000,
      destination.areaCode
    ),
    getWeather(destination.areaCode),
    getNearbyHospitalsWithMeta(coords.lat, coords.lng),
    getNearbyPharmaciesWithMeta(coords.lat, coords.lng),
    getWellnessCourse(coords.lat, coords.lng),
  ]);

  console.log('TourAPI 호출 완료', {
    restaurants: restaurants.length,
    attractions: areaAttractions.length + locationAttractions.length,
    wellness: wellnessItems.length,
  });

  const wellnessWithPhotos = filterPlacesWithImages(wellnessItems);

  // Merge area + location pools (dedupe) — location is insurance for code migration
  const attractions = deduplicateByContentId([
    ...areaAttractions,
    ...locationAttractions,
  ]);

  const attractionsWithPhotos = filterPlacesWithImages(attractions);
  console.log('명소 사진 필터', {
    before: attractions.length,
    after: attractionsWithPhotos.length,
  });

  // 구 지정: 시·군 중심 40km / 시 전체(광역시): 시 중심 ~25km로 풀 정리
  let scopedAttractions = attractionsWithPhotos;
  if (attractions.length > 0) {
    const maxM =
      cityWide && region.group === 'metropolitan'
        ? 25_000
        : !cityWide
          ? 40_000
          : undefined;
    if (maxM) {
      const near = scopedAttractions.filter((a) => {
        const c = itemCoords(a);
        return distanceMeters(coords, c) <= maxM;
      });
      if (near.length >= 3) scopedAttractions = near;
    }
  }

  const medicalFacilities: MedicalFacility[] = [
    ...hospitalResult.facilities,
    ...pharmacyResult.facilities,
  ];
  let medicalMeta: MedicalLookupMeta = {
    source:
      hospitalResult.meta.source === 'kakao' || pharmacyResult.meta.source === 'kakao'
        ? 'kakao'
        : hospitalResult.meta.source === 'hira' || pharmacyResult.meta.source === 'hira'
          ? 'hira'
          : hospitalResult.meta.source,
    hiraFailed: hospitalResult.meta.hiraFailed || pharmacyResult.meta.hiraFailed,
    hiraMessage: [hospitalResult.meta.hiraMessage, pharmacyResult.meta.hiraMessage]
      .filter(Boolean)
      .join(' · '),
  };

  let restaurantPool: TourApiItem[] = isVegan
    ? [
        ...veganRestaurants,
        ...restaurants.filter(
          (r) => !veganRestaurants.some((v) => v.contentid === r.contentid)
        ),
      ]
    : restaurants;

  restaurantPool = filterPlacesWithImages(restaurantPool);
  console.log('식당 사진 필터', { count: restaurantPool.length });

  if (restaurantPool.length === 0) {
    restaurantPool = isVegan
      ? [
          ...getMockVeganRestaurants(destination.areaCode, coords.lat, coords.lng),
          ...getMockRestaurants(destination.areaCode, coords.lat, coords.lng),
        ]
      : getMockRestaurants(destination.areaCode, coords.lat, coords.lng);
  }

  // Day plans: Gemini + travelStyle로 명소 선정 → 식사는 하이라이트 근처
  const usedRestaurantIds = new Set<string>();
  const dayClusterM =
    region.group === 'metropolitan' ? 8_000 : 12_000;
  const styleTheme = travelStyleToDayTheme(travelStyle);

  const attractionPicks = await planAttractionsByTravelStyle(
    scopedAttractions,
    travelStyle,
    period.days,
    placeLabel,
    coords,
    cityWide && region.group === 'metropolitan',
    dayClusterM,
    destination.areaCode
  );

  const dayPlans: Array<{
    theme: ReturnType<typeof themeForDay>;
    morning?: TourApiItem;
    afternoon?: TourApiItem;
    mealCandidates: TourApiItem[];
  }> = [];

  for (let d = 0; d < period.days; d++) {
    const theme = styleTheme ?? themeForDay(d);
    const pick = attractionPicks[d] ?? {};
    const morning = pick.morning;
    const afternoon = pick.afternoon;

    const highlight = morning
      ? itemCoords(morning)
      : afternoon
        ? itemCoords(afternoon)
        : coords;
    const mealMaxM = mealClusterMaxMeters(destination.areaCode);
    const mealCandidates = rankRestaurantsNear(
      restaurantPool,
      highlight,
      isVegan,
      usedRestaurantIds,
      mealMaxM
    ).slice(0, 10);

    dayPlans.push({ theme, morning, afternoon, mealCandidates });
  }

  // Analyze meal candidates (+ a few extras) only
  const toAnalyze = new Map<string, TourApiItem>();
  for (const plan of dayPlans) {
    for (const r of plan.mealCandidates) {
      toAnalyze.set(r.contentid, r);
    }
  }

  const restaurantAnalysis = new Map<
    string,
    { detail: RestaurantDetail | null; analysis: MenuAnalysis }
  >();

  console.log('Gemini 호출 시작...', {
    mealCandidates: toAnalyze.size,
    conditions: healthProfile.conditions,
  });

  await runWithConcurrency(
    Array.from(toAnalyze.values()).map((r) => async () => {
      const detail = await getRestaurantDetail(r.contentid);
      const raw = await analyzeMenuForHealth({
        firstmenu: detail?.firstmenu ?? r.title,
        treatmenu: detail?.treatmenu ?? '',
        conditions: healthProfile.conditions,
      });
      const analysis = sanitizeVeganAnalysis(
        `${detail?.firstmenu ?? r.title} ${detail?.treatmenu ?? ''} ${r.title}`,
        raw
      );
      restaurantAnalysis.set(r.contentid, { detail, analysis });
      // Keep pipeline veganLevel in sync for scoring/filters
      const level = veganLevelFromAnalysis(analysis);
      r.veganLevel = level;
    }),
    5
  );

  console.log('Gemini 호출 완료', { analyzed: restaurantAnalysis.size });

  // Re-rank meals with corrected veganLevel (menu analysis > name heuristics)
  for (const plan of dayPlans) {
    const highlight = plan.morning
      ? itemCoords(plan.morning)
      : plan.afternoon
        ? itemCoords(plan.afternoon)
        : coords;
    plan.mealCandidates = [...plan.mealCandidates].sort(
      (a, b) =>
        scoreRestaurantNear(b, highlight, isVegan) -
        scoreRestaurantNear(a, highlight, isVegan)
    );
  }

  const accessibilityMap = new Map<string, AccessibilityInfo | undefined>();
  const attractionIds = dayPlans
    .flatMap((p) => [p.morning?.contentid, p.afternoon?.contentid])
    .filter(Boolean) as string[];
  await runWithConcurrency(
    attractionIds.map((id) => async () => {
      try {
        accessibilityMap.set(id, (await getAccessibilityInfo(id)) ?? undefined);
      } catch {
        accessibilityMap.set(id, undefined);
      }
    }),
    5
  );

  const days: DayCourse[] = [];
  let hasVeganOptions = false;
  const isHot = weather.temperature > 30 && weather.humidity > 80;

  for (let d = 0; d < period.days; d++) {
    const date = format(addDays(new Date(period.startDate), d), 'yyyy-MM-dd');
    const plan = dayPlans[d];
    const schedules: Schedule[] = [];
    const theme = plan.theme;

    const pickMeals = (): TourApiItem[] => {
      const picked: TourApiItem[] = [];
      const tryAdd = (r: TourApiItem, allowRed: boolean) => {
        if (picked.length >= 2) return;
        if (picked.some((p) => p.contentid === r.contentid)) return;
        if (usedRestaurantIds.has(r.contentid)) return;
        const analysis = restaurantAnalysis.get(r.contentid)?.analysis;
        if (!allowRed && analysis?.overallRisk === 'HIGH') return;
        if (isVegan) {
          const vl =
            r.veganLevel ??
            (analysis ? veganLevelFromAnalysis(analysis) : undefined);
          if (vl === 'NOT_VEGAN') return;
        }
        picked.push(r);
        usedRestaurantIds.add(r.contentid);
      };

      for (const r of plan.mealCandidates) tryAdd(r, false);
      for (const r of plan.mealCandidates) tryAdd(r, true);
      return picked;
    };

    const meals = pickMeals();
    const mealTimes = ['12:00', '18:00'] as const;

    meals.forEach((restaurant, idx) => {
      const pre = restaurantAnalysis.get(restaurant.contentid);
      const analysis =
        pre?.analysis ??
        ({
          overallRisk: 'LOW',
          veganFriendly: true,
          veganItems: [],
          nonVeganIngredients: [],
          menuItems: [],
          recommendation: '현지에서 메뉴를 확인해 주세요.',
          alternatives: [],
          postMealAdvice: '식후 가벼운 산책을 권장합니다.',
        } satisfies MenuAnalysis);

      const veganLevel =
        isVegan && restaurant.veganLevel
          ? restaurant.veganLevel
          : veganLevelFromAnalysis(analysis);
      if (veganLevel === 'FULL_VEGAN' || veganLevel === 'PARTIAL_VEGAN') {
        hasVeganOptions = true;
      }

      const { lat, lng } = tourCoords(restaurant.mapx, restaurant.mapy);
      const firstmenu = pre?.detail?.firstmenu;
      schedules.push({
        time: mealTimes[idx] ?? '12:00',
        type: 'RESTAURANT',
        contentId: restaurant.contentid,
        title: restaurant.title,
        address: restaurant.addr1,
        coordinates: { lat, lng },
        safetyLevel: riskToSafety(analysis.overallRisk),
        veganLevel: isVegan ? veganLevel : undefined,
        hookLine: restaurantHookLine(restaurant.title, firstmenu),
        safetyReason: analysis.recommendation,
        healthTips: [analysis.postMealAdvice],
        menuAnalysis: analysis,
        nearbyMedical: [],
        imageUrl: pickTourImageUrl(restaurant),
      });
    });

    const pushAttraction = (
      attraction: TourApiItem,
      time: string,
      slot: 'morning' | 'afternoon'
    ) => {
      const { lat, lng } = tourCoords(attraction.mapx, attraction.mapy);
      const accessibility = accessibilityMap.get(attraction.contentid);
      const healthTips = isHot
        ? ['더운 날엔 그늘·실내 동선 위주로', '수분 챙기기']
        : ['여유 있게 둘러보기'];

      let safetyLevel: SafetyLevel = isHot ? 'YELLOW' : 'GREEN';
      const safetyReason = isHot
        ? '고온다습 — 오후 실내·그늘 코스 권장'
        : slot === 'morning'
          ? `${themeLabel(theme)} · 오전 하이라이트`
          : `${themeLabel(theme)} · 오후 스팟`;

      if (accessibility?.level === 'LOW') {
        healthTips.push('무장애 정보가 적어 이동 전 확인을 권장합니다.');
        if (safetyLevel === 'GREEN') safetyLevel = 'YELLOW';
      }

      schedules.push({
        time,
        type: 'ATTRACTION',
        contentId: attraction.contentid,
        title: attraction.title,
        address: attraction.addr1,
        coordinates: { lat, lng },
        safetyLevel,
        hookLine: attractionHookLine(
          attraction.title,
          theme,
          attraction.addr1,
          slot
        ),
        safetyReason,
        healthTips,
        nearbyMedical: [],
        accessibility,
        imageUrl: pickTourImageUrl(attraction),
      });
    };

    if (plan.morning) {
      pushAttraction(plan.morning, isHot ? '09:30' : '10:00', 'morning');
    }
    if (plan.afternoon) {
      pushAttraction(plan.afternoon, isHot ? '15:30' : '15:00', 'afternoon');
    }

    // Rest after lunch — travel + gentle health rhythm
    const restAnchor = plan.morning
      ? itemCoords(plan.morning)
      : meals[0]
        ? tourCoords(meals[0].mapx, meals[0].mapy)
        : coords;
    schedules.push({
      time: '13:30',
      type: 'REST',
      contentId: `rest-${d}`,
      title: '식후 가벼운 산책',
      address: placeLabel,
      coordinates: restAnchor,
      safetyLevel: 'GREEN',
      hookLine: '점심 이후 천천히 걸어 오후를 열기',
      safetyReason: '식후 가벼운 보행으로 리듬 맞추기',
      healthTips: ['무리하지 않는 선에서'],
      nearbyMedical: [],
    });

    // Wellness only on the last day (optional treat), not every day
    const wellness =
      wellnessWithPhotos.length > 0 && d === period.days - 1
        ? wellnessWithPhotos[0]
        : undefined;
    if (wellness) {
      const { lat, lng } = tourCoords(wellness.mapx, wellness.mapy);
      const wLabel = wellness.theme
        ? WELLNESS_THEME_LABEL[wellness.theme] ?? '힐링'
        : '힐링';
      schedules.push({
        time: '16:30',
        type: 'WELLNESS',
        contentId: wellness.contentid,
        title: wellness.title,
        address: wellness.addr1,
        coordinates: { lat, lng },
        safetyLevel: 'GREEN',
        hookLine: `여행 마지막, ${wLabel}로 마무리`,
        safetyReason: `${wLabel} — 여유로운 마무리`,
        healthTips: ['컨디션에 맞게 짧게'],
        nearbyMedical: [],
        wellnessTheme: wellness.theme,
        imageUrl: pickTourImageUrl(wellness),
      });
    }

    days.push({
      day: d + 1,
      date,
      themeLabel: themeLabel(theme),
      schedules: sortSchedulesByTime(schedules),
    });
  }

  const spotMeta = await attachNearbyMedicalBySpot(days);
  if (spotMeta?.hiraFailed) {
    medicalMeta = {
      source:
        spotMeta.source === 'kakao' || medicalMeta.source === 'kakao'
          ? 'kakao'
          : medicalMeta.source,
      hiraFailed: true,
      hiraMessage: [medicalMeta.hiraMessage, spotMeta.hiraMessage]
        .filter(Boolean)
        .join(' · '),
    };
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

  const selectedIds = new Set<string>();
  for (const day of days) {
    for (const s of day.schedules) {
      if (s.type === 'REST') continue;
      selectedIds.add(s.contentId);
    }
  }
  const alternatives = buildCourseAlternatives(
    scopedAttractions,
    restaurantPool,
    wellnessWithPhotos,
    selectedIds
  );

  return {
    days,
    medicalFacilities,
    medicalMeta,
    overallSafetyScore,
    hasVeganOptions: isVegan ? hasVeganOptions : false,
    alternatives,
    warnings: healthProfile.insulinUser
      ? [
          {
            level: 'INFO' as const,
            message: '인슐린 투여 중 — 식사 시간을 맞춰 주세요.',
          },
        ]
      : [],
  };
}
