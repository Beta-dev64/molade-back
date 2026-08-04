import { OtpPurpose } from "@prisma/client";
import { isDev } from "../../config/env";
import { prisma } from "../../db/prisma";
import { badRequest, tooManyRequests } from "../../lib/errors";
import { generateOtp, hashOtp, OTP_MAX_ATTEMPTS, OTP_TTL_MS } from "../../lib/otp";
import { getRedis } from "../../redis/client";

const RESEND_COOLDOWN_SEC = 60;

export class OtpService {
  async issue(userId: string, purpose: OtpPurpose): Promise<string> {
    const cooldownKey = `otp:cooldown:${userId}:${purpose}`;
    const redis = getRedis();
    if (redis.status !== "ready") await redis.connect();

    const cooling = await redis.get(cooldownKey);
    if (cooling) throw tooManyRequests("Please wait before requesting another code");

    await prisma.otp.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const { display, hash } = generateOtp();
    await prisma.otp.create({
      data: {
        userId,
        purpose,
        codeHash: hash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await redis.set(cooldownKey, "1", "EX", RESEND_COOLDOWN_SEC);

    if (isDev) {
      console.log(`[otp:dev] ${purpose} for user ${userId}: ${display}`);
    }

    return display;
  }

  async verify(email: string, code: string, purpose: OtpPurpose) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw badRequest("Invalid verification code");

    const otp = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) throw badRequest("Invalid or expired verification code");

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw badRequest("Too many attempts — request a new code");
    }

    const match = otp.codeHash === hashOtp(code);
    if (!match) {
      await prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw badRequest("Invalid verification code");
    }

    await prisma.otp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    return user;
  }
}

export const otpService = new OtpService();
