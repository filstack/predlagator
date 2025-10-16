// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { createAnonClient, createUserClient } from '../lib/supabase';

/**
 * Extended request interface with Supabase Auth context
 */
export interface AuthRequest extends Request {
  user?: User;
  supabase?: SupabaseClient;
}

/**
 * Authentication middleware - verifies JWT token via Supabase Auth
 *
 * On success:
 * - req.user: Supabase User object (id, email, etc.)
 * - req.supabase: User-scoped Supabase client with RLS context
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT via Supabase Auth
    const supabase = createAnonClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user and RLS-enabled Supabase client to request
    req.user = user;
    req.supabase = createUserClient(token);

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication - doesn't fail if token is missing
 *
 * If token is present and valid:
 * - req.user: Supabase User object
 * - req.supabase: User-scoped Supabase client with RLS context
 *
 * If token is missing or invalid, request continues without user context.
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Try to verify JWT via Supabase Auth
      const supabase = createAnonClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        req.user = user;
        req.supabase = createUserClient(token);
      }
    }

    next();
  } catch (error) {
    // Silently fail - continue without user
    console.warn('Optional auth failed:', error);
    next();
  }
}
