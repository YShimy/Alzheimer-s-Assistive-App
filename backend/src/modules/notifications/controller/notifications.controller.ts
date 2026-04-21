/**
 * Notifications Controller
 * 
 * API endpoints for push notification management.
 */

import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../../shared/validation/validator.js';
import { z } from 'zod';
import { notificationsService } from '../service/notifications.service.js';

const router = Router();

// Register push token
const registerTokenSchema = z.object({
  body: z.object({
    pushToken: z.string().min(1, 'Push token is required'),
  }),
});

router.post(
  '/register-push-token',
  authMiddleware,
  validateBody(registerTokenSchema),
  async (req, res, next) => {
    try {
      const { pushToken } = req.body;
      await notificationsService.registerPushToken(req.user!.userId, pushToken);
      res.json({ success: true, message: 'Push token registered' });
    } catch (error) {
      next(error);
    }
  }
);

// Unregister push token (on logout)
router.post(
  '/unregister-push-token',
  authMiddleware,
  async (req, res, next) => {
    try {
      await notificationsService.unregisterPushToken(req.user!.userId);
      res.json({ success: true, message: 'Push token unregistered' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
