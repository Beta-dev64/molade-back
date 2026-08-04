/**
 * End-to-end smoke test against a running API (default http://localhost:4000).
 * Usage: npx tsx scripts/smoke-e2e.ts
 */
import { PrismaClient, OtpPurpose } from "@prisma/client";
import { createHash } from "node:crypto";

const BASE = process.env.API_URL ?? "http://localhost:4000";
const prisma = new PrismaClient();

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json()) as Record<string, unknown>;
  return { res, body };
}

function hashOtp(code: string) {
  return createHash("sha256").update(code.replace(/[-\s]/g, "").toUpperCase()).digest("hex");
}

/** Dev helper: inject a known OTP into DB for automated verify. */
async function plantOtp(email: string, purpose: OtpPurpose, display: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.otp.updateMany({
    where: { userId: user.id, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.otp.create({
    data: {
      userId: user.id,
      purpose,
      codeHash: hashOtp(display),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
}

async function main() {
  console.log("Smoke E2E →", BASE);

  // 1. Health
  {
    const { res, body } = await req("/api/health");
    assert(res.ok || res.status === 503, `health status ${res.status}`);
    assert(body.success === true, "health success");
    console.log("✓ health", (body.data as { status: string }).status);
  }

  // 2. Login seeded user
  let token = "";
  {
    const { res, body } = await req("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "a.molade@ulster.ac.uk",
        password: "Password123!",
      }),
    });
    assert(res.ok, `login failed: ${JSON.stringify(body)}`);
    token = (body.data as { token: string }).token;
    assert(token, "missing token");
    console.log("✓ login seeded user");
  }

  const auth = { Authorization: `Bearer ${token}` };

  // 3. List tasks (user-scoped)
  {
    const { res, body } = await req("/api/tasks", { headers: auth });
    assert(res.ok, `tasks list failed: ${JSON.stringify(body)}`);
    const tasks = body.data as unknown[];
    assert(Array.isArray(tasks) && tasks.length >= 1, "expected seeded tasks");
    console.log("✓ tasks list", tasks.length);
  }

  // 4. Create task
  let taskId = "";
  {
    const { res, body } = await req("/api/tasks", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        title: "Smoke Test Task",
        description: "Created by smoke-e2e",
        course: "QA",
        courseCode: "SMOKE",
        deadline: new Date(Date.now() + 36e5 * 20).toISOString(),
        effort: "S",
        status: "not_started",
        personalPreference: "normal",
      }),
    });
    assert(res.status === 201, `create task failed: ${JSON.stringify(body)}`);
    taskId = (body.data as { id: string }).id;
    console.log("✓ create task", taskId);
  }

  // 5. Priorities
  {
    const { res, body } = await req("/api/priorities", { headers: auth });
    assert(res.ok, `priorities failed: ${JSON.stringify(body)}`);
    const ranked = body.data as unknown[];
    assert(Array.isArray(ranked) && ranked.length >= 1, "expected ranked tasks");
    console.log("✓ priorities", ranked.length);
  }

  // 6. Register + verify email with planted OTP
  const email = `smoke.${Date.now()}@ulster.ac.uk`;
  {
    const { res, body } = await req("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Smoke Tester",
        email,
        password: "Password123!",
      }),
    });
    assert(res.status === 201, `register failed: ${JSON.stringify(body)}`);
    console.log("✓ register", email);
  }

  const otp = "AB1-C2D";
  await plantOtp(email, OtpPurpose.EMAIL_VERIFY, otp);

  let newToken = "";
  {
    const { res, body } = await req("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code: otp }),
    });
    assert(res.ok, `verify-email failed: ${JSON.stringify(body)}`);
    newToken = (body.data as { token: string }).token;
    assert(newToken, "missing verify token");
    console.log("✓ verify-email");
  }

  // 7. Isolation: new user must not see Adeola's tasks
  {
    const { res, body } = await req("/api/tasks", {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    assert(res.ok, `isolation list failed: ${JSON.stringify(body)}`);
    const tasks = body.data as unknown[];
    assert(Array.isArray(tasks) && tasks.length === 0, "new user should have 0 tasks");
    console.log("✓ user isolation (empty task list)");
  }

  // 8. New user cannot read Adeola's task by id
  {
    const { res, body } = await req(`/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    assert(res.status === 404, `expected 404 for foreign task, got ${res.status}`);
    assert(body.success === false, "expected error envelope");
    console.log("✓ IDOR blocked on foreign task id");
  }

  // 9. Forgot password + reset
  const resetOtp = "XY9-Z8W";
  {
    const { res, body } = await req("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    assert(res.ok, `forgot-password failed: ${JSON.stringify(body)}`);
    await plantOtp(email, OtpPurpose.PASSWORD_RESET, resetOtp);

    const verify = await req("/api/auth/verify-reset-otp", {
      method: "POST",
      body: JSON.stringify({ email, code: resetOtp }),
    });
    assert(verify.res.ok, `verify-reset-otp failed: ${JSON.stringify(verify.body)}`);
    const resetToken = (verify.body.data as { resetToken: string }).resetToken;

    const reset = await req("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ resetToken, password: "NewPassword123!" }),
    });
    assert(reset.res.ok, `reset-password failed: ${JSON.stringify(reset.body)}`);
    console.log("✓ forgot/reset password");
  }

  // cleanup smoke user
  await prisma.user.deleteMany({ where: { email } });
  await prisma.task.deleteMany({ where: { id: taskId, title: "Smoke Test Task" } });

  console.log("\nAll smoke checks passed.");
}

main()
  .catch((err) => {
    console.error("\nSMOKE FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
