import { assessBloodSugar } from '@/lib/ai/healthAdvisor';
import { getNearbyPharmacies } from '@/lib/medical/hospital';
import {
  hasHealthOrDietConditions,
  wantsPlantBasedDining,
} from '@/lib/profile/healthConditions';
import { tourCoords } from '@/lib/tourapi/client';
import { getVeganRestaurants } from '@/lib/tourapi/restaurant';
import { errorResponse } from '@/lib/utils/api-error';
import type { AdjustCourseRequest } from '@/types/course.types';

/**
 * 혈당 이상 시 주변 시설만 조회한다.
 * 보호자 FCM은 클라이언트 `/api/notify` 경로에서만 보내 이중 전송을 막는다.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AdjustCourseRequest;
    const plantBased = wantsPlantBasedDining(body.conditions);
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
    let nearbyFacilities;

    if (isHealthFocused && body.currentLocation && assessment.level !== 'NORMAL') {
      const { lat, lng } = body.currentLocation;
      const [pharmacies, veganRestaurants] = await Promise.all([
        getNearbyPharmacies(lat, lng, 2000),
        plantBased ? getVeganRestaurants(lat, lng) : Promise.resolve([]),
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
      guardianNotified: false,
      fcmMode: null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
