import { OtpPurpose } from "@prisma/client";
import { prisma } from "../../db/prisma";
import {
  AppError,
  badRequest,
  conflict,
  unauthorized,
} from "../../lib/errors";
import { signAccessToken, signResetToken, verifyResetToken } from "../../lib/jwt";
import { hashPassword, verifyPassword } from "../../lib/password";
import { serializeUser } from "../../lib/serialize";
import { sendMail } from "../../mail/sendMail";
import { passwordResetTemplate } from "../../mail/templates/passwordReset";
import { verifyEmailTemplate } from "../../mail/templates/verifyEmail";
import { isAuthVerificationLax } from "../../config/env";
import { otpService } from "./otp.service";

const OTP_EXPIRES_MIN = 10;

export class AuthService {
  async register(input: { name: string; email: string; password: string }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw conflict("An account with this email already exists");

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        prefs: { create: {} },
      },
    });

    const otpDisplay = await otpService.issue(user.id, OtpPurpose.EMAIL_VERIFY);
    await sendMail({
      to: user.email,
      ...verifyEmailTemplate({
        name: user.name,
        otpDisplay,
        expiresMinutes: OTP_EXPIRES_MIN,
      }),
    });

    return {
      requiresVerification: true as const,
      verificationSkippable: isAuthVerificationLax(),
      email: user.email,
      message: "Check your email for a verification code",
    };
  }

  async verifyEmail(email: string, code: string) {
    const user = await otpService.verify(email, code, OtpPurpose.EMAIL_VERIFY);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    const token = signAccessToken(updated);
    return { token, user: serializeUser(updated) };
  }

  async resendOtp(email: string, purpose: "EMAIL_VERIFY" | "PASSWORD_RESET") {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { ok: true as const };

    const otpPurpose =
      purpose === "EMAIL_VERIFY" ? OtpPurpose.EMAIL_VERIFY : OtpPurpose.PASSWORD_RESET;

    if (otpPurpose === OtpPurpose.EMAIL_VERIFY && user.emailVerifiedAt) {
      throw badRequest("Email is already verified");
    }

    const otpDisplay = await otpService.issue(user.id, otpPurpose);
    const mail =
      otpPurpose === OtpPurpose.EMAIL_VERIFY
        ? verifyEmailTemplate({ name: user.name, otpDisplay, expiresMinutes: OTP_EXPIRES_MIN })
        : passwordResetTemplate({ name: user.name, otpDisplay, expiresMinutes: OTP_EXPIRES_MIN });

    await sendMail({ to: user.email, ...mail });
    return { ok: true as const };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw unauthorized("Invalid email or password");
    }

    if (!user.emailVerifiedAt && !isAuthVerificationLax()) {
      throw new AppError(
        403,
        "Please verify your email before logging in.",
        "EMAIL_NOT_VERIFIED",
      );
    }

    const token = signAccessToken(user);
    return { token, user: serializeUser(user) };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && (user.emailVerifiedAt || isAuthVerificationLax())) {
      const otpDisplay = await otpService.issue(user.id, OtpPurpose.PASSWORD_RESET);
      await sendMail({
        to: user.email,
        ...passwordResetTemplate({
          name: user.name,
          otpDisplay,
          expiresMinutes: OTP_EXPIRES_MIN,
        }),
      });
    }
    return { ok: true as const };
  }

  async verifyResetOtp(email: string, code: string) {
    const user = await otpService.verify(email, code, OtpPurpose.PASSWORD_RESET);
    const { token, expiresInSeconds } = signResetToken(user.id);
    return { resetToken: token, expiresInSeconds };
  }

  async resetPassword(resetToken: string, password: string) {
    const userId = verifyResetToken(resetToken);
    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { ok: true as const };
  }

  logout() {
    return { ok: true as const };
  }

  getConfig() {
    return {
      verificationMode: isAuthVerificationLax() ? ("lax" as const) : ("" as const),
      verificationSkippable: isAuthVerificationLax(),
    };
  }
}

export const authService = new AuthService();
