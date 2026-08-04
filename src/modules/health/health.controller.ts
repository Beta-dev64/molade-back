import type { Request, Response } from "express";
import { successResponse } from "../../responses/success.response";
import { healthService } from "./health.service";

export class HealthController {
  get = async (_req: Request, res: Response) => {
    const data = await healthService.check();
    const statusCode = data.status === "ok" ? 200 : 503;
    return successResponse(res, data, data.status === "ok" ? "Healthy" : "Degraded", statusCode);
  };
}

export const healthController = new HealthController();
