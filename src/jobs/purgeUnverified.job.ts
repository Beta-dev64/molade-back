import cron from "node-cron";
import { prisma } from "../db/prisma";

/**
 * Daily at 03:00 — remove accounts that never verified email within 24 hours.
 */
export function startPurgeUnverifiedJob() {
  cron.schedule("0 3 * * *", async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      const result = await prisma.user.deleteMany({
        where: {
          emailVerifiedAt: null,
          createdAt: { lt: cutoff },
        },
      });
      if (result.count) {
        console.log(`[job:purge] removed ${result.count} unverified account(s)`);
      }
    } catch (err) {
      console.error("[job:purge]", err);
    }
  });

  console.log("[job:purge] scheduled");
}
