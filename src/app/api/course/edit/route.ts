import { generateOptimizedCourse } from '@/lib/ai/courseOptimizer';
import { getAttractionsByLocation } from '@/lib/tourapi/attraction';
import { getRestaurantsByLocation } from '@/lib/tourapi/restaurant';
import { tourCoords } from '@/lib/tourapi/client';
import { errorResponse } from '@/lib/utils/api-error';
import type {
  DayCourse,
  GenerateCourseRequest,
  GenerateCourseResponse,
  Schedule,
} from '@/types/course.types';

export const maxDuration = 60;

export type CourseEditBody = {
  action: 'regenerate_day' | 'swap';
  request: GenerateCourseRequest;
  /** 0-based day index */
  dayIndex: number;
  /** Full course days (client state) */
  days: DayCourse[];
  courseId?: string;
  medicalFacilities?: GenerateCourseResponse['medicalFacilities'];
  medicalMeta?: GenerateCourseResponse['medicalMeta'];
  hasVeganOptions?: boolean;
  warnings?: GenerateCourseResponse['warnings'];
  alternatives?: GenerateCourseResponse['alternatives'];
  /** For swap: schedule contentId within that day */
  contentId?: string;
};

function usedContentIds(days: DayCourse[], except?: string): Set<string> {
  const ids = new Set<string>();
  for (const d of days) {
    for (const s of d.schedules) {
      if (s.contentId === except) continue;
      if (s.type === 'REST') continue;
      ids.add(s.contentId);
    }
  }
  return ids;
}

function scoreOverall(days: DayCourse[]): number {
  const scores = days.flatMap((day) =>
    day.schedules.map((s) =>
      s.safetyLevel === 'GREEN' ? 100 : s.safetyLevel === 'YELLOW' ? 70 : 40
    )
  );
  if (scores.length === 0) return 80;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

async function swapPlace(
  days: DayCourse[],
  dayIndex: number,
  contentId: string,
  areaCode: string
): Promise<DayCourse[]> {
  const day = days[dayIndex];
  if (!day) throw new Error('해당 일정이 없습니다.');
  const idx = day.schedules.findIndex((s) => s.contentId === contentId);
  if (idx < 0) throw new Error('교체할 장소를 찾지 못했습니다.');
  const current = day.schedules[idx];
  if (current.type === 'REST' || current.type === 'MEDICAL') {
    throw new Error('이 일정은 교체할 수 없습니다.');
  }

  const exclude = usedContentIds(days, contentId);
  const { lat, lng } = current.coordinates;

  let next: Schedule | null = null;

  if (current.type === 'ATTRACTION' || current.type === 'WELLNESS') {
    const pool = await getAttractionsByLocation(lat, lng, 5000, areaCode);
    const alt = pool.find((a) => !exclude.has(a.contentid));
    if (alt) {
      const c = tourCoords(alt.mapx, alt.mapy);
      next = {
        ...current,
        contentId: alt.contentid,
        title: alt.title,
        address: alt.addr1,
        coordinates: c,
        hookLine: `다른 선택 · 「${alt.title}」`,
        safetyReason: '일정에서 교체한 명소입니다.',
        accessibility: undefined,
      };
    }
  } else if (current.type === 'RESTAURANT') {
    const pool = await getRestaurantsByLocation(lat, lng, 3000, areaCode, 30);
    const alt = pool.find((a) => !exclude.has(a.contentid));
    if (alt) {
      const c = tourCoords(alt.mapx, alt.mapy);
      next = {
        ...current,
        contentId: alt.contentid,
        title: alt.title,
        address: alt.addr1,
        coordinates: c,
        hookLine: `다른 식사 · 「${alt.title}」`,
        safetyReason: '일정에서 교체한 식당입니다. 메뉴는 현장에서 확인해 주세요.',
        menuAnalysis: undefined,
        veganLevel: alt.veganLevel,
      };
    }
  }

  if (!next) throw new Error('근처에서 대체 장소를 찾지 못했습니다.');

  const schedules = [...day.schedules];
  schedules[idx] = next;
  const nextDays = [...days];
  nextDays[dayIndex] = { ...day, schedules };
  return nextDays;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CourseEditBody;
    const { action, request: genReq, dayIndex, days } = body;

    if (!genReq?.destination || !Array.isArray(days)) {
      return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }
    if (dayIndex < 0 || dayIndex >= days.length) {
      return Response.json({ error: 'dayIndex가 범위를 벗어났습니다.' }, { status: 400 });
    }

    let nextDays = days;
    let nextAlternatives = body.alternatives;

    if (action === 'regenerate_day') {
      const fresh = await generateOptimizedCourse(genReq);
      nextAlternatives = fresh.alternatives;
      const replacement = fresh.days[dayIndex];
      if (!replacement) {
        return Response.json({ error: '해당 일을 다시 만들지 못했습니다.' }, { status: 500 });
      }
      nextDays = [...days];
      nextDays[dayIndex] = {
        ...replacement,
        day: days[dayIndex].day,
        date: days[dayIndex].date,
      };
    } else if (action === 'swap') {
      if (!body.contentId) {
        return Response.json({ error: 'contentId가 필요합니다.' }, { status: 400 });
      }
      nextDays = await swapPlace(
        days,
        dayIndex,
        body.contentId,
        genReq.destination.areaCode
      );
    } else {
      return Response.json({ error: '알 수 없는 action' }, { status: 400 });
    }

    return Response.json({
      courseId: body.courseId ?? `course-${Date.now()}`,
      days: nextDays,
      medicalFacilities: body.medicalFacilities ?? [],
      medicalMeta: body.medicalMeta,
      overallSafetyScore: scoreOverall(nextDays),
      hasVeganOptions: body.hasVeganOptions ?? false,
      warnings: body.warnings ?? [],
      alternatives: nextAlternatives,
    } satisfies GenerateCourseResponse);
  } catch (error) {
    return errorResponse(error);
  }
}
