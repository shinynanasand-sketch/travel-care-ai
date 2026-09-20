import { sendGuardianNotification, isFcmConfigured } from '@/lib/notification/firebase';
import { errorResponse } from '@/lib/utils/api-error';
import {
  enforceOptionalApiSecret,
  enforceRateLimit,
} from '@/lib/utils/rateLimit';

export async function POST(request: Request) {
  try {
    const secretBlock = enforceOptionalApiSecret(request);
    if (secretBlock) return secretBlock;
    const limited = enforceRateLimit(request, 'guardian-notify', 10, 60_000);
    if (limited) return limited;

    const body = (await request.json()) as {
      fcmToken: string;
      title: string;
      message: string;
    };

    if (!body.fcmToken?.trim()) {
      return Response.json(
        { sent: false, mode: 'error', reason: 'missing_fcm_token' },
        { status: 400 }
      );
    }

    const result = await sendGuardianNotification(
      body.fcmToken,
      body.title,
      body.message
    );

    return Response.json({
      ...result,
      configured: isFcmConfigured(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
