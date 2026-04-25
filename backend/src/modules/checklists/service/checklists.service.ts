import { randomUUID } from 'node:crypto';
import { AppError } from '../../../shared/errors/AppError.js';
import { prisma } from '../../../shared/db/prisma.js';
import { z } from 'zod';
import type { createTemplateSchema, updateTemplateSchema, createRunSchema, updateRunSchema } from '../validation/checklists.schemas.js';

type CreateTemplateDto = z.infer<typeof createTemplateSchema>;
type UpdateTemplateDto = z.infer<typeof updateTemplateSchema>;
type CreateRunDto = z.infer<typeof createRunSchema>;
type UpdateRunDto = z.infer<typeof updateRunSchema>;

// Redesigned: Resolve media URLs with device-reachable URLs for Expo Go
async function resolveMediaUrls(steps: any[], forDevice: boolean = true) {
  const assetIds = new Set<string>();
  steps.forEach((s) => {
    if (s.imageAssetId) assetIds.add(s.imageAssetId);
    if (s.videoAssetId) assetIds.add(s.videoAssetId);
  });

  if (assetIds.size === 0) return steps;

  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: Array.from(assetIds) } }
  });

  // publicUrl is always stored with the correct reachable base URL (set at upload time by media.service)
  const assetMap = new Map(assets.map(a => [a.id, a.publicUrl]));

  return steps.map(s => ({
    ...s,
    imageUrl: s.imageAssetId ? assetMap.get(s.imageAssetId) : null,
    videoUrl: s.videoAssetId ? assetMap.get(s.videoAssetId) : null,
  }));
}

async function mapTemplate(t: any) {
  const rawSteps = (t.steps as any[]) || [];
  let steps = rawSteps.map((s: any) => ({
    id: s.stepId ?? s.id ?? s.order?.toString() ?? randomUUID(),
    order: s.order,
    title: s.label ?? s.title,
    description: s.description ?? s.optionalHint ?? null,
    imageAssetId: s.imageAssetId ?? null,
    videoAssetId: s.videoAssetId ?? null,
  }));

  steps = await resolveMediaUrls(steps);

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    steps,
    estimatedMinutes: t.estimatedDurationMinutes,
    isActive: t.isActive,
    archivedAt: t.archivedAt?.toISOString() || null,
    createdByUserId: t.createdByUserId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function mapRun(r: any & { template?: any }) {
  const normalizeSteps = (rawSteps: any[]) =>
    (rawSteps ?? []).map((s: any) => ({
      id: s.stepId ?? s.id ?? s.order?.toString() ?? randomUUID(),
      order: s.order,
      title: s.label ?? s.title,
      description: s.description ?? s.optionalHint ?? null,
      imageAssetId: s.imageAssetId ?? null,
      videoAssetId: s.videoAssetId ?? null,
    }));

  let steps = normalizeSteps(r.template?.steps ?? []);
  steps = await resolveMediaUrls(steps);

  return {
    id: r.id,
    templateId: r.checklistTemplateId,
    patientUserId: r.patientUserId,
    status: r.status.toLowerCase(),
    stepProgress: r.stepResults,
    startedAt: r.startedAt?.toISOString() || r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() || null,
    template: r.template ? {
      id: r.template.id,
      title: r.template.title,
      steps,
    } : undefined,
  };
}

export const checklistsService = {
  async listTemplates(patientUserId: string, includeArchived = false) {
    console.log(`[ChecklistsService] listTemplates - patientUserId: ${patientUserId}, includeArchived: ${includeArchived}`);
    const where: any = { patientUserId };
    if (!includeArchived) {
      where.isActive = true;
    }
    console.log(`[ChecklistsService] listTemplates - query where:`, JSON.stringify(where));
    const templates = await prisma.checklistTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    console.log(`[ChecklistsService] listTemplates - found ${templates.length} templates`);
    templates.forEach(t => {
      console.log(`[ChecklistsService] listTemplates - template: ${t.id}, title: "${t.title}", isActive: ${t.isActive}, patientUserId: ${t.patientUserId}`);
    });
    // mapTemplate is async, need to await all
    const mappedTemplates = await Promise.all(templates.map(mapTemplate));
    console.log(`[ChecklistsService] listTemplates - mapped ${mappedTemplates.length} templates`);
    return mappedTemplates;
  },

  async createTemplate(patientUserId: string, creatorId: string, data: CreateTemplateDto) {
    console.log(`[ChecklistsService] createTemplate - patientUserId: ${patientUserId}, creatorId: ${creatorId}, title: "${data.title}"`);
    const template = await prisma.checklistTemplate.create({
      data: {
        patientUserId,
        title: data.title,
        description: data.description ?? null,
        category: (data.category || 'general').toUpperCase() as any,
        steps: data.steps.map((s, i) => ({
          stepId: randomUUID(),
          title: s.title,
          description: s.description ?? null,
          order: s.order ?? i,
          imageAssetId: s.imageAssetId ?? null,
          videoAssetId: s.videoAssetId ?? null,
        })) as any,
        estimatedDurationMinutes: data.estimatedMinutes ?? null,
        createdByUserId: creatorId,
        lastEditedByUserId: creatorId,
      },
    });
    console.log(`[ChecklistsService] createTemplate - SUCCESS - templateId: ${template.id}, patientUserId: ${template.patientUserId}`);
    return mapTemplate(template);
  },

  async updateTemplate(templateId: string, editorId: string, data: UpdateTemplateDto) {
    const existing = await prisma.checklistTemplate.findUnique({ where: { id: templateId } });
    if (!existing) throw new AppError('Template not found', 404);

    const template = await prisma.checklistTemplate.update({
      where: { id: templateId },
      data: {
        title: data.title,
        description: data.description !== undefined ? data.description : undefined,
        category: data.category?.toUpperCase() as any,
        steps: data.steps ? (data.steps as any) : undefined,
        estimatedDurationMinutes: data.estimatedMinutes,
        lastEditedByUserId: editorId,
      },
    });
    return mapTemplate(template);
  },

  async archiveTemplate(templateId: string, editorId: string) {
    const template = await prisma.checklistTemplate.update({
      where: { id: templateId },
      data: {
        isActive: false,
        archivedAt: new Date(),
        lastEditedByUserId: editorId,
      },
    });
    return mapTemplate(template);
  },

  async startRun(patientUserId: string, actorId: string, actorRole: string, data: CreateRunDto) {
    const template = await prisma.checklistTemplate.findUnique({ where: { id: data.templateId } });
    if (!template) throw new AppError('Template not found', 404);
    if (!template.isActive) throw new AppError('Cannot start an archived template', 400);

    const stepsArray = (template.steps as any[]) || [];
    
    const run = await prisma.checklistRun.create({
      data: {
        template: { connect: { id: template.id } },
        patient: { connect: { id: patientUserId } },
        actor: { connect: { id: actorId } },
        actorRole: actorRole.toLowerCase(),
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        totalStepsCount: stepsArray.length,
        stepResults: [] as any, // initial empty progress
      },
      include: {
        template: {
          select: { id: true, title: true, steps: true }
        }
      }
    });

    return mapRun(run);
  },

  async updateRun(runId: string, data: UpdateRunDto) {
    const run = await prisma.checklistRun.findUnique({ where: { id: runId } });
    if (!run) throw new AppError('Run not found', 404);

    const updateData: any = {};

    if (data.status) {
      updateData.status = data.status.toUpperCase();
      if (updateData.status === 'COMPLETED') {
        updateData.completedAt = new Date();
        if (run.startedAt) {
          updateData.durationSeconds = Math.floor((updateData.completedAt.getTime() - run.startedAt.getTime()) / 1000);
        }
      } else if (updateData.status === 'ABANDONED') {
        updateData.abandonedAt = new Date();
      }
    }

    if (data.stepProgress) {
      updateData.stepResults = data.stepProgress as any;
      updateData.completedStepsCount = data.stepProgress.filter((s: any) => s.completed).length;
    }

    const updated = await prisma.checklistRun.update({
      where: { id: runId },
      data: updateData,
    });

    return mapRun(updated);
  },

  async getActiveRuns(patientUserId: string) {
    const runs = await prisma.checklistRun.findMany({
      where: {
        patientUserId,
        status: { in: ['STARTED', 'IN_PROGRESS'] },
      },
      include: {
        template: {
          select: { id: true, title: true, steps: true }
        }
      },
      orderBy: { startedAt: 'desc' },
    });
    return runs.map(mapRun);
  }
};
