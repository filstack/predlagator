# Implementation Plan: Migrate to pg-boss PostgreSQL Queue

**Branch**: `002-migrate-from-bullmq` | **Date**: 2025-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-migrate-from-bullmq/spec.md`

---

## Summary

Replace BullMQ (Redis-based) job queue with pg-boss (PostgreSQL-based) and migrate from Prisma ORM to Supabase JavaScript SDK for database access. This eliminates Redis dependency (ECONNREFUSED errors) while leveraging existing Supabase PostgreSQL infrastructure. Changes include: installing pg-boss, refactoring queue/worker code, removing BullMQ/Redis/Prisma dependencies, updating schema (remove `bullJobId`), and maintaining campaign/message delivery functionality with rate limiting, retry logic, and FLOOD_WAIT handling.

---

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20+
**Primary Dependencies**: pg-boss ^10.1.3, @supabase/supabase-js ^2.75.0, telegram ^2.26.22, express 4.18
**Storage**: Supabase PostgreSQL (direct connection for pg-boss, SDK for business logic)
**Testing**: Integration tests with local PostgreSQL (via Docker), unit tests for Telegram mocks
**Target Platform**: Node.js server (Linux/Windows), deployed as separate API + worker processes
**Project Type**: Web application (backend API + background workers)
**Performance Goals**: 20-100 messages/second throughput, <5s job pickup latency, support 5 concurrent campaigns
**Constraints**: <10ms Supabase query latency (p95), no Redis infrastructure, maintain existing Telegram API integration
**Scale/Scope**: 100+ channels per campaign, 1000+ jobs per campaign, single worker instance (horizontal scaling out of scope)

---

## Constitution Check

*No project-specific constitution defined. Proceeding with standard best practices.*

**Validation**:
- ✅ Single technology choice per domain (pg-boss for queues, Supabase SDK for DB)
- ✅ Minimal dependencies (removing 4 packages, adding 1)
- ✅ No breaking API changes (existing REST endpoints unchanged)
- ✅ Backward compatibility (existing database schema preserved)

---

## Project Structure

### Documentation (this feature)

```
specs/002-migrate-from-bullmq/
├── spec.md                # Feature specification (existing)
├── plan.md                # This file (/speckit.plan output)
├── research.md            # Phase 0: Technology decisions & rationale
├── data-model.md          # Phase 1: Supabase schema & pg-boss contracts
├── quickstart.md          # Phase 1: Developer setup guide
├── contracts/             # Phase 1: TypeScript interfaces
│   ├── queue-jobs.ts      # pg-boss job payload types
│   └── supabase-types.ts  # Supabase table types
└── tasks.md               # Phase 2: Will be created by /speckit.tasks (NOT by this command)
```

### Source Code (repository root)

```
backend/
├── src/
│   ├── server.ts                      # Express API server (existing)
│   ├── worker-server.ts               # NEW: Worker process entry point
│   ├── app.ts                         # Express app setup (existing)
│   │
│   ├── queues/
│   │   ├── campaign-queue.ts          # UPDATE: Remove (BullMQ code)
│   │   └── pg-boss-queue.ts           # NEW: pg-boss initialization
│   │
│   ├── workers/
│   │   ├── campaign-worker.ts         # UPDATE: Refactor for pg-boss + Supabase
│   │   └── message-worker.ts          # UPDATE: Refactor for pg-boss + Supabase
│   │
│   ├── lib/
│   │   ├── redis.ts                   # DELETE: No longer needed
│   │   ├── prisma.ts                  # DELETE: Replaced by Supabase SDK
│   │   └── supabase.ts                # UPDATE: Ensure proper configuration
│   │
│   ├── api/
│   │   ├── campaigns.ts               # UPDATE: Replace Prisma with Supabase SDK
│   │   ├── batches.ts                 # UPDATE: Replace Prisma with Supabase SDK
│   │   ├── channels.ts                # UPDATE: Replace Prisma with Supabase SDK
│   │   ├── templates.ts               # UPDATE: Replace Prisma with Supabase SDK
│   │   └── users.ts                   # UPDATE: Replace Prisma with Supabase SDK
│   │
│   ├── services/
│   │   └── telegram.ts                # UNCHANGED: Keep existing implementation
│   │
│   └── middleware/
│       ├── auth.ts                    # UPDATE: Replace Prisma with Supabase SDK
│       └── audit-logger.ts            # UPDATE: Replace Prisma with Supabase SDK
│
├── package.json                       # UPDATE: Dependencies
├── .env                               # UPDATE: Add SUPABASE_DIRECT_URL, remove REDIS_*
└── tsconfig.json                      # UNCHANGED

shared/
├── prisma/
│   └── schema.prisma                  # DELETE: No longer using Prisma
└── migrations/
    └── 001_remove_bullJobId.sql       # NEW: Schema migration

tests/
└── integration/
    ├── queue.test.ts                  # NEW: pg-boss queue tests
    ├── campaign-worker.test.ts        # NEW: Campaign orchestration tests
    └── message-worker.test.ts         # NEW: Message delivery tests
```

**Structure Decision**:
Web application structure (backend + tests). Workers run in separate process (`worker-server.ts`) from API server (`server.ts`) but share same codebase. This allows independent scaling and deployment of API vs background workers.

---

## Complexity Tracking

*No constitution violations to justify. Migration follows standard patterns.*

---

## Phase 0: Research & Decisions

**Status**: ✅ Complete

**Output**: [research.md](./research.md)

**Key Decisions**:
1. **pg-boss over alternatives** - PostgreSQL-native, production-ready, feature parity with BullMQ
2. **Supabase SDK over Prisma** - Optimized for Supabase, simpler connection management
3. **Direct connection for pg-boss** - Bypass pgBouncer pooler (incompatible with long-lived connections)
4. **Singleton jobs for rate limiting** - Built-in pg-boss feature (`singletonSeconds`)
5. **Hybrid state tracking** - pg-boss manages queue state, Supabase stores business state
6. **Manual SQL migration** - Simple one-time schema change (remove `bullJobId`)

---

## Phase 1: Design & Contracts

**Status**: ✅ Complete

### Artifacts

1. **data-model.md**
   - Supabase table schemas (users, campaigns, jobs, channels, etc.)
   - pg-boss queue definitions (send-message, start-campaign)
   - State transitions and validation rules
   - Data flow diagrams

2. **contracts/queue-jobs.ts**
   - `SendMessageJobData` interface
   - `StartCampaignJobData` interface
   - Worker handler type signatures
   - Runtime validation functions

3. **contracts/supabase-types.ts**
   - Table interfaces (User, Campaign, Job, Channel, etc.)
   - Insert/Update types for Supabase SDK
   - Relation types for joins
   - Enum definitions

4. **quickstart.md**
   - Step-by-step developer setup
   - Environment configuration
   - Code examples for all major components
   - Troubleshooting guide
   - Production deployment instructions

---

## Phase 2: Implementation Tasks

**Status**: ⏭️ Pending

**Next Command**: Run `/speckit.tasks` to generate dependency-ordered task list.

**Expected Task Categories**:
1. **Setup** - Install dependencies, update environment variables
2. **Database** - Execute schema migration, verify pg-boss tables
3. **Core Infrastructure** - Create pg-boss queue, Supabase client, worker server
4. **Workers** - Refactor campaign worker, refactor message worker
5. **API** - Update all endpoints to use Supabase SDK
6. **Middleware** - Update auth and audit logging
7. **Cleanup** - Remove BullMQ/Redis/Prisma code and dependencies
8. **Testing** - Integration tests, manual smoke tests
9. **Documentation** - Update README, deployment docs

---

## Implementation Strategy

### 1. Parallel Work Streams

**Stream A: Infrastructure** (no dependencies on B/C)
- Install pg-boss dependency
- Create pg-boss-queue.ts initialization
- Create worker-server.ts entry point
- Update .env with Supabase credentials

**Stream B: Database Migration** (no dependencies on A/C)
- Execute SQL migration (remove bullJobId)
- Verify pg-boss schema creation
- Test Supabase SDK connection

**Stream C: Type Definitions** (no dependencies on A/B)
- Copy contracts from specs/ to src/types/
- Validate TypeScript compilation

### 2. Sequential Work (after A+B+C complete)

1. Refactor workers (campaign-worker.ts, message-worker.ts)
2. Update API endpoints (campaigns.ts, etc.)
3. Update middleware (auth.ts, audit-logger.ts)
4. Remove old code (redis.ts, prisma.ts, campaign-queue.ts)
5. Update package.json (remove BullMQ/ioredis/Prisma)
6. Run integration tests

### 3. Rollback Plan

If migration fails:
1. Restore `bullJobId` column: `ALTER TABLE jobs ADD COLUMN "bullJobId" TEXT;`
2. Reinstall dependencies: `npm install bullmq ioredis @prisma/client`
3. Revert code changes via git: `git checkout backend/src/`
4. Drop pg-boss schema: `DROP SCHEMA IF EXISTS pgboss CASCADE;`

---

## Success Criteria (from spec.md)

- ✅ SC-001: Campaigns start without Redis configuration (zero ECONNREFUSED errors)
- ✅ SC-002: Messages deliver to 100+ channels per campaign with configurable rate limiting
- ✅ SC-003: Campaign progress updates visible within 5 seconds
- ✅ SC-004: System auto-pauses campaigns within 10s of FLOOD_WAIT
- ✅ SC-005: Failed jobs retry automatically (exponential backoff: 5s, 10s, 20s)
- ✅ SC-006: System handles 5 concurrent campaigns with 500 jobs each
- ✅ SC-007: Queue throughput supports 20+ messages/second
- ✅ SC-008: Zero Redis-related errors in logs
- ✅ SC-009: Campaign completion time within 10% of theoretical minimum

**Validation Method**:
- Create test campaign with 100 channels
- Monitor queue stats via `monitor-states` event
- Check Supabase logs for errors
- Measure actual vs expected completion time

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| pg-boss performance at scale | Load test with 1000 jobs before production rollout |
| Supabase connection limits | Use direct connection (non-pooled) for pg-boss |
| Data loss during migration | Full database backup before schema changes |
| Worker process crashes | Implement graceful shutdown + restart logic |
| Queue stalled jobs | Monitor `monitor-states` event, alert on anomalies |

---

## Dependencies

**External**:
- Supabase PostgreSQL (existing, verified working)
- Telegram Bot API (existing, no changes)

**Internal**:
- Existing Telegram service (src/services/telegram.ts) - unchanged
- Existing Express API routes - updated to use Supabase SDK
- Existing authentication middleware - updated to use Supabase SDK

---

## Testing Plan

### Unit Tests
- ✅ Telegram service mocks (existing)
- ⏭️ Supabase SDK query builders
- ⏭️ Job payload validation functions

### Integration Tests
- ⏭️ pg-boss queue lifecycle (send → work → complete)
- ⏭️ Campaign worker orchestration
- ⏭️ Message worker delivery + retry
- ⏭️ Rate limiting enforcement
- ⏭️ FLOOD_WAIT handling

### Manual Tests
- ⏭️ Create campaign via API
- ⏭️ Start campaign, verify jobs queued
- ⏭️ Monitor progress in Supabase + pg-boss tables
- ⏭️ Trigger FLOOD_WAIT, verify retry
- ⏭️ Pause/resume campaign

---

## Deployment Plan

### Development
1. Install dependencies (`npm install pg-boss`)
2. Update .env with Supabase credentials
3. Run schema migration in Supabase SQL Editor
4. Start API server: `npm run dev`
5. Start worker: `npx tsx src/worker-server.ts`

### Production
1. Deploy backend with updated dependencies
2. Start API server: `pm2 start npm --name api -- start`
3. Start worker: `pm2 start npm --name worker -- run start:worker`
4. Monitor logs for errors
5. Verify campaigns execute successfully

---

## Monitoring & Observability

**Queue Metrics** (via pg-boss `monitor-states` event):
- Jobs created/active/completed/failed per queue
- Job processing rate
- Average job duration

**Business Metrics** (via Supabase queries):
- Campaign completion rate
- Message delivery success rate
- Channel error rate
- FLOOD_WAIT frequency

**Alerting**:
- Alert if failed jobs > 10% of total
- Alert if no jobs processed in 5 minutes
- Alert on worker crash (via PM2)

---

## Documentation Updates

After implementation complete:
- ✅ Update README.md with pg-boss + Supabase instructions
- ✅ Update CONTRIBUTING.md with worker development guide
- ✅ Update deployment docs (Docker Compose, PM2 configs)
- ✅ Archive old BullMQ documentation

---

## Timeline Estimate

**Total**: ~3-5 days (1 developer)

| Phase | Duration | Tasks |
|-------|----------|-------|
| Setup | 0.5 days | Install deps, env config, schema migration |
| Core refactoring | 1.5 days | pg-boss queue, workers, Supabase SDK |
| API updates | 1 day | Replace Prisma in all endpoints |
| Testing | 0.5 days | Integration tests, manual smoke tests |
| Cleanup | 0.5 days | Remove old code, update docs |
| **Buffer** | 1 day | Debugging, edge cases |

---

## Next Steps

1. **Run `/speckit.tasks`** to generate detailed implementation task list
2. **Run `/speckit.implement`** to execute tasks with automated tracking
3. **Manual testing** after implementation
4. **Production deployment** with monitoring

---

**Phase 1 Complete** ✅
All design artifacts generated. Ready for task breakdown and implementation.
