import type { Request, Response } from 'express';
import { usersService } from '../service/users.service.js';

export const usersController = {
  /**
   * GET /api/users/me
   */
  async getMe(req: Request, res: Response): Promise<void> {
    const profile = await usersService.getProfile(req.user!.userId);
    res.status(200).json({ user: profile });
  },

  /**
   * PATCH /api/users/me
   */
  async updateMe(req: Request, res: Response): Promise<void> {
    const profile = await usersService.updateProfile(req.user!.userId, req.body);
    res.status(200).json({ user: profile });
  },
};
