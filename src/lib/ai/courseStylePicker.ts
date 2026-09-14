import { geminiFlash, genAI, isGeminiAvailable } from './client';
import {
  buildDayAttractionPools,
  dayPairMaxMeters,
  itemCoords,
  pickDayAttractions,
  themeForDay,
  travelStyleToDayTheme,
} from './courseAppeal';
import { distanceMeters } from '@/lib/geo/distance';
import type { CourseProfileMode } from '@/lib/profile/healthConditions';
import type { TravelStyle } from '@/types/course.types';
import type { TourApiItem } from '@/types/tourapi.types';

const HEALTH_SYSTEM_INSTRUCTION = `당신은 만성질환·식이 제한 여행자를 위한 한국 국내여행 코스 기획 전문가입니다.
안전한 동선, 병원·약국 접근성, 무리 없는 이동, 특수 식단(비건·할랄 등)을 최우선으로 고려하세요.
사용자의 여행 취향(travelStyle)에 맞는 명소를 고르되, 과도한 고강도·장거리 이동은 피하세요.
마을회관·동사무소·주민센터 등 지역 행정 시설이나 매력이 낮은 소규모 시설은 제외하세요.
반드시 제공된 후보 목록의 contentid에서만 선택하고, 목록에 없는 장소는 만들지 마세요.`;

const GENERAL_SYSTEM_INSTRUCTION = `당신은 한국 국내여행 핫플레이스 큐레이터입니다.
병원·약국·의료시설·건강 제약 조건은 절대 고려하지 마세요.
해당 지역에서 가장 인기 있는 관광 명소, SNS·여행객 사이에서 유명한 핫플레이스, 유명 로컬 맛집 거리, 트렌디한 카페 동네, 이동 동선이 효율적인 코스를 최우선으로 짜세요.
사진이 있는 대표 명소, 여행객에게 잘 알려진 랜드마크를 우선하세요.
마을회관·동사무소·주민센터 등 매력이 낮은 시설은 제외하세요.
반드시 제공된 후보 목록의 contentid에서만 선택하고, 목록에 없는 장소는 만들지 마세요.`;

export type DayAttractionPick = {
  morning?: TourApiItem;
  afternoon?: TourApiItem;
};

function fallbackDayPlans(
  scopedAttractions: TourApiItem[],
  days: number,
  travelStyle: TravelStyle,
  cityWide: boolean,
  coords: { lat: number; lng: number },
  dayClusterM: number,
  areaCode: string,
  usedAttractionIds: Set<string>,
  profileMode: CourseProfileMode
): DayAttractionPick[] {
  const styleTheme = travelStyleToDayTheme(travelStyle);
  const dayPools = buildDayAttractionPools(
    scopedAttractions,
    days,
    cityWide,
    coords,
    dayClusterM
  );
  const pairMax = dayPairMaxMeters(areaCode);
  const plans: DayAttractionPick[] = [];

  for (let d = 0; d < days; d++) {
    const pool = dayPools[d] ?? scopedAttractions;
    const dayTheme = styleTheme ?? themeForDay(d);
    plans.push(
      pickDayAttractions(
        pool,
        dayTheme,
        coords,
        usedAttractionIds,
        pairMax,
        profileMode
      )
    );
  }
  return plans;
}

function parseGeminiDayPicks(
  text: string,
  days: number
): Array<{ morning?: string; afternoon?: string }> | null {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as {
      days?: Array<{ morning?: string; afternoon?: string }>;
    };
    if (!Array.isArray(parsed.days) || parsed.days.length === 0) return null;
    return parsed.days.slice(0, days);
  } catch {
    return null;
  }
}

function resolveGeminiPicks(
  picks: Array<{ morning?: string; afternoon?: string }>,
  byId: Map<string, TourApiItem>,
  pairMaxM: number
): DayAttractionPick[] {
  const used = new Set<string>();
  const result: DayAttractionPick[] = [];

  for (const pick of picks) {
    let morning: TourApiItem | undefined;
    if (pick.morning) {
      const item = byId.get(pick.morning);
      if (item && !used.has(item.contentid)) {
        morning = item;
        used.add(item.contentid);
      }
    }

    let afternoon: TourApiItem | undefined;
    if (pick.afternoon) {
      const item = byId.get(pick.afternoon);
      if (item && !used.has(item.contentid)) {
        if (morning) {
          const m = distanceMeters(itemCoords(morning), itemCoords(item));
          if (m <= pairMaxM * 1.5) {
            afternoon = item;
            used.add(item.contentid);
          }
        } else {
          afternoon = item;
          used.add(item.contentid);
        }
      }
    }

    result.push({ morning, afternoon });
  }

  return result;
}

export async function planAttractionsByTravelStyle(
  scopedAttractions: TourApiItem[],
  travelStyle: TravelStyle,
  days: number,
  destinationLabel: string,
  coords: { lat: number; lng: number },
  cityWide: boolean,
  dayClusterM: number,
  areaCode: string,
  profileMode: CourseProfileMode = 'health'
): Promise<DayAttractionPick[]> {
  const usedAttractionIds = new Set<string>();
  const fallback = () =>
    fallbackDayPlans(
      scopedAttractions,
      days,
      travelStyle,
      cityWide,
      coords,
      dayClusterM,
      areaCode,
      usedAttractionIds,
      profileMode
    );

  if (!isGeminiAvailable() || !geminiFlash || scopedAttractions.length === 0) {
    return fallback();
  }

  const systemInstruction =
    profileMode === 'general'
      ? GENERAL_SYSTEM_INSTRUCTION
      : HEALTH_SYSTEM_INSTRUCTION;

  const styleModel =
    genAI?.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
    }) ?? geminiFlash;

  const byId = new Map(scopedAttractions.map((a) => [a.contentid, a]));
  const candidates = scopedAttractions.slice(0, 80).map((a) => ({
    contentid: a.contentid,
    title: a.title,
    addr1: a.addr1,
    hasImage: Boolean(a.firstimage?.trim() || a.firstimage2?.trim()),
  }));

  const healthPromptExtra =
    profileMode === 'health'
      ? `- 안전하고 무리 없는 동선, 병원·약국 접근이 비교적 수월한 지역 우선
- ${travelStyle} 취향에 맞는 대표 명소를 우선`
      : `- 병원·건강·의료 관련 고려는 하지 마세요
- ${travelStyle} 취향에 맞는 인기 핫플, 유명 로컬 맛집·카페 거리, 효율적인 이동 동선 우선
- 여행객·SNS에서 유명한 대표 명소·랜드마크를 적극 선택`;

  const userPrompt = `여행지: ${destinationLabel}
여행 취향(travelStyle): ${travelStyle}
일수: ${days}일
사용자 유형: ${profileMode === 'general' ? '일반 여행객 (건강/식이 조건 없음)' : '건강·식이 조건 있음'}

각 일차마다 오전(morning) 명소 1곳, 오후(afternoon) 명소 1곳을 고르세요.
- 같은 contentid는 전체 일정에서 한 번만 사용
- 오후 명소는 오전 명소와 이동이 효율적이고 가까운 곳 우선
${healthPromptExtra}

후보 장소 (contentid | 제목 | 주소 | 사진유무):
${candidates.map((c) => `${c.contentid} | ${c.title} | ${c.addr1} | ${c.hasImage ? 'Y' : 'N'}`).join('\n')}

JSON만 응답 (다른 텍스트 없이):
{"days":[{"morning":"<contentid>","afternoon":"<contentid>"}, ...]}`;

  try {
    console.log('Gemini 명소 선정 시작...', {
      travelStyle,
      profileMode,
      candidates: candidates.length,
    });
    const result = await styleModel.generateContent(userPrompt);
    const text = result.response.text();
    const parsed = parseGeminiDayPicks(text, days);
    if (!parsed) return fallback();

    const pairMax = dayPairMaxMeters(areaCode);
    const resolved = resolveGeminiPicks(parsed, byId, pairMax);

    const filled: DayAttractionPick[] = [];
    const globalUsed = new Set<string>();

    for (let d = 0; d < days; d++) {
      let plan = resolved[d] ?? {};
      const validMorning =
        plan.morning && !globalUsed.has(plan.morning.contentid)
          ? plan.morning
          : undefined;
      const validAfternoon =
        plan.afternoon && !globalUsed.has(plan.afternoon.contentid)
          ? plan.afternoon
          : undefined;

      if (!validMorning && !validAfternoon) {
        const [extra] = fallbackDayPlans(
          scopedAttractions.filter((a) => !globalUsed.has(a.contentid)),
          1,
          travelStyle,
          cityWide,
          coords,
          dayClusterM,
          areaCode,
          globalUsed,
          profileMode
        );
        plan = extra ?? {};
      } else {
        plan = { morning: validMorning, afternoon: validAfternoon };
      }

      if (plan.morning) globalUsed.add(plan.morning.contentid);
      if (plan.afternoon) globalUsed.add(plan.afternoon.contentid);
      filled.push(plan);
    }

    console.log('Gemini 명소 선정 완료', { days: filled.length });
    return filled;
  } catch (err) {
    console.error('Gemini 명소 선정 실패, 규칙 기반 폴백:', err);
    return fallback();
  }
}
