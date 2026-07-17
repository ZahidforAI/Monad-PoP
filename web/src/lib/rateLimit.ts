// Simple memory-based rate limiter for MVP
// Can be replaced with Redis/Upstash in production

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const cache = new Map<string, RateLimitRecord>();

export function isRateLimited(key: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = cache.get(key);

  if (!record) {
    cache.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (now > record.resetTime) {
    // Reset window
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }

  record.count++;
  if (record.count > limit) {
    return true;
  }

  return false;
}
