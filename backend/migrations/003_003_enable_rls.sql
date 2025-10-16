-- Migration 003_003: Enable Row Level Security
-- Feature: 003-multitenancy-supabase-auth
-- Date: 2025-10-16

BEGIN;

-- ============================================================================
-- Users Table
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- Campaigns Table
-- ============================================================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "channels_all_own"
  ON channels FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- Batches Table
-- ============================================================================

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batches_all_own"
  ON batches FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- Templates Table
-- ============================================================================

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_all_own"
  ON templates FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- Jobs Table (Read-only for users)
-- ============================================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_select_own"
  ON jobs FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- Audit Logs Table (Read-only for users)
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_own"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

COMMIT;
