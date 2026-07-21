import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';
import { env } from '../../config/env';

function handleZodError(err: ZodError, req: Request, res: Response): void {
  logger.warn('Validation error', { path: req.path, issues: err.issues });
  res.status(400).json({
    error: 'ValidationError',
    message: 'Invalid request payload',
    details: err.flatten(),
  });
}

function handleAppError(err: AppError, req: Request, res: Response): void {
  const level = err.statusCode >= 500 ? 'error' : 'warn';
  logger.log(level, err.message, { path: req.path, statusCode: err.statusCode });
  res.status(err.statusCode).json({
    error: err.name,
    message: err.message,
  });
}

function handleUnknownError(err: unknown, req: Request, res: Response): void {
  const error = err instanceof Error ? err : new Error('Unknown error');
  logger.error('Unhandled error', { path: req.path, message: error.message, stack: error.stack });

  res.status(500).json({
    error: 'InternalServerError',
    message: env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    handleZodError(err, req, res);
    return;
  }

  if (err instanceof AppError) {
    handleAppError(err, req, res);
    return;
  }

  handleUnknownError(err, req, res);
}
