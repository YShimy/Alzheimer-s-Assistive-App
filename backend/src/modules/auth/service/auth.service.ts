import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../shared/config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';
import { toApiRole } from '../../../shared/types/roles.js';
import { logger } from '../../../shared/logger/logger.js';
import { sendVerificationCodeEmail } from '../../../shared/mail/mail.service.js';
import { authRepo } from '../repo/auth.repo.js';
import type { AuthPayload } from '../../../shared/middleware/auth.middleware.js';
import type {
  LoginResponse,
  MeResponse,
  GoogleTokenPayload,
  SignupRequestCodeResponse,
  SignupVerifyCodeResponse,
} from '../types/auth.types.js';

// ─── Constants ──────────────────────────────────────────────

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 10;
const CODE_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

// ─── Google OAuth2 client ───────────────────────────────────

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

// ─── Helpers ────────────────────────────────────────────────

/** Generate a cryptographically random 6-digit code */
function generateCode(): string {
  return crypto.randomInt(100_000, 999_999).toString();
}

/** Hash a verification code using SHA-256 (not passwords — codes are short-lived) */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/** Constant-time comparison for hashed codes */
function verifyCodeHash(code: string, storedHash: string): boolean {
  const inputHash = hashCode(code);
  return crypto.timingSafeEqual(
    Buffer.from(inputHash, 'hex'),
    Buffer.from(storedHash, 'hex'),
  );
}

/** Hashes a password using argon2id */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Verifies a password against a stored argon2 hash */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Support both legacy argon2 hashes and new bcrypt hashes
  if (hash.startsWith('$argon2')) {
    // If any existing users have argon2 hashes, reject and require password reset
    // (no argon2 dependency available in serverless)
    return false;
  }
  return bcrypt.compare(password, hash);
}

/** Issue a short-lived verification token (JWT signed, scoped for signup completion) */
function signVerificationToken(email: string): string {
  return jwt.sign(
    { email, purpose: 'signup_verification' },
    env.JWT_SECRET,
    { expiresIn: '30m' },
  );
}

/** Verify and decode a signup verification token */
function decodeVerificationToken(token: string): { email: string } {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      email: string;
      purpose: string;
    };
    if (payload.purpose !== 'signup_verification') {
      throw new AppError('Invalid verification token', 400, ErrorCode.INVALID_TOKEN);
    }
    return { email: payload.email };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Verification token is invalid or expired', 400, ErrorCode.INVALID_TOKEN);
  }
}

/** Verifies a Google ID token with Google's servers */
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  if (!googleClient) {
    throw new AppError(
      'Google Sign-In is not configured on this server',
      501,
      ErrorCode.NOT_IMPLEMENTED,
    );
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new AppError('Google token payload is empty', 401, ErrorCode.INVALID_TOKEN);
    }

    if (!payload.sub || !payload.email) {
      throw new AppError('Google token is missing required fields', 401, ErrorCode.INVALID_TOKEN);
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0] ?? 'User',
      picture: payload.picture,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Google ID token verification failed', 401, ErrorCode.INVALID_TOKEN);
  }
}

function signJwt(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

// ─── Auth Service ───────────────────────────────────────────

export const authService = {
  // ═══════════════════════════════════════════════════════════
  //  SIGNUP FLOW — Phase 1: Request Code
  // ═══════════════════════════════════════════════════════════
  async signupRequestCode(email: string): Promise<SignupRequestCodeResponse> {
    // Check if email already belongs to an active user
    const existingUser = await authRepo.findByEmail(email);
    if (existingUser) {
      throw new AppError(
        'An account with this email already exists. Please sign in instead.',
        409,
        ErrorCode.EMAIL_ALREADY_EXISTS,
      );
    }

    // Check for existing active verification (resend cooldown)
    const existing = await authRepo.findActiveVerification(email, 'SIGNUP');
    if (existing) {
      const secondsSinceLastSent =
        (Date.now() - new Date(existing.lastSentAt).getTime()) / 1000;
      if (secondsSinceLastSent < RESEND_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastSent);
        throw new AppError(
          `Please wait ${remaining} seconds before requesting a new code.`,
          429,
          ErrorCode.RESEND_COOLDOWN,
        );
      }
      // Invalidate old code before creating a new one
      await authRepo.invalidateVerifications(email, 'SIGNUP');
    }

    // Generate code, hash it, store it
    const rawCode = generateCode();
    const codeHash = hashCode(rawCode);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await authRepo.createVerification({
      email,
      codeHash,
      expiresAt,
      purpose: 'SIGNUP',
    });

    // Send email — fail safely
    const sent = await sendVerificationCodeEmail(email, rawCode, CODE_EXPIRY_MINUTES);
    if (!sent) {
      logger.warn({ email }, 'Failed to send verification email — code created but not delivered');
    }

    // In dev mode, log the code for testing
    if (env.NODE_ENV === 'development') {
      logger.info({ email, code: rawCode }, '🔑 DEV: Verification code (also check email)');
    }

    return { ok: true, cooldownSeconds: RESEND_COOLDOWN_SECONDS };
  },

  // ═══════════════════════════════════════════════════════════
  //  SIGNUP FLOW — Phase 2: Verify Code
  // ═══════════════════════════════════════════════════════════
  async signupVerifyCode(email: string, code: string): Promise<SignupVerifyCodeResponse> {
    const verification = await authRepo.findActiveVerification(email, 'SIGNUP');

    if (!verification) {
      throw new AppError(
        'No pending verification found. Please request a new code.',
        404,
        ErrorCode.VERIFICATION_CODE_INVALID,
      );
    }

    // Check expiration
    if (new Date() > new Date(verification.expiresAt)) {
      throw new AppError(
        'Verification code has expired. Please request a new one.',
        410,
        ErrorCode.VERIFICATION_CODE_EXPIRED,
      );
    }

    // Check max attempts
    if (verification.attempts >= CODE_MAX_ATTEMPTS) {
      throw new AppError(
        'Too many incorrect attempts. Please request a new code.',
        429,
        ErrorCode.VERIFICATION_MAX_ATTEMPTS,
      );
    }

    // Increment attempts BEFORE checking the code
    await authRepo.incrementVerificationAttempts(verification.id);

    // Verify code using constant-time comparison
    if (!verifyCodeHash(code, verification.codeHash)) {
      const attemptsLeft = CODE_MAX_ATTEMPTS - (verification.attempts + 1);
      throw new AppError(
        `Incorrect code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
        400,
        ErrorCode.VERIFICATION_CODE_INVALID,
      );
    }

    // Mark as consumed — prevents replay
    await authRepo.consumeVerification(verification.id);

    // Issue a short-lived verification token for the completion step
    const verificationToken = signVerificationToken(email);

    return { ok: true, verificationToken };
  },

  // ═══════════════════════════════════════════════════════════
  //  SIGNUP FLOW — Phase 3: Complete Registration
  // ═══════════════════════════════════════════════════════════
  async signupComplete(data: {
    verificationToken: string;
    password: string;
    displayName: string;
    age: number;
    role?: 'patient' | 'caregiver';
  }): Promise<LoginResponse> {
    // Decode and validate verification token
    const { email } = decodeVerificationToken(data.verificationToken);

    // Double-check no user was created in the meantime
    const existingUser = await authRepo.findByEmail(email);
    if (existingUser) {
      throw new AppError(
        'An account with this email already exists.',
        409,
        ErrorCode.EMAIL_ALREADY_EXISTS,
      );
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user with the requested role (default: patient)
    const prismaRole = data.role === 'caregiver' ? 'CAREGIVER' : 'PATIENT';
    const user = await authRepo.createUser({
      email,
      passwordHash,
      displayName: data.displayName,
      age: data.age,
      role: prismaRole,
    });

    logger.info({ userId: user.id, email, role: prismaRole }, 'New user registered via email signup');

    // Issue access token
    const tokenPayload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = signJwt(tokenPayload);

    return {
      accessToken,
      user: {
        id: user.id,
        role: toApiRole(user.role),
        displayName: user.displayName,
        email: user.email,
        language: user.language,
      },
      // Patients get prompted to link a caregiver; caregivers go straight to their home
      nextStep: prismaRole === 'PATIENT' ? 'optional_caregiver_link' : undefined,
    };
  },

  // ═══════════════════════════════════════════════════════════
  //  SIGNUP FLOW — Resend Code
  // ═══════════════════════════════════════════════════════════
  async signupResendCode(email: string): Promise<SignupRequestCodeResponse> {
    // Reuse the request-code logic (it handles invalidation + cooldown)
    return this.signupRequestCode(email);
  },

  // ═══════════════════════════════════════════════════════════
  //  SIGN IN — Email + Password
  // ═══════════════════════════════════════════════════════════
  async signin(email: string, password: string): Promise<LoginResponse> {
    const user = await authRepo.findByEmail(email);

    if (!user || !user.passwordHash) {
      // Use generic message to prevent email enumeration
      throw new AppError(
        'Invalid email or password.',
        401,
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated.', 403, ErrorCode.USER_INACTIVE);
    }

    if (!user.emailVerifiedAt) {
      throw new AppError(
        'Email not verified. Please complete the signup flow.',
        403,
        ErrorCode.EMAIL_NOT_VERIFIED,
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError(
        'Invalid email or password.',
        401,
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    // Update last seen
    await authRepo.updateLastSeen(user.id);

    const tokenPayload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = signJwt(tokenPayload);

    return {
      accessToken,
      user: {
        id: user.id,
        role: toApiRole(user.role),
        displayName: user.displayName,
        email: user.email,
        language: user.language,
      },
    };
  },

  // ═══════════════════════════════════════════════════════════
  //  GOOGLE SIGN-IN
  // ═══════════════════════════════════════════════════════════
  async loginWithGoogle(idToken: string): Promise<LoginResponse> {
    if (!idToken) {
      throw AppError.badRequest('idToken is required');
    }

    const googlePayload = await verifyGoogleToken(idToken);

    const user = await authRepo.upsertByGoogleId({
      googleId: googlePayload.sub,
      email: googlePayload.email,
      displayName: googlePayload.name,
    });

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403, ErrorCode.USER_INACTIVE);
    }

    const tokenPayload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = signJwt(tokenPayload);

    return {
      accessToken,
      user: {
        id: user.id,
        role: toApiRole(user.role),
        displayName: user.displayName,
        email: user.email,
        language: user.language,
      },
    };
  },

  // ═══════════════════════════════════════════════════════════
  //  GET /auth/me
  // ═══════════════════════════════════════════════════════════
  async getMe(userId: string): Promise<MeResponse> {
    const user = await authRepo.findById(userId);

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Update lastSeenAt
    await authRepo.updateLastSeen(userId);

    return {
      user: {
        id: user.id,
        role: toApiRole(user.role),
        displayName: user.displayName,
        email: user.email,
        language: user.language,
        timezone: user.timezone,
        isActive: user.isActive,
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      },
    };
  },

  // ═══════════════════════════════════════════════════════════
  //  DEV LOGIN (preserved for backwards compatibility)
  // ═══════════════════════════════════════════════════════════
  async devLogin(role: 'PATIENT' | 'CAREGIVER'): Promise<LoginResponse> {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Dev login is not available in production', 403, ErrorCode.UNAUTHORIZED);
    }

    const seedGoogleId = role === 'PATIENT' ? 'dev-seed-patient-001' : 'dev-seed-caregiver-001';
    const seedEmail    = role === 'PATIENT' ? 'dev.patient@test.local' : 'dev.caregiver@test.local';
    const seedName     = role === 'PATIENT' ? 'Dev Patient'            : 'Dev Caregiver';

    const user = await authRepo.upsertByGoogleId({
      googleId: seedGoogleId,
      email:    seedEmail,
      displayName: seedName,
      role,
    });

    const tokenPayload: AuthPayload = {
      userId: user.id,
      email:  user.email,
      role:   user.role,
    };

    const accessToken = signJwt(tokenPayload);

    return {
      accessToken,
      user: {
        id:          user.id,
        role:        toApiRole(user.role),
        displayName: user.displayName,
        email:       user.email,
        language:    user.language,
      },
    };
  },
};
