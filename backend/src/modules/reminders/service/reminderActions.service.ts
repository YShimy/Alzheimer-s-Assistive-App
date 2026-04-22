import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';
import { actionToEventType, toApiPriorityLevel } from '../../../shared/types/roles.js';
import { remindersRepo } from '../repo/reminders.repo.js';
import { reminderEventsRepo } from '../repo/reminderEvents.repo.js';
import { prisma } from '../../../shared/db/prisma.js';
import { notificationsService } from '../../../modules/notifications/service/notifications.service.js';
import type { ReminderEventResponse } from '../types/reminders.types.js';
import type { ReminderActionInput } from '../validation/reminderActions.schemas.js';

function toEventResponse(e: any): ReminderEventResponse {
  return {
    id: e.id,
    reminderId: e.reminderId,
    patientUserId: e.patientUserId,
    eventType: e.eventType.toLowerCase(),
    scheduledFor: e.scheduledFor?.toISOString() ?? null,
    timestamp: e.timestamp.toISOString(),
    actorUserId: e.actorUserId,
    actorRole: e.actorRole,
    source: e.source,
    actionValue: e.actionValue ?? null,
    optionalReasonCode: e.optionalReasonCode ?? null,
    // Redesigned: escalation fields
    escalationTriggered: e.escalationTriggered ?? false,
    escalationReason: e.escalationReason ?? null,
    linkedChecklistRunId: e.linkedChecklistRunId ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

// Redesigned: escalation detection for high/critical priority reminders
async function detectEscalationNeed(
  reminder: any,
  action: string,
  patientId: string,
): Promise<{ escalationTriggered: boolean; escalationReason: string | null }> {
  const priority = toApiPriorityLevel(reminder.priority);
  
  // High priority skip = immediate escalation
  if (action === 'skip' && priority === 'high') {
    return { escalationTriggered: true, escalationReason: 'high_priority_skipped' };
  }
  
  // Critical priority skip = immediate escalation
  if (action === 'skip' && priority === 'critical') {
    return { escalationTriggered: true, escalationReason: 'critical_skipped' };
  }
  
  // Detect repeated skips (3+ skips in last 24 hours for any reminder)
  if (action === 'skip') {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const recentSkips = await prisma.reminderEvent.count({
      where: {
        patientUserId: patientId,
        eventType: 'SKIPPED' as any,
        timestamp: { gte: oneDayAgo },
      },
    });
    
    if (recentSkips >= 3) {
      return { escalationTriggered: true, escalationReason: 'repeated_skip_pattern' };
    }
  }
  
  // Guided reminder not started (start_now not recorded within 30 min of scheduled time)
  const scheduledTime = new Date();
  const thirtyMinutesAgo = new Date(scheduledTime.getTime() - 30 * 60 * 1000);
  
  if (reminder.reminderType === 'GUIDED' && action === 'skip') {
    const recentStart = await prisma.reminderEvent.findFirst({
      where: {
        reminderId: reminder.id,
        eventType: 'START_NOW' as any,
        timestamp: { gte: thirtyMinutesAgo },
      },
    });
    
    if (!recentStart) {
      return { escalationTriggered: true, escalationReason: 'guided_not_started' };
    }
  }
  
  return { escalationTriggered: false, escalationReason: null };
}

// Redesigned: validate action is allowed for reminder type
function validateActionForReminderType(action: string, reminderType: string): void {
  const simpleActions = ['done', 'snooze', 'skip'];
  const guidedActions = ['start_now', 'snooze', 'skip'];
  
  const upperType = reminderType.toUpperCase();
  
  if (upperType === 'SIMPLE' && !simpleActions.includes(action)) {
    throw new AppError(
      `Action '${action}' not allowed for simple reminders. Use: ${simpleActions.join(', ')}`,
      400,
      ErrorCode.REMINDER_INVALID_ACTION
    );
  }
  
  if (upperType === 'GUIDED' && !guidedActions.includes(action)) {
    throw new AppError(
      `Action '${action}' not allowed for guided reminders. Use: ${guidedActions.join(', ')}`,
      400,
      ErrorCode.REMINDER_INVALID_ACTION
    );
  }
}

export const reminderActionsService = {
  /**
   * Records a reminder action (done/snooze/skip for simple, start_now/snooze/skip for guided).
   * Maps the public action name to the internal event type.
   * Redesigned: includes escalation detection and type validation.
   */
  async recordAction(
    reminderId: string,
    input: ReminderActionInput,
    actorUserId: string,
    actorRole: string,
  ): Promise<ReminderEventResponse> {
    const reminder = await remindersRepo.findById(reminderId);

    if (!reminder) {
      throw new AppError('Reminder not found', 404, ErrorCode.REMINDER_NOT_FOUND);
    }

    if (!reminder.isActive) {
      throw new AppError('Cannot perform actions on inactive reminders', 400, ErrorCode.REMINDER_ARCHIVED);
    }

    // Redesigned: validate action is allowed for reminder type
    validateActionForReminderType(input.action, reminder.reminderType ?? 'SIMPLE');

    const eventType = actionToEventType(input.action);

    // Redesigned: detect if this action should trigger escalation
    const { escalationTriggered, escalationReason } = await detectEscalationNeed(
      reminder,
      input.action,
      reminder.patientUserId
    );

    // Redesigned: send notification to caregivers if escalation triggered
    if (escalationTriggered && escalationReason) {
      try {
        await notificationsService.notifyEscalation(
          reminder.patientUserId,
          reminderId,
          escalationReason,
        );
      } catch (notifyError) {
        // Don't fail the action if notification fails
        console.error('[ReminderActions] Failed to send escalation notification:', notifyError);
      }
    }

    const event = await reminderEventsRepo.create({
      reminderId,
      patientUserId: reminder.patientUserId,
      eventType,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
      actorUserId,
      actorRole,
      source: input.source ?? 'home',
      actionValue: input.actionValue,
      optionalReasonCode: input.reasonCode ?? escalationReason ?? undefined,
      // Redesigned: escalation tracking (cast as any until migration runs)
      escalationTriggered: escalationTriggered as any,
      escalationReason: escalationReason as any,
      linkedChecklistRunId: input.actionValue?.checklistRunId as any,
    });

    return toEventResponse(event);
  },
  
  /**
   * Redesigned: record checklist completion for guided reminders
   */
  async recordChecklistCompletion(
    reminderId: string,
    checklistRunId: string,
    actorUserId: string,
    actorRole: string,
  ): Promise<ReminderEventResponse> {
    const reminder = await remindersRepo.findById(reminderId);
    
    if (!reminder) {
      throw new AppError('Reminder not found', 404, ErrorCode.REMINDER_NOT_FOUND);
    }

    const event = await reminderEventsRepo.create({
      reminderId,
      patientUserId: reminder.patientUserId,
      eventType: 'LINKED_CHECKLIST_COMPLETED' as any,
      actorUserId,
      actorRole,
      source: 'checklist_flow',
      linkedChecklistRunId: checklistRunId as any,
    });

    return toEventResponse(event);
  },
  
  /**
   * Redesigned: get pending escalations for a patient
   *
   * Returns the most recent escalation events, enriched with reminder title and priority.
   * Used by caregiver dashboard/home alert cards.
   */
  async getPendingEscalations(
    patientId: string,
    limit = 20,
  ): Promise<(ReminderEventResponse & { reminderTitle?: string; priority?: string })[]> {
    const events = await prisma.reminderEvent.findMany({
      where: {
        patientUserId: patientId,
        escalationTriggered: true as any,
      },
      include: {
        reminder: { select: { title: true, priority: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    
    return events.map((e: any) => ({
      ...toEventResponse(e),
      reminderTitle: e.reminder?.title ?? undefined,
      priority: e.reminder?.priority?.toLowerCase() ?? undefined,
    }));
  },
};

