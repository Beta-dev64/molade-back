export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(message = "Not found") {
  return new AppError(404, message, "NOT_FOUND");
}

export function badRequest(message: string, details?: unknown) {
  return new AppError(400, message, "BAD_REQUEST", details);
}

export function unauthorized(message = "Unauthorized") {
  return new AppError(401, message, "UNAUTHORIZED");
}

export function forbidden(message = "Forbidden") {
  return new AppError(403, message, "FORBIDDEN");
}

export function conflict(message: string) {
  return new AppError(409, message, "CONFLICT");
}

export function tooManyRequests(message = "Too many requests") {
  return new AppError(429, message, "RATE_LIMITED");
}
