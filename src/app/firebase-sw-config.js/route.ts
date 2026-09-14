import { getFirebaseWebConfig } from '@/lib/firebase-config';

export const dynamic = 'force-dynamic';

/** Service Worker에서 importScripts로 불러올 Firebase 공개 설정 */
export async function GET() {
  const config = getFirebaseWebConfig();

  const body = config
    ? `self.FIREBASE_SW_CONFIG = ${JSON.stringify(config)};`
    : 'self.FIREBASE_SW_CONFIG = null;';

  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
