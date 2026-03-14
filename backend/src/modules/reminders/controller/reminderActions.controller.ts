import type { Request, Response } from 'express';
import { reminderActionsService } from '../service/reminderActions.service.js';
import { toApiRole } from '../../../shared/types/roles.js';

export const reminderActionsController = {
  /**
   * POST /api/reminders/:id/actions
   */
  async recordAction(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const event = await reminderActionsService.recordAction(
      id,
      req.body,
      req.user!.userId,
      toApiRole(req.user!.role),
    );
    res.status(201).json({ event });
  },
};
