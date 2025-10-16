// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import { verifyJWT, JWTPayload } from '../utils/jwt'

export interface AuthRequest extends Request {
  user?: JWTPayload
}

/**
 * Authentication middleware - verifies JWT token
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' })
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    const payload = await verifyJWT(token)
    req.user = payload

    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Optional authentication - doesn't fail if token is missing
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = await verifyJWT(token)
      req.user = payload
    }

    next()
  } catch (error) {
    // Silently fail - continue without user
    next()
  }
}
