import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env";
import { verifyAccessToken } from "../lib/jwt";
import type { serializeNotification } from "../lib/serialize";

export type SerializedNotification = ReturnType<typeof serializeNotification>;

export const SOCKET_EVENTS = {
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_UPDATED: "notification:updated",
  NOTIFICATION_REMOVED: "notification:removed",
  NOTIFICATIONS_SYNC: "notifications:sync",
} as const;

let io: Server | null = null;

function userRoom(userId: string) {
  return `user:${userId}`;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    try {
      const raw =
        (socket.handshake.auth?.token as string | undefined) ||
        (typeof socket.handshake.headers.authorization === "string"
          ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
          : undefined);

      if (!raw) {
        next(new Error("UNAUTHORIZED"));
        return;
      }

      const payload = verifyAccessToken(raw);
      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    void socket.join(userRoom(userId));

    if (env.NODE_ENV === "development") {
      console.log(`[socket] connected user=${userId} id=${socket.id}`);
    }

    socket.on("disconnect", (reason) => {
      if (env.NODE_ENV === "development") {
        console.log(`[socket] disconnected user=${userId} reason=${reason}`);
      }
    });
  });

  console.log("[socket] Socket.IO attached");
  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(userRoom(userId)).emit(event, payload);
}

export function emitNotificationNew(userId: string, notification: SerializedNotification) {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, notification);
}

export function emitNotificationUpdated(userId: string, notification: SerializedNotification) {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_UPDATED, notification);
}

export function emitNotificationRemoved(userId: string, id: string) {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_REMOVED, { id });
}

export function emitNotificationsSync(userId: string) {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATIONS_SYNC, { at: new Date().toISOString() });
}
