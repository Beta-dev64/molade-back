import { prisma } from "../../db/prisma";
import { redisPing } from "../../redis/client";
import { verifyMailer } from "../../mail/transporter";

export class HealthService {
  async check() {
    const started = process.uptime();

    const [db, redis, mail] = await Promise.all([
      this.checkDb(),
      redisPing(),
      verifyMailer(),
    ]);

    const degraded = !db.ok || !redis.ok || !mail.ok;

    return {
      status: degraded ? ("degraded" as const) : ("ok" as const),
      uptime: Math.round(started),
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: db.ok ? "up" : "down", latencyMs: db.latencyMs },
        redis: { status: redis.ok ? "up" : "down", latencyMs: redis.latencyMs },
        mail: { status: mail.ok ? "up" : "down", mode: mail.mode },
      },
    };
  }

  private async checkDb() {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }
}

export const healthService = new HealthService();
