import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { activityController } from "./activity.controller";

const router = Router();
router.use(authMiddleware);
router.get("/", asyncHandler(activityController.list));
export default router;
