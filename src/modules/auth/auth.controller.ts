import type { Request, Response } from "express";
import { createdResponse, successResponse } from "../../responses/success.response";
import { authService } from "./auth.service";

export class AuthController {
  register = async (req: Request, res: Response) => {
    const data = await authService.register(req.body);
    return createdResponse(res, data, "Registration started");
  };

  verifyEmail = async (req: Request, res: Response) => {
    const data = await authService.verifyEmail(req.body.email, req.body.code);
    return successResponse(res, data, "Email verified");
  };

  resendOtp = async (req: Request, res: Response) => {
    const data = await authService.resendOtp(req.body.email, req.body.purpose);
    return successResponse(res, data);
  };

  login = async (req: Request, res: Response) => {
    const data = await authService.login(req.body.email, req.body.password);
    return successResponse(res, data, "Logged in");
  };

  forgotPassword = async (req: Request, res: Response) => {
    const data = await authService.forgotPassword(req.body.email);
    return successResponse(res, data);
  };

  verifyResetOtp = async (req: Request, res: Response) => {
    const data = await authService.verifyResetOtp(req.body.email, req.body.code);
    return successResponse(res, data, "Code verified");
  };

  resetPassword = async (req: Request, res: Response) => {
    const data = await authService.resetPassword(req.body.resetToken, req.body.password);
    return successResponse(res, data, "Password updated");
  };

  logout = async (_req: Request, res: Response) => {
    const data = authService.logout();
    return successResponse(res, data, "Logged out");
  };

  config = async (_req: Request, res: Response) => {
    const data = authService.getConfig();
    return successResponse(res, data);
  };
}

export const authController = new AuthController();
