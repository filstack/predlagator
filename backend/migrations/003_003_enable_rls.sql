-- Migration 003_003: Enable Row Level Security
-- Feature: 003-multitenancy-supabase-auth
-- Date: 2025-10-16
-- FIXED: Added explicit type casts for TEXT columns

BEGIN;

-- ============================================================================
-- Users Table
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (idempotent)
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- Telegram Accounts Table
-- ============================================================================

ALTER TABLE telegram_accounts ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (already created in 003_001)
DROP POLICY IF EXISTS "telegram_accounts_select_own" ON telegram_accounts;
DROP POLICY IF EXISTS "telegram_accounts_insert_own" ON telegram_accounts;
DROP POLICY IF EXISTS "telegram_accounts_update_own" ON telegram_accounts;
DROP POLICY IF EXISTS "telegram_accounts_delete_own" ON telegram_accounts;

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

-- ============================================================================
-- Campaigns Table
-- ============================================================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select_own" ON campaigns;
DROP POLICY IF EXISTS "campaigns_insert_own" ON campaigns;
DROP POLICY IF EXISTS "campaigns_update_own" ON campaigns;
DROP POLICY IF EXISTS "campaigns_delete_own" ON campaigns;

CREATE POLICY "campaigns_select_own"
  ON campaigns FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "campaigns_insert_own"
  ON campaigns FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaigns_update_own"
  ON campaigns FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "campaigns_delete_own"
  ON campaigns FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- Channels Table
-- ============================================================================

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channels_all_own" ON channels;

CREATE POLICY "channels_all_own"
  ON channels FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- Batches Table
-- ============================================================================

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "batches_all_own" ON batches;

CREATE POLICY "batches_all_own"
  ON batches FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- Templates Table
-- ============================================================================

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_all_own" ON templates;

CREATE POLICY "templates_all_own"
  ON templates FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- Jobs Table (Read-only for users)
-- ============================================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_select_own" ON jobs;

CREATE POLICY "jobs_select_own"
  ON jobs FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- Audit Logs Table (Read-only for users)
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_own" ON audit_logs;

CREATE POLICY "audit_logs_select_own"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

COMMIT;
