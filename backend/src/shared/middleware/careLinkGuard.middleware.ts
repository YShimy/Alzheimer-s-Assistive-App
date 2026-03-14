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
  | 'canMarkTasksOnBehalf';

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
      throw AppError.unauthorized();
    }

    const patientId = (req.params.patientId ?? req.params.id) as string;

    // Patients can always access their own data
    if (req.user.userId === patientId) {
      next();
      return;
    }

    // For caregivers: verify active CareLink exists with the required permission
    const careLink = await prisma.careLink.findFirst({
      where: {
        caregiverUserId: req.user.userId,
        patientUserId: patientId,
        status: 'ACTIVE',
      },
    });

    if (!careLink) {
      throw new AppError(
        'No active care link found with this patient',
        403,
        ErrorCode.CARELINK_PERMISSION_DENIED,
      );
    }

    const permissions = careLink.permissions as Record<string, boolean>;

    if (!permissions[requiredPermission]) {
      throw new AppError(
        `Missing permission: ${requiredPermission}`,
        403,
        ErrorCode.CARELINK_PERMISSION_DENIED,
      );
    }

    next();
  };
}
