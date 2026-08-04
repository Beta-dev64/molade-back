import { prisma } from "../../db/prisma";
import { hoursUntil } from "../../lib/priority";
import { cacheGet, cacheSet } from "../../redis/cache";

export class AnalyticsService {
  async summary(userId: string) {
    const cacheKey = `user:${userId}:analytics`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return cached;

    const tasks = await prisma.task.findMany({ where: { userId } });
    const now = Date.now();

    const completed = tasks.filter((t) => t.status === "completed");
    const open = tasks.filter((t) => t.status !== "completed");
    const overdue = open.filter((t) => hoursUntil(t.deadline.toISOString(), now) < 0);

    const onTime = completed.filter((t) => t.completedOnTime === true).length;
    const late = completed.filter((t) => t.completedOnTime === false).length;

    const moduleMap = new Map<string, number>();
    for (const task of open) {
      const key = task.courseCode || task.course;
      moduleMap.set(key, (moduleMap.get(key) ?? 0) + 1);
    }

    const trendMap = new Map<string, number>();
    for (const task of completed) {
      if (!task.completedAt) continue;
      const label = task.completedAt.toISOString().slice(0, 10);
      trendMap.set(label, (trendMap.get(label) ?? 0) + 1);
    }

    const completionTrend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([label, count]) => ({ label, completed: count }));

    const data = {
      totals: {
        open: open.length,
        completed: completed.length,
        overdue: overdue.length,
      },
      onTimeSplit: [
        { name: "On time", value: onTime },
        { name: "Late", value: late },
      ],
      completionTrend,
      workloadByModule: [...moduleMap.entries()].map(([name, value]) => ({ name, value })),
      completionRate:
        tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100),
    };

    await cacheSet(cacheKey, data, 60);
    return data;
  }
}

export const analyticsService = new AnalyticsService();
