import cron from "node-cron";
import { isAuthVerificationLax } from "../config/env";
import { prisma } from "../db/prisma";

/**
 * Daily at 03:00 — remove accounts that never verified email within 24 hours.
 * Skipped when AUTH_VERIFICATION_MODE=lax so grader accounts are not deleted.
 */
export function startPurgeUnverifiedJob() {
  cron.schedule("0 3 * * *", async () => {
    if (isAuthVerificationLax()) {
      console.log("[job:purge] skipped (AUTH_VERIFICATION_MODE=lax)");
      return;
    }
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
