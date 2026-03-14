import { Router } from 'express';
import { carelinksController } from './controller/carelinks.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { validateBody, validateParams } from '../../shared/validation/validator.js';
import { inviteSchema, acceptSchema, updatePermissionsSchema, careLinkIdParam } from './validation/carelinks.schemas.js';

export const carelinksRouter = Router();

// All carelink routes require authentication
carelinksRouter.use(authMiddleware);

// POST /api/carelinks/invite — Caregiver creates an invite code
carelinksRouter.post('/invite', validateBody(inviteSchema), carelinksController.createInvite);

// POST /api/carelinks/accept — Patient accepts an invite code
carelinksRouter.post('/accept', validateBody(acceptSchema), carelinksController.acceptInvite);

// GET /api/carelinks/me — List all linked users
carelinksRouter.get('/me', carelinksController.getMyLinks);

// PATCH /api/carelinks/:id/permissions — Update permissions
carelinksRouter.patch(
  '/:id/permissions',
  validateParams(careLinkIdParam),
  validateBody(updatePermissionsSchema),
  carelinksController.updatePermissions,
);

// PATCH /api/carelinks/:id/revoke — Revoke a care link
carelinksRouter.patch(
  '/:id/revoke',
  validateParams(careLinkIdParam),
  carelinksController.revoke,
);
