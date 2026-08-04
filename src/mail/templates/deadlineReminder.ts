import { escapeHtml, renderEmailLayout } from "./layout";

export function deadlineReminderTemplate(opts: {
  name: string;
  taskTitle: string;
  courseCode: string;
  summary: string;
  hoursLeft: number;
}) {
  const overdue = opts.hoursLeft <= 0;
  const subject = overdue
    ? `${opts.taskTitle} is overdue`
    : `${opts.taskTitle} — deadline approaching`;
  const headline = overdue ? "This task is overdue" : "Deadline reminder";

  const html = renderEmailLayout({
    preheader: `${opts.courseCode} · ${opts.summary}`,
    title: subject,
    recipientName: opts.name,
    bodyHtml: `
      <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:#F9FAFB;">${escapeHtml(headline)}</p>
      <p style="margin:0 0 12px;"><strong style="color:#F9FAFB;">${escapeHtml(opts.taskTitle)}</strong> (${escapeHtml(opts.courseCode)})</p>
      <p style="margin:0 0 12px;color:#D1D5DB;">${escapeHtml(opts.summary)}</p>
      <p style="margin:16px 0 0;font-size:13px;color:#9CA3AF;">Open Molade to review your ranked priorities.</p>
    `,
  });

  const text = `Hi ${opts.name.split(" ")[0] || opts.name},

${headline}: ${opts.taskTitle} (${opts.courseCode})
${opts.summary}

— Molade`;

  return { subject, html, text };
}
