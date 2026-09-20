import { addDays, format } from 'date-fns';
import { getRegionByAreaCode } from '@/lib/data/korea-regions';
import { getDestinationCoords, getSigungu } from '@/lib/data/korea-sigungu';
import { tourCoords } from '@/lib/tourapi/client';
import {
  getRestaurantsByLocation,
  getVeganRestaurants,
  getRestaurantDetail,
} from '@/lib/tourapi/restaurant';
import { getMockRestaurants, getMockVeganRestaurants } from '@/lib/tourapi/mock-data';
import { getAttractionsByArea, getAttractionsByLocation, getCulturalFacilitiesByArea } from '@/lib/tourapi/attraction';
import { deduplicateByContentId } from '@/lib/tourapi/client';
import { filterItemsBySigunguName } from '@/lib/tourapi/districtFilter';
import { isRestaurantBlacklisted } from '@/lib/tourapi/restaurantBlacklist';
import { filterPlacesWithImages, pickTourImageUrl } from '@/lib/tourapi/placeFilters';
import { getWeather } from '@/lib/tourapi/weather';
import { isTourApiConfigured } from '@/lib/data/korea-regions';
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
  rankAttractions,
  themeForDay,
  themeLabel,
  travelStyleToDayTheme,
} from './courseAppeal';
import { planAttractionsByTravelStyle } from './courseStylePicker';
import { distanceMeters } from '@/lib/geo/distance';
import { getCourseProfileMode } from '@/lib/profile/healthConditions';
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

function generalMenuAnalysis(restaurantTitle: string): MenuAnalysis {
  return {
    overallRisk: 'LOW',
    veganFriendly: 'PARTIAL',
    veganItems: [],
    nonVeganIngredients: [],
    menuItems: [],
    recommendation: `${restaurantTitle} — 현지 인기 메뉴를 즐겨보세요.`,
    alternatives: [],
    postMealAdvice: '근처 카페·거리 산책으로 이어가기 좋습니다.',
  };
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
    const imageUrl = pickTourImageUrl(item) || '';
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
  const sigunguName = sigunguCode
    ? getSigungu(destination.areaCode, sigunguCode)?.name
    : undefined;
  const isVegan =
    healthProfile.conditions.includes('VEGAN') ||
    healthProfile.conditions.includes('VEGETARIAN');
  const profileMode = getCourseProfileMode(healthProfile.conditions);
  const isHealthFocused = profileMode === 'health';
  const placeLabel = destination.name || region.name;
  // 시 전체(구 미지정): 초기 식당 풀을 넓게 — 일별 식사는 하이라이트 클러스터로 다시 좁힘
  const restaurantRadiusM =
    cityWide && region.group === 'metropolitan' ? 10_000 : 5_000;

  console.log('TourAPI 호출 시작...', {
    destination: placeLabel,
    areaCode: destination.areaCode,
    sigunguCode: sigunguCode ?? '(시 전체)',
    sigunguName: sigunguName ?? null,
    restaurantRadiusM,
    isVegan,
    travelStyle,
    profileMode,
  });

  const emptyMedicalResult = {
    facilities: [] as MedicalFacility[],
    meta: { source: 'mock' as const, hiraFailed: false, hiraMessage: '' },
  };

  const [
    restaurantsRaw,
    veganRestaurantsRaw,
    areaAttractions,
    culturalFacilitiesRaw,
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
      ? getVeganRestaurants(
          coords.lat,
          coords.lng,
          destination.areaCode,
          sigunguCode
        )
      : Promise.resolve([]),
    getAttractionsByArea(destination.areaCode, sigunguCode),
    getCulturalFacilitiesByArea(destination.areaCode, sigunguCode),
    getWeather(destination.areaCode),
    isHealthFocused
      ? getNearbyHospitalsWithMeta(coords.lat, coords.lng)
      : Promise.resolve(emptyMedicalResult),
    isHealthFocused
      ? getNearbyPharmaciesWithMeta(coords.lat, coords.lng)
      : Promise.resolve(emptyMedicalResult),
    getWellnessCourse(coords.lat, coords.lng),
  ]);

  // 구 모드: locationBased는 area 풀이 비었을 때만 (후필터 필수)
  // 시 전체: 기존처럼 location 병합
  let locationAttractions: Awaited<ReturnType<typeof getAttractionsByLocation>> =
    [];
  if (cityWide) {
    locationAttractions = await getAttractionsByLocation(
      coords.lat,
      coords.lng,
      region.group === 'metropolitan' ? 12_000 : 8_000,
      destination.areaCode
    );
  } else if (areaAttractions.length === 0) {
    const loc = await getAttractionsByLocation(
      coords.lat,
      coords.lng,
      8_000,
      destination.areaCode
    );
    locationAttractions = filterItemsBySigunguName(loc, sigunguName);
  }

  const restaurants = cityWide
    ? restaurantsRaw
    : filterItemsBySigunguName(restaurantsRaw, sigunguName);
  const veganRestaurants = cityWide
    ? veganRestaurantsRaw
    : filterItemsBySigunguName(veganRestaurantsRaw, sigunguName);
  const culturalFacilities = cityWide
    ? culturalFacilitiesRaw
    : filterItemsBySigunguName(culturalFacilitiesRaw, sigunguName);

  console.log('TourAPI 호출 완료', {
    restaurants: restaurants.length,
    attractions: areaAttractions.length + locationAttractions.length,
    cultural: culturalFacilities.length,
    wellness: wellnessItems.length,
    cityWide,
  });

  const wellnessWithPhotos = filterPlacesWithImages(wellnessItems);

  const attractions = deduplicateByContentId(
    cityWide
      ? [...areaAttractions, ...locationAttractions]
      : areaAttractions.length > 0
        ? filterItemsBySigunguName(areaAttractions, sigunguName)
        : locationAttractions
  );

  const attractionsWithPhotos = filterPlacesWithImages(attractions);
  console.log('명소 사진 필터', {
    before: attractions.length,
    after: attractionsWithPhotos.length,
  });

  // 구 지정: 구 중심 ~6km / 시 전체(광역시): 시 중심 ~25km
  let scopedAttractions = attractionsWithPhotos;
  if (attractions.length > 0) {
    const maxM =
      cityWide && region.group === 'metropolitan'
        ? 25_000
        : !cityWide
          ? 6_000
          : undefined;
    if (maxM) {
      const near = scopedAttractions.filter((a) => {
        const c = itemCoords(a);
        return distanceMeters(coords, c) <= maxM;
      });
      if (near.length >= 3) scopedAttractions = near;
    }
  }

  const wellnessClosingPool = filterPlacesWithImages(
    deduplicateByContentId([...scopedAttractions, ...culturalFacilities])
  );

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

  let generalRestaurantPool: TourApiItem[] = filterPlacesWithImages(restaurants);
  // 실연동(USE_MOCK_DATA=false)에서는 빈 풀을 mock으로 채우지 않음
  if (generalRestaurantPool.length === 0 && !isTourApiConfigured()) {
    generalRestaurantPool = getMockRestaurants(
      destination.areaCode,
      coords.lat,
      coords.lng
    );
  }

  if (restaurantPool.length === 0 && !isTourApiConfigured()) {
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
    destination.areaCode,
    profileMode
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
      mealMaxM,
      profileMode
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
  const blacklistedRestaurantIds = new Set<string>();

  console.log('Gemini 호출 시작...', {
    mealCandidates: toAnalyze.size,
    conditions: healthProfile.conditions,
    profileMode,
    skipMenuAnalysis: !isHealthFocused,
  });

  if (isHealthFocused) {
    await runWithConcurrency(
      Array.from(toAnalyze.values()).map((r) => async () => {
        const detail = await getRestaurantDetail(r.contentid);

        if (isRestaurantBlacklisted(r.title, detail?.treatmenu)) {
          blacklistedRestaurantIds.add(r.contentid);
          return;
        }

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
        const level = veganLevelFromAnalysis(analysis);
        r.veganLevel = level;
      }),
      5
    );
  } else {
    for (const r of toAnalyze.values()) {
      if (isRestaurantBlacklisted(r.title)) {
        blacklistedRestaurantIds.add(r.contentid);
        continue;
      }
      restaurantAnalysis.set(r.contentid, {
        detail: null,
        analysis: generalMenuAnalysis(r.title),
      });
    }
  }

  if (blacklistedRestaurantIds.size > 0) {
    for (const plan of dayPlans) {
      plan.mealCandidates = plan.mealCandidates.filter(
        (r) => !blacklistedRestaurantIds.has(r.contentid)
      );
    }
    console.log('식당 블랙리스트 필터', {
      excluded: blacklistedRestaurantIds.size,
      ids: [...blacklistedRestaurantIds],
    });
  }

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
        scoreRestaurantNear(b, highlight, isVegan, profileMode) -
        scoreRestaurantNear(a, highlight, isVegan, profileMode)
    );
  }

  const accessibilityMap = new Map<string, AccessibilityInfo | undefined>();
  if (isHealthFocused) {
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
  }

  const days: DayCourse[] = [];
  let hasVeganOptions = false;
  const isHot =
    weather.source === 'live' &&
    weather.temperature > 30 &&
    weather.humidity > 80;

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
        if (isHealthFocused && !allowRed && analysis?.overallRisk === 'HIGH') {
          return;
        }
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

    const dayHighlight = plan.morning
      ? itemCoords(plan.morning)
      : plan.afternoon
        ? itemCoords(plan.afternoon)
        : coords;
    const dayMealMaxM = mealClusterMaxMeters(destination.areaCode);

    let fallbackMeals: TourApiItem[] = [];
    if (isVegan && meals.length === 0) {
      fallbackMeals = rankRestaurantsNear(
        generalRestaurantPool,
        dayHighlight,
        false,
        usedRestaurantIds,
        dayMealMaxM,
        profileMode
      ).slice(0, 2);
      if (fallbackMeals.length > 0) {
        console.log('비건 식당 fallback', {
          day: d + 1,
          restaurants: fallbackMeals.map((r) => r.title),
        });
      }
    }

    const mealEntries: Array<{ restaurant: TourApiItem; isFallback: boolean }> = [
      ...meals.map((restaurant) => ({ restaurant, isFallback: false })),
      ...fallbackMeals.map((restaurant) => ({ restaurant, isFallback: true })),
    ];

    mealEntries.forEach(({ restaurant, isFallback }, idx) => {
      const pre = restaurantAnalysis.get(restaurant.contentid);
      const fallbackAnalysis: MenuAnalysis = {
        overallRisk: 'MEDIUM',
        veganFriendly: 'PARTIAL',
        veganItems: [],
        nonVeganIngredients: [],
        menuItems: [],
        recommendation:
          '주변에 확실한 비건 식당이 없어 일반 식당을 대안으로 안내합니다. 메뉴를 현장에서 확인해 주세요.',
        alternatives: [],
        postMealAdvice: '식사 전 비건 옵션 여부를 직원에게 확인해 주세요.',
      };
      const analysis =
        isFallback
          ? fallbackAnalysis
          : pre?.analysis ??
            (isHealthFocused
              ? ({
                  overallRisk: 'LOW',
                  veganFriendly: true,
                  veganItems: [],
                  nonVeganIngredients: [],
                  menuItems: [],
                  recommendation: '현지에서 메뉴를 확인해 주세요.',
                  alternatives: [],
                  postMealAdvice: '식후 가벼운 산책을 권장합니다.',
                } satisfies MenuAnalysis)
              : generalMenuAnalysis(restaurant.title));

      const veganLevel = isFallback
        ? 'CHECK_NEEDED'
        : isVegan && restaurant.veganLevel
          ? restaurant.veganLevel
          : veganLevelFromAnalysis(analysis);
      if (
        !isFallback &&
        (veganLevel === 'FULL_VEGAN' || veganLevel === 'PARTIAL_VEGAN')
      ) {
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
        safetyLevel: isFallback ? 'YELLOW' : riskToSafety(analysis.overallRisk),
        veganLevel: isVegan ? veganLevel : undefined,
        isVeganGuaranteed: isFallback ? false : undefined,
        hookLine: restaurantHookLine(restaurant.title, firstmenu),
        safetyReason: analysis.recommendation,
        healthTips: [analysis.postMealAdvice],
        menuAnalysis: analysis,
        nearbyMedical: [],
        imageUrl: pickTourImageUrl(restaurant),
      });

      if (isFallback) {
        usedRestaurantIds.add(restaurant.contentid);
      }
    });

    const pushAttraction = (
      attraction: TourApiItem,
      time: string,
      slot: 'morning' | 'afternoon'
    ) => {
      const { lat, lng } = tourCoords(attraction.mapx, attraction.mapy);
      const accessibility = isHealthFocused
        ? accessibilityMap.get(attraction.contentid)
        : undefined;
      const healthTips = isHealthFocused
        ? isHot
          ? ['더운 날엔 그늘·실내 동선 위주로', '수분 챙기기']
          : ['여유 있게 둘러보기']
        : isHot
          ? ['더운 날엔 실내·카페 스팟과 함께', '인증샷 포인트 미리 체크']
          : ['핫플 포토존·주변 맛집 거리도 함께 둘러보기'];

      let safetyLevel: SafetyLevel = isHot ? 'YELLOW' : 'GREEN';
      const safetyReason = isHealthFocused
        ? isHot
          ? '고온다습 — 오후 실내·그늘 코스 권장'
          : slot === 'morning'
            ? `${themeLabel(theme)} · 오전 하이라이트`
            : `${themeLabel(theme)} · 오후 스팟`
        : isHot
          ? '인기 스팟 — 더운 시간대는 실내·카페와 함께'
          : slot === 'morning'
            ? `${themeLabel(theme)} · 오전 핫플`
            : `${themeLabel(theme)} · 오후 추천 스팟`;

      if (isHealthFocused && accessibility?.level === 'LOW') {
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
        accessibility: isHealthFocused ? accessibility : undefined,
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
      title: isHealthFocused ? '식후 가벼운 산책' : '점심 후 카페·거리 산책',
      address: placeLabel,
      coordinates: restAnchor,
      safetyLevel: 'GREEN',
      hookLine: isHealthFocused
        ? '점심 이후 천천히 걸어 오후를 열기'
        : '점심 후 근처 카페·거리를 가볍게 둘러보기',
      safetyReason: isHealthFocused
        ? '식후 가벼운 보행으로 리듬 맞추기'
        : '인기 거리·카페 동선으로 오후 코스 연결',
      healthTips: isHealthFocused ? ['무리하지 않는 선에서'] : ['SNS 핫플·로컬 맛집 탐색'],
      nearbyMedical: [],
    });

    // 마지막 날 + 힐링 취향: 웰니스 스팟 또는 실제 명소 fallback
    if (d === period.days - 1 && travelStyle === '힐링') {
      const closingExclude = new Set<string>();
      for (const dayPlan of dayPlans) {
        if (dayPlan.morning) closingExclude.add(dayPlan.morning.contentid);
        if (dayPlan.afternoon) closingExclude.add(dayPlan.afternoon.contentid);
      }
      usedRestaurantIds.forEach((id) => closingExclude.add(id));
      for (const s of schedules) {
        if (s.type !== 'REST') closingExclude.add(s.contentId);
      }

      const wellness =
        wellnessWithPhotos.length > 0 ? wellnessWithPhotos[0] : undefined;

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
      } else {
        const closingAnchor = plan.morning
          ? itemCoords(plan.morning)
          : plan.afternoon
            ? itemCoords(plan.afternoon)
            : coords;
        const fallbackAttraction = rankAttractions(
          wellnessClosingPool,
          theme,
          closingAnchor,
          closingExclude,
          profileMode
        )[0];

        if (fallbackAttraction) {
          console.log('웰니스 데이터 부재 — 명소 fallback', {
            day: d + 1,
            title: fallbackAttraction.title,
          });
          pushAttraction(fallbackAttraction, '16:30', 'afternoon');
          const closingSchedule = schedules[schedules.length - 1];
          if (closingSchedule?.contentId === fallbackAttraction.contentid) {
            closingSchedule.hookLine = '여행 마지막, 여유로운 명소로 마무리';
            closingSchedule.safetyReason =
              '웰니스 데이터가 없어 지역 관광·문화시설로 대체 안내';
          }
        }
      }
    }

    days.push({
      day: d + 1,
      date,
      themeLabel: themeLabel(theme),
      schedules: sortSchedulesByTime(schedules),
    });
  }

  const spotMeta = isHealthFocused
    ? await attachNearbyMedicalBySpot(days)
    : null;
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
    warnings:
      isHealthFocused && healthProfile.insulinUser
        ? [
            {
              level: 'INFO' as const,
              message: '인슐린 투여 중 — 식사 시간을 맞춰 주세요.',
            },
          ]
        : [],
  };
}
