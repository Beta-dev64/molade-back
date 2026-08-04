import { env } from "../../config/env";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function otpBlocksHtml(otpDisplay: string): string {
  const parts = otpDisplay.split("-");
  const blocks = parts.map(
    (part) =>
      `<span style="display:inline-block;background:#111827;border:1px solid #374151;border-radius:8px;padding:10px 14px;margin:0 4px;font-family:ui-monospace,monospace;font-size:22px;letter-spacing:0.08em;color:#F9FAFB;">${escapeHtml(part)}</span>`,
  );
  return `<div style="margin:16px 0;text-align:center;">${blocks.join("")}</div>`;
}

export function renderEmailLayout(opts: {
  preheader?: string;
  title: string;
  recipientName: string;
  bodyHtml: string;
}): string {
  const logo = env.MAIL_LOGO_URL?.trim();
  const logoBlock = logo
    ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(env.APP_NAME)}" height="36" style="display:block;margin:0 auto 16px;" />`
    : `<div style="font-size:20px;font-weight:700;color:#F9FAFB;text-align:center;margin-bottom:16px;">${escapeHtml(env.APP_NAME)}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#0B0F19;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B0F19;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111827;border:1px solid #1F2937;border-radius:12px;padding:28px 24px;">
          <tr><td>${logoBlock}</td></tr>
          <tr>
            <td style="color:#E5E7EB;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">Hi ${escapeHtml(opts.recipientName.split(" ")[0] || opts.recipientName)},</p>
              ${opts.bodyHtml}
              <p style="margin:24px 0 0;font-size:13px;color:#6B7280;">— ${escapeHtml(env.APP_NAME)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
