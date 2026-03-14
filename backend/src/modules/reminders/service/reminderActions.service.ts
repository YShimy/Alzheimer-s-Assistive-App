import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';
import { actionToEventType } from '../../../shared/types/roles.js';
import { remindersRepo } from '../repo/reminders.repo.js';
import { reminderEventsRepo } from '../repo/reminderEvents.repo.js';
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
    createdAt: e.createdAt.toISOString(),
  };
}

export const reminderActionsService = {
  /**
   * Records a reminder action (done, snooze, skip).
   * Maps the public action name to the internal event type.
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

    const eventType = actionToEventType(input.action);

    const event = await reminderEventsRepo.create({
      reminderId,
      patientUserId: reminder.patientUserId,
      eventType,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
      actorUserId,
      actorRole,
      source: input.source ?? 'home',
      actionValue: input.actionValue,
      optionalReasonCode: input.reasonCode,
    });

    return toEventResponse(event);
  },
};
