import { getRedis } from "./client";

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getRedis().get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  try {
    await getRedis().set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    /* cache miss is acceptable */
  }
}

export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    const redis = getRedis();
    const keys = await redis.keys(`user:${userId}:*`);
    if (keys.length) await redis.del(...keys);
  } catch {
    /* ignore */
  }
}
