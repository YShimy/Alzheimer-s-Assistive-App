import type { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError.js';
import { checklistsService } from '../service/checklists.service.js';
import { carelinksService } from '../../carelinks/service/carelinks.service.js';
import { createTemplateSchema, updateTemplateSchema, createRunSchema, updateRunSchema } from '../validation/checklists.schemas.js';

/**
 * Helper to determine the target patient ID for the checklist request.
 * If PATIENT, it is their own ID.
 * If CAREGIVER, we fetch their active care links and default to the first one.
 * (If the app later supports multiple patients per caregiver natively in the UI, we would read a ?patientId= query param here).
 */
async function getTargetPatientId(req: Request): Promise<string> {
  const user = req.user!;
  if (user.role === 'PATIENT') {
    return user.userId;
  }
  
  if (user.role === 'CAREGIVER') {
    const links = await carelinksService.getMyLinks(user.userId);
    const activeLinks = links.filter((l) => l.status === 'active' && l.patientUserId);
    
    if (activeLinks.length === 0 || !activeLinks[0].patientUserId) {
      throw new AppError('No linked patient found. Please link with a patient first.', 400);
    }
    
    return activeLinks[0].patientUserId; // Default to first available patient for MVP
  }
  
  throw new AppError('Unauthorized role', 403);
}

export const checklistsController = {
  // ─── Templates ────────────────────────────────────────────────────────────

  async listTemplates(req: Request, res: Response) {
    const patientId = await getTargetPatientId(req);
    // Caregivers can see archived ones in their UI, patients only see active ones.
    const includeArchived = req.user?.role === 'CAREGIVER';
    const templates = await checklistsService.listTemplates(patientId, includeArchived);
    res.json({ templates });
  },

  async createTemplate(req: Request, res: Response) {
    const patientId = await getTargetPatientId(req);
    const data = createTemplateSchema.parse(req.body);
    const template = await checklistsService.createTemplate(patientId, req.user!.userId, data);
    res.status(201).json({ template });
  },

  async updateTemplate(req: Request, res: Response) {
    const id = req.params.id as string;
    const data = updateTemplateSchema.parse(req.body);
    const template = await checklistsService.updateTemplate(id, req.user!.userId, data);
    res.json({ template });
  },

  async archiveTemplate(req: Request, res: Response) {
    const id = req.params.id as string;
    const template = await checklistsService.archiveTemplate(id, req.user!.userId);
    res.json({ template });
  },

  // ─── Runs ────────────────────────────────────────────────────────────────

  async startRun(req: Request, res: Response) {
    const patientId = await getTargetPatientId(req);
    const data = createRunSchema.parse(req.body);
    const run = await checklistsService.startRun(patientId, req.user!.userId, req.user!.role, data);
    res.status(201).json({ run });
  },

  async updateRun(req: Request, res: Response) {
    const id = req.params.id as string;
    const data = updateRunSchema.parse(req.body);
    const run = await checklistsService.updateRun(id, data);
    res.json({ run });
  },

  async getActiveRuns(req: Request, res: Response) {
    const patientId = await getTargetPatientId(req);
    const runs = await checklistsService.getActiveRuns(patientId);
    res.json({ runs });
  },
};
