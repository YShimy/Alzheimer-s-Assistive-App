import type { Request, Response } from 'express';
import { authService } from '../service/auth.service.js';

export const authController = {
  /**
   * POST /api/auth/google/mobile
   * Exchanges a Google ID token for a JWT.
   */
  async googleMobileLogin(req: Request, res: Response): Promise<void> {
    const result = await authService.loginWithGoogle(req.body.idToken, req.body.role);
    res.status(200).json(result);
  },

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user.
   */
  async me(req: Request, res: Response): Promise<void> {
    const result = await authService.getMe(req.user!.userId);
    res.status(200).json(result);
  },

  /**
   * POST /api/auth/logout
   * Stateless JWT — logout is client-side for MVP.
   */
  async logout(_req: Request, res: Response): Promise<void> {
    // With stateless JWT, logout is handled client-side (discard token).
    // Future: add token blacklisting or refresh token revocation.
    res.status(200).json({ message: 'Logged out successfully' });
  },
};
