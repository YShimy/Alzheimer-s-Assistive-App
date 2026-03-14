import { Router } from 'express';
import { usersController } from './controller/users.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../shared/validation/validator.js';
import { updateUserSchema } from './validation/users.schemas.js';

export const usersRouter = Router();

// All user routes require authentication
usersRouter.use(authMiddleware);

// GET /api/users/me — Get own profile
usersRouter.get('/me', usersController.getMe);

// PATCH /api/users/me — Update own profile
usersRouter.patch('/me', validateBody(updateUserSchema), usersController.updateMe);
