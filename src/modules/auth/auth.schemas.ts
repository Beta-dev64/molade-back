import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255).transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform((e) => e.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const emailOnlySchema = z.object({
  email: z.string().trim().email().transform((e) => e.toLowerCase()),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email().transform((e) => e.toLowerCase()),
  code: z.string().trim().min(6).max(8),
});

export const resendOtpSchema = z.object({
  email: z.string().trim().email().transform((e) => e.toLowerCase()),
  purpose: z.enum(["EMAIL_VERIFY", "PASSWORD_RESET"]),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(20),
  password: z.string().min(8).max(128),
});
