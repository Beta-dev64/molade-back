import type { Request, Response } from "express";
import { requireUserId } from "../../middlewares/auth.middleware";
import { successResponse } from "../../responses/success.response";
import { prioritiesService } from "./priorities.service";

export class PrioritiesController {
  list = async (req: Request, res: Response) => {
    const data = await prioritiesService.list(requireUserId(req));
    return successResponse(res, data);
  };

  recalculate = async (req: Request, res: Response) => {
    const data = await prioritiesService.recalculate(requireUserId(req));
    return successResponse(res, data, "Priorities recalculated");
  };
}

export const prioritiesController = new PrioritiesController();
