import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../shared/validation/validator.js';
import { eventsController } from './controller/events.controller.js';
import { batchEventsSchema, clientErrorSchema } from './validation/events.schemas.js';

export const eventsRouter = Router();

eventsRouter.use(authMiddleware);

// POST /api/events/batch
// eslint-disable-next-line @typescript-eslint/no-misused-promises
eventsRouter.post('/batch', validateBody(batchEventsSchema), eventsController.batchEvents);

// POST /api/events/errors/client
// eslint-disable-next-line @typescript-eslint/no-misused-promises
eventsRouter.post('/errors/client', validateBody(clientErrorSchema), eventsController.reportClientError);

