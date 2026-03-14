import { prisma } from '../../../shared/db/prisma.js';

// Use 'any' for Prisma model types to avoid import path issues with generated client
type User = any;

export const authRepo = {
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
      },
    });
  },

  async updateLastSeen(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  },
};
