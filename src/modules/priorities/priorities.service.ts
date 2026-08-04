import { prisma } from "../../db/prisma";
import { rankAll, type RankableTask } from "../../lib/priority";
import { serializeTask } from "../../lib/serialize";
import { cacheGet, cacheSet, invalidateUserCache } from "../../redis/cache";

export class PrioritiesService {
  async list(userId: string) {
    const cacheKey = `user:${userId}:priorities`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return cached;

    const tasks = await prisma.task.findMany({ where: { userId } });
    const ranked = rankAll(
      tasks.map((t) => serializeTask(t) as RankableTask),
      Date.now(),
    );
    await cacheSet(cacheKey, ranked, 30);
    return ranked;
  }

  async recalculate(userId: string) {
    await invalidateUserCache(userId);
    return this.list(userId);
  }
}

export const prioritiesService = new PrioritiesService();
