import type { Request, Response } from 'express';
import { authService } from '../service/auth.service.js';

export const authController = {
  /**
   * POST /api/auth/dev-login — DEV ONLY
   * body: { role: 'PATIENT' | 'CAREGIVER' }
   */
  async devLogin(req: Request, res: Response): Promise<void> {
    const role = req.body.role;
    if (role !== 'PATIENT' && role !== 'CAREGIVER') {
      res.status(400).json({ message: 'role must be PATIENT or CAREGIVER' });
      return;
    }
    const result = await authService.devLogin(role);
    res.status(200).json(result);
  },

  /**
   * POST /api/auth/google/mobile
   * Verifies a Google ID token and exchanges it for an app JWT.
   * Role is determined from the DB — never from the request body.
   */
  async googleMobileLogin(req: Request, res: Response): Promise<void> {
    const result = await authService.loginWithGoogle(req.body.idToken);
    res.status(200).json(result);
  },

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user's profile.
   */
  async me(req: Request, res: Response): Promise<void> {
    const result = await authService.getMe(req.user!.userId);
    res.status(200).json(result);
  },

  /**
   * POST /api/auth/logout
   * Stateless JWT — server-side is a no-op.
   * Client must discard its token and clear SecureStore.
   */
  async logout(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ message: 'Logged out successfully' });
  },
};
