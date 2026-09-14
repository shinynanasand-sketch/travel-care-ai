import { assessBloodSugar, shouldNotifyGuardian } from '@/lib/ai/healthAdvisor';
import { getNearbyPharmacies } from '@/lib/medical/hospital';
import { hasHealthOrDietConditions } from '@/lib/profile/healthConditions';
import { tourCoords } from '@/lib/tourapi/client';
import { getVeganRestaurants } from '@/lib/tourapi/restaurant';
import { sendGuardianNotification } from '@/lib/notification/firebase';
import { db } from '@/lib/db';
import { errorResponse } from '@/lib/utils/api-error';
import type { AdjustCourseRequest } from '@/types/course.types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AdjustCourseRequest & {
      /** 클라이언트 localStorage 보호자 토큰 (DB 미연결 시 fallback) */
      guardianFcmTokens?: string[];
    };
    const isVegan = body.conditions.includes('VEGAN');
    const isHealthFocused = hasHealthOrDietConditions(body.conditions);

    if (!body.bloodSugar) {
      return Response.json({
        adjusted: false,
        alertLevel: 'NORMAL',
        action: null,
        guardianNotified: false,
        fcmMode: null,
      });
    }

    const assessment = assessBloodSugar(body.bloodSugar);
    let guardianNotified = false;
    let fcmMode: 'live' | 'mock' | 'error' | null = null;
    let nearbyFacilities;

    if (shouldNotifyGuardian(assessment.level)) {
      const tokens = new Set<string>();

      try {
        const guardians = await db.guardian.findMany({
          where: { userId: body.userId },
        });
        for (const g of guardians) {
          if (g.fcmToken) tokens.add(g.fcmToken);
        }
      } catch (dbError) {
        console.error(
          '[course/adjust] guardian.findMany DB 조회 실패 — localStorage 토큰만 사용:',
          dbError
        );
      }

      for (const t of body.guardianFcmTokens ?? []) {
        if (t?.trim()) tokens.add(t.trim());
      }

      for (const token of Array.from(tokens)) {
        const result = await sendGuardianNotification(
          token,
          '건강 경고 알림',
          `혈당 ${body.bloodSugar} mg/dL — ${assessment.action}`
        );
        fcmMode = result.mode;
        if (result.sent) guardianNotified = true;
      }

      if (tokens.size === 0) {
        fcmMode = 'error';
      }
    }

    if (isHealthFocused && body.currentLocation && assessment.level !== 'NORMAL') {
      const { lat, lng } = body.currentLocation;
      const [pharmacies, veganRestaurants] = await Promise.all([
        getNearbyPharmacies(lat, lng, 2000),
        isVegan ? getVeganRestaurants(lat, lng) : Promise.resolve([]),
      ]);
      nearbyFacilities = [
        ...pharmacies,
        ...veganRestaurants.map((r) => ({
          name: r.title,
          type: 'PHARMACY' as const,
          address: r.addr1,
          phone: r.tel ?? '',
          coordinates: tourCoords(r.mapx, r.mapy),
          distanceM: parseInt(r.dist ?? '0', 10),
        })),
      ];
    }

    return Response.json({
      adjusted: assessment.level !== 'NORMAL',
      alertLevel: assessment.level,
      action: assessment.action,
      nearbyFacilities,
      guardianNotified,
      fcmMode,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
