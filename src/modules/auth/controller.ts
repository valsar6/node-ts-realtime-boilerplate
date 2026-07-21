import { Request, Response } from 'express';
import { authService } from './service';
import { loginSchema, refreshSchema, registerSchema } from './schemas';
import { asyncHandler } from '../../shared/middleware/asyncHandler';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const input = refreshSchema.parse(req.body);
    const tokens = await authService.refresh(input.refreshToken);
    res.status(200).json(tokens);
  }),
};
