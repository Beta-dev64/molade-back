import Redis from "ioredis";
import { env } from "../config/env";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
  }
  return client;
}

export async function redisPing(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const redis = getRedis();
    if (redis.status !== "ready") await redis.connect();
    const pong = await redis.ping();
    return { ok: pong === "PONG", latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
