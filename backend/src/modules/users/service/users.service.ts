import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';
import { toApiRole } from '../../../shared/types/roles.js';
import { usersRepo } from '../repo/users.repo.js';
import type { UserProfile, AccessibilitySettings } from '../types/users.types.js';
import type { UpdateUserInput } from '../validation/users.schemas.js';

function toUserProfile(user: any): UserProfile {
  return {
    id: user.id,
    role: toApiRole(user.role),
    displayName: user.displayName,
    email: user.email,
    language: user.language,
    timezone: user.timezone,
    isActive: user.isActive,
    accessibilitySettings: user.accessibilitySettings as AccessibilitySettings,
    preferredNotificationMode: user.preferredNotificationMode,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export const usersService = {
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await usersRepo.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);
    }

    return toUserProfile(user);
  },

  async updateProfile(userId: string, input: UpdateUserInput): Promise<UserProfile> {
    const user = await usersRepo.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);
    }

    // Merge accessibility settings if partial update
    const updateData: any = { ...input };
    if (input.accessibilitySettings) {
      const current = (user.accessibilitySettings as AccessibilitySettings) ?? {};
      updateData.accessibilitySettings = {
        ...current,
        ...input.accessibilitySettings,
      };
    }

    const updated = await usersRepo.update(userId, updateData);

    return toUserProfile(updated);
  },
};
