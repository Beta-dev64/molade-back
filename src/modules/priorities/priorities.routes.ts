import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { prioritiesController } from "./priorities.controller";

const router = Router();
router.use(authMiddleware);
router.get("/", asyncHandler(prioritiesController.list));
router.post("/recalculate", asyncHandler(prioritiesController.recalculate));
export default router;
