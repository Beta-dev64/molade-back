import { prisma } from "../../db/prisma";
import { badRequest, notFound } from "../../lib/errors";
import { serializeTask } from "../../lib/serialize";
import { cacheGet, cacheSet, invalidateUserCache } from "../../redis/cache";

function parseDeadline(raw: string): Date {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw badRequest("Invalid deadline");
  return d;
}

/**
 * Every query is scoped by userId. Never load a task by id alone.
 * Missing rows → 404 (no existence leak across accounts).
 */
export class TasksService {
  async list(userId: string) {
    const cacheKey = `user:${userId}:tasks`;
    const cached = await cacheGet<ReturnType<typeof serializeTask>[]>(cacheKey);
    if (cached) return cached;

    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { deadline: "asc" },
    });
    const data = tasks.map(serializeTask);
    await cacheSet(cacheKey, data, 45);
    return data;
  }

  async getById(userId: string, taskId: string) {
    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) throw notFound("Task not found");
    return serializeTask(task);
  }

  async create(
    userId: string,
    input: {
      title: string;
      description?: string;
      course: string;
      courseCode: string;
      deadline: string;
      effort: string;
      status?: string;
      personalPreference?: string;
    },
  ) {
    const task = await prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description ?? "",
        course: input.course,
        courseCode: input.courseCode,
        deadline: parseDeadline(input.deadline),
        effort: input.effort,
        status: input.status ?? "not_started",
        personalPreference: input.personalPreference ?? "normal",
      },
    });

    await prisma.activity.create({
      data: { userId, kind: "created", text: `Added ${task.title}` },
    });

    await invalidateUserCache(userId);
    return serializeTask(task);
  }

  async update(userId: string, taskId: string, input: Record<string, unknown>) {
    await this.assertOwned(userId, taskId);

    const data: Record<string, unknown> = { ...input };
    if (typeof input.deadline === "string") {
      data.deadline = parseDeadline(input.deadline);
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
    });

    await prisma.activity.create({
      data: { userId, kind: "updated", text: `Updated ${task.title}` },
    });

    await invalidateUserCache(userId);
    return serializeTask(task);
  }

  async toggleComplete(userId: string, taskId: string) {
    const existing = await this.assertOwned(userId, taskId);
    const done = existing.status !== "completed";
    const now = new Date();

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: done ? "completed" : "in_progress",
        completedAt: done ? now : null,
        completedOnTime: done ? existing.deadline.getTime() > now.getTime() : null,
      },
    });

    await prisma.activity.create({
      data: {
        userId,
        kind: done ? "completed" : "updated",
        text: `${done ? "Completed" : "Reopened"} ${task.title}`,
      },
    });

    await invalidateUserCache(userId);
    return serializeTask(task);
  }

  async delete(userId: string, taskId: string) {
    await this.assertOwned(userId, taskId);
    await prisma.task.delete({ where: { id: taskId } });
    await invalidateUserCache(userId);
    return { ok: true as const };
  }

  async snooze(userId: string, taskId: string, hours: number) {
    await this.assertOwned(userId, taskId);
    const until = new Date(Date.now() + hours * 36e5);
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { snoozedUntil: until },
    });
    await prisma.activity.create({
      data: {
        userId,
        kind: "reminder",
        text: `Snoozed ${task.title} for ${hours}h`,
      },
    });
    await invalidateUserCache(userId);
    return serializeTask(task);
  }

  async unsnooze(userId: string, taskId: string) {
    await this.assertOwned(userId, taskId);
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { snoozedUntil: null },
    });
    await invalidateUserCache(userId);
    return serializeTask(task);
  }

  /** Ownership gate — always filter by userId. */
  private async assertOwned(userId: string, taskId: string) {
    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) throw notFound("Task not found");
    return task;
  }
}

export const tasksService = new TasksService();
