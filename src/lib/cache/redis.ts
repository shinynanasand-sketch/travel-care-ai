import { Redis } from '@upstash/redis';
import { PrismaClient } from '@prisma/client';
import { CACHE_TTL } from './keys';

let redis: Redis | null = null;
let prisma: PrismaClient | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  // .env.example placeholder — Prisma connect can hang indefinitely in dev
  if (/USER:PASS@HOST/i.test(url)) return false;
  return true;
}

function getPrisma(): PrismaClient | null {
  if (prisma) return prisma;
  if (!isDatabaseConfigured()) return null;
  prisma = new PrismaClient();
  return prisma;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (r) {
    try {
      const data = await r.get<T>(key);
      if (data) return data;
    } catch {
      // fall through to DB cache
    }
  }

  const db = getPrisma();
  if (!db) return null;

  try {
    const entry = await db.apiCache.findUnique({ where: { cacheKey: key } });
    if (!entry || entry.expiresAt < new Date()) return null;
    return entry.data as T;
  } catch {
    return null;
  }
}

export async function setCache<T>(
  key: string,
  data: T,
  ttlSeconds: number = CACHE_TTL.areaBasedList
): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(key, data, { ex: ttlSeconds });
      return;
    } catch {
      // fall through to DB cache
    }
  }

  const db = getPrisma();
  if (!db) return;

  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await db.apiCache.upsert({
      where: { cacheKey: key },
      create: { cacheKey: key, data: data as object, expiresAt },
      update: { data: data as object, expiresAt },
    });
  } catch {
    // cache write failure is non-fatal
  }
}

export { getPrisma as prisma };
