import { escapeHtml, otpBlocksHtml, renderEmailLayout } from "./layout";

export function passwordResetTemplate(opts: {
  name: string;
  otpDisplay: string;
  expiresMinutes: number;
}) {
  const subject = `Reset your Molade password: ${opts.otpDisplay}`;
  const html = renderEmailLayout({
    preheader: `Password reset code ${opts.otpDisplay}`,
    title: subject,
    recipientName: opts.name,
    bodyHtml: `
      <p style="margin:0 0 12px;">We received a request to reset your Molade password.</p>
      <p style="margin:0 0 8px;">Enter this code in the app. It expires in <strong style="color:#F9FAFB;">${opts.expiresMinutes} minutes</strong>.</p>
      ${otpBlocksHtml(opts.otpDisplay)}
      <p style="margin:16px 0 0;font-size:13px;color:#9CA3AF;">
        If you didn't request this, you can ignore this email — your password won't change.
      </p>
    `,
  });

  const text = `Hi ${opts.name.split(" ")[0] || opts.name},

Your Molade password reset code is ${opts.otpDisplay}.
It expires in ${opts.expiresMinutes} minutes.

If you didn't request this, ignore this email.

— Molade`;

  return { subject, html, text: escapeHtml(text) === text ? text : text };
}
