import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';
import { toApiReminderCategory, toPrismaReminderCategory } from '../../../shared/types/roles.js';
import { remindersRepo } from '../repo/reminders.repo.js';
import type { ReminderResponse } from '../types/reminders.types.js';
import type { CreateReminderInput, UpdateReminderInput } from '../validation/reminders.schemas.js';
import { prisma } from '../../../shared/db/prisma.js';

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
    priority: r.priority,
    linkedChecklistTemplateId: r.linkedChecklistTemplateId ?? null,
    snoozeEnabled: r.snoozeEnabled,
    defaultSnoozeMinutes: r.defaultSnoozeMinutes,
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

      const todayEvents = await prisma.reminderEvent.findMany({
        where: {
          patientUserId: patientId,
          timestamp: { gte: startOfDay, lte: endOfDay },
          eventType: { in: ['DONE', 'SKIPPED', 'SNOOZED'] }
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
      priority: input.priority ?? 1,
      linkedChecklistTemplateId: input.linkedChecklistTemplateId,
      snoozeEnabled: input.snoozeEnabled ?? true,
      defaultSnoozeMinutes: input.defaultSnoozeMinutes ?? 10,
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
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.linkedChecklistTemplateId !== undefined) updateData.linkedChecklistTemplateId = input.linkedChecklistTemplateId;
    if (input.snoozeEnabled !== undefined) updateData.snoozeEnabled = input.snoozeEnabled;
    if (input.defaultSnoozeMinutes !== undefined) updateData.defaultSnoozeMinutes = input.defaultSnoozeMinutes;
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
