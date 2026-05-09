import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';
import { 
  toApiReminderCategory, 
  toPrismaReminderCategory,
  toApiPriorityLevel,
  toPrismaPriorityLevel,
  toApiReminderType,
  toPrismaReminderType,
} from '../../../shared/types/roles.js';
import { remindersRepo } from '../repo/reminders.repo.js';
import type { ReminderResponse, LinkedChecklistSummary } from '../types/reminders.types.js';
import type { CreateReminderInput, UpdateReminderInput } from '../validation/reminders.schemas.js';
import { prisma } from '../../../shared/db/prisma.js';

function buildLinkedChecklistSummary(r: any): LinkedChecklistSummary | null {
  if (!r.linkedChecklist) return null;
  const steps = r.linkedChecklist.steps as any[] || [];
  return {
    id: r.linkedChecklist.id,
    title: r.linkedChecklist.title,
    stepCount: steps.length,
    category: r.linkedChecklist.category?.toLowerCase() || 'general',
  };
}

function buildVisualCueSummary(r: any): { assetId: string; url: string; thumbnailUrl?: string } | null {
  if (!r.visualCueAsset) return null;
  return {
    assetId: r.visualCueAsset.id,
    url: r.visualCueAsset.publicUrl || '',
    thumbnailUrl: r.visualCueAsset.thumbnailUrl || undefined,
  };
}

function toReminderResponse(r: any): ReminderResponse {
  return {
    id: r.id,
    patientUserId: r.patientUserId,
    title: r.title,
    category: toApiReminderCategory(r.category),
    scheduledTime: r.scheduledTime,
    repeatRule: r.repeatRule ?? null,
    startDate: r.startDate.toISOString().split('T')[0]!,
    endDate: r.endDate?.toISOString().split('T')[0] ?? null,
    daysOfWeek: r.daysOfWeek,
    description: r.description ?? null,
    // Redesigned: priority as enum
    priority: toApiPriorityLevel(r.priority),
    // Redesigned: reminder type
    reminderType: toApiReminderType(r.reminderType),
    // Redesigned: linked checklist summary
    linkedChecklistTemplateId: r.linkedChecklistTemplateId ?? null,
    linkedChecklist: buildLinkedChecklistSummary(r),
    // Redesigned: visual cue
    visualCueAssetId: r.visualCueAssetId ?? null,
    visualCue: buildVisualCueSummary(r),
    snoozeEnabled: r.snoozeEnabled,
    defaultSnoozeMinutes: r.defaultSnoozeMinutes,
    // Native alarm flag
    nativeAlarmEnabled: r.nativeAlarmEnabled ?? false,
    isActive: r.isActive,
    archivedAt: r.archivedAt?.toISOString() ?? null,
    createdByUserId: r.createdByUserId,
    lastEditedByUserId: r.lastEditedByUserId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const remindersService = {
  async list(patientId: string, filters?: { active?: string; category?: string; pendingOnly?: string }): Promise<ReminderResponse[]> {
    const isActive = filters?.active !== undefined ? filters.active === 'true' : undefined;
    const reminders = await remindersRepo.findByPatientId(patientId, {
      isActive,
      category: filters?.category,
    });

    if (filters?.pendingOnly === 'true') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Redesigned: include all action types including guided reminder actions
      const todayEvents = await prisma.reminderEvent.findMany({
        where: {
          patientUserId: patientId,
          timestamp: { gte: startOfDay, lte: endOfDay },
          // Cast as any until Prisma migration adds new event types
          eventType: { in: ['DONE', 'SKIPPED', 'SNOOZED', 'START_NOW', 'LINKED_CHECKLIST_COMPLETED'] as any }
        },
        select: { reminderId: true }
      });

      const handledReminderIds = new Set(todayEvents.map((e: any) => e.reminderId));

      const pendingReminders = reminders.filter((r: any) => !handledReminderIds.has(r.id));
      return pendingReminders.map(toReminderResponse);
    }

    return reminders.map(toReminderResponse);
  },

  async getById(id: string): Promise<ReminderResponse> {
    const reminder = await remindersRepo.findById(id);
    if (!reminder) {
      throw new AppError('Reminder not found', 404, ErrorCode.REMINDER_NOT_FOUND);
    }
    return toReminderResponse(reminder);
  },

  async create(
    patientId: string,
    input: CreateReminderInput,
    createdByUserId: string,
  ): Promise<ReminderResponse> {
    const reminder = await remindersRepo.create({
      patientUserId: patientId,
      title: input.title,
      category: toPrismaReminderCategory(input.category ?? 'task'),
      scheduledTime: input.scheduledTime,
      repeatRule: input.repeatRule,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      daysOfWeek: input.daysOfWeek ?? [],
      description: input.description,
      // Redesigned: priority as enum
      priority: toPrismaPriorityLevel(input.priority ?? 'normal') as any,
      // Redesigned: reminder type
      reminderType: toPrismaReminderType(input.reminderType ?? 'simple') as any,
      // Redesigned: visual cue
      visualCueAssetId: input.visualCueAssetId,
      linkedChecklistTemplateId: input.linkedChecklistTemplateId,
      snoozeEnabled: input.snoozeEnabled ?? true,
      defaultSnoozeMinutes: input.defaultSnoozeMinutes ?? 10,
      nativeAlarmEnabled: input.nativeAlarmEnabled ?? false,
      createdByUserId,
      lastEditedByUserId: createdByUserId,
    });

    return toReminderResponse(reminder);
  },

  async update(
    id: string,
    input: UpdateReminderInput,
    editedByUserId: string,
  ): Promise<ReminderResponse> {
    const existing = await remindersRepo.findById(id);
    if (!existing) {
      throw new AppError('Reminder not found', 404, ErrorCode.REMINDER_NOT_FOUND);
    }

    if (existing.archivedAt) {
      throw new AppError('Cannot edit an archived reminder', 400, ErrorCode.REMINDER_ARCHIVED);
    }

    const updateData: any = { lastEditedByUserId: editedByUserId };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.category !== undefined) updateData.category = toPrismaReminderCategory(input.category);
    if (input.scheduledTime !== undefined) updateData.scheduledTime = input.scheduledTime;
    if (input.repeatRule !== undefined) updateData.repeatRule = input.repeatRule;
    if (input.startDate !== undefined) updateData.startDate = new Date(input.startDate);
    if (input.endDate !== undefined) updateData.endDate = input.endDate ? new Date(input.endDate) : null;
    if (input.daysOfWeek !== undefined) updateData.daysOfWeek = input.daysOfWeek;
    if (input.description !== undefined) updateData.description = input.description;
    // Redesigned: priority as enum
    if (input.priority !== undefined) updateData.priority = toPrismaPriorityLevel(input.priority) as any;
    // Redesigned: reminder type
    if (input.reminderType !== undefined) updateData.reminderType = toPrismaReminderType(input.reminderType) as any;
    // Redesigned: visual cue
    if (input.visualCueAssetId !== undefined) updateData.visualCueAssetId = input.visualCueAssetId;
    if (input.linkedChecklistTemplateId !== undefined) updateData.linkedChecklistTemplateId = input.linkedChecklistTemplateId;
    if (input.snoozeEnabled !== undefined) updateData.snoozeEnabled = input.snoozeEnabled;
    if (input.defaultSnoozeMinutes !== undefined) updateData.defaultSnoozeMinutes = input.defaultSnoozeMinutes;
    if (input.nativeAlarmEnabled !== undefined) updateData.nativeAlarmEnabled = input.nativeAlarmEnabled;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const updated = await remindersRepo.update(id, updateData);

    return toReminderResponse(updated);
  },

  async archive(id: string): Promise<ReminderResponse> {
    const existing = await remindersRepo.findById(id);
    if (!existing) {
      throw new AppError('Reminder not found', 404, ErrorCode.REMINDER_NOT_FOUND);
    }

    if (existing.archivedAt) {
      throw new AppError('Reminder already archived', 400, ErrorCode.REMINDER_ARCHIVED);
    }

    const archived = await remindersRepo.archive(id);

    return toReminderResponse(archived);
  },
};
