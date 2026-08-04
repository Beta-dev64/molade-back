import type { Response } from "express";

export interface SuccessBody<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export function successResponse<T>(
  res: Response,
  data: T,
  message = "OK",
  statusCode = 200,
  meta?: Record<string, unknown>,
): Response {
  const body: SuccessBody<T> = {
    success: true,
    message,
    data,
  };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function createdResponse<T>(res: Response, data: T, message = "Created") {
  return successResponse(res, data, message, 201);
}
