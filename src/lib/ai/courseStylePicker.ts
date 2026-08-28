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
import type { TravelStyle } from '@/types/course.types';
import type { TourApiItem } from '@/types/tourapi.types';

const SYSTEM_INSTRUCTION = `당신은 한국 국내여행 코스 기획 전문가입니다.
사용자의 여행 취향(travelStyle)에 가장 잘 맞는, 인지도 높은 관광 명소 위주로 코스를 짜세요.
마을회관·동사무소·주민센터 등 지역 행정 시설이나 매력이 낮은 소규모 시설은 제외하세요.
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
  usedAttractionIds: Set<string>
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
      pickDayAttractions(pool, dayTheme, coords, usedAttractionIds, pairMax)
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
  areaCode: string
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
      usedAttractionIds
    );

  if (!isGeminiAvailable() || !geminiFlash || scopedAttractions.length === 0) {
    return fallback();
  }

  const styleModel =
    genAI?.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    }) ?? geminiFlash;

  const byId = new Map(scopedAttractions.map((a) => [a.contentid, a]));
  const candidates = scopedAttractions.slice(0, 80).map((a) => ({
    contentid: a.contentid,
    title: a.title,
    addr1: a.addr1,
    hasImage: Boolean(a.firstimage?.trim() || a.firstimage2?.trim()),
  }));

  const userPrompt = `여행지: ${destinationLabel}
여행 취향(travelStyle): ${travelStyle}
일수: ${days}일

각 일차마다 오전(morning) 명소 1곳, 오후(afternoon) 명소 1곳을 고르세요.
- 같은 contentid는 전체 일정에서 한 번만 사용
- 오후 명소는 오전 명소와 이동이 무리 없이 가까운 곳 우선
- ${travelStyle} 취향에 맞고, 여행객에게 잘 알려진 대표 명소를 우선

후보 장소 (contentid | 제목 | 주소 | 사진유무):
${candidates.map((c) => `${c.contentid} | ${c.title} | ${c.addr1} | ${c.hasImage ? 'Y' : 'N'}`).join('\n')}

JSON만 응답 (다른 텍스트 없이):
{"days":[{"morning":"<contentid>","afternoon":"<contentid>"}, ...]}`;

  try {
    console.log('Gemini 명소 선정 시작...', { travelStyle, candidates: candidates.length });
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
          globalUsed
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
