import { createHash, randomBytes } from "node:crypto";

const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Normalize user input: strip dashes/spaces, uppercase. */
export function normalizeOtp(code: string): string {
  return code.replace(/[-\s]/g, "").toUpperCase();
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(normalizeOtp(code)).digest("hex");
}

function randomSegment(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHANUM[bytes[i]! % ALPHANUM.length];
  }
  return out;
}

/** Generate OTP in XXX-XXX display format (10 min lifetime enforced by caller). */
export function generateOtp(): { display: string; hash: string } {
  const display = `${randomSegment(3)}-${randomSegment(3)}`;
  return { display, hash: hashOtp(display) };
}

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
