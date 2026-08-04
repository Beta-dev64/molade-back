import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(255).transform((e) => e.toLowerCase()).optional(),
  programme: z.string().trim().max(120).optional(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export const updatePrefsSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  lead: z.enum(["24h", "12h", "3h"]).optional(),
  priorityChanges: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
});
