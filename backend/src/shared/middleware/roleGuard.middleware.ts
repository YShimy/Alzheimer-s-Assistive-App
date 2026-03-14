import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { ErrorCode } from '../errors/errorCodes.js';

/**
 * Requires the authenticated user to have one of the specified roles.
 * Must be used after authMiddleware.
 */
export function roleGuard(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    // Map Prisma uppercase roles to lowercase for comparison
    const userRole = req.user.role.toLowerCase();

    if (!allowedRoles.includes(userRole)) {
      throw new AppError('Insufficient permissions for this action', 403, ErrorCode.FORBIDDEN);
    }

    next();
  };
}
