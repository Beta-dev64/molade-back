import { prisma } from "../../db/prisma";
import { serializeActivity } from "../../lib/serialize";
import { cacheGet, cacheSet, invalidateUserCache } from "../../redis/cache";

export class ActivityService {
  async list(userId: string) {
    const cacheKey = `user:${userId}:activity`;
    const cached = await cacheGet<ReturnType<typeof serializeActivity>[]>(cacheKey);
    if (cached) return cached;

    const rows = await prisma.activity.findMany({
      where: { userId },
      orderBy: { at: "desc" },
      take: 100,
    });
    const data = rows.map(serializeActivity);
    await cacheSet(cacheKey, data, 30);
    return data;
  }
}

export const activityService = new ActivityService();

// Re-export for cache invalidation from other modules if needed
export { invalidateUserCache };
