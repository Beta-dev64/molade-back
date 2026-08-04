import { escapeHtml, otpBlocksHtml, renderEmailLayout } from "./layout";

export function verifyEmailTemplate(opts: {
  name: string;
  otpDisplay: string;
  expiresMinutes: number;
}) {
  const subject = `Your Molade verification code: ${opts.otpDisplay}`;
  const html = renderEmailLayout({
    preheader: `Verify your email with code ${opts.otpDisplay}`,
    title: subject,
    recipientName: opts.name,
    bodyHtml: `
      <p style="margin:0 0 12px;">Welcome to Molade. Confirm your university email to start ranking your coursework.</p>
      <p style="margin:0 0 8px;">Enter this code in the app. It expires in <strong style="color:#F9FAFB;">${opts.expiresMinutes} minutes</strong>.</p>
      ${otpBlocksHtml(opts.otpDisplay)}
      <p style="margin:16px 0 0;font-size:13px;color:#9CA3AF;">
        For your security, never share this code. If you don’t verify within <strong>24 hours</strong>,
        this account will be removed automatically.
      </p>
    `,
  });

  const text = `Hi ${opts.name.split(" ")[0] || opts.name},

Your Molade verification code is ${opts.otpDisplay}.
It expires in ${opts.expiresMinutes} minutes.

If you don't verify within 24 hours, the account will be removed.

— Molade`;

  return { subject, html, text: escapeHtml(text) === text ? text : text };
}
