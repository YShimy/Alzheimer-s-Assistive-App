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

  /**
   * GET /api/patients/:patientId/reminders/escalations
   *
   * Returns recent escalation events for a patient — used by caregiver dashboard.
   * Ordered by most recent first.
   * Accepts optional ?limit=N (default 20, max 50)
   */
  async getEscalations(req: Request, res: Response): Promise<void> {
    const patientId = req.params.patientId as string;
    const rawLimit = parseInt((req.query.limit as string) || '20', 10);
    const limit = Math.min(50, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
    const events = await reminderActionsService.getPendingEscalations(patientId, limit);
    res.status(200).json({ escalations: events, count: events.length });
  },
};

