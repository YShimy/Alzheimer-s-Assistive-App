import type { Request, Response } from 'express';
import { remindersService } from '../service/reminders.service.js';

export const remindersController = {
  /**
   * GET /api/patients/:patientId/reminders
   */
  async list(req: Request, res: Response): Promise<void> {
    const patientId = req.params.patientId as string;
    const reminders = await remindersService.list(patientId, {
      active: req.query.active as string | undefined,
      category: req.query.category as string | undefined,
      pendingOnly: req.query.pendingOnly as string | undefined,
    });
    res.status(200).json({ reminders, count: reminders.length });
  },

  /**
   * POST /api/patients/:patientId/reminders
   */
  async create(req: Request, res: Response): Promise<void> {
    const patientId = req.params.patientId as string;
    const reminder = await remindersService.create(
      patientId,
      req.body,
      req.user!.userId,
    );
    res.status(201).json({ reminder });
  },

  /**
   * GET /api/reminders/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const reminder = await remindersService.getById(id);
    res.status(200).json({ reminder });
  },

  /**
   * PATCH /api/reminders/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const reminder = await remindersService.update(
      id,
      req.body,
      req.user!.userId,
    );
    res.status(200).json({ reminder });
  },

  /**
   * PATCH /api/reminders/:id/archive
   */
  async archive(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const reminder = await remindersService.archive(id);
    res.status(200).json({ reminder });
  },
};
