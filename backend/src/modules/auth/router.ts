import { Router } from 'express';
import { authController } from './controller/auth.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../shared/validation/validator.js';
import {
  googleLoginSchema,
  signupRequestCodeSchema,
  signupVerifyCodeSchema,
  signupCompleteSchema,
  signinSchema,
  resendCodeSchema,
} from './validation/auth.schemas.js';

export const authRouter = Router();

// ─── Signup Flow ────────────────────────────────────────────

// POST /api/auth/signup/request-code — Request email verification code
authRouter.post(
  '/signup/request-code',
  validateBody(signupRequestCodeSchema),
  authController.signupRequestCode,
);

// POST /api/auth/signup/verify-code — Verify 6-digit code
authRouter.post(
  '/signup/verify-code',
  validateBody(signupVerifyCodeSchema),
  authController.signupVerifyCode,
);

// POST /api/auth/signup/complete — Complete registration (set password, name, age)
authRouter.post(
  '/signup/complete',
  validateBody(signupCompleteSchema),
  authController.signupComplete,
);

// POST /api/auth/signup/resend-code — Resend verification code
authRouter.post(
  '/signup/resend-code',
  validateBody(resendCodeSchema),
  authController.signupResendCode,
);

// ─── Sign In ────────────────────────────────────────────────

// POST /api/auth/signin — Email + password login
authRouter.post(
  '/signin',
  validateBody(signinSchema),
  authController.signin,
);

// ─── Google Sign-In ─────────────────────────────────────────

// POST /api/auth/google/mobile — Exchange Google ID token for JWT
authRouter.post(
  '/google/mobile',
  validateBody(googleLoginSchema),
  authController.googleMobileLogin,
);

// ─── Session ────────────────────────────────────────────────

// GET /api/auth/me — Get currently authenticated user
authRouter.get('/me', authMiddleware, authController.me);

// POST /api/auth/logout — Logout (stateless for MVP)
authRouter.post('/logout', authMiddleware, authController.logout);

// ─── Dev Login (development only) ───────────────────────────

if (process.env.NODE_ENV !== 'production') {
  authRouter.post('/dev-login', authController.devLogin);
}
