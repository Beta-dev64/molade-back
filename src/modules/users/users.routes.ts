import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { usersController } from "./users.controller";
import {
  updatePasswordSchema,
  updatePrefsSchema,
  updateProfileSchema,
} from "./users.schemas";

const router = Router();

router.use(authMiddleware);

router.get("/me", asyncHandler(usersController.me));
router.patch("/me", validate(updateProfileSchema), asyncHandler(usersController.updateProfile));
router.post(
  "/me/password",
  validate(updatePasswordSchema),
  asyncHandler(usersController.updatePassword),
);
router.get("/me/prefs", asyncHandler(usersController.getPrefs));
router.patch(
  "/me/prefs",
  validate(updatePrefsSchema),
  asyncHandler(usersController.updatePrefs),
);
router.get("/me/export", asyncHandler(usersController.exportData));
router.delete("/me", asyncHandler(usersController.deleteAccount));

export default router;
