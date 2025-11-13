-- Migration: 005_fix_batch_channels_foreign_keys
-- Feature: 004-manual-channel-management (bugfix)
-- Description: Fix foreign key constraints and data types in batches and batch_channels tables
-- Date: 2025-10-20
-- Issue: After migration 004 dropped channels table with CASCADE, batch_channels lost FK constraints
--        Also need to convert TEXT columns to UUID to match new schema

BEGIN;

-- ============================================================================
-- Step 0: Drop existing foreign key constraints before type conversion
-- ============================================================================

-- Drop FK constraint for batch_channels.batch_id -> batches.id if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'batch_channels'
      AND constraint_name = 'batch_channels_batch_id_fkey'
  ) THEN
    ALTER TABLE batch_channels
      DROP CONSTRAINT batch_channels_batch_id_fkey;

    RAISE NOTICE 'Dropped FK constraint: batch_channels.batch_id -> batches.id';
  END IF;
END $$;

-- Drop FK constraint for batches.created_by_id -> users.id if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'batches'
      AND constraint_name = 'batches_created_by_id_fkey'
  ) THEN
    ALTER TABLE batches
      DROP CONSTRAINT batches_created_by_id_fkey;

    RAISE NOTICE 'Dropped FK constraint: batches.created_by_id -> users.id';
  END IF;
END $$;

-- ============================================================================
-- Step 1: Fix batches table types and constraints
-- ============================================================================

-- Convert batches.id from TEXT to UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batches'
      AND column_name = 'id'
      AND data_type = 'text'
  ) THEN
    -- Convert TEXT to UUID
    ALTER TABLE batches
      ALTER COLUMN id TYPE UUID USING id::uuid;

    RAISE NOTICE 'batches.id converted from TEXT to UUID';
  END IF;
END $$;

-- Convert batches.created_by_id from TEXT to UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batches'
      AND column_name = 'created_by_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE batches
      ALTER COLUMN created_by_id TYPE UUID USING created_by_id::uuid;

    RAISE NOTICE 'batches.created_by_id converted from TEXT to UUID';
  END IF;
END $$;

-- Add foreign key constraint for batches.created_by_id -> users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'batches'
      AND constraint_name = 'batches_created_by_id_fkey'
  ) THEN
    ALTER TABLE batches
      ADD CONSTRAINT batches_created_by_id_fkey
      FOREIGN KEY (created_by_id)
      REFERENCES users(id)
      ON DELETE SET NULL;

    RAISE NOTICE 'Added FK constraint: batches.created_by_id -> users(id)';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Fix batch_channels table types and constraints
-- ============================================================================

-- Convert batch_channels.batch_id from TEXT to UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_channels'
      AND column_name = 'batch_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE batch_channels
      ALTER COLUMN batch_id TYPE UUID USING batch_id::uuid;

    RAISE NOTICE 'batch_channels.batch_id converted from TEXT to UUID';
  END IF;
END $$;

-- Convert batch_channels.channel_id from TEXT to UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_channels'
      AND column_name = 'channel_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE batch_channels
      ALTER COLUMN channel_id TYPE UUID USING channel_id::uuid;

    RAISE NOTICE 'batch_channels.channel_id converted from TEXT to UUID';
  END IF;
END $$;

-- Add foreign key constraint for batch_channels.batch_id -> batches(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'batch_channels'
      AND constraint_name = 'batch_channels_batch_id_fkey'
  ) THEN
    ALTER TABLE batch_channels
      ADD CONSTRAINT batch_channels_batch_id_fkey
      FOREIGN KEY (batch_id)
      REFERENCES batches(id)
      ON DELETE CASCADE;

    RAISE NOTICE 'Added FK constraint: batch_channels.batch_id -> batches(id)';
  END IF;
END $$;

-- Add foreign key constraint for batch_channels.channel_id -> channels(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'batch_channels'
      AND constraint_name = 'batch_channels_channel_id_fkey'
  ) THEN
    ALTER TABLE batch_channels
      ADD CONSTRAINT batch_channels_channel_id_fkey
      FOREIGN KEY (channel_id)
      REFERENCES channels(id)
      ON DELETE CASCADE;

    RAISE NOTICE 'Added FK constraint: batch_channels.channel_id -> channels(id)';
  END IF;
END $$;

-- ============================================================================
-- Step 3: Recreate indexes if needed
-- ============================================================================

-- Indexes for batch_channels
CREATE INDEX IF NOT EXISTS idx_batch_channels_batch_id ON batch_channels(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_channels_channel_id ON batch_channels(channel_id);

-- Indexes for batches
CREATE INDEX IF NOT EXISTS idx_batches_created_by_id ON batches(created_by_id);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration:
-- 1. Converts batches.id from TEXT to UUID
-- 2. Converts batches.created_by_id from TEXT to UUID
-- 3. Converts batch_channels.batch_id from TEXT to UUID
-- 4. Converts batch_channels.channel_id from TEXT to UUID
-- 5. Restores all foreign key constraints that were lost during CASCADE drops
-- 6. Ensures indexes are in place for performance
-- ============================================================================
