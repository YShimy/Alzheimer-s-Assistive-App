import { Request, Response } from 'express';
import { progressService } from '../service/progress.service.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { prisma } from '../../../shared/db/prisma.js';

export class ProgressController {
  getWeeklyProgress = async (req: Request, res: Response) => {
    const patientId = req.params.patientId as string;
    const user = req.user!;
    
    // Auth guard
    if (user.role === 'PATIENT' && user.userId !== patientId) {
      throw AppError.forbidden('Cannot view other patient progress');
    }
    if (user.role === 'CAREGIVER') {
      const link = await prisma.careLink.findFirst({
        where: { caregiverUserId: user.userId, patientUserId: patientId, status: 'ACTIVE' }
      });
      if (!link) {
        throw AppError.forbidden('Not linked to this patient');
      }
    }

    const role = user.role === 'PATIENT' ? 'patient' : 'caregiver';
    const data = await progressService.getWeeklyProgress(patientId, role);
    res.json(data);
  };

  getOverview = async (req: Request, res: Response) => {
    const patientId = req.params.patientId as string;
    const user = req.user!;
    
    // Auth guard
    if (user.role === 'PATIENT' && user.userId !== patientId) {
      throw AppError.forbidden('Cannot view other patient progress');
    }
    if (user.role === 'CAREGIVER') {
      const link = await prisma.careLink.findFirst({
        where: { caregiverUserId: user.userId, patientUserId: patientId, status: 'ACTIVE' }
      });
      if (!link) {
        throw AppError.forbidden('Not linked to this patient');
      }
    }

    const data = await progressService.getProgressOverview(patientId);
    res.json(data);
  };
}

export const progressController = new ProgressController();
