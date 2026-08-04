import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { analyticsController } from "./analytics.controller";

const router = Router();
router.use(authMiddleware);
router.get("/summary", asyncHandler(analyticsController.summary));
export default router;
