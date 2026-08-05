import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let adminApp: App | null = null;

export type FcmSendResult = {
  sent: boolean;
  /** live = Admin SDK 전송, mock = 자격 증명 없음, error = 전송 실패 */
  mode: 'live' | 'mock' | 'error';
  reason?: string;
};

function getAdminApp(): App | null {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) return null;

  if (!getApps().length) {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    adminApp = getApps()[0]!;
  }
  return adminApp;
}

/** Firebase Admin 자격 증명(FIREBASE_*) 설정 여부 */
export function isFcmConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

export async function sendGuardianNotification(
  fcmToken: string,
  title: string,
  body: string
): Promise<FcmSendResult> {
  if (!fcmToken?.trim()) {
    return { sent: false, mode: 'error', reason: 'missing_fcm_token' };
  }

  try {
    const app = getAdminApp();
    if (!app) {
      console.log(
        '[FCM Mock] credentials missing — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY',
        { title, body, tokenPreview: `${fcmToken.slice(0, 8)}…` }
      );
      return {
        sent: false,
        mode: 'mock',
        reason: 'missing_firebase_credentials',
      };
    }
    await getMessaging(app).send({
      token: fcmToken,
      notification: { title, body },
    });
    return { sent: true, mode: 'live' };
  } catch (error) {
    console.error('FCM send failed:', error);
    return {
      sent: false,
      mode: 'error',
      reason: error instanceof Error ? error.message : 'send_failed',
    };
  }
}
