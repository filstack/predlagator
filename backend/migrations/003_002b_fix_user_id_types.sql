-- Migration 003_002b: Fix user_id column types to UUID
-- Feature: 003-multitenancy-supabase-auth
-- Date: 2025-10-18
-- Description: Ensures all user_id columns are UUID type (not TEXT)

BEGIN;

-- ============================================================================
-- Fix user_id types in all tables (TEXT → UUID if needed)
-- ============================================================================

-- Campaigns
DO $$
BEGIN
  -- Check if user_id is TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns'
      AND column_name = 'user_id'
      AND data_type = 'text'
  ) THEN
    -- Convert TEXT to UUID
    ALTER TABLE campaigns
      ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

    RAISE NOTICE 'campaigns.user_id converted to UUID';
  END IF;
END $$;

-- Channels
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels'
      AND column_name = 'user_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE channels
      ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

    RAISE NOTICE 'channels.user_id converted to UUID';
  END IF;
END $$;

-- Batches
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batches'
      AND column_name = 'user_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE batches
      ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

    RAISE NOTICE 'batches.user_id converted to UUID';
  END IF;
END $$;

-- Templates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates'
      AND column_name = 'user_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE templates
      ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

    RAISE NOTICE 'templates.user_id converted to UUID';
  END IF;
END $$;

-- Jobs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs'
      AND column_name = 'user_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE jobs
      ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

    RAISE NOTICE 'jobs.user_id converted to UUID';
  END IF;
END $$;

-- Audit Logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs'
      AND column_name = 'user_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE audit_logs
      ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

    RAISE NOTICE 'audit_logs.user_id converted to UUID';
  END IF;
END $$;

COMMIT;
