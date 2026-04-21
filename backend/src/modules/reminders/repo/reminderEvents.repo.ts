import { prisma } from '../../../shared/db/prisma.js';

type ReminderEvent = any;

export const reminderEventsRepo = {
  async create(data: {
    reminderId: string;
    patientUserId: string;
    eventType: string;
    scheduledFor?: Date;
    actorUserId: string;
    actorRole: string;
    source: string;
    actionValue?: any;
    optionalReasonCode?: string;
    // Redesigned: escalation fields
    escalationTriggered?: boolean;
    escalationReason?: string | null;
    linkedChecklistRunId?: string;
  }): Promise<ReminderEvent> {
    return prisma.reminderEvent.create({
      data: {
        reminderId: data.reminderId,
        patientUserId: data.patientUserId,
        eventType: data.eventType as any,
        scheduledFor: data.scheduledFor ?? undefined,
        actorUserId: data.actorUserId,
        actorRole: data.actorRole,
        source: data.source,
        actionValue: data.actionValue ?? undefined,
        optionalReasonCode: data.optionalReasonCode ?? undefined,
        // Redesigned: escalation fields (cast as any until migration runs)
        escalationTriggered: data.escalationTriggered as any,
        escalationReason: data.escalationReason as any,
        linkedChecklistRunId: data.linkedChecklistRunId as any,
      } as any,
    });
  },

  async findByReminderId(reminderId: string): Promise<ReminderEvent[]> {
    return prisma.reminderEvent.findMany({
      where: { reminderId },
      orderBy: { timestamp: 'desc' },
    });
  },

  async findByPatientId(patientUserId: string, limit = 50): Promise<ReminderEvent[]> {
    return prisma.reminderEvent.findMany({
      where: { patientUserId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  },
};
