import type { Request, Response } from 'express';
import { importantInfoService } from '../service/important-info.service.js';

export const importantInfoController = {
  // GET /api/patients/:patientId/important-info  (caregiver)
  async getForCaregiver(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const info = await importantInfoService.getForCaregiver(patientId);
    res.json({ info: info ?? null });
  },

  // PUT/PATCH /api/patients/:patientId/important-info  (caregiver)
  async upsert(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const caregiverId = req.user!.userId;
    const info = await importantInfoService.upsert(patientId, caregiverId, req.body);
    res.json({ info });
  },

  // POST /api/patients/:patientId/important-info/review  (caregiver)
  async markReviewed(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const caregiverId = req.user!.userId;
    const info = await importantInfoService.markReviewed(patientId, caregiverId);
    res.json({ info });
  },

  // GET /api/me/important-info  (patient only)
  async getForPatient(req: Request, res: Response) {
    const patientId = req.user!.userId;
    const info = await importantInfoService.getForPatient(patientId);
    res.json({ info: info ?? null });
  },
};
