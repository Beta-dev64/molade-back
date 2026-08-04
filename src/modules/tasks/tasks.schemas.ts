import { z } from "zod";

const effort = z.enum(["S", "M", "L"]);
const status = z.enum(["not_started", "in_progress", "blocked", "completed"]);
const preference = z.enum(["none", "low", "normal", "high"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().default(""),
  course: z.string().trim().min(1).max(120),
  courseCode: z.string().trim().min(1).max(40),
  /** Accept ISO or datetime-local values from the Molade frontend. */
  deadline: z.string().trim().min(1),
  effort,
  status: status.optional().default("not_started"),
  personalPreference: preference.optional().default("normal"),
});

export const updateTaskSchema = createTaskSchema.partial();

export const snoozeSchema = z.object({
  hours: z.coerce.number().int().min(1).max(168),
});

export const idParamSchema = z.object({
  id: z.string().cuid(),
});
