import { Router } from 'express';
import { authController } from './controller/auth.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../shared/validation/validator.js';
import { googleLoginSchema } from './validation/auth.schemas.js';

export const authRouter = Router();

// POST /api/auth/google/mobile — Exchange Google ID token for JWT
authRouter.post('/google/mobile', validateBody(googleLoginSchema), authController.googleMobileLogin);

// GET /api/auth/me — Get currently authenticated user
authRouter.get('/me', authMiddleware, authController.me);

// POST /api/auth/logout — Logout (stateless for MVP)
authRouter.post('/logout', authMiddleware, authController.logout);
