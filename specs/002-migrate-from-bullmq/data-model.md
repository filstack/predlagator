# Data Model: Migrate to pg-boss PostgreSQL Queue

**Feature**: 002-migrate-from-bullmq
**Date**: 2025-01-16

## Overview

This document defines the data model for the pg-boss + Supabase SDK migration, including schema changes, Supabase table structures, and pg-boss queue contracts.

---

## Schema Changes

### 1. Job Table Modifications

**Remove BullMQ-specific fields**:

```sql
-- Migration: Remove bullJobId column
ALTER TABLE jobs DROP COLUMN IF EXISTS "bullJobId";
```

**Current schema** (after migration):

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,              -- CUID from application
  campaign_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,

  -- Job state
  status TEXT NOT NULL,             -- 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED'
  attempts INTEGER DEFAULT 0,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Foreign keys
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE INDEX idx_jobs_campaign_status ON jobs(campaign_id, status);
CREATE INDEX idx_jobs_channel ON jobs(channel_id);
CREATE INDEX idx_jobs_status ON jobs(status);
```

**Field mapping** (Prisma names → Supabase names):
- `jobId` → `id` (no change)
- `campaignId` → `campaign_id`
- `channelId` → `channel_id`
- `errorMessage` → `error_message`
- `createdAt` → `created_at`
- `startedAt` → `started_at`
- `sentAt` → `sent_at`
- `failedAt` → `failed_at`

---

### 2. pg-boss Tables (Auto-created)

pg-boss automatically creates its own tables in the `pgboss` schema on first `boss.start()`:

```sql
-- Created automatically by pg-boss
CREATE SCHEMA IF NOT EXISTS pgboss;

-- Main job queue table
CREATE TABLE pgboss.job (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,              -- Queue name: 'send-message', 'start-campaign'
  priority INTEGER,
  data JSONB,                      -- Job payload
  state TEXT,                      -- 'created', 'retry', 'active', 'completed', 'failed'
  retryLimit INTEGER,
  retryCount INTEGER,
  retryDelay INTEGER,
  retryBackoff BOOLEAN,
  startAfter TIMESTAMPTZ,
  startedOn TIMESTAMPTZ,
  singletonKey TEXT,
  singletonOn TIMESTAMPTZ,
  expireIn INTERVAL,
  createdOn TIMESTAMPTZ,
  completedOn TIMESTAMPTZ,
  keepUntil TIMESTAMPTZ,
  deadLetter TEXT,
  policy TEXT,
  output JSONB
);

-- Additional pg-boss tables:
-- - pgboss.version (schema version tracking)
-- - pgboss.schedule (cron jobs)
-- - pgboss.subscription (worker registrations)
```

**No manual intervention required** - pg-boss manages these tables.

---

## Entity Definitions

### 1. Campaign

**Purpose**: Represents a broadcast operation with target channels and delivery configuration.

**Supabase Access Pattern**:

```typescript
// Read campaign with relations
const { data: campaign, error } = await supabase
  .from('campaigns')
  .select(`
    *,
    batch:batches(*),
    template:templates(*),
    createdBy:users!campaigns_created_by_id_fkey(id, username),
    jobs(id, status, channel_id)
  `)
  .eq('id', campaignId)
  .single()

// Update campaign status
await supabase
  .from('campaigns')
  .update({ status: 'RUNNING', started_at: new Date().toISOString() })
  .eq('id', campaignId)

// Get campaign statistics
const { data: stats } = await supabase
  .from('jobs')
  .select('status')
  .eq('campaign_id', campaignId)
  // Manual aggregation in JS or use Supabase RPC
```

**Fields**:
- `id` (TEXT): Unique identifier
- `name` (TEXT): Campaign name
- `description` (TEXT): Optional description
- `batch_id` (TEXT): FK to batches table
- `template_id` (TEXT): FK to templates table
- `params` (JSONB): Template parameters
- `mode` (TEXT): 'TEST' | 'LIVE'
- `delivery_rate` (INTEGER): Messages per minute
- `retry_limit` (INTEGER): Max retries per job
- `status` (TEXT): 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
- `progress` (INTEGER): Percentage complete (0-100)
- `total_jobs` (INTEGER): Total jobs created
- `created_at`, `updated_at`, `started_at`, `completed_at` (TIMESTAMPTZ)
- `created_by_id` (TEXT): FK to users table

**State Transitions**:
```
QUEUED → RUNNING (user starts campaign)
RUNNING → PAUSED (user pauses or FLOOD_WAIT)
PAUSED → RUNNING (user resumes)
RUNNING → COMPLETED (all jobs finished)
RUNNING → FAILED (campaign-level error)
* → CANCELLED (user cancels)
```

---

### 2. Job

**Purpose**: Individual message delivery task linking campaign to specific channel.

**Supabase Access Pattern**:

```typescript
// Create jobs for campaign
const jobsData = channels.map(channel => ({
  id: generateCuid(),
  campaign_id: campaignId,
  channel_id: channel.id,
  status: 'QUEUED'
}))

await supabase.from('jobs').insert(jobsData)

// Update job status (in worker)
await supabase
  .from('jobs')
  .update({
    status: 'SENDING',
    started_at: new Date().toISOString(),
    attempts: job.attempts + 1
  })
  .eq('id', jobId)

// Mark job as sent
await supabase
  .from('jobs')
  .update({
    status: 'SENT',
    sent_at: new Date().toISOString()
  })
  .eq('id', jobId)

// Mark job as failed
await supabase
  .from('jobs')
  .update({
    status: 'FAILED',
    failed_at: new Date().toISOString(),
    error_message: error.message
  })
  .eq('id', jobId)
```

**Fields**:
- `id` (TEXT): Unique identifier (CUID)
- `campaign_id` (TEXT): FK to campaigns table
- `channel_id` (TEXT): FK to channels table
- `status` (TEXT): 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED'
- `attempts` (INTEGER): Retry counter
- `error_message` (TEXT): Last error details
- `created_at`, `started_at`, `sent_at`, `failed_at` (TIMESTAMPTZ)

**State Transitions**:
```
QUEUED → SENDING (worker picks up job)
SENDING → SENT (message delivered)
SENDING → FAILED (all retries exhausted)
SENDING → QUEUED (retry after error)
```

**Validation Rules**:
- `attempts` ≤ `campaign.retry_limit`
- `status` = 'FAILED' requires `error_message`
- `sent_at` and `failed_at` are mutually exclusive

---

### 3. Channel

**Purpose**: Target Telegram channel with activity status and error tracking.

**Supabase Access Pattern**:

```typescript
// Get active channels for batch
const { data: channels } = await supabase
  .from('channels')
  .select('*')
  .in('id', channelIds)
  .eq('is_active', true)

// Increment error count
const { data: channel } = await supabase
  .from('channels')
  .select('error_count')
  .eq('id', channelId)
  .single()

await supabase
  .from('channels')
  .update({
    error_count: channel.error_count + 1,
    last_error: error.message
  })
  .eq('id', channelId)

// Deactivate after threshold
if (channel.error_count + 1 >= 5) {
  await supabase
    .from('channels')
    .update({ is_active: false })
    .eq('id', channelId)
}
```

**Fields**:
- `id` (TEXT): Unique identifier
- `username` (TEXT): Telegram username (@channel)
- `category` (TEXT): Channel category
- `is_active` (BOOLEAN): Active/inactive flag
- `error_count` (INTEGER): Consecutive errors
- `last_error` (TEXT): Last error message
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Validation Rules**:
- `is_active` = false when `error_count` ≥ 5
- PEER_BLOCKED errors immediately set `is_active` = false

---

### 4. pg-boss Queue Jobs (Internal)

**Purpose**: pg-boss manages queue state independently from business `jobs` table.

**Queue Definitions**:

#### Queue: `send-message`

**Payload** (`data` field):
```typescript
interface SendMessageJobData {
  jobId: string               // Reference to Supabase jobs.id
  campaignId: string
  channelId: string
  channelUsername: string
  templateContent: string
  mediaType?: 'PHOTO' | 'VIDEO' | 'DOCUMENT'
  mediaUrl?: string
  attempt: number             // For logging/debugging
}
```

**Options**:
```typescript
{
  retryLimit: 3,              // From campaign.retry_limit
  retryDelay: 5,              // Seconds (exponential backoff)
  retryBackoff: true,         // Enable exponential: 5s, 10s, 20s
  expireInMinutes: 15,        // Job expires after 15min in active state
  singletonSeconds: 3,        // Rate limit: ~20 msg/min
  singletonKey: campaignId    // Rate limit per campaign
}
```

#### Queue: `start-campaign`

**Payload** (`data` field):
```typescript
interface StartCampaignJobData {
  campaignId: string
  userId?: string            // For audit logging
}
```

**Options**:
```typescript
{
  retryLimit: 1,              // Don't retry campaign orchestration
  singletonKey: campaignId    // Prevent duplicate campaign starts
}
```

---

## Relationships

```
users (1) ──── (N) campaigns
batches (1) ──── (N) campaigns
templates (1) ──── (N) campaigns
campaigns (1) ──── (N) jobs
channels (1) ──── (N) jobs
batches (N) ──── (N) channels (via batch_channels join table)

pg-boss queues:
  send-message jobs → reference jobs.id via jobId field
  start-campaign jobs → reference campaigns.id via campaignId field
```

---

## Data Flow

### 1. Campaign Start Flow

```
1. API: User starts campaign
   ↓
2. Supabase: Update campaign.status = 'RUNNING'
   ↓
3. Supabase: Create Job records (status = 'QUEUED')
   ↓
4. pg-boss: Send 'start-campaign' job
   ↓
5. Campaign Worker: Process campaign
   ↓
6. pg-boss: Send N 'send-message' jobs (with delay)
```

### 2. Message Delivery Flow

```
1. Message Worker: Pick up 'send-message' job from pg-boss
   ↓
2. Supabase: Update job.status = 'SENDING', increment attempts
   ↓
3. Telegram: Send message via GramJS
   ↓
4a. Success:
    - Supabase: Update job.status = 'SENT', set sent_at
    - pg-boss: Complete job
   ↓
4b. Failure (retryable):
    - Supabase: Keep job.status = 'QUEUED'
    - pg-boss: Fail job with retryDelay
   ↓
4c. Failure (permanent):
    - Supabase: Update job.status = 'FAILED', set failed_at, error_message
    - Supabase: Increment channel.error_count
    - pg-boss: Fail job (no retry)
```

### 3. Campaign Progress Tracking

```
Every N jobs (e.g., every 10):
  ↓
1. Supabase: Query job counts by status
   ↓
2. Calculate: progress = (sent + failed) / total * 100
   ↓
3. Supabase: Update campaign.progress
   ↓
4. If progress == 100:
    - Supabase: Update campaign.status = 'COMPLETED', set completed_at
```

---

## Indexing Strategy

### Application Tables (Supabase)

**Existing indexes** (from Prisma schema):
```sql
CREATE INDEX idx_jobs_campaign_status ON jobs(campaign_id, status);
CREATE INDEX idx_jobs_channel ON jobs(channel_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_channels_is_active ON channels(is_active);
```

**No additional indexes needed** for pg-boss migration.

### pg-boss Tables

pg-boss creates its own indexes automatically:
```sql
-- Managed by pg-boss
CREATE INDEX job_name ON pgboss.job(name);
CREATE INDEX job_fetch ON pgboss.job(name, state, priority, createdOn, id);
CREATE INDEX job_singletonKey ON pgboss.job(name, singletonKey);
```

---

## Data Retention

### Application Data (Supabase)

**Jobs**: Retain indefinitely for audit trail
- Completed jobs: Keep all records
- Failed jobs: Keep all records for debugging

**Campaigns**: Retain indefinitely

**Channels**: Retain indefinitely

**Optional cleanup** (manual):
```sql
-- Delete old completed jobs (older than 90 days)
DELETE FROM jobs
WHERE status = 'SENT'
  AND sent_at < NOW() - INTERVAL '90 days';
```

### Queue Data (pg-boss)

**Automatic cleanup** via pg-boss configuration:
```typescript
{
  archiveCompletedAfterSeconds: 604800,  // 7 days
  deleteArchivedJobsAfterDays: 30        // Total: 37 days retention
}
```

Jobs automatically move through states:
```
active → completed → archived (7 days) → deleted (30 days)
```

---

## Migration Checklist

- [x] Remove `bullJobId` column from jobs table
- [ ] Verify all Supabase indexes exist
- [ ] Confirm pg-boss schema permissions (pg-boss auto-creates `pgboss` schema)
- [ ] Test Supabase SDK CRUD operations on all tables
- [ ] Validate foreign key constraints still work
- [ ] Verify cascade deletes (campaign → jobs)

---

## Summary

**Key changes**:
1. Removed BullMQ-specific `bullJobId` field
2. Keep existing application schema (users, campaigns, jobs, channels, etc.)
3. pg-boss manages separate `pgboss` schema (auto-created)
4. Dual state tracking: pg-boss (queue) + Supabase (business)
5. All database access via Supabase SDK (no Prisma)

**No breaking changes** to existing data - only removal of unused BullMQ field.
