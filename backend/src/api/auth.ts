// backend/src/api/auth.ts
import { Router } from 'express';
import { createAnonClient, getSupabase } from '../lib/supabase';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/register - Регистрация нового пользователя
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword123",
 *   "username": "username" (optional)
 * }
 *
 * Response:
 * {
 *   "user": { id, email, ... },
 *   "session": { access_token, refresh_token, ... }
 * }
 */
router.post('/register', validate(registerSchema, 'body'), async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    const supabase = createAnonClient();

    // 1. Create auth user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0], // Use email prefix if no username
        },
      },
    });

    if (authError) {
      console.error('Auth registration error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(400).json({ error: 'Failed to create user' });
    }

    // 2. Create user record in users table
    const serviceSupabase = getSupabase();
    const { error: userError } = await serviceSupabase
      .from('users')
      .insert({
        id: authData.user.id,
        role: 'USER', // Default role
      });

    if (userError) {
      console.error('User record creation error:', userError);
      // Don't fail - user was created in auth, just log the error
    }

    console.log(`✅ User registered: ${email} (${authData.user.id})`);

    res.status(201).json({
      user: authData.user,
      session: authData.session,
    });
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/login - Вход существующего пользователя
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword123"
 * }
 *
 * Response:
 * {
 *   "user": { id, email, ... },
 *   "session": { access_token, refresh_token, ... }
 * }
 */
router.post('/login', validate(loginSchema, 'body'), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const supabase = createAnonClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ error: error.message });
    }

    if (!data.user || !data.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`✅ User logged in: ${email} (${data.user.id})`);

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/logout - Выход пользователя
 *
 * Note: В Supabase logout обычно выполняется на клиенте.
 * Этот эндпоинт предоставляет server-side logout для полноты.
 *
 * Requires: Authorization header with Bearer token
 *
 * Response:
 * { "success": true }
 */
router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    const supabase = createAnonClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ User logged out');

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    next(error);
  }
});

/**
 * GET /api/auth/me - Получить информацию о текущем пользователе
 *
 * Requires: Authorization header with Bearer token
 *
 * Response:
 * {
 *   "user": { id, email, ... },
 *   "profile": { role, ... }
 * }
 */
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    const supabase = createAnonClient();

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile from database
    const serviceSupabase = getSupabase();
    const { data: profile, error: profileError } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    res.json({
      user,
      profile: profile || null,
    });
  } catch (error) {
    console.error('Get user error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/refresh - Обновить access token
 *
 * Request body:
 * {
 *   "refresh_token": "..."
 * }
 *
 * Response:
 * {
 *   "session": { access_token, refresh_token, ... }
 * }
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Missing refresh_token' });
    }

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
      console.error('Token refresh error:', error);
      return res.status(401).json({ error: error.message });
    }

    res.json({
      session: data.session,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    next(error);
  }
});

export default router;
