import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { isFcmConfigured } from '@/lib/notification/firebase';
import { errorResponse } from '@/lib/utils/api-error';
import {
  enforceOptionalApiSecret,
  enforceRateLimit,
} from '@/lib/utils/rateLimit';

const ALERT_TITLE = '저혈당 위험 알림';
const ALERT_BODY = '현재 혈당이 위험 수치입니다!';
const FCM_SERVER_PREFIX = '🚨 [FCM SERVER DEBUG]';

function getAdminApp(): App | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) return null;

  if (!getApps().length) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  return getApps()[0]!;
}

function extractFirebaseError(error: unknown) {
  if (error && typeof error === 'object') {
    const err = error as {
      message?: string;
      code?: string;
      errorInfo?: { code?: string; message?: string };
      stack?: string;
    };

    return {
      message: err.message ?? 'unknown_error',
      code: err.code ?? err.errorInfo?.code,
      errorInfo: err.errorInfo,
      stack: err.stack,
    };
  }

  return {
    message: error instanceof Error ? error.message : String(error),
    code: undefined,
    errorInfo: undefined,
    stack: error instanceof Error ? error.stack : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const secretBlock = enforceOptionalApiSecret(request);
    if (secretBlock) return secretBlock;
    const limited = enforceRateLimit(request, 'notify', 10, 60_000);
    if (limited) return limited;

    const body = (await request.json()) as {
      token?: string;
      bloodSugar?: number;
    };

    const token = body.token?.trim();
    const bloodSugar = body.bloodSugar;

    console.log(`${FCM_SERVER_PREFIX} POST /api/notify 수신`, {
      tokenPreview: token ? `${token.slice(0, 12)}…${token.slice(-8)}` : null,
      tokenLength: token?.length ?? 0,
      bloodSugar,
      adminConfigured: isFcmConfigured(),
    });

    if (!token) {
      console.error(`${FCM_SERVER_PREFIX} ❌ missing_token`);
      return Response.json(
        {
          sent: false,
          mode: 'error',
          reason: 'missing_token',
          errorMessage: 'token is required',
        },
        { status: 400 }
      );
    }

    if (typeof bloodSugar !== 'number' || Number.isNaN(bloodSugar)) {
      console.error(`${FCM_SERVER_PREFIX} ❌ invalid_blood_sugar`, {
        bloodSugar,
      });
      return Response.json(
        {
          sent: false,
          mode: 'error',
          reason: 'invalid_blood_sugar',
          errorMessage: 'bloodSugar must be a number',
        },
        { status: 400 }
      );
    }

    if (bloodSugar >= 70) {
      console.log(`${FCM_SERVER_PREFIX} ⏭️ blood_sugar_not_critical`, {
        bloodSugar,
      });
      return Response.json({
        sent: false,
        mode: 'skipped',
        reason: 'blood_sugar_not_critical',
        bloodSugar,
        configured: isFcmConfigured(),
      });
    }

    const app = getAdminApp();
    if (!app) {
      console.error(`${FCM_SERVER_PREFIX} ❌ Firebase Admin 자격 증명 없음`, {
        hasProjectId: Boolean(process.env.FIREBASE_PROJECT_ID),
        hasClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
        hasPrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
      });

      return Response.json({
        sent: false,
        mode: 'mock',
        reason: 'missing_firebase_credentials',
        errorMessage:
          'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY 확인 필요',
        bloodSugar,
        configured: false,
      });
    }

    try {
      console.log(`${FCM_SERVER_PREFIX} firebase-admin send() 시작`, {
        title: ALERT_TITLE,
        body: ALERT_BODY,
        tokenPreview: `${token.slice(0, 12)}…${token.slice(-8)}`,
      });

      const messageId = await getMessaging(app).send({
        token,
        notification: { title: ALERT_TITLE, body: ALERT_BODY },
      });

      console.log(`${FCM_SERVER_PREFIX} ✅ send() 성공`, {
        messageId,
        bloodSugar,
      });

      return Response.json({
        sent: true,
        mode: 'live',
        messageId,
        bloodSugar,
        configured: isFcmConfigured(),
      });
    } catch (sendError) {
      const details = extractFirebaseError(sendError);

      console.error(`${FCM_SERVER_PREFIX} ❌ firebase-admin send() 실패`, {
        ...details,
        tokenPreview: `${token.slice(0, 12)}…${token.slice(-8)}`,
        bloodSugar,
      });

      return Response.json(
        {
          sent: false,
          mode: 'error',
          reason: details.code ?? 'send_failed',
          errorMessage: details.message,
          errorCode: details.code,
          errorInfo: details.errorInfo,
          bloodSugar,
          configured: isFcmConfigured(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const details = extractFirebaseError(error);
    console.error(`${FCM_SERVER_PREFIX} ❌ route handler 예외`, details);
    return errorResponse(error);
  }
}
