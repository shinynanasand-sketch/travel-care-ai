/** 클라이언트·Service Worker 공통 Firebase 웹 설정 (NEXT_PUBLIC_* 만 사용) */
export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
};

export function getFirebaseWebConfig(): FirebaseWebConfig | null {
  const fromJson = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (fromJson && fromJson !== '{}') {
    try {
      const parsed = JSON.parse(fromJson) as Partial<FirebaseWebConfig>;
      if (
        parsed.apiKey &&
        parsed.authDomain &&
        parsed.projectId &&
        parsed.messagingSenderId &&
        parsed.appId
      ) {
        return parsed as FirebaseWebConfig;
      }
    } catch {
      // fall through to individual env vars
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) {
    return null;
  }

  return { apiKey, authDomain, projectId, messagingSenderId, appId };
}
