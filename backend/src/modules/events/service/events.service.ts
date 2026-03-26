import { prisma } from '../../../shared/db/prisma.js';
import { z } from 'zod';
import { batchEventsSchema, clientErrorSchema } from '../validation/events.schemas.js';

type BatchEventsDto = z.infer<typeof batchEventsSchema>;
type ClientErrorDto = z.infer<typeof clientErrorSchema>;

export const eventsService = {
  async saveBatch(actorUserId: string, data: BatchEventsDto) {
    const validEvents = data.events.map((evt) => ({
      eventName: evt.eventName,
      occurredAt: evt.occurredAt ? new Date(evt.occurredAt) : new Date(),
      actorUserId,
      actorRole: evt.actorRole ?? 'patient',
      patientUserId: evt.patientUserId, // Note: For a caregiver, this might be sent explicitly
      sessionId: evt.sessionId,
      screenName: evt.screenName,
      source: evt.source,
      appVersion: evt.appVersion,
      platform: evt.platform,
      language: evt.language,
      // Stringify payload to ensure it fits safely or store as Json
      payload: evt.payload ? JSON.parse(JSON.stringify(evt.payload)) : undefined,
    }));

    if (validEvents.length > 0) {
      await prisma.analyticsEvent.createMany({
        data: validEvents
      });
    }

    return { accepted: validEvents.length };
  },

  async saveClientError(actorUserId: string, data: ClientErrorDto) {
    await prisma.analyticsEvent.create({
      data: {
        eventName: 'error_occurred',
        actorUserId,
        actorRole: 'patient', // Assume patient by default if not specified
        screenName: data.screenName,
        payload: {
          errorCode: data.errorCode,
          actionAttempted: data.actionAttempted,
          recoverable: data.recoverable,
        }
      }
    });
  }
};
