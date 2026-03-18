import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod/v4';
import { AppError } from '../errors/AppError.js';
import { ErrorCode } from '../errors/errorCodes.js';

/**
 * Creates an Express middleware that validates `req.body` against a Zod schema.
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const formatted = z.prettifyError(result.error);
      throw new AppError(
        `Validation failed: ${formatted}`,
        400,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    req.body = result.data;
    next();
  };
}

/**
 * Creates an Express middleware that validates `req.query` against a Zod schema.
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const formatted = z.prettifyError(result.error);
      throw new AppError(
        `Invalid query parameters: ${formatted}`,
        400,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    next();
  };
}

/**
 * Creates an Express middleware that validates `req.params` against a Zod schema.
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const formatted = z.prettifyError(result.error);
      throw new AppError(
        `Invalid path parameters: ${formatted}`,
        400,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    Object.defineProperty(req, 'params', {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    next();
  };
}
