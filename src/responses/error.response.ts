import type { Response } from "express";

export interface ErrorBody {
  success: false;
  message: string;
  code: string;
  details?: unknown;
  requestId?: string;
}

export function errorResponse(
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: unknown,
  requestId?: string,
): Response {
  const body: ErrorBody = {
    success: false,
    message,
    code,
  };
  if (details !== undefined) body.details = details;
  if (requestId) body.requestId = requestId;
  return res.status(statusCode).json(body);
}
