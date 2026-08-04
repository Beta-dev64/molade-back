import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { validate } from "../../middlewares/validate.middleware";
import { authController } from "./auth.controller";
import {
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "./auth.schemas";

const router = Router();

router.post("/register", validate(registerSchema), asyncHandler(authController.register));
router.post("/verify-email", validate(verifyOtpSchema), asyncHandler(authController.verifyEmail));
router.post("/resend-otp", validate(resendOtpSchema), asyncHandler(authController.resendOtp));
router.post("/login", validate(loginSchema), asyncHandler(authController.login));
router.post("/forgot-password", validate(emailOnlySchema), asyncHandler(authController.forgotPassword));
router.post(
  "/verify-reset-otp",
  validate(verifyOtpSchema),
  asyncHandler(authController.verifyResetOtp),
);
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);
router.post("/logout", asyncHandler(authController.logout));

export default router;
