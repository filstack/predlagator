# Quickstart: pg-boss + Supabase SDK Migration

**Feature**: 002-migrate-from-bullmq
**Branch**: `002-migrate-from-bullmq`
**Target Audience**: Developers implementing or maintaining the queue system

---

## Prerequisites

- Node.js 20+
- PostgreSQL access via Supabase
- Existing Telegram Bot credentials
- Git (for branch management)

---

## 1. Environment Setup

### 1.1 Install Dependencies

```bash
cd backend

# Install new dependencies
npm install pg-boss@^10.1.3

# Remove old dependencies
npm uninstall bullmq ioredis @prisma/client prisma
```

### 1.2 Update Environment Variables

**backend/.env**:

```env
# Supabase Configuration
SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=[GET_FROM_DASHBOARD]

# Direct connection for pg-boss (bypasses pgBouncer pooler)
SUPABASE_DIRECT_URL=postgres://postgres.qjnxcjbzwelokluaiqmk:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

# Server Configuration
PORT=3000
NODE_ENV=development

# Telegram API
TELEGRAM_API_ID=27562180
TELEGRAM_API_HASH=76342fabc755398259eb7e813e6340a6
TELEGRAM_SESSION=[YOUR_SESSION_STRING]

# Rate Limiting
RATE_LIMIT_MESSAGES_PER_SECOND=20

# REMOVE these (no longer needed):
# REDIS_URL=...
# REDIS_HOST=...
# REDIS_PORT=...
```

**Get SUPABASE_SERVICE_ROLE_KEY**:
1. Open https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk/settings/api
2. Copy "service_role" key
3. Paste into `.env`

---

## 2. Database Migration

### 2.1 Remove BullMQ Field

Execute in **Supabase SQL Editor**:

```sql
-- Remove BullMQ-specific column
ALTER TABLE jobs DROP COLUMN IF EXISTS "bullJobId";

-- Verify
\d jobs;  -- Should not show bullJobId column
```

### 2.2 Verify pg-boss Schema Creation

pg-boss will automatically create the `pgboss` schema on first start. Verify after first worker run:

```sql
-- Check pg-boss tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'pgboss';

-- Expected output:
-- job, version, schedule, subscription
```

---

## 3. Code Implementation

### 3.1 Create pg-boss Queue Initialization

**backend/src/queues/pg-boss-queue.ts** (NEW FILE):

```typescript
import PgBoss from 'pg-boss'

let bossInstance: PgBoss | null = null

/**
 * Get or create pg-boss instance (singleton)
 */
export async function getPgBoss(): Promise<PgBoss> {
  if (bossInstance) {
    return bossInstance
  }

  const boss = new PgBoss({
    connectionString: process.env.SUPABASE_DIRECT_URL,
    schema: 'pgboss',
    max: 5, // Connection pool size
    archiveCompletedAfterSeconds: 604800, // 7 days
    retentionDays: 30,
    monitorStateIntervalSeconds: 60
  })

  boss.on('error', (error) => {
    console.error('❌ pg-boss error:', error)
  })

  boss.on('monitor-states', (stats) => {
    console.log('📊 Queue stats:', stats)
  })

  await boss.start()
  console.log('✅ pg-boss started')

  bossInstance = boss
  return boss
}

/**
 * Graceful shutdown
 */
export async function closePgBoss() {
  if (bossInstance) {
    await bossInstance.stop()
    bossInstance = null
    console.log('✅ pg-boss stopped')
  }
}
```

### 3.2 Update Supabase Client

**backend/src/lib/supabase.ts** (update if exists):

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test connection
export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from('users')
    .select('count')
    .limit(1)

  if (error) {
    throw new Error(`Supabase connection failed: ${error.message}`)
  }

  console.log('✅ Supabase connected')
  return true
}
```

### 3.3 Create Worker Server Entry Point

**backend/src/worker-server.ts** (NEW FILE):

```typescript
import { getPgBoss, closePgBoss } from './queues/pg-boss-queue'
import { createCampaignWorker } from './workers/campaign-worker'
import { createMessageWorker } from './workers/message-worker'
import { testSupabaseConnection } from './lib/supabase'

async function startWorkers() {
  try {
    // Test Supabase connection
    await testSupabaseConnection()

    // Initialize pg-boss
    const boss = await getPgBoss()

    // Start workers
    await createCampaignWorker(boss)
    await createMessageWorker(boss)

    console.log('🚀 All workers started')

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('📴 Shutting down workers...')
      await closePgBoss()
      process.exit(0)
    })

    process.on('SIGINT', async () => {
      console.log('📴 Shutting down workers...')
      await closePgBoss()
      process.exit(0)
    })

  } catch (error) {
    console.error('❌ Worker startup failed:', error)
    process.exit(1)
  }
}

startWorkers()
```

### 3.4 Update Campaign Worker

**backend/src/workers/campaign-worker.ts** (REFACTOR):

```typescript
import PgBoss from 'pg-boss'
import { supabase } from '../lib/supabase'
import { StartCampaignJobData, SendMessageJobData, QUEUE_NAMES } from '../../specs/002-migrate-from-bullmq/contracts/queue-jobs'

export async function createCampaignWorker(boss: PgBoss) {
  await boss.work<StartCampaignJobData>(
    QUEUE_NAMES.START_CAMPAIGN,
    {
      batchSize: 1,
      pollingIntervalSeconds: 2
    },
    async ([job]) => {
      const { campaignId } = job.data

      console.log(`🎬 Starting campaign: ${campaignId}`)

      // 1. Fetch campaign with relations
      const { data: campaign, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          *,
          template:templates(*),
          batch:batches!campaigns_batch_id_fkey(
            channels:channels!batch_channels(*)
          )
        `)
        .eq('id', campaignId)
        .single()

      if (fetchError || !campaign) {
        throw new Error(`Campaign not found: ${campaignId}`)
      }

      // 2. Get queued jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'QUEUED')

      if (!jobs || jobs.length === 0) {
        throw new Error(`No jobs found for campaign: ${campaignId}`)
      }

      const channels = campaign.batch.channels

      // 3. Calculate delays for rate limiting
      const baseDelaySeconds = 60 / campaign.delivery_rate // e.g., 60/20 = 3s

      // 4. Send message jobs with delays
      for (const [index, job] of jobs.entries()) {
        const channel = channels.find(ch => ch.id === job.channel_id)
        if (!channel) continue

        const jitter = (Math.random() - 0.5) * 0.4 * baseDelaySeconds // ±20%
        const delaySeconds = index * baseDelaySeconds + jitter

        const messageJobData: SendMessageJobData = {
          jobId: job.id,
          campaignId: campaign.id,
          channelId: channel.id,
          channelUsername: channel.username,
          templateContent: campaign.template.content,
          mediaType: campaign.template.media_type,
          mediaUrl: campaign.template.media_url,
          attempt: 0
        }

        await boss.send(
          QUEUE_NAMES.SEND_MESSAGE,
          messageJobData,
          {
            startAfter: delaySeconds,
            retryLimit: campaign.retry_limit,
            retryDelay: 5,
            retryBackoff: true,
            expireInMinutes: 15,
            singletonSeconds: Math.ceil(baseDelaySeconds),
            singletonKey: campaignId
          }
        )
      }

      // 5. Update campaign started timestamp
      await supabase
        .from('campaigns')
        .update({ started_at: new Date().toISOString() })
        .eq('id', campaignId)

      console.log(`✅ Campaign ${campaignId}: ${jobs.length} jobs queued`)
    }
  )

  console.log('👷 Campaign worker registered')
}
```

### 3.5 Update Message Worker

**backend/src/workers/message-worker.ts** (REFACTOR):

```typescript
import PgBoss from 'pg-boss'
import { supabase } from '../lib/supabase'
import { telegramService } from '../services/telegram'
import { SendMessageJobData, QUEUE_NAMES } from '../../specs/002-migrate-from-bullmq/contracts/queue-jobs'

export async function createMessageWorker(boss: PgBoss) {
  await boss.work<SendMessageJobData>(
    QUEUE_NAMES.SEND_MESSAGE,
    {
      batchSize: 10,
      pollingIntervalSeconds: 2
    },
    async (jobs) => {
      // Process jobs in parallel
      await Promise.allSettled(jobs.map(job => processMessageJob(job, boss)))
    }
  )

  console.log('📨 Message worker registered')
}

async function processMessageJob(job: PgBoss.Job<SendMessageJobData>, boss: PgBoss) {
  const { jobId, campaignId, channelId, channelUsername, templateContent, mediaType, mediaUrl } = job.data

  try {
    // 1. Update job status: SENDING
    await supabase
      .from('jobs')
      .update({
        status: 'SENDING',
        started_at: new Date().toISOString(),
        attempts: job.data.attempt + 1
      })
      .eq('id', jobId)

    // 2. Send message via Telegram
    const result = await telegramService.sendMessage(channelUsername, templateContent, {
      mediaType,
      mediaUrl
    })

    if (result.success) {
      // 3a. Success: Update job status
      await supabase
        .from('jobs')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString()
        })
        .eq('id', jobId)

      await updateCampaignProgress(campaignId)

      console.log(`✅ Sent message to ${channelUsername}`)

    } else {
      // 3b. Handle errors
      if (result.errorCode === 'FLOOD_WAIT' && result.waitTime) {
        // FLOOD_WAIT: Retry after delay
        console.log(`⏳ FLOOD_WAIT for ${channelUsername}: retry in ${result.waitTime}s`)

        await boss.fail(job.id, { retryDelay: result.waitTime })

        await supabase
          .from('jobs')
          .update({
            status: 'QUEUED',
            error_message: result.error
          })
          .eq('id', jobId)

      } else {
        // Other errors: Mark as failed
        throw new Error(result.error || 'Unknown error')
      }
    }

  } catch (error: any) {
    // 4. Handle failures
    const { data: currentJob } = await supabase
      .from('jobs')
      .select('attempts')
      .eq('id', jobId)
      .single()

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('retry_limit')
      .eq('id', campaignId)
      .single()

    const shouldRetry = currentJob && campaign && currentJob.attempts < campaign.retry_limit

    if (!shouldRetry) {
      // Final failure
      await supabase
        .from('jobs')
        .update({
          status: 'FAILED',
          failed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', jobId)

      // Update channel error count
      const { data: channel } = await supabase
        .from('channels')
        .select('error_count')
        .eq('id', channelId)
        .single()

      if (channel) {
        const newErrorCount = channel.error_count + 1

        await supabase
          .from('channels')
          .update({
            error_count: newErrorCount,
            last_error: error.message,
            is_active: newErrorCount >= 5 ? false : undefined
          })
          .eq('id', channelId)
      }

      await updateCampaignProgress(campaignId)
    }

    throw error // Let pg-boss handle retry
  }
}

async function updateCampaignProgress(campaignId: string) {
  // Get job counts by status
  const { data: jobs } = await supabase
    .from('jobs')
    .select('status')
    .eq('campaign_id', campaignId)

  if (!jobs) return

  const total = jobs.length
  const sent = jobs.filter(j => j.status === 'SENT').length
  const failed = jobs.filter(j => j.status === 'FAILED').length
  const progress = Math.floor(((sent + failed) / total) * 100)

  await supabase
    .from('campaigns')
    .update({
      progress,
      ...(progress === 100 && {
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      })
    })
    .eq('id', campaignId)
}
```

### 3.6 Update API Endpoints

**backend/src/api/campaigns.ts** (replace Prisma with Supabase):

```typescript
// Replace:
import prisma from '../lib/prisma'

// With:
import { supabase } from '../lib/supabase'
import { getPgBoss } from '../queues/pg-boss-queue'
import { QUEUE_NAMES } from '../../specs/002-migrate-from-bullmq/contracts/queue-jobs'

// Example: Start campaign endpoint (POST /api/campaigns/:id/action)
router.post('/:id/action', async (req, res) => {
  const { action } = req.body
  const campaignId = req.params.id

  // ... validation logic ...

  if (action === 'start') {
    // Update campaign status in Supabase
    await supabase
      .from('campaigns')
      .update({ status: 'RUNNING' })
      .eq('id', campaignId)

    // Send job to pg-boss
    const boss = await getPgBoss()
    await boss.send(QUEUE_NAMES.START_CAMPAIGN, {
      campaignId,
      userId: req.user?.id
    }, {
      singletonKey: campaignId
    })

    res.json({ success: true })
  }
})
```

---

## 4. Testing

### 4.1 Start Worker Process

```bash
# Terminal 1: Start API server
cd backend
npm run dev

# Terminal 2: Start worker server
cd backend
npx tsx src/worker-server.ts
```

Expected output:
```
✅ Supabase connected
✅ pg-boss started
👷 Campaign worker registered
📨 Message worker registered
🚀 All workers started
```

### 4.2 Manual Test: Create and Start Campaign

```bash
# 1. Create campaign
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "batchId": "<batch-id>",
    "templateId": "<template-id>",
    "mode": "TEST",
    "deliveryRate": 20
  }'

# 2. Start campaign
curl -X POST http://localhost:3000/api/campaigns/<campaign-id>/action \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### 4.3 Monitor Queue

**Check pg-boss queue state**:

```sql
-- Supabase SQL Editor
SELECT name, state, COUNT(*)
FROM pgboss.job
GROUP BY name, state
ORDER BY name, state;
```

**Check job progress**:

```sql
SELECT status, COUNT(*)
FROM jobs
WHERE campaign_id = '<campaign-id>'
GROUP BY status;
```

---

## 5. Troubleshooting

### Issue: pg-boss fails to start

**Error**: `relation "pgboss.version" does not exist`

**Solution**: Ensure `SUPABASE_DIRECT_URL` is set correctly (direct connection, not pooled).

```bash
# Verify connection
psql "$SUPABASE_DIRECT_URL" -c "SELECT version();"
```

---

### Issue: Jobs not processing

**Symptom**: Jobs stuck in `created` state in `pgboss.job` table.

**Diagnosis**:

```sql
-- Check worker subscriptions
SELECT * FROM pgboss.subscription;
```

**Solution**: Restart worker process.

---

### Issue: FLOOD_WAIT not retrying

**Symptom**: Jobs fail immediately instead of retrying after FLOOD_WAIT.

**Solution**: Verify `boss.fail()` is called with `retryDelay` option:

```typescript
await boss.fail(job.id, { retryDelay: waitTimeSeconds })
```

---

## 6. Production Deployment

### 6.1 Update package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "worker": "tsx src/worker-server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "start:worker": "node dist/worker-server.js"
  }
}
```

### 6.2 Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start API server
pm2 start npm --name "api" -- start

# Start worker
pm2 start npm --name "worker" -- run start:worker

# Monitor
pm2 monit
```

### 6.3 Docker Compose

```yaml
version: '3.8'

services:
  api:
    build: ./backend
    command: npm start
    ports:
      - "3000:3000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

  worker:
    build: ./backend
    command: npm run start:worker
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPABASE_DIRECT_URL=${SUPABASE_DIRECT_URL}
```

---

## 7. Next Steps

1. ✅ Complete implementation following this guide
2. ⏭️ Run `/speckit.tasks` to generate detailed implementation tasks
3. ⏭️ Run `/speckit.implement` to execute tasks sequentially
4. ⏭️ Add monitoring dashboard for queue metrics
5. ⏭️ Set up alerts for FLOOD_WAIT events

---

## Reference Links

- **pg-boss docs**: https://github.com/timgit/pg-boss
- **Supabase docs**: https://supabase.com/docs
- **Contracts**: See `specs/002-migrate-from-bullmq/contracts/`
- **Data Model**: See `specs/002-migrate-from-bullmq/data-model.md`
- **Research**: See `specs/002-migrate-from-bullmq/research.md`
