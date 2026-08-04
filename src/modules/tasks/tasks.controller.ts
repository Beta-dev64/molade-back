import type { Request, Response } from "express";
import { requireUserId } from "../../middlewares/auth.middleware";
import { createdResponse, successResponse } from "../../responses/success.response";
import { tasksService } from "./tasks.service";

export class TasksController {
  list = async (req: Request, res: Response) => {
    const data = await tasksService.list(requireUserId(req));
    return successResponse(res, data);
  };

  get = async (req: Request, res: Response) => {
    const data = await tasksService.getById(requireUserId(req), req.params.id!);
    return successResponse(res, data);
  };

  create = async (req: Request, res: Response) => {
    const data = await tasksService.create(requireUserId(req), req.body);
    return createdResponse(res, data, "Task created");
  };

  update = async (req: Request, res: Response) => {
    const data = await tasksService.update(requireUserId(req), req.params.id!, req.body);
    return successResponse(res, data, "Task updated");
  };

  toggleComplete = async (req: Request, res: Response) => {
    const data = await tasksService.toggleComplete(requireUserId(req), req.params.id!);
    return successResponse(res, data);
  };

  remove = async (req: Request, res: Response) => {
    const data = await tasksService.delete(requireUserId(req), req.params.id!);
    return successResponse(res, data, "Task deleted");
  };

  snooze = async (req: Request, res: Response) => {
    const data = await tasksService.snooze(requireUserId(req), req.params.id!, req.body.hours);
    return successResponse(res, data);
  };

  unsnooze = async (req: Request, res: Response) => {
    const data = await tasksService.unsnooze(requireUserId(req), req.params.id!);
    return successResponse(res, data);
  };
}

export const tasksController = new TasksController();
