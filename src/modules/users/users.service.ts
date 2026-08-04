import { prisma } from "../../db/prisma";
import { badRequest, conflict, notFound, unauthorized } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/password";
import { serializePrefs, serializeTask, serializeUser } from "../../lib/serialize";
import { invalidateUserCache } from "../../redis/cache";

export class UsersService {
  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { prefs: true },
    });
    if (!user || !user.prefs) throw notFound("User not found");
    return { user: serializeUser(user), prefs: serializePrefs(user.prefs) };
  }

  async updateProfile(
    userId: string,
    input: { name?: string; email?: string; programme?: string },
  ) {
    if (input.email) {
      const taken = await prisma.user.findFirst({
        where: { email: input.email, NOT: { id: userId } },
      });
      if (taken) throw conflict("Email is already in use");
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
    });
    await invalidateUserCache(userId);
    return serializeUser(user);
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound("User not found");
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw unauthorized("Current password is incorrect");
    }
    if (currentPassword === newPassword) {
      throw badRequest("New password must differ from the current password");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    return { ok: true as const };
  }

  async getPrefs(userId: string) {
    const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
    if (!prefs) throw notFound("Preferences not found");
    return serializePrefs(prefs);
  }

  async updatePrefs(userId: string, input: Record<string, unknown>) {
    const prefs = await prisma.userPreferences.update({
      where: { userId },
      data: input,
    });
    return serializePrefs(prefs);
  }

  async exportData(userId: string) {
    const [user, tasks, notifications, activity] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, include: { prefs: true } }),
      prisma.task.findMany({ where: { userId } }),
      prisma.notification.findMany({ where: { userId } }),
      prisma.activity.findMany({ where: { userId }, orderBy: { at: "desc" } }),
    ]);
    if (!user) throw notFound("User not found");

    return {
      exportedAt: new Date().toISOString(),
      user: serializeUser(user),
      prefs: user.prefs ? serializePrefs(user.prefs) : null,
      tasks: tasks.map(serializeTask),
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      activity: activity.map((a) => ({
        id: a.id,
        kind: a.kind,
        text: a.text,
        at: a.at.toISOString(),
      })),
    };
  }

  async deleteAccount(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
    await invalidateUserCache(userId);
    return { ok: true as const };
  }
}

export const usersService = new UsersService();
