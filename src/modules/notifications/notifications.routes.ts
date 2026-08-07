import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { notificationsController } from "./notifications.controller";

const idParamSchema = z.object({ id: z.string().cuid() });
const snoozeSchema = z.object({ hours: z.coerce.number().int().min(1).max(168) });

const router = Router();
router.use(authMiddleware);

router.get("/", asyncHandler(notificationsController.list));
router.post("/ping", asyncHandler(notificationsController.ping));
router.post("/read-all", asyncHandler(notificationsController.markAllRead));
router.post(
  "/:id/read",
  validate(idParamSchema, "params"),
  asyncHandler(notificationsController.markRead),
);
router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(notificationsController.dismiss),
);
router.post(
  "/:id/snooze",
  validate(idParamSchema, "params"),
  validate(snoozeSchema),
  asyncHandler(notificationsController.snooze),
);
router.post(
  "/:id/restore",
  validate(idParamSchema, "params"),
  asyncHandler(notificationsController.restore),
);

export default router;
