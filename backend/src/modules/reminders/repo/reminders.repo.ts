import { prisma } from '../../../shared/db/prisma.js';

type Reminder = any;

export const remindersRepo = {
  async findByPatientId(patientId: string, filters?: {
    isActive?: boolean;
    category?: string;
  }): Promise<Reminder[]> {
    const where: any = { patientUserId: patientId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.category) {
      where.category = filters.category.toUpperCase();
    }

    // Exclude archived by default unless explicitly asking for inactive
    if (where.isActive === undefined) {
      where.archivedAt = null;
    }

    return prisma.reminder.findMany({
      where,
      // Redesigned: include relations for linked checklist and visual cue
      include: {
        linkedChecklist: true,
        visualCueAsset: true,
      },
      orderBy: [{ priority: 'desc' }, { scheduledTime: 'asc' }],
    });
  },

  async findById(id: string): Promise<Reminder | null> {
    // Redesigned: include relations for linked checklist and visual cue
    return prisma.reminder.findUnique({ 
      where: { id },
      include: {
        linkedChecklist: true,
        visualCueAsset: true,
      },
    });
  },

  async create(data: {
    patientUserId: string;
    title: string;
    category: string;
    scheduledTime: string;
    repeatRule?: any;
    startDate: Date;
    endDate?: Date;
    daysOfWeek: number[];
    description?: string;
    priority: any; // PriorityLevel enum
    reminderType?: any; // ReminderType enum
    visualCueAssetId?: string;
    linkedChecklistTemplateId?: string;
    snoozeEnabled: boolean;
    defaultSnoozeMinutes: number;
    createdByUserId: string;
    lastEditedByUserId: string;
  }): Promise<Reminder> {
    return prisma.reminder.create({
      data: {
        patientUserId: data.patientUserId,
        title: data.title,
        category: data.category as any,
        scheduledTime: data.scheduledTime,
        repeatRule: data.repeatRule ?? undefined,
        startDate: data.startDate,
        endDate: data.endDate ?? undefined,
        daysOfWeek: data.daysOfWeek,
        description: data.description ?? undefined,
        // Redesigned: priority as enum
        priority: data.priority,
        // Redesigned: reminder type
        reminderType: data.reminderType ?? 'SIMPLE',
        // Redesigned: visual cue
        visualCueAssetId: data.visualCueAssetId ?? undefined,
        linkedChecklistTemplateId: data.linkedChecklistTemplateId ?? undefined,
        snoozeEnabled: data.snoozeEnabled,
        defaultSnoozeMinutes: data.defaultSnoozeMinutes,
        createdByUserId: data.createdByUserId,
        lastEditedByUserId: data.lastEditedByUserId,
      },
    });
  },

  async update(id: string, data: Record<string, any>): Promise<Reminder> {
    return prisma.reminder.update({
      where: { id },
      data,
    });
  },

  async archive(id: string): Promise<Reminder> {
    return prisma.reminder.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    });
  },
};
