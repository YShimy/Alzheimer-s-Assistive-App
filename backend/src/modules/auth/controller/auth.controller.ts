import type { Request, Response } from 'express';
import { authService } from '../service/auth.service.js';

export const authController = {
  // ─── Signup: Request Code ─────────────────────────────────
  async signupRequestCode(req: Request, res: Response): Promise<void> {
    const result = await authService.signupRequestCode(req.body.email);
    res.status(200).json(result);
  },

  // ─── Signup: Verify Code ──────────────────────────────────
  async signupVerifyCode(req: Request, res: Response): Promise<void> {
    const result = await authService.signupVerifyCode(req.body.email, req.body.code);
    res.status(200).json(result);
  },

  // ─── Signup: Complete Registration ────────────────────────
  async signupComplete(req: Request, res: Response): Promise<void> {
    const result = await authService.signupComplete({
      verificationToken: req.body.verificationToken,
      password: req.body.password,
      displayName: req.body.displayName,
      age: req.body.age,
      role: req.body.role,
    });
    res.status(201).json(result);
  },

  // ─── Signup: Resend Code ──────────────────────────────────
  async signupResendCode(req: Request, res: Response): Promise<void> {
    const result = await authService.signupResendCode(req.body.email);
    res.status(200).json(result);
  },

  // ─── Sign In (Email + Password) ───────────────────────────
  async signin(req: Request, res: Response): Promise<void> {
    const result = await authService.signin(req.body.email, req.body.password);
    res.status(200).json(result);
  },

  // ─── Google Mobile Login ──────────────────────────────────
  async googleMobileLogin(req: Request, res: Response): Promise<void> {
    const result = await authService.loginWithGoogle(req.body.idToken);
    res.status(200).json(result);
  },

  // ─── Get Current User ─────────────────────────────────────
  async me(req: Request, res: Response): Promise<void> {
    const result = await authService.getMe(req.user!.userId);
    res.status(200).json(result);
  },

  // ─── Logout ───────────────────────────────────────────────
  async logout(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ message: 'Logged out successfully' });
  },

  // ─── Dev Login (development only) ─────────────────────────
  async devLogin(req: Request, res: Response): Promise<void> {
    const role = req.body.role;
    if (role !== 'PATIENT' && role !== 'CAREGIVER') {
      res.status(400).json({ message: 'role must be PATIENT or CAREGIVER' });
      return;
    }
    const result = await authService.devLogin(role);
    res.status(200).json(result);
  },
};
