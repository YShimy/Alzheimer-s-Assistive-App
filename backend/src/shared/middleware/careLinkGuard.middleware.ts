import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { ErrorCode } from '../errors/errorCodes.js';
import { prisma } from '../db/prisma.js';

type CareLinkPermission =
  | 'canCreateReminders'
  | 'canEditReminders'
  | 'canViewProgress'
  | 'canCreateChecklists'
  | 'canEditChecklists'
  | 'canMarkTasksOnBehalf'
  | 'canManageRecords';

/**
 * Verifies that the requesting caregiver has an active CareLink
 * with the target patient and holds the required permission.
 *
 * Extracts patientId from req.params.patientId.
 * If the user IS the patient, the guard passes automatically (patients own their data).
 */
export function careLinkGuard(requiredPermission: CareLinkPermission) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      console.log(`[careLinkGuard] No user in request`);
      throw AppError.unauthorized();
    }

    const patientId = (req.params.patientId ?? req.params.id) as string;
    console.log(`[careLinkGuard] Checking - userId: ${req.user.userId}, patientId: ${patientId}, requiredPermission: ${requiredPermission}, role: ${req.user.role}`);

    // Patients can always access their own data
    if (req.user.userId === patientId) {
      console.log(`[careLinkGuard] Patient accessing own data - ALLOWED`);
      next();
      return;
    }

    // For caregivers: verify active CareLink exists with the required permission
    console.log(`[careLinkGuard] Looking for careLink - caregiver: ${req.user.userId}, patient: ${patientId}`);
    const careLink = await prisma.careLink.findFirst({
      where: {
        caregiverUserId: req.user.userId,
        patientUserId: patientId,
        status: 'ACTIVE',
      },
    });

    if (!careLink) {
      console.log(`[careLinkGuard] No active care link found - DENIED`);
      throw new AppError(
        'No active care link found with this patient',
        403,
        ErrorCode.CARELINK_PERMISSION_DENIED,
      );
    }
    console.log(`[careLinkGuard] Found careLink: ${careLink.id}, status: ${careLink.status}`);

    // Provide default permissions for legacy care links that may have null permissions
    const defaultPermissions: Record<CareLinkPermission, boolean> = {
      canCreateReminders: true,
      canEditReminders: true,
      canViewProgress: true,
      canCreateChecklists: true,
      canEditChecklists: true,
      canMarkTasksOnBehalf: false,
      canManageRecords: true,
    };

    const permissions = careLink.permissions as Record<string, boolean> | null;
    const effectivePermissions = permissions ? { ...defaultPermissions, ...permissions } : defaultPermissions;
    console.log(`[careLinkGuard] Permissions check - required: ${requiredPermission}, hasPermission: ${effectivePermissions[requiredPermission]}`);

    if (!effectivePermissions[requiredPermission]) {
      console.log(`[careLinkGuard] Missing permission - DENIED`);
      throw new AppError(
        `Missing permission: ${requiredPermission}`,
        403,
        ErrorCode.CARELINK_PERMISSION_DENIED,
      );
    }

    console.log(`[careLinkGuard] All checks passed - ALLOWED`);
    next();
  };
}
