/**
 * Quick Brevo connectivity + optional test send.
 *
 *   npx tsx scripts/test-brevo.ts
 *   npx tsx scripts/test-brevo.ts you@example.com
 */
import { env, getBrevoSender, isDev } from "../src/config/env";
import { sendMail } from "../src/mail/sendMail";
import { verifyMailer } from "../src/mail/transporter";

async function main() {
  const to = process.argv[2];
  const sender = getBrevoSender();

  console.log("Brevo key present:", Boolean(env.BREVO_API_KEY?.trim()));
  console.log("Sender:", sender);
  console.log("Dev:", isDev);

  const health = await verifyMailer();
  console.log("verifyMailer:", health);

  if (!to) {
    console.log("Pass a recipient email to send a test HTML message.");
    process.exit(health.ok ? 0 : 1);
  }

  await sendMail({
    to,
    subject: "Molade Brevo HTML test",
    html: `<html><body style="font-family:system-ui,sans-serif;padding:24px">
      <h1 style="color:#0F766E">Molade</h1>
      <p>This is a transactional HTML email sent via the Brevo API.</p>
      <p style="color:#6B7280;font-size:13px;">If you received this, mail delivery is working.</p>
    </body></html>`,
    text: "Molade Brevo HTML test — if you received this, mail delivery is working.",
  });

  console.log("Test email accepted by Brevo for", to);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
