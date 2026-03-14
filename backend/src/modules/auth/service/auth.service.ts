import jwt from 'jsonwebtoken';
import { env } from '../../../shared/config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';
import { toApiRole } from '../../../shared/types/roles.js';
import { authRepo } from '../repo/auth.repo.js';
import type { AuthPayload } from '../../../shared/middleware/auth.middleware.js';
import type { LoginResponse, MeResponse, GoogleTokenPayload } from '../types/auth.types.js';

/**
 * Verifies a Google ID token.
 *
 * TODO(seif): Replace with actual Google verification using google-auth-library:
 *   import { OAuth2Client } from 'google-auth-library';
 *   const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
 *   const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
 *   return ticket.getPayload();
 */
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  // Stub: In production, decode and verify the actual Google token
  // For development, use a test token format: "test_<email>_<name>"
  if (idToken.startsWith('test_')) {
    const parts = idToken.split('_');
    return {
      sub: `google-${parts[1] ?? 'user'}`,
      email: parts[1] ? `${parts[1]}@test.com` : 'test@test.com',
      name: parts[2] ?? 'Test User',
    };
  }

  // Production path — placeholder until google-auth-library is integrated
  return {
    sub: `google-${Date.now()}`,
    email: 'placeholder@example.com',
    name: 'Placeholder User',
  };
}

function signJwt(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

export const authService = {
  async loginWithGoogle(idToken: string, role?: 'PATIENT' | 'CAREGIVER'): Promise<LoginResponse> {
    if (!idToken) {
      throw AppError.badRequest('idToken is required');
    }

    const googlePayload = await verifyGoogleToken(idToken);

    const user = await authRepo.upsertByGoogleId({
      googleId: googlePayload.sub,
      email: googlePayload.email,
      displayName: googlePayload.name,
      role,
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
