import type { Request, Response } from "express";
import { requireUserId } from "../../middlewares/auth.middleware";
import { successResponse } from "../../responses/success.response";
import { activityService } from "./activity.service";

export class ActivityController {
  list = async (req: Request, res: Response) => {
    const data = await activityService.list(requireUserId(req));
    return successResponse(res, data);
  };
}

export const activityController = new ActivityController();
