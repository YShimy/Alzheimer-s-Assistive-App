import type { Request, Response } from 'express';
import { summaryExportService } from '../service/summary-export.service.js';

export const summaryExportController = {
  async createExport(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const caregiverId = req.user!.userId;
    const result = await summaryExportService.createExport(patientId, caregiverId, req.body);
    res.status(201).json(result);
  },

  async listExports(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const exports = await summaryExportService.listExports(patientId);
    res.json({ exports });
  },

  async getExport(req: Request, res: Response) {
    const { patientId, exportId } = req.params as { patientId: string; exportId: string };
    const record = await summaryExportService.getExport(patientId, exportId);
    res.json({ export: record });
  },

  async getDownloadUrl(req: Request, res: Response) {
    const { patientId, exportId } = req.params as { patientId: string; exportId: string };
    const caregiverId = req.user!.userId;
    const result = await summaryExportService.getDownloadUrl(patientId, exportId, caregiverId);
    res.json(result);
  },

  async archiveExport(req: Request, res: Response) {
    const { patientId, exportId } = req.params as { patientId: string; exportId: string };
    const caregiverId = req.user!.userId;
    const record = await summaryExportService.archiveExport(patientId, exportId, caregiverId);
    res.json({ export: record });
  },
};
