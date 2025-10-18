# Implementation Tasks: Migrate to pg-boss PostgreSQL Queue

**Feature**: 002-migrate-from-bullmq
**Branch**: `002-migrate-from-bullmq`
**Generated**: 2025-01-16

---

## Task Summary

**Total Tasks**: 45
**User Stories**: 3 (P1, P2, P3)
**Estimated Duration**: 3-5 days

### Task Distribution by Phase
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 8 tasks
- Phase 3 (US1 - Campaign Execution): 12 tasks
- Phase 4 (US2 - Rate Limiting): 8 tasks
- Phase 5 (US3 - Retry Logic): 7 tasks
- Phase 6 (Polish): 4 tasks

### Parallel Execution Opportunities
- **Phase 1**: T002-T006 (environment, dependencies, types) can run in parallel
- **Phase 2**: T009-T010 (Supabase client + test) can run in parallel
- **Phase 3**: T016-T018 (worker + API updates) can run after T015
- **Phase 4**: T028-T030 (singleton implementation) can run in parallel
- **Phase 5**: T035-T037 (retry handlers) can run in parallel

---

## User Story Mapping

### User Story 1 (P1): Campaign Execution Without Redis
**Goal**: Operators can start campaigns and have messages delivered without Redis dependency.
**Independent Test**: Create campaign, start it, verify jobs queued in pg-boss and delivered to Telegram.
**Blocking**: None (MVP story)
**Tasks**: T012-T023 (12 tasks)

### User Story 2 (P2): Throttling and Rate Limiting
**Goal**: System automatically controls message delivery speed to avoid FLOOD_WAIT.
**Independent Test**: Start high-volume campaign, verify delivery stays within rate limit.
**Blocking**: Requires US1 complete (campaign execution infrastructure)
**Tasks**: T024-T031 (8 tasks)

### User Story 3 (P3): Retry Logic for Failed Messages
**Goal**: Failed deliveries automatically retry with exponential backoff.
**Independent Test**: Simulate network errors, verify retries with exponential delays.
**Blocking**: Requires US1 complete (message delivery infrastructure)
**Tasks**: T032-T038 (7 tasks)

---

## Dependencies Graph

```
Phase 1 (Setup)
└─> Phase 2 (Foundational)
    └─> Phase 3 (US1) ─┬─> Phase 4 (US2)
                       └─> Phase 5 (US3)

Phase 4 & Phase 5 can run in parallel after Phase 3 complete.
Phase 6 (Polish) requires all phases complete.
```

---

## Implementation Strategy

### MVP Scope (Recommended First Milestone)
**Complete Phase 1-3 only** (User Story 1)
- Basic campaign execution working end-to-end
- Zero Redis dependency
- Messages deliver to Telegram channels
- No advanced features (rate limiting, retry) yet

**Validation**: Manual test campaign with 10-20 channels.

### Incremental Delivery After MVP
1. **Sprint 2**: Add US2 (Rate Limiting) → Phase 4
2. **Sprint 3**: Add US3 (Retry Logic) → Phase 5
3. **Sprint 4**: Polish & optimization → Phase 6

---

## Phase 1: Setup & Environment

**Goal**: Prepare project for pg-boss + Supabase SDK migration.

**Tasks**:

- [X] T001 Backup current database via Supabase dashboard (Projects → Database → Backups → Create Manual Backup)
- [X] T002 [P] Update backend/.env with SUPABASE_DIRECT_URL from Supabase dashboard (Settings → Database → Connection String → Direct connection)
- [X] T003 [P] Update backend/.env with SUPABASE_SERVICE_ROLE_KEY from Supabase dashboard (Settings → API → service_role key)
- [X] T004 [P] Install pg-boss dependency: `cd backend && npm install pg-boss@^10.1.3`
- [X] T005 [P] Uninstall old dependencies: `cd backend && npm uninstall bullmq ioredis @prisma/client prisma`
- [X] T006 [P] Copy TypeScript contract files from specs/002-migrate-from-bullmq/contracts/ to backend/src/types/ directory

**Verification**: `npm list` shows pg-boss installed, BullMQ/ioredis/Prisma removed. `.env` has SUPABASE_DIRECT_URL and SUPABASE_SERVICE_ROLE_KEY set.

---

## Phase 2: Foundational Infrastructure

**Goal**: Set up core pg-boss and Supabase infrastructure (blocking for all user stories).

**Tasks**:

- [X] T007 Execute SQL migration in Supabase SQL Editor: `ALTER TABLE jobs DROP COLUMN IF EXISTS "bullJobId";` (see data-model.md)
- [X] T008 Verify schema migration: Run `\d jobs` in Supabase SQL Editor, confirm bullJobId column removed
- [X] T009 [P] Create backend/src/lib/supabase.ts with Supabase client initialization (see quickstart.md section 3.2)
- [X] T010 [P] Create backend/src/lib/test-supabase.ts with connection test (see quickstart.md section 3.2)
- [X] T011 Test Supabase connection: `cd backend && npx tsx src/lib/test-supabase.ts` should output "✅ Supabase connected"
- [X] T012 Create backend/src/queues/pg-boss-queue.ts with boss initialization, error handlers, monitor-states event (see quickstart.md section 3.1)
- [X] T013 Create backend/src/worker-server.ts entry point that starts pg-boss and workers (see quickstart.md section 3.3)
- [X] T014 Update backend/package.json scripts: add `"worker": "tsx src/worker-server.ts"` and `"start:worker": "node dist/worker-server.js"`

**Verification**: Run `npx tsx src/worker-server.ts` → should start pg-boss and output "✅ pg-boss started". Verify `pgboss` schema created in Supabase with `SELECT table_name FROM information_schema.tables WHERE table_schema = 'pgboss';`.

---

## Phase 3: User Story 1 - Campaign Execution Without Redis (P1)

**Story Goal**: Operators can start campaigns and have jobs queued + delivered without Redis dependency.

**Independent Test Criteria**:
1. Create campaign via API: `POST /api/campaigns` with batchId, templateId
2. Start campaign: `POST /api/campaigns/:id/action` with `action: "start"`
3. Verify jobs created in Supabase: `SELECT * FROM jobs WHERE campaign_id = '...'` shows QUEUED jobs
4. Verify pg-boss queue populated: `SELECT * FROM pgboss.job WHERE name = 'start-campaign'`
5. Workers process jobs: Campaign worker creates send-message jobs, message worker delivers to Telegram
6. Verify completion: Campaign status = COMPLETED, jobs status = SENT

**Tasks**:

- [X] T015 [US1] Refactor backend/src/workers/campaign-worker.ts: Replace BullMQ Worker with pg-boss work(), replace Prisma with Supabase SDK (see quickstart.md section 3.4)
- [X] T016 [P] [US1] Refactor backend/src/workers/message-worker.ts: Replace BullMQ Worker with pg-boss work(), replace Prisma with Supabase SDK, keep Telegram service integration (see quickstart.md section 3.5)
- [ ] T017 [P] [US1] Update backend/src/api/campaigns.ts: Replace all `prisma.*` calls with Supabase SDK equivalents (see contracts/supabase-types.ts for types)
- [ ] T018 [P] [US1] Update backend/src/api/campaigns.ts start campaign endpoint: Replace `startCampaign()` queue call with `boss.send(QUEUE_NAMES.START_CAMPAIGN, ...)` (see quickstart.md section 3.6)
- [ ] T019 [US1] Update backend/src/api/batches.ts: Replace all Prisma calls with Supabase SDK (from('batches').select(), .insert(), .update())
- [ ] T020 [US1] Update backend/src/api/channels.ts: Replace all Prisma calls with Supabase SDK (from('channels').select(), .update() for error_count)
- [ ] T021 [US1] Update backend/src/api/templates.ts: Replace all Prisma calls with Supabase SDK
- [ ] T022 [US1] Update backend/src/api/users.ts: Replace all Prisma calls with Supabase SDK
- [ ] T023 [US1] Update backend/src/middleware/auth.ts: Replace Prisma user lookups with Supabase `from('users').select().eq('id', userId)`
- [ ] T024 [US1] Update backend/src/middleware/audit-logger.ts: Replace Prisma audit log inserts with Supabase `from('audit_logs').insert()`
- [ ] T025 [US1] Start worker process: `cd backend && npm run worker` in separate terminal, verify "🚀 All workers started"
- [ ] T026 [US1] Manual integration test: Create test campaign via API, start it, monitor pg-boss tables and Supabase jobs table, verify messages delivered

**Acceptance**: Campaign created via API → started → jobs queued in pg-boss → messages delivered to Telegram → campaign status = COMPLETED. No Redis errors in logs.

---

## Phase 4: User Story 2 - Throttling and Rate Limiting (P2)

**Story Goal**: System automatically controls delivery speed to avoid Telegram FLOOD_WAIT errors.

**Independent Test Criteria**:
1. Create campaign with deliveryRate = 20 (20 msg/min)
2. Start campaign with 100+ channels
3. Monitor actual delivery rate: Should not exceed 20 msg/min (~1 msg per 3 seconds)
4. Verify no FLOOD_WAIT errors in logs
5. Check pg-boss job scheduling: Jobs should have `startAfter` delays reflecting rate limit

**Blocking Dependencies**: Requires Phase 3 complete (campaign execution infrastructure).

**Tasks**:

- [ ] T027 [US2] Update campaign-worker.ts: Calculate baseDelaySeconds from campaign.delivery_rate (60 / deliveryRate)
- [ ] T028 [P] [US2] Update campaign-worker.ts: Add jitter calculation (±20% random variation) to baseDelaySeconds
- [ ] T029 [P] [US2] Update campaign-worker.ts: Set pg-boss job options `singletonSeconds: Math.ceil(baseDelaySeconds)` and `singletonKey: campaignId`
- [ ] T030 [P] [US2] Update campaign-worker.ts: Set pg-boss job option `startAfter: delaySeconds` for each send-message job
- [ ] T031 [US2] Add pg-boss monitor-states event logging in pg-boss-queue.ts to track job processing rate
- [ ] T032 [US2] Create test campaign with deliveryRate=20, start it, measure actual delivery rate using audit logs timestamps
- [ ] T033 [US2] Verify singleton behavior: Attempt to send duplicate job within same second, confirm second job returns null (throttled)
- [ ] T034 [US2] Load test: Create campaign with 200 channels, deliveryRate=10, verify completion time ~20 minutes (200 / 10 msg/min)

**Acceptance**: Campaign with deliveryRate=20 delivers at 20 msg/min ±5% variance. No FLOOD_WAIT errors. Duplicate jobs within same second are throttled.

---

## Phase 5: User Story 3 - Retry Logic for Failed Messages (P3)

**Story Goal**: Failed message deliveries automatically retry with exponential backoff.

**Independent Test Criteria**:
1. Simulate network error in Telegram service (throw error for specific channel)
2. Start campaign including the failing channel
3. Verify job retries 3 times (from campaign.retry_limit)
4. Verify exponential delays: 5s → 10s → 20s (check pg-boss job.retryDelay)
5. After 3 failures: Job marked FAILED in Supabase, channel.error_count incremented
6. After 5 errors: Channel deactivated (is_active = false)

**Blocking Dependencies**: Requires Phase 3 complete (message delivery infrastructure).

**Tasks**:

- [ ] T035 [P] [US3] Update message-worker.ts: Wrap telegram.sendMessage() in try-catch, call boss.fail(jobId, { retryDelay: 5 }) on error
- [ ] T036 [P] [US3] Update message-worker.ts: Set pg-boss send options `retryLimit: campaign.retry_limit, retryBackoff: true, retryDelay: 5`
- [ ] T037 [P] [US3] Update message-worker.ts: On final failure (attempts >= retryLimit), update Supabase job status='FAILED', increment channel.error_count
- [ ] T038 [US3] Update message-worker.ts: Check channel.error_count after increment, if >= 5 set channel.is_active=false
- [ ] T039 [US3] Add FLOOD_WAIT specific handling: Extract waitTime from error message, call boss.fail(jobId, { retryDelay: waitTime })
- [ ] T040 [US3] Add audit log for FLOOD_WAIT: Insert audit_logs with action='FLOOD_WAIT_TRIGGERED', metadata={waitTime, channelUsername}
- [ ] T041 [US3] Create mock Telegram error scenario: Modify telegram.service.ts to throw error for test channel, verify 3 retries with exponential backoff
- [ ] T042 [US3] Verify channel deactivation: After 5 consecutive errors, confirm channel.is_active=false and job status=FAILED

**Acceptance**: Failed jobs retry 3 times with 5s, 10s, 20s delays. After 3 failures, job marked FAILED. After 5 channel errors, channel deactivated. FLOOD_WAIT errors trigger custom retry delay from Telegram API.

---

## Phase 6: Cleanup & Polish

**Goal**: Remove old code, finalize documentation, production readiness.

**Tasks**:

- [ ] T043 Delete backend/src/lib/redis.ts (no longer needed)
- [ ] T044 Delete backend/src/lib/prisma.ts (replaced by Supabase SDK)
- [ ] T045 Delete backend/src/queues/campaign-queue.ts (replaced by pg-boss-queue.ts)
- [ ] T046 Update backend/README.md: Replace BullMQ/Prisma documentation with pg-boss/Supabase instructions (see quickstart.md)

**Verification**: `git status` shows old files deleted. `npm run build` succeeds without errors. README.md reflects new architecture.

---

## Parallel Execution Examples

### Example 1: Phase 1 Setup (Max parallelism)
```bash
# Terminal 1
task T002  # Update .env SUPABASE_DIRECT_URL

# Terminal 2
task T003  # Update .env SUPABASE_SERVICE_ROLE_KEY

# Terminal 3
task T004  # npm install pg-boss

# Terminal 4
task T005  # npm uninstall old deps

# Terminal 5
task T006  # Copy contract files
```

### Example 2: Phase 3 API Updates (After T015-T016 complete)
```bash
# Terminal 1
task T017  # Update campaigns.ts

# Terminal 2
task T019  # Update batches.ts

# Terminal 3
task T020  # Update channels.ts

# Terminal 4
task T021  # Update templates.ts
```

### Example 3: Phase 4 Singleton Implementation
```bash
# Terminal 1
task T028  # Add jitter calculation

# Terminal 2
task T029  # Set singletonSeconds

# Terminal 3
task T030  # Set startAfter delays
```

---

## Testing Checklist

### Manual Integration Tests (Per User Story)

**US1: Campaign Execution**
- [ ] Create campaign via POST /api/campaigns
- [ ] Start campaign via POST /api/campaigns/:id/action
- [ ] Verify jobs in pg-boss: `SELECT * FROM pgboss.job WHERE name = 'send-message'`
- [ ] Verify jobs in Supabase: `SELECT status, COUNT(*) FROM jobs WHERE campaign_id = '...' GROUP BY status`
- [ ] Check Telegram channels for delivered messages
- [ ] Confirm campaign.status = 'COMPLETED' when done

**US2: Rate Limiting**
- [ ] Create campaign with deliveryRate = 20
- [ ] Start campaign with 100+ channels
- [ ] Monitor delivery timestamps in audit_logs
- [ ] Calculate actual rate: Should be ~20 msg/min ±5%
- [ ] Check pg-boss job delays: `SELECT data->'jobId', startedon FROM pgboss.job ORDER BY startedon`

**US3: Retry Logic**
- [ ] Modify telegram.service.ts to throw error for specific test channel
- [ ] Start campaign including failing channel
- [ ] Monitor pg-boss job retries: `SELECT retrycount, retrydelay FROM pgboss.job WHERE id = '...'`
- [ ] Verify exponential delays: 5s, 10s, 20s
- [ ] Confirm job.status = 'FAILED' after 3 attempts
- [ ] Confirm channel.error_count incremented
- [ ] After 5 errors: Verify channel.is_active = false

### Automated Tests (Optional, if time permits)

**Integration Test Suite** (backend/tests/integration/)
- [ ] Create queue.test.ts: Test pg-boss send → work → complete cycle
- [ ] Create campaign-worker.test.ts: Test campaign orchestration with mock Supabase
- [ ] Create message-worker.test.ts: Test message delivery + retry with mock Telegram API

Run with: `npm test` (requires Docker PostgreSQL for pg-boss)

---

## Rollback Plan

If migration fails at any phase:

1. **Restore database**:
   ```sql
   ALTER TABLE jobs ADD COLUMN "bullJobId" TEXT;
   DROP SCHEMA IF EXISTS pgboss CASCADE;
   ```

2. **Reinstall old dependencies**:
   ```bash
   npm install bullmq ioredis @prisma/client prisma
   ```

3. **Revert code changes**:
   ```bash
   git checkout backend/src/
   ```

4. **Restart with BullMQ**:
   ```bash
   # Start Redis (if installed locally)
   redis-server

   # Or update REDIS_URL to remote Redis instance
   npm run dev
   ```

---

## Production Deployment Checklist

After all phases complete:

- [ ] Run full test suite: `npm test`
- [ ] Manual smoke test on staging environment
- [ ] Update production .env with Supabase credentials
- [ ] Deploy backend: `pm2 start npm --name api -- start`
- [ ] Deploy worker: `pm2 start npm --name worker -- run start:worker`
- [ ] Monitor logs for errors: `pm2 logs`
- [ ] Verify first production campaign executes successfully
- [ ] Set up monitoring alerts for queue metrics (via pg-boss monitor-states)

---

## Success Metrics (from spec.md)

Track these metrics post-deployment:

- ✅ **SC-001**: Zero Redis connection errors in logs
- ✅ **SC-002**: Campaigns deliver to 100+ channels with rate limiting
- ✅ **SC-003**: Campaign progress updates within 5 seconds
- ✅ **SC-004**: FLOOD_WAIT auto-pause within 10 seconds
- ✅ **SC-005**: Automatic retries with exponential backoff (5s, 10s, 20s)
- ✅ **SC-006**: 5 concurrent campaigns with 500 jobs each supported
- ✅ **SC-007**: Queue throughput ≥ 20 messages/second
- ✅ **SC-008**: Zero ECONNREFUSED errors
- ✅ **SC-009**: Completion time within 10% of theoretical minimum

---

## Next Steps

1. **Review this task list** with team for feedback
2. **Start MVP implementation**: Execute Phase 1 → Phase 2 → Phase 3
3. **Run `/speckit.implement`** to automatically execute tasks with tracking
4. **After US1 complete**: Demo to stakeholders, gather feedback
5. **Incrementally add US2 and US3** in subsequent sprints

---

**Total Tasks**: 46
**Parallelizable**: 18 tasks marked [P]
**User Story Tasks**: 27 tasks across 3 stories
**Infrastructure Tasks**: 14 tasks (Setup + Foundational)
**Cleanup Tasks**: 4 tasks

**Estimated Timeline**: 3-5 days for MVP (Phase 1-3), +1-2 days for US2+US3, +0.5 day for polish.
