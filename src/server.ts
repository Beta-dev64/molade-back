import http from "http";
import { env, isAuthVerificationLax } from "./config/env";
import { createApp, startBackgroundJobs } from "./app";
import { prisma } from "./db/prisma";
import { getRedis } from "./redis/client";
import { getIO, initSocket } from "./socket/io";

const app = createApp();
const httpServer = http.createServer(app);
initSocket(httpServer);

const server = httpServer.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
  console.log(`[socket] path=/socket.io cors=${env.CORS_ORIGIN}`);
  if (isAuthVerificationLax()) {
    console.log("[auth] AUTH_VERIFICATION_MODE=lax — OTP optional; unverified login allowed");
  }
  startBackgroundJobs();
});

async function shutdown(signal: string) {
  console.log(`[api] ${signal} — shutting down`);
  const io = getIO();
  io?.close();
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
