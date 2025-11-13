-- Migration: 005_prepare_fix_types
-- Drop all FK constraints before type conversion
-- Date: 2025-10-20

BEGIN;

-- Drop FK: campaigns.batch_id -> batches.id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'campaigns' AND constraint_name = 'campaigns_batch_id_fkey'
  ) THEN
    ALTER TABLE campaigns DROP CONSTRAINT campaigns_batch_id_fkey;
    RAISE NOTICE 'Dropped: campaigns.batch_id -> batches.id';
  END IF;
END $$;

-- Drop FK: batch_channels.batch_id -> batches.id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'batch_channels' AND constraint_name = 'batch_channels_batch_id_fkey'
  ) THEN
    ALTER TABLE batch_channels DROP CONSTRAINT batch_channels_batch_id_fkey;
    RAISE NOTICE 'Dropped: batch_channels.batch_id -> batches.id';
  END IF;
END $$;

-- Drop FK: batches.created_by_id -> users.id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'batches' AND constraint_name = 'batches_created_by_id_fkey'
  ) THEN
    ALTER TABLE batches DROP CONSTRAINT batches_created_by_id_fkey;
    RAISE NOTICE 'Dropped: batches.created_by_id -> users.id';
  END IF;
END $$;

-- Drop FK: jobs.channel_id -> channels.id (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'jobs' AND constraint_name = 'jobs_channel_id_fkey'
  ) THEN
    ALTER TABLE jobs DROP CONSTRAINT jobs_channel_id_fkey;
    RAISE NOTICE 'Dropped: jobs.channel_id -> channels.id';
  END IF;
END $$;

-- Drop FK: jobs.campaign_id -> campaigns.id (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'jobs' AND constraint_name = 'jobs_campaign_id_fkey'
  ) THEN
    ALTER TABLE jobs DROP CONSTRAINT jobs_campaign_id_fkey;
    RAISE NOTICE 'Dropped: jobs.campaign_id -> campaigns.id';
  END IF;
END $$;

COMMIT;
