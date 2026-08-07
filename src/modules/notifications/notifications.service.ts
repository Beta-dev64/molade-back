import { prisma } from "../../db/prisma";
import { notFound } from "../../lib/errors";
import { serializeNotification } from "../../lib/serialize";
import { cacheGet, cacheSet, invalidateUserCache } from "../../redis/cache";
import {
  emitNotificationNew,
  emitNotificationRemoved,
  emitNotificationUpdated,
  emitNotificationsSync,
} from "../../socket/io";
import { tasksService } from "../tasks/tasks.service";

export class NotificationsService {
  async list(userId: string) {
    const cacheKey = `user:${userId}:notifications`;
    const cached = await cacheGet<ReturnType<typeof serializeNotification>[]>(cacheKey);
    if (cached) return cached;

    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const data = rows.map(serializeNotification);
    await cacheSet(cacheKey, data, 30);
    return data;
  }

  async markRead(userId: string, id: string) {
    await this.assertOwned(userId, id);
    const row = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    await invalidateUserCache(userId);
    const payload = serializeNotification(row);
    emitNotificationUpdated(userId, payload);
    return payload;
  }

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    await invalidateUserCache(userId);
    emitNotificationsSync(userId);
    return { ok: true as const };
  }

  async dismiss(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await prisma.notification.delete({ where: { id } });
    await invalidateUserCache(userId);
    emitNotificationRemoved(userId, id);
    return { ok: true as const };
  }

  async snooze(userId: string, id: string, hours: number) {
    const n = await this.assertOwned(userId, id);
    const until = new Date(Date.now() + hours * 36e5);
    const row = await prisma.notification.update({
      where: { id },
      data: { snoozedUntil: until, read: true },
    });

    if (n.taskId) {
      await tasksService.snooze(userId, n.taskId, hours);
    }

    await invalidateUserCache(userId);
    const payload = serializeNotification(row);
    emitNotificationUpdated(userId, payload);
    return payload;
  }

  async restore(userId: string, id: string) {
    const n = await this.assertOwned(userId, id);
    const row = await prisma.notification.update({
      where: { id },
      data: { snoozedUntil: null, read: false },
    });
    if (n.taskId) {
      await tasksService.unsnooze(userId, n.taskId);
    }
    await invalidateUserCache(userId);
    const payload = serializeNotification(row);
    emitNotificationUpdated(userId, payload);
    return payload;
  }

  /**
   * Manual / test helper — creates a system notification and pushes it live.
   */
  async createSystem(userId: string, title: string, body: string) {
    const row = await prisma.notification.create({
      data: {
        userId,
        type: "system",
        title,
        body,
        leadBucket: `system-${Date.now()}`,
      },
    });
    await invalidateUserCache(userId);
    const payload = serializeNotification(row);
    emitNotificationNew(userId, payload);
    return payload;
  }

  private async assertOwned(userId: string, id: string) {
    const row = await prisma.notification.findFirst({ where: { id, userId } });
    if (!row) throw notFound("Notification not found");
    return row;
  }
}

export const notificationsService = new NotificationsService();
