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
export const checklistsController = {
  // ─── Templates ────────────────────────────────────────────────────────────

  async listTemplates(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    console.log(`[Checklists] listTemplates - PatientId: ${patientId}, User: ${req.user?.userId}, Role: ${req.user?.role}`);
    // Caregivers can see archived ones in their UI, patients only see active ones.
    const includeArchived = req.user?.role === 'CAREGIVER';
    const templates = await checklistsService.listTemplates(patientId, includeArchived);
    console.log(`[Checklists] listTemplates - Returning ${templates.length} templates`);
    if (templates.length > 0) {
      console.log(`[Checklists] listTemplates - First template:`, JSON.stringify(templates[0]));
    }
    res.json({ templates });
  },

  async createTemplate(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    console.log(`[Checklists] createTemplate - Target PatientId: ${patientId} - Creator: ${req.user!.userId}`);
    const data = createTemplateSchema.parse(req.body);
    const template = await checklistsService.createTemplate(patientId, req.user!.userId, data);
    console.log(`[Checklists] createTemplate - SUCCESS - TemplateId: ${template.id}`);
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
    const patientId = req.params.patientId as string;
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
    const patientId = req.params.patientId as string;
    const runs = await checklistsService.getActiveRuns(patientId);
    res.json({ runs });
  },
};
