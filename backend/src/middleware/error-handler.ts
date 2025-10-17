// backend/src/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express'
import { Prisma } from '../../../shared/node_modules/@prisma/client'
import { ZodError } from 'zod'

interface ErrorResponse {
  error: string
  message?: string
  details?: any
  stack?: string
}

/**
 * Global error handler middleware
 * Handles Prisma errors, Zod validation errors, and generic errors
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err)

  // Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      error: 'Validation Error',
      message: 'Invalid request data',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    }
    res.status(400).json(response)
    return
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let response: ErrorResponse

    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        response = {
          error: 'Conflict',
          message: `Record with this ${err.meta?.target} already exists`,
        }
        res.status(409).json(response)
        return

      case 'P2025':
        // Record not found
        response = {
          error: 'Not Found',
          message: 'The requested record does not exist',
        }
        res.status(404).json(response)
        return

      case 'P2003':
        // Foreign key constraint failed
        response = {
          error: 'Bad Request',
          message: 'Referenced record does not exist',
        }
        res.status(400).json(response)
        return

      default:
        response = {
          error: 'Database Error',
          message:
            process.env.NODE_ENV === 'development' ? err.message : 'Database operation failed',
        }
        res.status(500).json(response)
        return
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    const response: ErrorResponse = {
      error: 'Database Validation Error',
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Invalid data for database operation',
    }
    res.status(400).json(response)
    return
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const response: ErrorResponse = {
      error: 'Unauthorized',
      message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
    }
    res.status(401).json(response)
    return
  }

  // Generic error
  const response: ErrorResponse = {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(500).json(response)
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  })
}
