import { env, getBrevoSender, isDev } from "../config/env";
import { getTransporter, isBrevoConfigured, isSmtpConfigured } from "./transporter";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (isBrevoConfigured()) {
    await sendViaBrevo(options);
    return;
  }

  if (isSmtpConfigured()) {
    await sendViaSmtp(options);
    return;
  }

  // Dev stub: log instead of sending
  const info = await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (isDev) {
    console.log("[mail] queued (jsonTransport — set BREVO_API_KEY to send real HTML)", {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
      preview: typeof info.message === "string" ? info.message.slice(0, 200) : undefined,
    });
  }
}

async function sendViaBrevo(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const sender = getBrevoSender();

  const res = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: sender.name,
        email: sender.email,
      },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    messageId?: string;
    message?: string;
    code?: string;
  };

  if (!res.ok) {
    const detail = body.message || body.code || res.statusText;
    throw new Error(`Brevo send failed (${res.status}): ${detail}`);
  }

  console.log("[mail] sent via Brevo", {
    to: options.to,
    subject: options.subject,
    messageId: body.messageId,
    from: sender.email,
  });
}

async function sendViaSmtp(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const info = await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (isDev) {
    console.log("[mail] sent via SMTP", {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    });
  }
}
