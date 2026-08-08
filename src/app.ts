import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env, getCorsOrigins } from "./config/env";
import { startDeadlineRemindersJob } from "./jobs/deadlineReminders.job";
import { startPurgeUnverifiedJob } from "./jobs/purgeUnverified.job";
import { asyncHandler } from "./lib/asyncHandler";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware";
import { rateLimitMiddleware } from "./middlewares/rateLimit.middleware";
import { requestIdMiddleware } from "./middlewares/requestId.middleware";
import activityRoutes from "./modules/activity/activity.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import authRoutes from "./modules/auth/auth.routes";
import healthRoutes from "./modules/health/health.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import prioritiesRoutes from "./modules/priorities/priorities.routes";
import tasksRoutes from "./modules/tasks/tasks.routes";
import usersRoutes from "./modules/users/users.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  const corsOrigins = getCorsOrigins();
  app.use(
    cors({
      origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  app.use(requestIdMiddleware);
  app.use(asyncHandler(rateLimitMiddleware));

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/priorities", prioritiesRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/activity", activityRoutes);
  app.use("/api/analytics", analyticsRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

export function startBackgroundJobs() {
  startDeadlineRemindersJob();
  startPurgeUnverifiedJob();
}
