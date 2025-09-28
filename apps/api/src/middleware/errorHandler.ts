import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { HTTP_STATUS_CODES, ERROR_CODES } from '@ryuk/shared';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error implements ApiError {
  statusCode = HTTP_STATUS_CODES.BAD_REQUEST;
  code = ERROR_CODES.VALIDATION_ERROR;

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = HTTP_STATUS_CODES.NOT_FOUND;
  code = ERROR_CODES.NOT_FOUND;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error implements ApiError {
  statusCode = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
  code = ERROR_CODES.DATABASE_ERROR;

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends Error implements ApiError {
  statusCode = HTTP_STATUS_CODES.UNAUTHORIZED;
  code = ERROR_CODES.AUTHENTICATION_ERROR;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements ApiError {
  statusCode = HTTP_STATUS_CODES.FORBIDDEN;
  code = ERROR_CODES.AUTHORIZATION_ERROR;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function errorHandler(
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = error.statusCode || HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
  const code = error.code || ERROR_CODES.INTERNAL_SERVER_ERROR;

  // Log the error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } else {
    logger.warn('Client error:', {
      error: error.message,
      code,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: error.stack }),
    },
    timestamp: new Date().toISOString(),
  });
}