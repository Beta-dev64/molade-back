import cron from "node-cron";
import { prisma } from "../db/prisma";
import { countdownLabel, hoursUntil, rankTask, type RankableTask } from "../lib/priority";
import { serializeTask } from "../lib/serialize";
import { sendMail } from "../mail/sendMail";
import { deadlineReminderTemplate } from "../mail/templates/deadlineReminder";
import { invalidateUserCache } from "../redis/cache";

const LEAD_HOURS: Record<string, number> = {
  "24h": 24,
  "12h": 12,
  "3h": 3,
};

/**
 * Every 10 minutes: create in-app + email reminders for approaching deadlines.
 * Scoped per-user; never crosses user boundaries.
 */
export function startDeadlineRemindersJob() {
  cron.schedule("*/10 * * * *", async () => {
    const now = Date.now();
    try {
      const users = await prisma.user.findMany({
        where: { emailVerifiedAt: { not: null }, prefs: { email: true } },
        include: { prefs: true },
      });

      for (const user of users) {
        const lead = user.prefs?.lead ?? "24h";
        const leadH = LEAD_HOURS[lead] ?? 24;

        const tasks = await prisma.task.findMany({
          where: { userId: user.id, status: { not: "completed" } },
        });

        for (const task of tasks) {
          const h = hoursUntil(task.deadline.toISOString(), now);
          // Fire when within lead window and not yet overdue by more than 1h
          // (overdue gets its own notification type)
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

          const ranked = rankTask(serializeTask(task) as RankableTask, now);
          const title = justOverdue
            ? `${task.title} is overdue`
            : `${task.title} due ${countdownLabel(task.deadline.toISOString(), now).toLowerCase()}`;
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

          if (user.prefs?.email) {
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
    }
  });

  console.log("[job:reminders] scheduled");
}
