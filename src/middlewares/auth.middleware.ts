import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { unauthorized, forbidden, AppError } from "../lib/errors";
import { verifyAccessToken } from "../lib/jwt";

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const cookie = req.cookies?.molade_token as string | undefined;
  return cookie || null;
}

/** Require a valid JWT and a still-existing, verified user. */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearer(req);
    if (!token) throw unauthorized();

    const payload = verifyAccessToken(token);

    // Re-check DB so revoked / deleted / unverified users cannot use stale tokens
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });

    if (!user) throw unauthorized("Account no longer exists");
    if (!user.emailVerifiedAt) {
      throw new AppError(403, "Please verify your email before continuing.", "EMAIL_NOT_VERIFIED");
    }

    // Bind identity from DB — never trust client-supplied userId
    req.user = { sub: user.id, email: user.email, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
}

/** Convenience: typed current user id after authMiddleware. */
export function requireUserId(req: Request): string {
  if (!req.user?.sub) throw forbidden();
  return req.user.sub;
}
