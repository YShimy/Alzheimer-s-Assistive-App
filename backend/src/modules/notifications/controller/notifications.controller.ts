/**
 * Notifications Controller
 *
 * API endpoints for push notification management and in-app inbox.
 *
 * Routes:
 *   POST /notifications/register-push-token     — register device
 *   POST /notifications/unregister-push-token   — remove device (logout)
 *   GET  /notifications                          — list inbox (paginated)
 *   POST /notifications/:id/read                — mark one as read
 *   POST /notifications/read-all                — mark all as read
 *   GET  /notifications/unread-count            — badge count
 */

import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../../shared/validation/validator.js';
import { z } from 'zod/v4';
import { notificationsService } from '../service/notifications.service.js';

const router = Router();

// ─── Register push token ─────────────────────────────────────────────────

const registerTokenSchema = z.object({
  pushToken: z.string().min(1, 'Push token is required'),
  platform: z.enum(['ios', 'android', 'unknown']).default('unknown'),
});

router.post(
  '/register-push-token',
  authMiddleware,
  validateBody(registerTokenSchema),
  async (req, res, next) => {
    try {
      const { pushToken, platform } = req.body;
      await notificationsService.registerPushToken(req.user!.userId, pushToken, platform);
      res.json({ success: true, message: 'Push token registered' });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Unregister push token (logout) ──────────────────────────────────────

const unregisterTokenSchema = z.object({
  pushToken: z.string().optional(), // if omitted, removes ALL device tokens
});

router.post(
  '/unregister-push-token',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { pushToken } = req.body ?? {};
      await notificationsService.unregisterPushToken(req.user!.userId, pushToken);
      res.json({ success: true, message: 'Push token unregistered' });
    } catch (error) {
      next(error);
    }
  },
);

// ─── List notifications (inbox) ───────────────────────────────────────────

router.get(
  '/',
  authMiddleware,
  async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10)));
      const result = await notificationsService.listNotifications(req.user!.userId, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// ─── Unread count (for badge) ──────────────────────────────────────────────

router.get(
  '/unread-count',
  authMiddleware,
  async (req, res, next) => {
    try {
      const count = await notificationsService.getUnreadCount(req.user!.userId);
      res.json({ unreadCount: count });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Mark all as read ─────────────────────────────────────────────────────

router.post(
  '/read-all',
  authMiddleware,
  async (req, res, next) => {
    try {
      await notificationsService.markAllRead(req.user!.userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Mark one as read ─────────────────────────────────────────────────────

router.post(
  '/:id/read',
  authMiddleware,
  async (req, res, next) => {
    try {
      await notificationsService.markRead(String(req.params.id), req.user!.userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
