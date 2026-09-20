import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null };

function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  // .env.example placeholder — Prisma connect can hang indefinitely
  if (/USER:PASS@HOST/i.test(url)) return false;
  return true;
}

function createClient(): PrismaClient | null {
  if (!isDatabaseConfigured()) return null;
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  });
}

/**
 * DATABASE_URL이 없거나 placeholder면 null.
 * 호출부는 try/catch 또는 null 체크로 데모 모드를 유지한다.
 */
export const db: PrismaClient =
  globalForPrisma.prisma ??
  createClient() ??
  // 타입 호환용 — 실제 create는 try/catch에서 실패하거나 no-op 경로로 감
  (new Proxy({} as PrismaClient, {
    get(_t, prop) {
      if (prop === 'then') return undefined;
      throw new Error(
        'DATABASE_URL이 설정되지 않았거나 placeholder입니다. DB 작업을 건너뜁니다.'
      );
    },
  }));

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = isDatabaseConfigured() ? db : null;
}

export { isDatabaseConfigured };
