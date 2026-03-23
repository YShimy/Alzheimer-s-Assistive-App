import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../shared/config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';
import { toApiRole } from '../../../shared/types/roles.js';
import { authRepo } from '../repo/auth.repo.js';
import type { AuthPayload } from '../../../shared/middleware/auth.middleware.js';
import type { LoginResponse, MeResponse, GoogleTokenPayload } from '../types/auth.types.js';

/**
 * Google OAuth2 client — initialized once at module level.
 * Uses the Web Client ID as the audience for ID token verification.
 */
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

/**
 * Verifies a Google ID token with Google's servers.
 * Throws AppError.unauthorized if the token is invalid, expired,
 * or was issued for a different audience.
 *
 * IMPORTANT: Only data extracted from the verified ticket is trusted.
 * Client-sent profile data is NEVER used.
 */
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
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
    // Re-throw AppErrors as-is; wrap Google auth errors
    if (err instanceof AppError) throw err;
    throw new AppError('Google ID token verification failed', 401, ErrorCode.INVALID_TOKEN);
  }
}

function signJwt(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

export const authService = {
  /**
   * DEV ONLY — POST /api/auth/dev-login
   * Creates (or finds) a fixed seed test user for the given role and issues a JWT.
   * Throws 403 if called in production.
   */
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
        language:    user.language,
      },
    };
  },

  /**
   * Validates a Google ID token, finds or creates the local user,
   * and issues an app JWT. Role is determined by the DB (defaults to PATIENT).
   */
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
        language: user.language,
      },
    };
  },

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
};
