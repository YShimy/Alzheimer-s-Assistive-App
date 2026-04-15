import type { Request, Response } from 'express';
import { progressService } from '../service/progress.service.js';

export const progressController = {
  // GET /api/patients/:patientId/progress/overview
  async getOverview(req: Request, res: Response): Promise<void> {
    const data = await progressService.getOverview(req.params.patientId);
    res.status(200).json(data);
  },

  // GET /api/patients/:patientId/progress/streaks
  async getStreaks(req: Request, res: Response): Promise<void> {
    const data = await progressService.getStreaks(req.params.patientId);
    res.status(200).json(data);
  },

  // GET /api/patients/:patientId/progress/categories
  async getCategories(req: Request, res: Response): Promise<void> {
    const data = await progressService.getCategories(req.params.patientId);
    res.status(200).json(data);
  },

  // GET /api/patients/:patientId/progress/charts
  async getCharts(req: Request, res: Response): Promise<void> {
    const data = await progressService.getCharts(req.params.patientId);
    res.status(200).json(data);
  }
};
