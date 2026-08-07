import cron from "node-cron";
import { prisma } from "../db/prisma";
import { countdownLabel, hoursUntil, rankTask, type RankableTask } from "../lib/priority";
import { serializeNotification, serializeTask } from "../lib/serialize";
import { sendMail } from "../mail/sendMail";
import { deadlineReminderTemplate } from "../mail/templates/deadlineReminder";
import { invalidateUserCache } from "../redis/cache";
import { emitNotificationNew } from "../socket/io";

const LEAD_HOURS: Record<string, number> = {
  "24h": 24,
  "12h": 12,
  "3h": 3,
};

/**
 * Every 10 minutes: create in-app (+ optional email) reminders for approaching deadlines.
 * Live clients receive `notification:new` over Socket.IO.
 */
export function startDeadlineRemindersJob() {
  cron.schedule("*/10 * * * *", async () => {
    await runDeadlineReminders();
  });

  console.log("[job:reminders] scheduled");
}

/** Exported for smoke/manual tests */
export async function runDeadlineReminders(nowMs = Date.now()) {
  try {
    const users = await prisma.user.findMany({
      where: { emailVerifiedAt: { not: null } },
      include: { prefs: true },
    });

    for (const user of users) {
      const lead = user.prefs?.lead ?? "24h";
      const leadH = LEAD_HOURS[lead] ?? 24;
      const wantEmail = user.prefs?.email !== false;

      const tasks = await prisma.task.findMany({
        where: { userId: user.id, status: { not: "completed" } },
      });

      for (const task of tasks) {
        const h = hoursUntil(task.deadline.toISOString(), nowMs);
        const inLeadWindow = h > 0 && h <= leadH;
        const justOverdue = h <= 0 && h > -2;

        if (!inLeadWindow && !justOverdue) continue;

        const bucket = justOverdue ? "overdue" : lead;
        const existing = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            taskId: task.id,
            leadBucket: bucket,
          },
        });
        if (existing) continue;

        const ranked = rankTask(serializeTask(task) as RankableTask, nowMs);
        const title = justOverdue
          ? `${task.title} is overdue`
          : `${task.title} due ${countdownLabel(task.deadline.toISOString(), nowMs).toLowerCase()}`;
        const body = `${task.courseCode} · ${ranked.summary}`;

        const notification = await prisma.notification.create({
          data: {
            userId: user.id,
            taskId: task.id,
            type: justOverdue ? "overdue" : "deadline",
            title,
            body,
            leadBucket: bucket,
          },
        });

        const payload = serializeNotification(notification);
        emitNotificationNew(user.id, payload);

        if (wantEmail) {
          try {
            await sendMail({
              to: user.email,
              ...deadlineReminderTemplate({
                name: user.name,
                taskTitle: task.title,
                courseCode: task.courseCode,
                summary: ranked.summary,
                hoursLeft: h,
              }),
            });
            await prisma.notification.update({
              where: { id: notification.id },
              data: { emailSentAt: new Date() },
            });
          } catch (err) {
            console.error("[job:reminders] mail failed", user.email, err);
          }
        }
      }

      await invalidateUserCache(user.id);
    }
  } catch (err) {
    console.error("[job:reminders]", err);
    throw err;
  }
}
