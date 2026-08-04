import type { Request, Response } from "express";
import { requireUserId } from "../../middlewares/auth.middleware";
import { successResponse } from "../../responses/success.response";
import { notificationsService } from "./notifications.service";

export class NotificationsController {
  list = async (req: Request, res: Response) => {
    const data = await notificationsService.list(requireUserId(req));
    return successResponse(res, data);
  };

  markRead = async (req: Request, res: Response) => {
    const data = await notificationsService.markRead(requireUserId(req), req.params.id!);
    return successResponse(res, data);
  };

  markAllRead = async (req: Request, res: Response) => {
    const data = await notificationsService.markAllRead(requireUserId(req));
    return successResponse(res, data);
  };

  dismiss = async (req: Request, res: Response) => {
    const data = await notificationsService.dismiss(requireUserId(req), req.params.id!);
    return successResponse(res, data);
  };

  snooze = async (req: Request, res: Response) => {
    const data = await notificationsService.snooze(
      requireUserId(req),
      req.params.id!,
      req.body.hours,
    );
    return successResponse(res, data);
  };

  restore = async (req: Request, res: Response) => {
    const data = await notificationsService.restore(requireUserId(req), req.params.id!);
    return successResponse(res, data);
  };
}

export const notificationsController = new NotificationsController();
