import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { healthController } from "./health.controller";

const router = Router();
router.get("/", asyncHandler(healthController.get));
export default router;
