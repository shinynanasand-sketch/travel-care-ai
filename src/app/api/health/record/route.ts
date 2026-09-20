import { assessBloodSugar } from '@/lib/ai/healthAdvisor';
import { db } from '@/lib/db';
import { errorResponse } from '@/lib/utils/api-error';
import {
  enforceOptionalApiSecret,
  enforceRateLimit,
} from '@/lib/utils/rateLimit';

export async function POST(request: Request) {
  try {
    const secretBlock = enforceOptionalApiSecret(request);
    if (secretBlock) return secretBlock;
    const limited = enforceRateLimit(request, 'health-record', 30, 60_000);
    if (limited) return limited;

    const body = (await request.json()) as {
      userId: string;
      recordType: 'BLOOD_SUGAR' | 'BLOOD_PRESSURE';
      value: number;
      value2?: number;
      travelPlanId?: string;
    };

    const alertLevel =
      body.recordType === 'BLOOD_SUGAR'
        ? assessBloodSugar(body.value).level
        : 'NORMAL';

    try {
      const record = await db.healthRecord.create({
        data: {
          userId: body.userId,
          travelPlanId: body.travelPlanId,
          recordType: body.recordType,
          value: body.value,
          value2: body.value2,
          alertLevel,
        },
      });
      return Response.json({ record, alertLevel, persisted: true });
    } catch (dbError) {
      console.error(
        '[health/record] DB 저장 실패 — 데모 모드로 계속 진행합니다:',
        dbError
      );
      return Response.json({
        record: { ...body, alertLevel, recordedAt: new Date().toISOString() },
        alertLevel,
        persisted: false,
        dbError:
          dbError instanceof Error ? dbError.message : 'database_unavailable',
      });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
