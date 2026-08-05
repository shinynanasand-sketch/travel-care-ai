import { generateOptimizedCourse } from '@/lib/ai/courseOptimizer';
import { db } from '@/lib/db';
import { errorResponse } from '@/lib/utils/api-error';
import type { GenerateCourseRequest } from '@/types/course.types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateCourseRequest;

    const result = await generateOptimizedCourse(body);

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
    } catch {
      // DB not configured — return in-memory course
    }

    return Response.json({
      courseId,
      days: result.days,
      medicalFacilities: result.medicalFacilities,
      overallSafetyScore: result.overallSafetyScore,
      hasVeganOptions: result.hasVeganOptions,
      warnings: result.warnings,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
