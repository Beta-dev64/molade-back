import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_NAME: z.string().default("Molade"),
  APP_URL: z.string().url().default("http://localhost:8080"),
  API_URL: z.string().url().default("http://localhost:4000"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(60),

  CORS_ORIGIN: z.string().default("http://localhost:8080"),

  /** Preferred: Brevo transactional API (HTML emails). */
  BREVO_API_KEY: z.string().default(""),
  /** Verified sender in Brevo; falls back to MAIL_FROM email when empty. */
  BREVO_SENDER_EMAIL: z.string().default(""),
  BREVO_SENDER_NAME: z.string().default("Molade"),

  /** Fallback SMTP via Nodemailer when Brevo is not configured. */
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .preprocess((v) => v === true || v === "true" || v === "1", z.boolean())
    .default(false),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),

  MAIL_FROM: z.string().default("Molade <noreply@molade.app>"),
  MAIL_LOGO_URL: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);
export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";

/** Parsed CORS allow-list (comma-separated CORS_ORIGIN). */
export function getCorsOrigins(): string[] {
  return env.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse `Name <email@domain>` or bare email from MAIL_FROM. */
export function parseMailFrom(raw = env.MAIL_FROM): { name: string; email: string } {
  const match = raw.match(/^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
  if (match) {
    return {
      name: (match[1] || env.BREVO_SENDER_NAME || env.APP_NAME).trim() || env.APP_NAME,
      email: match[2].trim(),
    };
  }
  const email = raw.trim();
  return {
    name: env.BREVO_SENDER_NAME || env.APP_NAME,
    email,
  };
}

export function getBrevoSender(): { name: string; email: string } {
  const parsed = parseMailFrom();
  return {
    name: env.BREVO_SENDER_NAME?.trim() || parsed.name,
    email: (env.BREVO_SENDER_EMAIL?.trim() || parsed.email).toLowerCase(),
  };
}
