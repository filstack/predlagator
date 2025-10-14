# Implementation Plan: Telegram Channel Broadcast Management System

**Branch**: `001-telegram-channel-broadcast` | **Date**: 2025-10-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-telegram-channel-broadcast/spec.md`

## Summary

Build a web-based Telegram broadcast management system enabling operators to send personalized messages to scraped channel lists while respecting Telegram rate limits. System comprises:

1. **React frontend (Vercel)**: shadcn UI-based web panel for catalog management, batch creation, message templating, campaign monitoring
2. **Backend API (Vercel)**: Lightweight CRUD operations, authentication, webhook receivers (<10s execution)
3. **Worker server (separate)**: Long-running GramJS campaign workers, job queue processing, rate-limit enforcement
4. **Data layer**: External Postgres database (Supabase/Railway/Neon), external file storage

**Core value**: Operators create batches from 10,000+ scraped channels, compose templated messages with placeholders, test safely, then execute campaigns with intelligent throttling to prevent Telegram bans.

**Technical approach** (from research.md):
- Frontend: React 18 + TypeScript + Vite + shadcn UI + Tailwind CSS + Zustand
- Backend: Node.js 20 + Express + GramJS + BullMQ (Redis queue)
- Database: Postgres (Supabase free tier) + Prisma ORM
- Deployment: Vercel (frontend + API) + Railway (worker server + Redis)

## Technical Context

**Language/Version**:
- **Frontend**: TypeScript 5.3, React 18.2, Node.js 20 LTS
- **Backend**: TypeScript 5.3, Node.js 20 LTS, Express 4.18

**Primary Dependencies**:
- **Frontend**:
  - React 18.2 (UI library)
  - shadcn/ui (component primitives + Radix UI)
  - Tailwind CSS 3.4 (styling)
  - Zustand 4.4 (state management - lighter than Redux)
  - react-hook-form 7.48 + zod 3.22 (form validation)
  - axios 1.6 (HTTP client)
  - date-fns 3.0 (date utilities)
  - recharts 2.10 (campaign metrics charts)
- **Backend**:
  - Express 4.18 (API server)
  - GramJS 2.19 (Telegram MTProto client)
  - BullMQ 5.1 + ioredis 5.3 (job queue)
  - Prisma 5.7 (ORM + migrations)
  - jose 5.1 (JWT auth)
  - bcrypt 5.1 (password hashing)
  - zod 3.22 (API validation)
  - node-cron 3.0 (scheduled campaign execution)

**Storage**:
- **Primary**: PostgreSQL 15+ via Supabase free tier (500 MB, connection pooling)
- **Queue**: Redis 7+ via Railway free tier or Upstash (persistent job queue)
- **File storage**: Supabase Storage or Cloudinary free tier (media uploads, import files)
- **Session strings**: AES-256 encrypted JSONB column in Postgres

**Testing**:
- **Frontend**: Vitest (unit), React Testing Library (component), Playwright (E2E)
- **Backend**: Jest (unit), Supertest (API integration)
- **Load**: k6 (campaign throughput validation)

**Target Platform**:
- **Frontend**: Vercel Edge Network (CDN), modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- **Backend API**: Vercel Serverless Functions (us-east-1 region)
- **Workers**: Railway container (512 MB RAM, persistent disk for logs)

**Project Type**: **Web application** (Option 2 from template)

**Performance Goals**:
- **Frontend**:
  - Initial page load: <3s on 3G (Lighthouse score >90)
  - Time to Interactive (TTI): <5s
  - Bundle size: <500 KB gzipped
- **Backend API**:
  - CRUD operations: <500ms p95
  - Authentication: <200ms p95
  - Campaign launch (job creation): <2s for 1000 channels
- **Workers**:
  - Message throughput: 2 msg/sec (conservative, configurable to 5 msg/sec)
  - Job processing: <50ms per job (excluding network)
  - Queue latency: <100ms (Redis publish/subscribe)

**Constraints**:
- **Vercel free tier**:
  - 10s function timeout (HARD limit)
  - 100 GB bandwidth/month
  - 45min build time
  - No persistent filesystem
- **Telegram API**:
  - 30 msg/sec global limit
  - 20 msg/min per chat limit
  - 50 MB media file size
  - FLOOD_WAIT errors require exponential backoff
- **Supabase free tier**:
  - 500 MB database
  - 2 GB bandwidth/month
  - 1 GB file storage
  - Connection pooling required (max 60 connections)
- **Railway free tier**:
  - 512 MB RAM
  - 1 GB disk
  - $5 monthly credit (~500 hours runtime)

**Scale/Scope**:
- **Users**: 10-50 operators, 3 roles (admin/operator/auditor)
- **Channels**: 100,000+ in catalog, 10,000 per batch maximum
- **Campaigns**: 100+ concurrent campaigns, 1000+ daily
- **Messages**: 50,000+ per day capacity (with throttling)
- **Data retention**: 1 year audit logs, unlimited campaign history

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Rate-Limit Protection (NON-NEGOTIABLE)

**Requirements**:
- Configurable throttle (msg/sec, delay)
- Exponential backoff on FLOOD_WAIT
- Auto-pause on repeated warnings
- Log all rate-limit violations
- Conservative defaults (1-5 workers)

**Implementation plan**:
- BullMQ rate limiter: `maxConcurrentJobs=1-5`, `delay=500ms-2000ms` per job
- FLOOD_WAIT handler: parse error, sleep for `error.seconds * 1.5`, retry with exponential backoff (2^attempt)
- Violation tracker: Redis counter, threshold=3 consecutive FLOOD errors → pause campaign + alert
- Logging: Winston structured logs to file + Supabase logs table
- **PASS**: All requirements addressed in worker architecture

### ✅ II. Job Persistence & Recovery

**Requirements**:
- Persistent storage (Redis/BullMQ/Postgres)
- Survive crashes/restarts
- Manual pause/resume
- Idempotent retries (no duplicates)
- State transitions tracked

**Implementation plan**:
- BullMQ with Redis persistence (AOF enabled on Railway)
- Job states: `waiting → active → completed|failed|paused`
- Pause/resume: BullMQ queue.pause()/resume() + campaign status in Postgres
- Idempotency: job ID = `campaign_id:channel_id`, check job status before send
- Recovery: BullMQ auto-resumes on restart, Postgres tracks campaign state
- **PASS**: BullMQ + Postgres provide full persistence

### ✅ III. Test Mode First

**Requirements**:
- Test mode sends to operator's account
- Message preview with placeholders
- Dry run logs without sending
- Explicit confirmation for live mode
- Risk indicators (Low/Medium/High)

**Implementation plan**:
- Campaign mode field: `test|live`, test mode overrides recipient with operator's peer ID
- Preview endpoint: `/api/campaigns/:id/preview/:channelId` renders template with channel data
- Dry run: `dryRun=true` flag → worker logs actions, marks jobs as `completed-dry-run`
- UI confirmation dialog: requires checking "I understand this will send X messages to Y channels"
- Risk score: algorithm based on batch size (>500=Medium, >2000=High), opt-out violations (=High)
- **PASS**: All test/safety features in campaign configuration

### ✅ IV. Batch Independence

**Requirements**:
- Independent create/edit/pause/resume
- Failures don't affect other batches
- Immutable metadata once launched
- UI/API separation from execution
- Import/export functionality

**Implementation plan**:
- Batch versioning: on campaign launch, snapshot batch channels to `campaign_channels` junction table
- Campaign isolation: separate BullMQ queue per campaign (namespace: `campaign:${id}`)
- Edit restrictions: API validates `status=draft` before mutations
- Worker architecture: each campaign has independent job processor, failure isolated
- Import/export: JSONL/CSV parsers in backend, validate before insert
- **PASS**: Architecture ensures complete isolation

### ✅ V. Security & Privacy

**Requirements**:
- AES-256 encrypted session strings at rest
- Service-account-only access
- RBAC (admin/operator/auditor)
- Honor opt-out flags
- Prevent .env commits
- Log security events

**Implementation plan**:
- Session encryption: `crypto.createCipheriv('aes-256-gcm')`, key in env var, IV stored with ciphertext
- Access control: JWT with `role` claim, middleware checks permissions per route
- RBAC implementation: Prisma RLS policies + middleware guards
- Opt-out validation: API checks `channel.opt_out` before adding to batch, UI shows warning
- Git security: `.gitignore` includes `.env`, pre-commit hook scans for secrets
- Audit logging: middleware logs all mutations to `audit_logs` table
- **PASS**: Full security suite in auth + middleware layers

### ✅ VI. Modern Frontend Stack

**Requirements**:
- React + TypeScript
- shadcn UI components
- Responsive (desktop/laptop/tablet)
- WCAG 2.1 AA accessibility
- Code splitting/lazy loading
- Performance optimization

**Implementation plan**:
- Stack: React 18 + TypeScript 5.3 + Vite 5 + shadcn/ui + Tailwind CSS
- Components: Button, Table, Dialog, Form, Select, Input, Textarea, Badge, Card, Tabs, Alert, Toast (all shadcn)
- Responsive: Tailwind breakpoints `sm:`, `md:`, `lg:` for 768px, 1366px, 1920px viewports
- Accessibility: ARIA labels on all interactive elements, keyboard navigation with `focus-visible`, semantic HTML5
- Code splitting: `React.lazy()` for pages, `loadable-components` for heavy tables
- Performance: `React.memo()` for list items, `useMemo()` for expensive calculations, `useCallback()` for callbacks
- **PASS**: Architecture follows all frontend principles

### ✅ VII. Free-Tier Deployment (Vercel)

**Requirements**:
- Vercel free tier compliance
- 10s function limit
- <45min build time
- <100 GB bandwidth/month
- External DB/storage
- Long-running workers separate

**Implementation plan**:
- **Vercel deployment**:
  - Frontend: Vite static build → Vercel CDN
  - API routes: Express mounted on Vercel Functions (CRUD only, <10s)
  - Auth endpoints: JWT generation/validation (<1s)
- **Railway deployment**:
  - Worker server: Node.js process with BullMQ consumers
  - Redis: Railway Redis addon or Upstash
  - Persistent logs: Railway disk volume
- **Architecture split**:
  - Vercel: frontend serving + `/api/channels`, `/api/batches`, `/api/campaigns` (CRUD), `/api/auth`
  - Railway: `/workers` process, GramJS clients, job execution
  - Communication: Railway worker polls Redis queue, updates Postgres directly
- **Optimizations**:
  - Build time: incremental Vite builds, npm cache, Turbo
  - Bandwidth: gzip compression, Vercel Image Optimization, CDN caching
  - Function execution: early return on validation errors, minimize DB queries
- **PASS**: Clear architecture split, all limits respected

### 🟡 Constitution Compliance Summary

**Status**: ✅ **ALL PRINCIPLES PASS** - No violations

All 7 constitutional principles are fully addressed in the planned architecture:
1. Rate limiting via BullMQ + Redis + FLOOD_WAIT handlers
2. Persistence via BullMQ + Postgres + Railway Redis AOF
3. Test mode + dry run + preview + risk scoring in campaign config
4. Batch independence via versioning + isolated queues + immutable snapshots
5. Security via AES-256 + JWT RBAC + audit logs + opt-out checks
6. Frontend via React + TypeScript + shadcn + Tailwind + accessibility
7. Deployment via Vercel (UI/API) + Railway (workers) split architecture

**No complexity tracking required** - architecture is straightforward and follows constitution without compromises.

## Project Structure

### Documentation (this feature)

```
specs/001-telegram-channel-broadcast/
├── plan.md              # This file
├── research.md          # Phase 0: Technology choices, GramJS patterns, Vercel limits
├── data-model.md        # Phase 1: Database schema (Prisma models)
├── quickstart.md        # Phase 1: Local dev setup, env vars, running services
├── contracts/           # Phase 1: OpenAPI specs for all endpoints
│   ├── channels.yaml    # Channel CRUD, import, availability check
│   ├── batches.yaml     # Batch CRUD, import/export, clone
│   ├── campaigns.yaml   # Campaign CRUD, launch, pause/resume, metrics
│   ├── templates.yaml   # Message template CRUD, preview
│   ├── auth.yaml        # Login, logout, token refresh, user management
│   └── webhooks.yaml    # Telegram delivery webhooks
└── tasks.md             # Phase 2: Implementation tasks (generated by /speckit.tasks)
```

### Source Code (repository root)

```
бот_рассылка/
├── frontend/                      # React SPA (deployed to Vercel)
│   ├── src/
│   │   ├── components/            # Reusable shadcn-based components
│   │   │   ├── ui/                # shadcn components (button, table, dialog, etc.)
│   │   │   ├── channels/          # ChannelTable, ChannelFilters, ChannelPreview
│   │   │   ├── batches/           # BatchList, BatchForm, BatchChannelSelector
│   │   │   ├── campaigns/         # CampaignForm, CampaignMonitor, CampaignMetrics
│   │   │   ├── templates/         # MessageEditor, PlaceholderPicker, MediaUploader
│   │   │   └── layout/            # Navbar, Sidebar, PageHeader, Footer
│   │   ├── pages/                 # Route-level components
│   │   │   ├── Channels.tsx       # Channel catalog + filters
│   │   │   ├── Batches.tsx        # Batch list + CRUD
│   │   │   ├── Campaigns.tsx      # Campaign list + launch
│   │   │   ├── CampaignDetail.tsx # Live monitoring + metrics
│   │   │   ├── Templates.tsx      # Message template library
│   │   │   ├── History.tsx        # Campaign history + reports
│   │   │   ├── Users.tsx          # User management (admin only)
│   │   │   └── Login.tsx          # Authentication
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useChannels.ts     # Fetch/filter channels
│   │   │   ├── useBatches.ts      # Batch CRUD operations
│   │   │   ├── useCampaigns.ts    # Campaign lifecycle
│   │   │   ├── useAuth.ts         # Login/logout/token management
│   │   │   └── usePolling.ts      # Generic polling hook for real-time updates
│   │   ├── lib/                   # Utilities
│   │   │   ├── api-client.ts      # Axios wrapper with auth + error handling
│   │   │   ├── validation.ts      # Zod schemas (shared with backend)
│   │   │   ├── placeholder.ts     # Template placeholder substitution
│   │   │   └── format.ts          # Date/number formatting
│   │   ├── types/                 # TypeScript definitions
│   │   │   ├── channel.ts         # Channel entity + filters
│   │   │   ├── batch.ts           # Batch entity
│   │   │   ├── campaign.ts        # Campaign entity + config
│   │   │   ├── template.ts        # MessageTemplate entity
│   │   │   └── api.ts             # API request/response types
│   │   ├── store/                 # Zustand stores
│   │   │   ├── auth.ts            # User session + permissions
│   │   │   ├── campaigns.ts       # Active campaign state
│   │   │   └── notifications.ts   # Toast messages
│   │   ├── App.tsx                # Root component + routing
│   │   └── main.tsx               # Vite entry point
│   ├── public/                    # Static assets
│   ├── index.html                 # HTML template
│   ├── vite.config.ts             # Vite configuration
│   ├── tailwind.config.js         # Tailwind CSS configuration
│   ├── tsconfig.json              # TypeScript configuration
│   └── package.json               # Frontend dependencies
│
├── backend/                       # Node.js API + Workers
│   ├── src/
│   │   ├── api/                   # Express API routes (Vercel Functions)
│   │   │   ├── channels.ts        # GET /api/channels, POST /api/channels/import
│   │   │   ├── batches.ts         # CRUD /api/batches, POST /api/batches/:id/clone
│   │   │   ├── campaigns.ts       # CRUD /api/campaigns, POST /api/campaigns/:id/launch
│   │   │   ├── templates.ts       # CRUD /api/templates, GET /api/templates/:id/preview
│   │   │   ├── auth.ts            # POST /api/auth/login, /logout, /refresh
│   │   │   ├── users.ts           # CRUD /api/users (admin only)
│   │   │   └── webhooks.ts        # POST /api/webhooks/telegram
│   │   ├── workers/               # Long-running job processors (Railway)
│   │   │   ├── campaign-worker.ts # BullMQ consumer for campaign jobs
│   │   │   ├── telegram-client.ts # GramJS connection pool manager
│   │   │   └── scheduler.ts       # node-cron for scheduled campaign launches
│   │   ├── services/              # Business logic
│   │   │   ├── channel-service.ts # Channel CRUD, import parser, availability check
│   │   │   ├── batch-service.ts   # Batch CRUD, channel management, import/export
│   │   │   ├── campaign-service.ts# Campaign lifecycle, job creation, metrics
│   │   │   ├── template-service.ts# Template CRUD, placeholder substitution
│   │   │   ├── queue-service.ts   # BullMQ job queue management
│   │   │   └── telegram-service.ts# GramJS send/resolve operations
│   │   ├── models/                # Prisma ORM models
│   │   │   └── schema.prisma      # Database schema (Channel, Batch, Campaign, etc.)
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.ts            # JWT validation + RBAC
│   │   │   ├── error-handler.ts   # Global error handling
│   │   │   ├── validation.ts      # Zod request validation
│   │   │   └── audit-logger.ts    # Audit log middleware
│   │   ├── utils/                 # Utilities
│   │   │   ├── encryption.ts      # AES-256 for session strings
│   │   │   ├── jwt.ts             # JWT generation/validation
│   │   │   ├── logger.ts          # Winston logger configuration
│   │   │   └── rate-limiter.ts    # Telegram rate limit logic
│   │   ├── app.ts                 # Express app setup
│   │   ├── server.ts              # HTTP server (local dev)
│   │   ├── worker-server.ts       # Worker process entry point (Railway)
│   │   └── vercel.ts              # Vercel Functions entry point
│   ├── prisma/
│   │   └── migrations/            # Database migrations
│   ├── tests/
│   │   ├── api/                   # API route tests (Supertest)
│   │   ├── services/              # Service unit tests (Jest)
│   │   └── integration/           # End-to-end tests
│   ├── tsconfig.json              # TypeScript configuration
│   └── package.json               # Backend dependencies
│
├── shared/                        # Shared TypeScript types + validators
│   ├── types/                     # Type definitions (imported by frontend + backend)
│   │   ├── entities.ts            # Channel, Batch, Campaign, Template, User
│   │   └── api.ts                 # API request/response types
│   ├── validation/                # Zod schemas (imported by frontend + backend)
│   │   ├── channel.ts             # Channel validation
│   │   ├── batch.ts               # Batch validation
│   │   ├── campaign.ts            # Campaign configuration validation
│   │   └── template.ts            # Message template validation
│   └── package.json               # Shared package
│
├── batched_files/                 # Scraped channel data (imported via script)
│   ├── links_новости_20250929_114926/
│   │   └── *.jsonl                # JSONL files with channel data
│   ├── links_технологии_20250929_122124/
│   └── ...
│
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore (includes .env)
├── vercel.json                    # Vercel configuration
├── railway.toml                   # Railway configuration
├── package.json                   # Root workspace package
└── README.md                      # Project documentation
```

**Structure Decision**: **Web application** (Option 2) selected because:
1. System has distinct UI (React) and API (Express) concerns
2. Frontend and backend have different deployment targets (Vercel vs Railway)
3. Separation enables independent scaling (frontend CDN-cached, backend worker-intensive)
4. Shared types package provides type safety across frontend/backend boundary

Alternative (Option 1 - single project) rejected because mixing UI and worker code violates Vercel deployment constraints (no long-running processes in functions).

## Complexity Tracking

*No entries* - All constitutional principles satisfied without compromises.

The architecture is straightforward:
- Standard web app split (frontend/backend)
- Proven technology choices (React, Express, Postgres, Redis)
- Clear deployment boundaries (Vercel for UI, Railway for workers)
- No custom abstractions or complex patterns needed

---

**Next Steps**: Proceed to Phase 0 (research.md generation)
