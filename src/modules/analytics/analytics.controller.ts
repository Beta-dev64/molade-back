import type { Request, Response } from "express";
import { requireUserId } from "../../middlewares/auth.middleware";
import { successResponse } from "../../responses/success.response";
import { analyticsService } from "./analytics.service";

export class AnalyticsController {
  summary = async (req: Request, res: Response) => {
    const data = await analyticsService.summary(requireUserId(req));
    return successResponse(res, data);
  };
}

export const analyticsController = new AnalyticsController();
