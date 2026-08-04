import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { tasksController } from "./tasks.controller";
import { createTaskSchema, idParamSchema, snoozeSchema, updateTaskSchema } from "./tasks.schemas";

const router = Router();
router.use(authMiddleware);

router.get("/", asyncHandler(tasksController.list));
router.post("/", validate(createTaskSchema), asyncHandler(tasksController.create));
router.get("/:id", validate(idParamSchema, "params"), asyncHandler(tasksController.get));
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateTaskSchema),
  asyncHandler(tasksController.update),
);
router.post(
  "/:id/toggle-complete",
  validate(idParamSchema, "params"),
  asyncHandler(tasksController.toggleComplete),
);
router.post(
  "/:id/snooze",
  validate(idParamSchema, "params"),
  validate(snoozeSchema),
  asyncHandler(tasksController.snooze),
);
router.post(
  "/:id/unsnooze",
  validate(idParamSchema, "params"),
  asyncHandler(tasksController.unsnooze),
);
router.delete("/:id", validate(idParamSchema, "params"), asyncHandler(tasksController.remove));

export default router;
