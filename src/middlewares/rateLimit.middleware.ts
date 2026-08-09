import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { tooManyRequests } from "../lib/errors";
import { getRedis } from "../redis/client";

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

/** Redis-backed sliding window: RATE_LIMIT_MAX requests per IP per window. */
export async function rateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Never rate-limit health checks or CORS preflight
  if (req.method === "OPTIONS" || req.path === "/api/health" || req.path.endsWith("/health")) {
    return next();
  }

  const ip = clientIp(req);
  const key = `rl:${ip}:${Math.floor(Date.now() / (env.RATE_LIMIT_WINDOW_SEC * 1000))}`;

  try {
    const redis = getRedis();
    if (redis.status !== "ready") await redis.connect();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, env.RATE_LIMIT_WINDOW_SEC);
    if (count > env.RATE_LIMIT_MAX) throw tooManyRequests();
    next();
  } catch (err) {
    next(err);
  }
}
