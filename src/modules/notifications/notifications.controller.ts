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

  /** Creates a live Socket.IO system notification for the signed-in user (demo / QA). */
  ping = async (req: Request, res: Response) => {
    const data = await notificationsService.createSystem(
      requireUserId(req),
      "Molade live notification",
      "Socket.IO is connected — you received this in real time.",
    );
    return successResponse(res, data, "Notification pushed", 201);
  };
}

export const notificationsController = new NotificationsController();
