/**
 * API Contracts for Feature 003: Multitenancy with Supabase Auth
 * This file defines TypeScript types for all API requests and responses.
 */

// ============================================================================
// Auth API (/api/auth)
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: { id: string; email: string };
  session: { access_token: string; refresh_token: string; expires_in: number };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: { id: string; email: string };
  session: { access_token: string; refresh_token: string; expires_in: number };
}

export interface GetMeResponse {
  id: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'AUDITOR';
  telegram_accounts: Array<{
    id: string;
    name: string | null;
    telegram_username: string | null;
    is_active: boolean;
  }>;
  created_at: string;
}

// ============================================================================
// Telegram Accounts API (/api/telegram-accounts)
// ============================================================================

export interface CreateTelegramAccountRequest {
  name?: string;
  apiId: string;
  apiHash: string;
  phone: string;
}

export interface CreateTelegramAccountResponse {
  accountId: string;
  sessionId: string;
  message: string;
}

export interface UpdateTelegramSessionRequest {
  sessionString: string;
}

export interface TelegramAccount {
  id: string;
  name: string | null;
  telegram_phone: string;
  telegram_connected: boolean;
  telegram_username: string | null;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// Campaigns API - UPDATED
// ============================================================================

export interface CreateCampaignRequest {
  name: string;
  telegram_account_id: string; // NEW: Required
  template_id: string;
  batch_ids: string[];
  schedule?: {
    start_time: string;
    rate_limit: number;
  };
}

export interface Campaign {
  id: string;
  user_id: string;
  telegram_account_id: string;
  name: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  total_messages: number;
  sent_count: number;
  created_at: string;
}
