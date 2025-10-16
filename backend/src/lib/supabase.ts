/**
 * Supabase Client Configuration
 * Based on electra_dashboard implementation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceClientInstance: SupabaseClient | null = null;
let anonClientInstance: SupabaseClient | null = null;

/**
 * Service role Supabase client (для backend API)
 * Bypasses RLS - используется с осторожностью!
 */
export const createServiceClient = () => {
  if (serviceClientInstance) {
    return serviceClientInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  serviceClientInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClientInstance;
};

/**
 * Anon client (для публичного доступа с RLS)
 */
export const createAnonClient = () => {
  if (anonClientInstance) {
    return anonClientInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  anonClientInstance = createClient(supabaseUrl, supabaseAnonKey);
  return anonClientInstance;
};

/**
 * Get service client (lazy initialization)
 */
export const getSupabase = () => createServiceClient();
