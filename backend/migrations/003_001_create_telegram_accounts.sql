-- Migration 003_001: Create telegram_accounts table
-- Feature: 003-multitenancy-supabase-auth
-- Date: 2025-10-16

BEGIN;

-- Create telegram_accounts table
CREATE TABLE telegram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Telegram credentials (ENCRYPTED)
  telegram_api_id TEXT NOT NULL,
  telegram_api_hash TEXT NOT NULL, -- Encrypted with AES-256
  telegram_session TEXT, -- Encrypted with AES-256
  telegram_phone TEXT NOT NULL,

  -- Telegram user info (filled after auth)
  telegram_connected BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_user_id TEXT,
  telegram_username TEXT,
  telegram_first_name TEXT,

  -- Account metadata
  name TEXT, -- Friendly name (e.g., "Main", "Backup")
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT telegram_accounts_phone_unique UNIQUE (telegram_phone)
);

-- Indexes
CREATE INDEX idx_telegram_accounts_user_id ON telegram_accounts(user_id);
CREATE INDEX idx_telegram_accounts_phone ON telegram_accounts(telegram_phone);
CREATE INDEX idx_telegram_accounts_active ON telegram_accounts(user_id, is_active)
  WHERE is_active = TRUE;

-- RLS
ALTER TABLE telegram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_accounts_select_own"
  ON telegram_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "telegram_accounts_insert_own"
  ON telegram_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "telegram_accounts_update_own"
  ON telegram_accounts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "telegram_accounts_delete_own"
  ON telegram_accounts FOR DELETE
  USING (user_id = auth.uid());

-- Trigger для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER telegram_accounts_updated_at
  BEFORE UPDATE ON telegram_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
