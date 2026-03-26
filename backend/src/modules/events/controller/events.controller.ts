import type { Request, Response } from 'express';
import { eventsService } from '../service/events.service.js';

export const eventsController = {
  async batchEvents(req: Request, res: Response) {
    const userId = req.user!.userId;
    const result = await eventsService.saveBatch(userId, req.body);
    res.json({ accepted: result.accepted });
  },

  async reportClientError(req: Request, res: Response) {
    const userId = req.user!.userId;
    await eventsService.saveClientError(userId, req.body);
    res.json({ accepted: true });
  }
};
