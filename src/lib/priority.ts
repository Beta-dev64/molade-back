/**
 * Rule-based ranking — kept in lockstep with frontend/src/lib/molade/priority.ts
 * so API and UI produce identical scores and explanations.
 */

export type TaskStatus = "not_started" | "in_progress" | "blocked" | "completed";
export type Effort = "S" | "M" | "L";
export type PriorityLevel = "Critical" | "High" | "Medium" | "Low";

export interface RankableTask {
  id: string;
  title: string;
  description: string;
  course: string;
  courseCode: string;
  deadline: string;
  effort: Effort;
  status: TaskStatus;
  personalPreference: "none" | "low" | "normal" | "high";
  createdAt: string;
  completedAt?: string;
  completedOnTime?: boolean;
  snoozedUntil?: string;
}

export interface PriorityReason {
  label: string;
  detail: string;
  weight: number;
  kind: "deadline" | "effort" | "status" | "risk" | "preference";
}

export interface RankedTask {
  task: RankableTask;
  score: number;
  level: PriorityLevel;
  reasons: PriorityReason[];
  hoursLeft: number;
  summary: string;
}

export const EFFORT_HOURS: Record<Effort, number> = { S: 2, M: 6, L: 14 };
export const EFFORT_LABEL: Record<Effort, string> = {
  S: "Small · ~2h",
  M: "Medium · ~6h",
  L: "Large · ~14h",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
  completed: "Completed",
};

export function hoursUntil(deadline: string, now: number): number {
  return (new Date(deadline).getTime() - now) / 36e5;
}

export function countdownLabel(deadline: string, now: number): string {
  const h = hoursUntil(deadline, now);
  const abs = Math.abs(h);
  const unit =
    abs < 1
      ? `${Math.max(1, Math.round(abs * 60))}m`
      : abs < 48
        ? `${Math.round(abs)}h`
        : `${Math.round(abs / 24)}d`;
  if (h < 0) return `Overdue by ${unit}`;
  if (h < 1) return `Due in ${unit}`;
  if (h < 24) return `Due in ${unit}`;
  if (h < 48) return "Due tomorrow";
  return `Due in ${unit}`;
}

export function rankTask(task: RankableTask, now: number): RankedTask {
  const hoursLeft = hoursUntil(task.deadline, now);
  const reasons: PriorityReason[] = [];
  let score = 0;

  let deadlinePoints: number;
  let deadlineDetail: string;
  if (hoursLeft < 0) {
    deadlinePoints = 46;
    deadlineDetail = `Deadline passed ${countdownLabel(task.deadline, now).toLowerCase().replace("overdue by ", "")} ago`;
  } else if (hoursLeft <= 24) {
    deadlinePoints = 42;
    deadlineDetail = `Less than 24 hours remaining`;
  } else if (hoursLeft <= 72) {
    deadlinePoints = 30;
    deadlineDetail = `Due within 3 days`;
  } else if (hoursLeft <= 168) {
    deadlinePoints = 18;
    deadlineDetail = `Due this week`;
  } else {
    deadlinePoints = 8;
    deadlineDetail = `More than a week away`;
  }
  score += deadlinePoints;
  reasons.push({
    kind: "deadline",
    label: "Deadline proximity",
    detail: deadlineDetail,
    weight: deadlinePoints,
  });

  const need = EFFORT_HOURS[task.effort];
  const pressure = hoursLeft <= 0 ? 3 : need / Math.max(hoursLeft, 1);
  const effortPoints = Math.round(Math.min(24, 6 + pressure * 18));
  score += effortPoints;
  reasons.push({
    kind: "effort",
    label: "Workload vs time",
    detail:
      pressure >= 0.5
        ? `${EFFORT_LABEL[task.effort]} — tight against the remaining window`
        : `${EFFORT_LABEL[task.effort]} — comfortable against the remaining window`,
    weight: effortPoints,
  });

  const statusPoints =
    task.status === "completed"
      ? -60
      : task.status === "blocked"
        ? 14
        : task.status === "not_started"
          ? 12
          : 5;
  score += statusPoints;
  reasons.push({
    kind: "status",
    label: "Status",
    detail:
      task.status === "not_started"
        ? "Nothing started yet"
        : task.status === "in_progress"
          ? "Already underway"
          : task.status === "blocked"
            ? "Blocked — needs unblocking early"
            : "Completed",
    weight: statusPoints,
  });

  if (hoursLeft < 0 && task.status !== "completed") {
    score += 18;
    reasons.push({
      kind: "risk",
      label: "Overdue risk",
      detail: "Already past the submission date",
      weight: 18,
    });
  } else if (hoursLeft < need && task.status !== "completed") {
    score += 12;
    reasons.push({
      kind: "risk",
      label: "Overdue risk",
      detail: "Estimated effort exceeds the time left",
      weight: 12,
    });
  }

  if (task.personalPreference === "high") {
    score += 6;
    reasons.push({
      kind: "preference",
      label: "Your preference",
      detail: "You flagged this as personally important",
      weight: 6,
    });
  } else if (task.personalPreference === "low") {
    score -= 6;
    reasons.push({
      kind: "preference",
      label: "Your preference",
      detail: "You marked this as low personal priority",
      weight: -6,
    });
  }

  const snoozedFor =
    task.snoozedUntil && new Date(task.snoozedUntil).getTime() > now
      ? Math.max(1, Math.round((new Date(task.snoozedUntil).getTime() - now) / 36e5))
      : 0;
  if (snoozedFor && task.status !== "completed") {
    score -= 25;
    reasons.push({
      kind: "preference",
      label: "Snoozed",
      detail: `You snoozed this — it returns in about ${snoozedFor}h`,
      weight: -25,
    });
  }

  const level: PriorityLevel =
    task.status === "completed"
      ? "Low"
      : score >= 78
        ? "Critical"
        : score >= 60
          ? "High"
          : score >= 42
            ? "Medium"
            : "Low";

  const summary = [
    countdownLabel(task.deadline, now),
    `${task.effort === "L" ? "High" : task.effort === "M" ? "Moderate" : "Light"} workload`,
    STATUS_LABEL[task.status],
  ].join(" · ");

  return { task, score: Math.round(score), level, reasons, hoursLeft, summary };
}

export function rankAll(tasks: RankableTask[], now: number): RankedTask[] {
  return tasks
    .map((t) => rankTask(t, now))
    .sort((a, b) => b.score - a.score || a.hoursLeft - b.hoursLeft);
}
