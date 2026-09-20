/**
 * 간단한 인메모리 IP rate limit (서버리스 cold start 시 리셋될 수 있음).
 * 공개 데모 API의 남용을 완화한다.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * @returns null if allowed, or a Response to return (429)
 */
export function enforceRateLimit(
  request: Request,
  keyPrefix: string,
  limit: number,
  windowMs: number
): Response | null {
  const ip = getClientIp(request);
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return Response.json(
      {
        error: 'rate_limited',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
        retryAfter,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, retryAfter)) },
      }
    );
  }
  return null;
}

/** INTERNAL_API_SECRET이 설정된 경우에만 헤더 검증 */
export function enforceOptionalApiSecret(request: Request): Response | null {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) return null;
  const header = request.headers.get('x-internal-secret')?.trim();
  if (header === secret) return null;
  return Response.json(
    { error: 'unauthorized', message: 'Invalid or missing x-internal-secret' },
    { status: 401 }
  );
}
