'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from 'firebase/messaging';
import { getFirebaseWebConfig } from '@/lib/firebase-config';

const FCM_DEBUG_PREFIX = '🚨 [FCM DEBUG]';

let messagingInstance: Messaging | null = null;

function logFcmSuccess(message: string, detail?: unknown) {
  console.log(
    `%c${FCM_DEBUG_PREFIX} ✅ ${message}`,
    'background:#15803d;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
    detail ?? ''
  );
}

function logFcmError(message: string, detail?: unknown) {
  console.error(
    `%c${FCM_DEBUG_PREFIX} ❌ ${message}`,
    'background:#b91c1c;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
    detail ?? ''
  );
}

function logFcmInfo(message: string, detail?: unknown) {
  console.log(
    `%c${FCM_DEBUG_PREFIX} ℹ️ ${message}`,
    'background:#1d4ed8;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
    detail ?? ''
  );
}

function getClientApp(): FirebaseApp | null {
  const config = getFirebaseWebConfig();
  if (!config) {
    logFcmError('Firebase 웹 설정 누락 — NEXT_PUBLIC_FIREBASE_* 확인 필요');
    return null;
  }

  if (getApps().length) {
    return getApp();
  }

  logFcmInfo('Firebase App 초기화', { projectId: config.projectId });
  return initializeApp(config);
}

async function getClientMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;

  const supported = await isSupported();
  if (!supported) {
    logFcmError('이 브라우저는 FCM Messaging을 지원하지 않습니다.');
    return null;
  }

  if (messagingInstance) return messagingInstance;

  const app = getClientApp();
  if (!app) return null;

  messagingInstance = getMessaging(app);
  logFcmSuccess('Firebase Messaging 인스턴스 준비 완료');
  return messagingInstance;
}

async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    logFcmError('Service Worker API 미지원');
    return null;
  }

  logFcmInfo('Service Worker 등록 시도', { path: '/firebase-messaging-sw.js' });
  const registration = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    { scope: '/' }
  );
  await navigator.serviceWorker.ready;
  logFcmSuccess('Service Worker 등록 완료', {
    scope: registration.scope,
    active: Boolean(registration.active),
  });
  return registration;
}

export type FcmTokenResult = {
  token: string | null;
  permission: NotificationPermission | 'unsupported';
  error?: string;
};

/** 알림 권한 요청 후 FCM 디바이스 토큰 발급 */
export async function requestFcmToken(): Promise<FcmTokenResult> {
  logFcmInfo('FCM 토큰 발급 시작');

  if (typeof window === 'undefined' || !('Notification' in window)) {
    logFcmError('Notification API 미지원 (SSR 또는 비지원 브라우저)');
    return { token: null, permission: 'unsupported', error: 'unsupported' };
  }

  const permission = await Notification.requestPermission();
  logFcmInfo('알림 권한 결과', { permission });

  if (permission !== 'granted') {
    logFcmError(`알림 권한 거부됨 — permission: "${permission}"`);
    return { token: null, permission };
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    logFcmError('NEXT_PUBLIC_FIREBASE_VAPID_KEY 환경변수 없음');
    return {
      token: null,
      permission,
      error: 'missing_vapid_key',
    };
  }

  logFcmInfo('VAPID 키 확인됨', { preview: `${vapidKey.slice(0, 8)}…` });

  try {
    const messaging = await getClientMessaging();
    if (!messaging) {
      logFcmError('Messaging 인스턴스 생성 실패');
      return {
        token: null,
        permission,
        error: 'messaging_unavailable',
      };
    }

    const registration = await registerMessagingServiceWorker();
    if (!registration) {
      logFcmError('Service Worker 등록 실패');
      return {
        token: null,
        permission,
        error: 'service_worker_unavailable',
      };
    }

    logFcmInfo('getToken() 호출 중…');
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      logFcmSuccess('FCM 토큰 발급 성공!', {
        tokenPreview: `${token.slice(0, 12)}…${token.slice(-8)}`,
        tokenLength: token.length,
        fullToken: token,
      });
      return { token, permission };
    }

    logFcmError('getToken() 반환값이 비어 있음');
    return { token: null, permission, error: 'empty_token' };
  } catch (error) {
    logFcmError('FCM 토큰 발급 중 예외 발생', error);
    return {
      token: null,
      permission,
      error: error instanceof Error ? error.message : 'token_failed',
    };
  }
}

/** 포그라운드 FCM 메시지 수신 리스너 */
export async function subscribeForegroundMessages(
  handler: (payload: { title?: string; body?: string }) => void
): Promise<(() => void) | null> {
  const messaging = await getClientMessaging();
  if (!messaging) {
    logFcmError('포그라운드 리스너 등록 실패 — Messaging 없음');
    return null;
  }

  logFcmSuccess('포그라운드 onMessage 리스너 등록 완료');

  return onMessage(messaging, (payload) => {
    logFcmSuccess('포그라운드 FCM 메시지 수신!', payload);

    const body =
      payload.notification?.body ??
      payload.data?.body ??
      '(body 없음)';

    alert(`🚨 [FCM 수신 성공] ${body}`);

    handler({
      title: payload.notification?.title ?? payload.data?.title,
      body: payload.notification?.body ?? payload.data?.body,
    });
  });
}
