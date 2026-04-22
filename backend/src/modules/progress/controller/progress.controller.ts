import type { Request, Response } from 'express';
import { progressService } from '../service/progress.service.js';

export const progressController = {
  // GET /api/patients/:patientId/progress/overview
  async getOverview(req: Request, res: Response): Promise<void> {
    const data = await progressService.getOverview(req.params.patientId as string);
    res.status(200).json(data);
  },

  // GET /api/patients/:patientId/progress/streaks
  async getStreaks(req: Request, res: Response): Promise<void> {
    const data = await progressService.getStreaks(req.params.patientId as string);
    res.status(200).json(data);
  },

  // GET /api/patients/:patientId/progress/categories
  async getCategories(req: Request, res: Response): Promise<void> {
    const data = await progressService.getCategories(req.params.patientId as string);
    res.status(200).json(data);
  },

  // GET /api/patients/:patientId/progress/charts
  async getCharts(req: Request, res: Response): Promise<void> {
    const data = await progressService.getCharts(req.params.patientId as string);
    res.status(200).json(data);
  },

  // GET /api/patients/:patientId/progress/checklists
  async getChecklistTracking(req: Request, res: Response): Promise<void> {
    const data = await progressService.getChecklistTracking(req.params.patientId as string);
    res.status(200).json(data);
  },

  // GET /api/patients/:patientId/progress/weekly
  async getWeekly(req: Request, res: Response): Promise<void> {
    const data = await progressService.getWeekly(req.params.patientId as string);
    res.status(200).json(data);
  },

  // GET /api/patients/:patientId/progress/game?gameType=xxx
  async getGameProgress(req: Request, res: Response): Promise<void> {
    const { gameType } = req.query;
    const data = await progressService.getGameProgress(req.params.patientId as string, gameType as string);
    res.status(200).json(data);
  },

  // GET /api/patients/:patientId/progress/priority-breakdown?days=7
  async getPriorityBreakdown(req: Request, res: Response): Promise<void> {
    const rawDays = parseInt((req.query.days as string) || '7', 10);
    // Clamp to 1–30 days
    const days = Math.min(30, Math.max(1, isNaN(rawDays) ? 7 : rawDays));
    const data = await progressService.getPriorityBreakdown(
      req.params.patientId as string,
      days,
    );
    res.status(200).json(data);
  },
};
