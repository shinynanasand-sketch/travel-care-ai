import { NextResponse } from 'next/server';
import { generateOptimizedCourse } from '@/lib/ai/courseOptimizer';
import { db } from '@/lib/db';
import type { GenerateCourseRequest } from '@/types/course.types';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    console.log('[course/generate] 요청 수신');

    const body = (await request.json()) as GenerateCourseRequest;
    console.log(
      '[course/generate] 코스 생성 시작:',
      body.destination?.name,
      `${body.period?.days}일`
    );

    const result = await generateOptimizedCourse(body);

    console.log('[course/generate] 코스 생성 완료, 응답 반환 준비');

    let courseId = `course-${Date.now()}`;
    try {
      const plan = await db.travelPlan.create({
        data: {
          userId: body.userId,
          destination: body.destination.name,
          areaCode: body.destination.areaCode,
          startDate: new Date(body.period.startDate),
          endDate: new Date(body.period.endDate),
          courseData: result.days as unknown as object,
          safetyScore: result.overallSafetyScore,
        },
      });
      courseId = plan.id;
      console.log('[course/generate] DB 저장 완료:', courseId);
    } catch (dbError) {
      console.error('[course/generate] DB 저장 스킵 (in-memory courseId 사용):', dbError);
    }

    return NextResponse.json({
      courseId,
      days: result.days,
      medicalFacilities: result.medicalFacilities,
      medicalMeta: result.medicalMeta,
      overallSafetyScore: result.overallSafetyScore,
      hasVeganOptions: result.hasVeganOptions,
      warnings: result.warnings,
      alternatives: result.alternatives,
    });
  } catch (error) {
    console.error('[course/generate] 오류:', error);
    const message =
      error instanceof Error ? error.message : '서버 에러 발생';
    return NextResponse.json(
      { error: message || '서버 에러 발생' },
      { status: 500 }
    );
  }
}
