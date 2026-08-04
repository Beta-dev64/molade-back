import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { isProd } from "../config/env";
import { errorResponse } from "../responses/error.response";

export function notFoundMiddleware(req: Request, res: Response) {
  return errorResponse(
    res,
    404,
    `Route ${req.method} ${req.path} not found`,
    "NOT_FOUND",
    undefined,
    req.requestId,
  );
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (res.headersSent) return;

  if (err instanceof AppError) {
    return errorResponse(
      res,
      err.statusCode,
      err.message,
      err.code,
      err.details,
      req.requestId,
    );
  }

  if (err instanceof ZodError) {
    return errorResponse(
      res,
      400,
      "Validation failed",
      "VALIDATION_ERROR",
      err.flatten(),
      req.requestId,
    );
  }

  console.error("[unhandled]", req.requestId, err);

  return errorResponse(
    res,
    500,
    isProd ? "An unexpected error occurred" : err instanceof Error ? err.message : "Unknown error",
    "INTERNAL_ERROR",
    undefined,
    req.requestId,
  );
}
