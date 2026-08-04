import type { Activity, Notification, Task, User } from "@prisma/client";

export function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    programme: user.programme,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    course: task.course,
    courseCode: task.courseCode,
    deadline: task.deadline.toISOString(),
    effort: task.effort,
    status: task.status,
    personalPreference: task.personalPreference,
    createdAt: task.createdAt.toISOString(),
    ...(task.completedAt ? { completedAt: task.completedAt.toISOString() } : {}),
    ...(task.completedOnTime != null ? { completedOnTime: task.completedOnTime } : {}),
    ...(task.snoozedUntil ? { snoozedUntil: task.snoozedUntil.toISOString() } : {}),
  };
}

export function serializeNotification(row: Notification) {
  return {
    id: row.id,
    type: row.type as "deadline" | "priority" | "overdue" | "system",
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    read: row.read,
    ...(row.taskId ? { taskId: row.taskId } : {}),
    ...(row.snoozedUntil ? { snoozedUntil: row.snoozedUntil.toISOString() } : {}),
  };
}

export function serializeActivity(row: Activity) {
  return {
    id: row.id,
    text: row.text,
    at: row.at.toISOString(),
    kind: row.kind as "completed" | "created" | "updated" | "reminder",
  };
}

export function serializePrefs(prefs: {
  email: boolean;
  push: boolean;
  lead: string;
  priorityChanges: boolean;
  weeklyDigest: boolean;
}) {
  return {
    email: prefs.email,
    push: prefs.push,
    lead: prefs.lead as "24h" | "12h" | "3h",
    priorityChanges: prefs.priorityChanges,
    weeklyDigest: prefs.weeklyDigest,
  };
}
