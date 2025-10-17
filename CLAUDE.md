- работаетм только в папке D:\00_dev\01_Ведомости\Новая папка\бот_рассылка. пишем всегдя на русском

## Active Technologies

- **TypeScript** 5.3
- **Node.js** 20+
- **pg-boss** ^10.1.3 (PostgreSQL job queue)
- **Supabase** (@supabase/supabase-js ^2.75.0)
- **Express** 4.18 (API server)
- **Telegram** ^2.26.22 (GramJS client)

## Project Structure

```
backend/
├── src/
│   ├── server.ts              # Express API server
│   ├── worker-server.ts       # Worker process (pg-boss workers)
│   ├── queues/
│   │   └── pg-boss-queue.ts   # pg-boss initialization
│   ├── workers/
│   │   ├── campaign-worker.ts # Campaign orchestration worker
│   │   └── message-worker.ts  # Message delivery worker
│   ├── lib/
│   │   └── supabase.ts        # Supabase client
│   ├── api/
│   │   ├── campaigns.ts       # Campaign CRUD endpoints
│   │   └── ...                # Other API endpoints
│   └── services/
│       └── telegram.ts        # Telegram message sending

shared/
└── migrations/
    └── 001_remove_bullJobId.sql

specs/002-migrate-from-bullmq/
├── spec.md                # Feature specification
├── plan.md                # Implementation plan
├── research.md            # Technology decisions
├── data-model.md          # Database schema & contracts
├── quickstart.md          # Developer setup guide
└── contracts/
    ├── queue-jobs.ts      # pg-boss job payload types
    └── supabase-types.ts  # Supabase table types
```

## Key Implementation Details

### Queue System (pg-boss)

- **Queues**: `send-message`, `start-campaign`
- **Connection**: Direct Supabase connection (non-pooled)
- **Rate limiting**: Singleton jobs with `singletonSeconds`
- **Retry**: Exponential backoff (5s, 10s, 20s)

### Database Access (Supabase SDK)

- Replace all Prisma calls with Supabase SDK
- Table names: `users`, `campaigns`, `jobs`, `channels`, `batches`, `templates`, `audit_logs`
- Snake_case fields (e.g., `campaign_id`, `created_at`)

### Environment Variables

```env
SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[from dashboard]
SUPABASE_DIRECT_URL=postgres://postgres.qjnxcjbzwelokluaiqmk:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

## Recent Changes

**Feature 002: Migrate to pg-boss + Supabase SDK**
- Replaced BullMQ/Redis with pg-boss (PostgreSQL-based queue)
- Migrated from Prisma ORM to Supabase JavaScript SDK
- Removed Redis dependency (eliminated ECONNREFUSED errors)
- Dual-queue architecture: campaign orchestration + message delivery
- Rate limiting via pg-boss singleton jobs
- FLOOD_WAIT handling with custom retry delays

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
- я тебе еще раз говорю!!! работаем только в это папке D:\00_dev\01_Ведомости\Новая папка\бот_рассылка