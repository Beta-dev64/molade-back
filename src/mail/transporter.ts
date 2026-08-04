import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { env, getBrevoSender, isDev } from "../config/env";

let transporter: nodemailer.Transporter | null = null;
let warnedFallback = false;

export function isBrevoConfigured(): boolean {
  return Boolean(env.BREVO_API_KEY?.trim());
}

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_USER?.trim());
}

/** True when any real delivery channel is configured (Brevo preferred). */
export function isMailConfigured(): boolean {
  return isBrevoConfigured() || isSmtpConfigured();
}

export function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (isSmtpConfigured()) {
    const options: SMTPTransport.Options = {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    };
    transporter = nodemailer.createTransport(options);
    return transporter;
  }

  // Ethereal-less stub: JSON transport logs messages instead of sending
  transporter = nodemailer.createTransport({ jsonTransport: true });
  if (isDev && !isBrevoConfigured() && !warnedFallback) {
    warnedFallback = true;
    console.warn(
      "[mail] BREVO_API_KEY not set — using jsonTransport (emails logged, not sent)",
    );
  }
  return transporter;
}

export async function verifyMailer(): Promise<{ ok: boolean; mode: string }> {
  if (isBrevoConfigured()) {
    try {
      const sender = getBrevoSender();
      // Lightweight account check — confirms API key without sending mail
      const res = await fetch("https://api.brevo.com/v3/account", {
        method: "GET",
        headers: {
          accept: "application/json",
          "api-key": env.BREVO_API_KEY,
        },
      });
      if (!res.ok) {
        return { ok: false, mode: "brevo" };
      }
      if (isDev) {
        console.log("[mail] Brevo API key ok; sender will be", sender.email);
      }
      return { ok: true, mode: "brevo" };
    } catch {
      return { ok: false, mode: "brevo" };
    }
  }

  if (!isSmtpConfigured()) {
    return { ok: true, mode: "jsonTransport" };
  }

  try {
    await getTransporter().verify();
    return { ok: true, mode: "smtp" };
  } catch {
    return { ok: false, mode: "smtp" };
  }
}
