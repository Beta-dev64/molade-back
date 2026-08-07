/**
 * Socket.IO smoke: login → connect with JWT → POST /notifications/ping → receive notification:new
 *
 *   npx tsx scripts/smoke-socket.ts
 */
import { io } from "socket.io-client";

const BASE = process.env.API_URL ?? "http://localhost:4000";

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "a.molade@ulster.ac.uk",
      password: "Password123!",
    }),
  });
  const body = (await res.json()) as {
    success: boolean;
    data?: { token: string };
    message?: string;
  };
  if (!res.ok || !body.data?.token) {
    throw new Error(`login failed: ${body.message ?? res.status}`);
  }
  return body.data.token;
}

async function main() {
  console.log("Socket smoke →", BASE);
  const token = await login();
  console.log("✓ login");

  const received = new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for notification:new")), 12000);

    const socket = io(BASE, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token },
    });

    socket.on("connect", async () => {
      console.log("✓ socket connected", socket.id);
      try {
        const res = await fetch(`${BASE}/api/notifications/ping`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(`ping failed: ${JSON.stringify(body)}`);
        console.log("✓ ping accepted");
      } catch (err) {
        clearTimeout(timer);
        socket.close();
        reject(err);
      }
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(new Error(`connect_error: ${err.message}`));
    });

    socket.on("notification:new", (payload) => {
      clearTimeout(timer);
      console.log("✓ notification:new", (payload as { title?: string }).title);
      socket.close();
      resolve(payload);
    });
  });

  await received;
  console.log("Socket smoke OK");
}

main().catch((err) => {
  console.error("Socket smoke FAILED", err);
  process.exit(1);
});
