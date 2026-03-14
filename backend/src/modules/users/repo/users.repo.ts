import { prisma } from '../../../shared/db/prisma.js';

type User = any;

export const usersRepo = {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async update(id: string, data: Partial<{
    displayName: string;
    language: string;
    timezone: string;
    accessibilitySettings: any;
    preferredNotificationMode: string;
  }>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  },
};
