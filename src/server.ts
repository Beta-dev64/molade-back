import { env } from "./config/env";
import { createApp, startBackgroundJobs } from "./app";
import { prisma } from "./db/prisma";
import { getRedis } from "./redis/client";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
  startBackgroundJobs();
});

async function shutdown(signal: string) {
  console.log(`[api] ${signal} — shutting down`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    try {
      const redis = getRedis();
      if (redis.status === "ready") await redis.quit();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
