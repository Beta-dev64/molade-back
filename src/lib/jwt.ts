import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { unauthorized } from "./errors";

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

export interface ResetTokenPayload {
  sub: string;
  type: "password_reset";
}

export function signAccessToken(user: { id: string; email: string; name: string }): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw unauthorized("Invalid or expired token");
  }
}

const RESET_EXPIRES_SEC = 15 * 60;

export function signResetToken(userId: string): { token: string; expiresInSeconds: number } {
  const payload: ResetTokenPayload = { sub: userId, type: "password_reset" };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: RESET_EXPIRES_SEC });
  return { token, expiresInSeconds: RESET_EXPIRES_SEC };
}

export function verifyResetToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as ResetTokenPayload;
    if (payload.type !== "password_reset" || !payload.sub) {
      throw unauthorized("Invalid reset token");
    }
    return payload.sub;
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      throw unauthorized("Reset token expired");
    }
    throw unauthorized("Invalid reset token");
  }
}
