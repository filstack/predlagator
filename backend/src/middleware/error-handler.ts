// backend/src/middleware/error-handler.ts - MIGRATED TO SUPABASE
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { PostgrestError } from '@supabase/supabase-js'

interface ErrorResponse {
  error: string
  message?: string
  details?: any
  stack?: string
}

/**
 * Global error handler middleware
 * Handles Supabase/PostgreSQL errors, Zod validation errors, and generic errors
 */
export function errorHandler(
  err: Error | PostgrestError,
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
      details: err.errors?.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })) || [],
    }
    res.status(400).json(response)
    return
  }

  // Supabase PostgrestError
  if ('code' in err && 'details' in err && 'hint' in err) {
    const pgError = err as PostgrestError
    let response: ErrorResponse

    // PostgreSQL error codes
    switch (pgError.code) {
      case '23505':
        // Unique constraint violation
        response = {
          error: 'Conflict',
          message: 'Record with this value already exists',
          details: process.env.NODE_ENV === 'development' ? pgError.details : undefined,
        }
        res.status(409).json(response)
        return

      case '23503':
        // Foreign key constraint violation
        response = {
          error: 'Bad Request',
          message: 'Referenced record does not exist',
          details: process.env.NODE_ENV === 'development' ? pgError.details : undefined,
        }
        res.status(400).json(response)
        return

      case '23502':
        // Not null constraint violation
        response = {
          error: 'Bad Request',
          message: 'Required field is missing',
          details: process.env.NODE_ENV === 'development' ? pgError.details : undefined,
        }
        res.status(400).json(response)
        return

      case 'PGRST116':
        // No rows returned (Supabase specific)
        response = {
          error: 'Not Found',
          message: 'The requested record does not exist',
        }
        res.status(404).json(response)
        return

      default:
        response = {
          error: 'Database Error',
          message: process.env.NODE_ENV === 'development' ? pgError.message : 'Database operation failed',
          details: process.env.NODE_ENV === 'development' ? {
            code: pgError.code,
            details: pgError.details,
            hint: pgError.hint,
          } : undefined,
        }
        res.status(500).json(response)
        return
    }
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
