# Research: Migrate to pg-boss PostgreSQL Queue

**Feature**: 002-migrate-from-bullmq
**Date**: 2025-01-16
**Status**: Complete

## Overview

This document captures research findings for migrating from BullMQ (Redis-based) to pg-boss (PostgreSQL-based) queue system, with simultaneous migration from Prisma ORM to Supabase SDK.

---

## Decision 1: Queue Library - pg-boss

### Decision
Use **pg-boss** (v10.x) as PostgreSQL-based job queue replacement for BullMQ.

### Rationale
1. **Zero Redis dependency** - eliminates ECONNREFUSED errors plaguing current system
2. **PostgreSQL-native** - leverages existing Supabase PostgreSQL infrastructure
3. **Feature parity** with BullMQ:
   - Built-in retry with exponential backoff
   - Rate limiting via singleton jobs
   - Batch processing support
   - Job expiration
   - Dead letter queues
4. **Production-ready** - Trust score 8.1, 68 code snippets, active maintenance
5. **Simple migration path** - API similar to BullMQ (send/work pattern)

### Alternatives Considered
- **BullMQ with Redis** - Rejected due to infrastructure complexity (separate Redis server required)
- **Graphile Worker** - Rejected, less mature ecosystem
- **PgQueuer (Python)** - Rejected, wrong language
- **Manual PostgreSQL LISTEN/NOTIFY** - Rejected, reinventing the wheel

### Implementation Notes
```bash
npm install pg-boss
npm uninstall bullmq ioredis
```

Key API mapping:
- `queue.add()` → `boss.send()`
- `new Worker()` → `boss.work()`
- `job.updateProgress()` → Direct Supabase update
- `queue.getJobs()` → `boss.fetch()`

---

## Decision 2: Database Access - Supabase SDK

### Decision
Migrate from **Prisma ORM** to **Supabase JavaScript SDK** for all database operations.

### Rationale
1. **Supabase-optimized** - Designed specifically for Supabase infrastructure
2. **Already partially implemented** - Project has `SUPABASE_FINAL_MIGRATION.md` guide
3. **Simpler connection management** - No pgBouncer pooler issues
4. **Built-in features**:
   - Row Level Security (RLS) support
   - Realtime subscriptions (future use)
   - Auto-generated TypeScript types
   - Batch operations and upsert
5. **Reference implementation exists** - `electra_dashboard` project uses same pattern

### Alternatives Considered
- **Keep Prisma** - Rejected, adds unnecessary abstraction layer over Supabase
- **Raw pg driver** - Rejected, too low-level for business logic
- **Kysely** - Rejected, not Supabase-specific

### Migration Impact
**Files to update**:
- `backend/src/lib/prisma.ts` → `backend/src/lib/supabase.ts` (already exists)
- `backend/src/api/campaigns.ts` - Replace all `prisma.*` calls
- `backend/src/workers/*-worker.ts` - Replace all `prisma.*` calls
- `backend/src/middleware/*` - Update authentication/audit logging

**Schema changes**:
- Remove `bullJobId` field from `Job` model (pg-boss manages its own IDs)
- Keep existing enums and relationships

---

## Decision 3: pg-boss Configuration

### Decision
Configure pg-boss with Supabase direct connection (non-pooled) for queue operations.

### Rationale
1. **pg-boss requires long-lived connections** - Incompatible with pgBouncer transaction pooling
2. **Supabase provides direct connection** - Port 5432 bypass pooler
3. **Worker isolation** - Queue workers run in separate process from API server

### Configuration
```typescript
const boss = new PgBoss({
  connectionString: process.env.SUPABASE_DIRECT_URL,
  // Supabase direct: postgres://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
  schema: 'pgboss', // Separate schema for pg-boss tables
  max: 5, // Connection pool size for workers
  archiveCompletedAfterSeconds: 604800 // 7 days retention
})
```

### Environment Variables
```env
# backend/.env
SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
SUPABASE_ANON_KEY=[existing]
SUPABASE_SERVICE_ROLE_KEY=[existing]
SUPABASE_DIRECT_URL=postgres://postgres.qjnxcjbzwelokluaiqmk:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

---

## Decision 4: Rate Limiting Strategy

### Decision
Use **pg-boss singleton jobs** for campaign-level rate limiting instead of BullMQ limiter.

### Rationale
1. **Built-in feature** - `singletonSeconds` option provides slot-based throttling
2. **Simpler than custom limiter** - No separate rate limiting service needed
3. **Per-campaign control** - Use `singletonKey: campaignId` for granular control

### Implementation Pattern
```typescript
// Current BullMQ approach (remove):
limiter: { max: 20, duration: 60000 }

// New pg-boss approach:
await boss.send('send-message', data, {
  singletonSeconds: 3, // 20 msgs/min = 1 msg per 3 seconds
  singletonKey: campaignId
})
```

### Trade-offs
- **Pro**: No external state required
- **Pro**: Automatically prevents duplicate jobs
- **Con**: Less flexible than BullMQ's precise limiter
- **Mitigation**: Add jitter (random delay ±20%) for natural distribution

---

## Decision 5: Worker Architecture

### Decision
Keep **dual-queue architecture** (campaign-management, message-sending) with separate worker processes.

### Rationale
1. **Separation of concerns** - Campaign orchestration vs message delivery
2. **Different concurrency profiles**:
   - Campaign worker: Low concurrency (1-5), high coordination
   - Message worker: High concurrency (10-20), independent tasks
3. **Existing pattern works** - No need to consolidate

### Process Structure
```
backend/
├── src/server.ts          # Express API server (no workers)
├── src/worker-server.ts   # NEW: Worker process entry point
└── src/queues/
    └── pg-boss-queue.ts   # NEW: pg-boss initialization
```

**Deployment**:
- API server: `npm run dev` (development) / `npm start` (production)
- Workers: `npm run worker` (runs worker-server.ts)

---

## Decision 6: Job State Management

### Decision
Use **hybrid approach**: pg-boss for queue state + Supabase `jobs` table for business state.

### Rationale
1. **pg-boss tracks queue lifecycle**: created → active → completed/failed
2. **Supabase `jobs` table tracks business state**: QUEUED → SENDING → SENT/FAILED
3. **Benefits**:
   - Clean separation: queue mechanics vs business logic
   - Audit trail in business database
   - Campaign progress reporting via Supabase queries
4. **Sync strategy**: Update Supabase job status on pg-boss job events

### State Mapping
| pg-boss State | Supabase JobStatus | Action |
|---------------|-------------------|--------|
| created/retry | QUEUED | Job waiting in queue |
| active | SENDING | Worker processing job |
| completed | SENT | Message delivered |
| failed | FAILED | All retries exhausted |

### Implementation
```typescript
// In message worker:
await boss.work('send-message', async ([job]) => {
  // Update Supabase: SENDING
  await supabase.from('jobs').update({ status: 'SENDING' }).eq('id', job.data.jobId)

  // Send message
  const result = await telegram.send(...)

  // Update Supabase: SENT or FAILED
  await supabase.from('jobs').update({
    status: result.success ? 'SENT' : 'FAILED'
  }).eq('id', job.data.jobId)
})
```

---

## Decision 7: FLOOD_WAIT Error Handling

### Decision
Continue using **job retry with custom delay** for Telegram FLOOD_WAIT errors.

### Rationale
1. **pg-boss supports custom retry delays** - `retryDelay` option on `fail()`
2. **Preserves existing logic** - FLOOD_WAIT detection and pause mechanism
3. **No queue-wide pause needed** - Individual job delays sufficient

### Implementation
```typescript
// Detect FLOOD_WAIT
if (error.code === 'FLOOD_WAIT') {
  const waitSeconds = extractWaitTime(error.message)

  // Fail job with custom retry delay
  await boss.fail(job.id, {
    retryDelay: waitSeconds,
    retryLimit: 10 // High limit for FLOOD_WAIT
  })

  // Log for monitoring
  await supabase.from('audit_logs').insert({
    action: 'FLOOD_WAIT_TRIGGERED',
    metadata: { waitSeconds, channel: job.data.channelUsername }
  })
}
```

---

## Decision 8: Schema Migration Strategy

### Decision
**Manual SQL migration** executed directly in Supabase SQL Editor.

### Rationale
1. **Prisma migrations incompatible** - Moving away from Prisma
2. **Simple changes required**:
   - Drop `bullJobId` column from `jobs` table
   - Add pg-boss schema (handled automatically by pg-boss on first start)
3. **One-time operation** - No ongoing schema sync needed

### Migration SQL
```sql
-- Remove BullMQ-specific column
ALTER TABLE jobs DROP COLUMN IF EXISTS "bullJobId";

-- pg-boss will auto-create its tables in 'pgboss' schema on first boss.start()
```

### Execution Steps
1. Backup current database (Supabase dashboard)
2. Run migration SQL in SQL Editor
3. Verify with `\d jobs` (bullJobId should be gone)

---

## Decision 9: Testing Strategy

### Decision
**Integration testing** with local PostgreSQL for queue operations.

### Rationale
1. **pg-boss requires real PostgreSQL** - Can't mock effectively
2. **Supabase local emulation** via Docker
3. **Test focus areas**:
   - Job enqueue/dequeue cycle
   - Retry logic with exponential backoff
   - Rate limiting enforcement
   - FLOOD_WAIT handling
   - Campaign progress tracking

### Test Environment Setup
```bash
# docker-compose.test.yml
services:
  postgres:
    image: supabase/postgres:15
    environment:
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
```

### Test Structure
```
backend/tests/
├── integration/
│   ├── queue.test.ts          # pg-boss queue operations
│   ├── campaign-worker.test.ts # Campaign orchestration
│   └── message-worker.test.ts  # Message delivery
└── unit/
    └── telegram.test.ts        # Mock Telegram API
```

---

## Decision 10: Monitoring & Observability

### Decision
Use **pg-boss monitor-states event** + Supabase queries for queue health monitoring.

### Rationale
1. **Built-in monitoring** - pg-boss emits state counts every N seconds
2. **Business metrics** from Supabase `jobs` table
3. **No external APM needed** for MVP

### Monitoring Points
```typescript
boss.on('monitor-states', (stats) => {
  console.log('Queue health:', {
    messageQueue: stats.queues['send-message'],
    campaignQueue: stats.queues['start-campaign'],
    totalActive: stats.active,
    totalFailed: stats.failed
  })

  // Optional: Push to Supabase for dashboards
  supabase.from('queue_metrics').insert(stats)
})
```

### Metrics to Track
- Jobs created/active/completed/failed per queue
- Average job duration
- FLOOD_WAIT frequency
- Campaign completion rate

---

## Technology Summary

### Added Dependencies
```json
{
  "pg-boss": "^10.1.3"
}
```

### Removed Dependencies
```json
{
  "bullmq": "^5.61.0",
  "ioredis": "^5.8.1",
  "@prisma/client": "^6.17.1",
  "prisma": "5.7"
}
```

### Unchanged Dependencies
- `@supabase/supabase-js`: ^2.75.0 (already installed)
- `telegram`: ^2.26.22 (GramJS client)
- `express`: 4.18
- `tsx`: ^4.20.6

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|-----------|
| pg-boss performance at scale | Medium | High | Load test with 1000+ jobs, monitor Supabase metrics |
| Supabase connection limits | Low | Medium | Use direct connection (non-pooled) for workers |
| Migration data loss | Low | Critical | Backup database before migration, test rollback |
| Learning curve (new APIs) | Medium | Low | Comprehensive code examples in quickstart.md |

---

## Open Questions (Resolved)

~~1. Should we keep Prisma or migrate to Supabase SDK?~~
**Resolved**: Migrate to Supabase SDK per project documentation and reference implementation.

~~2. How to handle pgBouncer pooler with pg-boss?~~
**Resolved**: Use Supabase direct connection (port 5432) for pg-boss, bypassing pooler.

~~3. Rate limiting implementation?~~
**Resolved**: Use pg-boss singleton jobs with `singletonSeconds` + random jitter.

---

## Next Steps

See **plan.md** Phase 1 for:
- data-model.md (Supabase schema)
- contracts/ (pg-boss job contracts)
- quickstart.md (Developer setup guide)
