-- Migration 003_004: Data migration script
-- Feature: 003-multitenancy-supabase-auth
-- Date: 2025-10-16
--
-- IMPORTANT: This script must be run AFTER creating admin user in Supabase Auth.
-- This is a TEMPLATE - replace placeholders before execution.
--
-- Steps:
-- 1. Create admin user in Supabase Dashboard (Authentication → Users → Add User)
--    Email: admin@example.com, Password: <generate secure password>
-- 2. Copy admin user UUID from dashboard
-- 3. Replace <ADMIN_UUID> below with actual UUID
-- 4. Run backend script to get encrypted credentials (see migrate-data.ts)
-- 5. Execute this SQL
--
-- WARNING: Do NOT commit this file with real values!

BEGIN;

-- ============================================================================
-- STEP 1: Create admin user record in users table
-- ============================================================================

-- Replace <ADMIN_UUID> with actual UUID from Supabase Auth
-- Example: INSERT INTO users (id, role) VALUES ('12345678-1234-1234-1234-123456789012', 'ADMIN');

INSERT INTO users (id, role)
VALUES ('<ADMIN_UUID>', 'ADMIN')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Create admin telegram account
-- ============================================================================

-- Replace placeholders with actual values:
-- <ADMIN_UUID> - UUID from step 1
-- <TELEGRAM_API_ID> - from .env TELEGRAM_API_ID
-- <ENCRYPTED_API_HASH> - result of encrypt(TELEGRAM_API_HASH)
-- <ENCRYPTED_SESSION> - result of encrypt(TELEGRAM_SESSION)
-- <TELEGRAM_PHONE> - phone number used for Telegram auth

-- Example using backend script:
-- npx tsx backend/scripts/encrypt-credentials.ts

/*
INSERT INTO telegram_accounts (
  user_id,
  telegram_api_id,
  telegram_api_hash,
  telegram_session,
  telegram_phone,
  telegram_connected,
  name
) VALUES (
  '<ADMIN_UUID>',
  '<TELEGRAM_API_ID>',
  '<ENCRYPTED_API_HASH>',
  '<ENCRYPTED_SESSION>',
  '<TELEGRAM_PHONE>',
  true,
  'Admin Account'
);
*/

-- ============================================================================
-- STEP 3: Link all existing data to admin user
-- ============================================================================

-- Update campaigns
UPDATE campaigns
SET user_id = '<ADMIN_UUID>'
WHERE user_id IS NULL;

-- Update channels
UPDATE channels
SET user_id = '<ADMIN_UUID>'
WHERE user_id IS NULL;

-- Update batches
UPDATE batches
SET user_id = '<ADMIN_UUID>'
WHERE user_id IS NULL;

-- Update templates
UPDATE templates
SET user_id = '<ADMIN_UUID>'
WHERE user_id IS NULL;

-- Update jobs
UPDATE jobs
SET user_id = '<ADMIN_UUID>'
WHERE user_id IS NULL;

-- ============================================================================
-- STEP 4: Link campaigns to admin telegram account
-- ============================================================================

-- Get telegram_account_id for admin user
WITH admin_account AS (
  SELECT id FROM telegram_accounts WHERE user_id = '<ADMIN_UUID>' LIMIT 1
)
UPDATE campaigns
SET telegram_account_id = (SELECT id FROM admin_account)
WHERE telegram_account_id IS NULL;

-- ============================================================================
-- STEP 5: Make user_id NOT NULL (after data migration)
-- ============================================================================

-- Verify all records have user_id
DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM campaigns WHERE user_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Cannot make user_id NOT NULL: % campaigns have NULL user_id', null_count;
  END IF;

  SELECT COUNT(*) INTO null_count FROM campaigns WHERE telegram_account_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Cannot make telegram_account_id NOT NULL: % campaigns have NULL telegram_account_id', null_count;
  END IF;
END $$;

-- Make columns NOT NULL
ALTER TABLE campaigns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE campaigns ALTER COLUMN telegram_account_id SET NOT NULL;
ALTER TABLE channels ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE batches ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE templates ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE jobs ALTER COLUMN user_id SET NOT NULL;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Run these after migration to verify success:

-- Check users table
-- SELECT id, role, created_at FROM users;

-- Check telegram_accounts table
-- SELECT id, user_id, telegram_phone, telegram_connected, name FROM telegram_accounts;

-- Check campaigns linked correctly
-- SELECT id, name, user_id, telegram_account_id FROM campaigns LIMIT 5;

-- Check RLS is working (should return only admin's data)
-- SET request.jwt.claims = '{"sub": "<ADMIN_UUID>"}';
-- SELECT COUNT(*) FROM campaigns;
