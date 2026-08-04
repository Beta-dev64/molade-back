import type { Request, Response } from "express";
import { requireUserId } from "../../middlewares/auth.middleware";
import { successResponse } from "../../responses/success.response";
import { usersService } from "./users.service";

export class UsersController {
  me = async (req: Request, res: Response) => {
    const data = await usersService.me(requireUserId(req));
    return successResponse(res, data);
  };

  updateProfile = async (req: Request, res: Response) => {
    const data = await usersService.updateProfile(requireUserId(req), req.body);
    return successResponse(res, data, "Profile updated");
  };

  updatePassword = async (req: Request, res: Response) => {
    const data = await usersService.updatePassword(
      requireUserId(req),
      req.body.currentPassword,
      req.body.newPassword,
    );
    return successResponse(res, data, "Password updated");
  };

  getPrefs = async (req: Request, res: Response) => {
    const data = await usersService.getPrefs(requireUserId(req));
    return successResponse(res, data);
  };

  updatePrefs = async (req: Request, res: Response) => {
    const data = await usersService.updatePrefs(requireUserId(req), req.body);
    return successResponse(res, data, "Preferences updated");
  };

  exportData = async (req: Request, res: Response) => {
    const data = await usersService.exportData(requireUserId(req));
    return successResponse(res, data);
  };

  deleteAccount = async (req: Request, res: Response) => {
    const data = await usersService.deleteAccount(requireUserId(req));
    return successResponse(res, data, "Account deleted");
  };
}

export const usersController = new UsersController();
