import { prisma } from '../../../shared/db/prisma.js';

// Use 'any' for Prisma model types to avoid import path issues with generated client
type User = any;
type EmailVerification = any;

export const authRepo = {
  // ─── User queries ─────────────────────────────────────────

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async upsertByGoogleId(data: {
    googleId: string;
    email: string;
    displayName: string;
    role?: string;
  }): Promise<User> {
    return prisma.user.upsert({
      where: { googleId: data.googleId },
      update: {
        email: data.email,
        displayName: data.displayName,
        lastSeenAt: new Date(),
      },
      create: {
        googleId: data.googleId,
        email: data.email,
        displayName: data.displayName,
        role: (data.role as any) ?? 'PATIENT',
        emailVerifiedAt: new Date(), // Google-verified emails are considered verified
      },
    });
  },

  async createUser(data: {
    email: string;
    passwordHash: string;
    displayName: string;
    age: number;
    role?: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        age: data.age,
        role: (data.role as any) ?? 'PATIENT',
        emailVerifiedAt: new Date(),
      },
    });
  },

  async updateLastSeen(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  },

  // ─── Email Verification queries ───────────────────────────

  async createVerification(data: {
    email: string;
    codeHash: string;
    expiresAt: Date;
    purpose?: string;
  }): Promise<EmailVerification> {
    return prisma.emailVerification.create({
      data: {
        email: data.email,
        codeHash: data.codeHash,
        expiresAt: data.expiresAt,
        purpose: (data.purpose as any) ?? 'SIGNUP',
      },
    });
  },

  /**
   * Finds the most recent unconsumed verification for an email + purpose.
   */
  async findActiveVerification(
    email: string,
    purpose: string = 'SIGNUP',
  ): Promise<EmailVerification | null> {
    return prisma.emailVerification.findFirst({
      where: {
        email,
        purpose: purpose as any,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Invalidates all unconsumed verifications for an email + purpose.
   */
  async invalidateVerifications(
    email: string,
    purpose: string = 'SIGNUP',
  ): Promise<void> {
    await prisma.emailVerification.updateMany({
      where: {
        email,
        purpose: purpose as any,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });
  },

  async incrementVerificationAttempts(id: string): Promise<EmailVerification> {
    return prisma.emailVerification.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
    });
  },

  async consumeVerification(id: string): Promise<EmailVerification> {
    return prisma.emailVerification.update({
      where: { id },
      data: {
        consumedAt: new Date(),
      },
    });
  },

  async updateVerificationLastSentAt(id: string): Promise<EmailVerification> {
    return prisma.emailVerification.update({
      where: { id },
      data: {
        lastSentAt: new Date(),
      },
    });
  },
};
