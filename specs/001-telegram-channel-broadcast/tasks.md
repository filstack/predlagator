# Tasks: Telegram Channel Broadcast Management System

**Input**: Design documents from `/specs/001-telegram-channel-broadcast/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT included in this task list (not requested in specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US9)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/`, `shared/`
- All paths are absolute from repository root: `бот_рассылка/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create root project structure with folders: `frontend/`, `backend/`, `shared/`, `batched_files/`
- [x] T002 [P] Initialize frontend package: `cd frontend && npm init -y`, install React 18.2, TypeScript 5.3, Vite 5.0, Tailwind CSS 3.4
- [x] T003 [P] Initialize backend package: `cd backend && npm init -y`, install Node.js 20, TypeScript 5.3, Express 4.18, Prisma 5.7
- [x] T004 [P] Initialize shared package: `cd shared && npm init -y`, install zod 3.22, TypeScript 5.3
- [ ] T005 [P] Configure TypeScript for frontend in `frontend/tsconfig.json` with strict mode, path aliases (`@/*`)
- [ ] T006 [P] Configure TypeScript for backend in `backend/tsconfig.json` with strict mode, Node.js target
- [ ] T007 [P] Configure Vite in `frontend/vite.config.ts` with React plugin, path aliases, build optimizations
- [ ] T008 [P] Configure Tailwind CSS in `frontend/tailwind.config.js` with custom theme, shadcn UI paths
- [ ] T009 [P] Initialize shadcn UI: `npx shadcn-ui@latest init` in frontend directory
- [ ] T010 [P] Add shadcn components: button, table, dialog, form, select, input, textarea, badge, card, tabs, alert, toast
- [ ] T011 Create `.env.example` files in `frontend/` and `backend/` with required environment variables
- [ ] T012 Configure ESLint and Prettier in root with shared config for TypeScript, React, Node.js
- [ ] T013 Create `.gitignore` with entries: `.env`, `node_modules/`, `dist/`, `.vercel/`, `.railway/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & ORM Setup

- [ ] T014 Create Prisma schema in `shared/prisma/schema.prisma` with all 7 entities (User, Channel, Batch, Template, Campaign, Job, AuditLog) from data-model.md
- [ ] T015 Configure Prisma client generation in `shared/package.json` scripts: `generate`, `migrate:dev`, `migrate:deploy`
- [ ] T016 Create initial migration: `npx prisma migrate dev --name init` to create all database tables
- [ ] T017 Create database seed script in `shared/prisma/seed.ts` with admin user, sample channels, sample template
- [ ] T018 Generate Prisma client: `npx prisma generate` for TypeScript types

### Authentication & Authorization Framework

- [ ] T019 [P] Implement JWT utilities in `backend/src/utils/jwt.ts` using jose 5.1: signJWT(), verifyJWT()
- [ ] T020 [P] Implement bcrypt utilities in `backend/src/utils/bcrypt.ts`: hashPassword(), comparePassword()
- [ ] T021 [P] Create auth middleware in `backend/src/middleware/auth.ts`: authenticate() validates JWT token
- [ ] T022 [P] Create RBAC middleware in `backend/src/middleware/authorize.ts`: authorize(role) checks user permissions
- [ ] T023 Implement session encryption utilities in `backend/src/utils/encryption.ts`: encryptSession(), decryptSession() using AES-256-GCM

### API Infrastructure

- [ ] T024 [P] Setup Express app in `backend/src/app.ts` with CORS, helmet, JSON parser, error handler
- [ ] T025 [P] Create error handler middleware in `backend/src/middleware/error-handler.ts` with standardized error format
- [ ] T026 [P] Create validation middleware in `backend/src/middleware/validation.ts` using zod schemas from shared/
- [ ] T027 [P] Create audit logger middleware in `backend/src/middleware/audit-logger.ts` logs all mutations to audit_logs table
- [ ] T028 [P] Setup API routing structure in `backend/src/api/index.ts` mounting all route modules
- [ ] T029 Create server entry point in `backend/src/server.ts` for local development
- [ ] T030 Create Vercel Functions entry point in `backend/src/vercel.ts` for serverless deployment

### Job Queue Infrastructure

- [ ] T031 [P] Setup Redis connection in `backend/src/workers/redis.ts` using ioredis 5.3
- [ ] T032 [P] Create BullMQ queue utilities in `backend/src/workers/queues.ts`: createCampaignQueue(), getCampaignQueue()
- [ ] T033 [P] Create BullMQ worker factory in `backend/src/workers/campaign-worker.ts`: createCampaignWorker() with rate limiting
- [ ] T034 Create worker server entry point in `backend/src/worker-server.ts` for Railway deployment

### Telegram Integration

- [ ] T035 [P] Create GramJS client pool manager in `backend/src/services/telegram/client-pool.ts`: createClient(), getClient()
- [ ] T036 [P] Implement Telegram send service in `backend/src/services/telegram/send-message.ts`: sendMessage() with FLOOD_WAIT handling
- [ ] T037 [P] Implement rate limit tracker in `backend/src/services/monitoring/rate-limit-tracker.ts`: logFloodWait(), checkViolations()

### Shared Validation Schemas

- [ ] T038 [P] Create channel validation schema in `shared/src/schemas/channel.ts` using zod
- [ ] T039 [P] Create batch validation schema in `shared/src/schemas/batch.ts` using zod
- [ ] T040 [P] Create campaign validation schema in `shared/src/schemas/campaign.ts` using zod
- [ ] T041 [P] Create template validation schema in `shared/src/schemas/template.ts` using zod
- [ ] T042 [P] Create auth validation schema in `shared/src/schemas/auth.ts` using zod

### Frontend Infrastructure

- [ ] T043 [P] Create Zustand auth store in `frontend/src/store/auth.ts`: user, token, login(), logout()
- [ ] T044 [P] Create Zustand notifications store in `frontend/src/store/notifications.ts`: toast messages
- [ ] T045 [P] Create API client wrapper in `frontend/src/lib/api-client.ts` using axios with auth headers, error handling
- [ ] T046 [P] Setup React Router in `frontend/src/App.tsx` with protected routes, role-based access
- [ ] T047 [P] Create main layout component in `frontend/src/components/layout/MainLayout.tsx` with navbar, sidebar
- [ ] T048 [P] Create placeholder substitution utility in `frontend/src/lib/placeholder.ts`: renderTemplate()
- [ ] T049 Create environment config loader in `frontend/src/lib/env.ts`: loads VITE_BACKEND_URL, validates required vars

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Send First Campaign (Priority: P1) 🎯 MVP

**Goal**: Enable operators to select channels, create message, and send first broadcast

**Independent Test**: View catalog → create batch → write template → test send → launch campaign

### Backend: Channel Services & APIs (US1)

- [ ] T050 [P] [US1] Implement channel service in `backend/src/services/channel-service.ts`: listChannels(), getChannel(), importChannels()
- [ ] T051 [P] [US1] Create channels API routes in `backend/src/api/channels.ts`: GET /api/channels, GET /api/channels/:id (from contracts/channels.yaml)
- [ ] T052 [US1] Add channel import endpoint in `backend/src/api/channels.ts`: POST /api/channels/import with JSONL parsing

### Backend: Batch Services & APIs (US1)

- [ ] T053 [P] [US1] Implement batch service in `backend/src/services/batch-service.ts`: createBatch(), getBatch(), addChannelsToBatch()
- [ ] T054 [US1] Create batches API routes in `backend/src/api/batches.ts`: POST /api/batches, GET /api/batches/:id (from contracts/batches.yaml)

### Backend: Template Services & APIs (US1)

- [ ] T055 [P] [US1] Implement template service in `backend/src/services/template-service.ts`: createTemplate(), renderTemplate()
- [ ] T056 [US1] Create templates API routes in `backend/src/api/templates.ts`: POST /api/templates, GET /api/templates/:id/preview (from contracts/templates.yaml)

### Backend: Campaign Services & APIs (US1)

- [ ] T057 [US1] Implement campaign service in `backend/src/services/campaign-service.ts`: createCampaign(), startCampaign(), getCampaignStatus()
- [ ] T058 [US1] Create campaigns API routes in `backend/src/api/campaigns.ts`: POST /api/campaigns, POST /api/campaigns/:id/start, GET /api/campaigns/:id (from contracts/campaigns.yaml)
- [ ] T059 [US1] Implement job creation logic in campaign service: createJobsForCampaign() generates Job records for all channels in batch
- [ ] T060 [US1] Implement BullMQ job enqueue logic in campaign service: addJobsToQueue() with rate limiting config

### Backend: Worker Job Processing (US1)

- [ ] T061 [US1] Implement job processor in `backend/src/workers/job-processor.ts`: processJob() sends message via GramJS, updates Job status
- [ ] T062 [US1] Add error handling for FLOOD_WAIT, PEER_ID_INVALID, NETWORK_ERROR in job processor
- [ ] T063 [US1] Implement retry logic with exponential backoff in job processor

### Frontend: Channel Catalog UI (US1)

- [ ] T064 [P] [US1] Create ChannelTable component in `frontend/src/components/channels/ChannelTable.tsx` using shadcn Table
- [ ] T065 [P] [US1] Create ChannelFilters component in `frontend/src/components/channels/ChannelFilters.tsx` with category, date range filters
- [ ] T066 [US1] Create Channels page in `frontend/src/pages/Channels.tsx` with table, filters, multiselect, "Add to Batch" button
- [ ] T067 [US1] Create useChannels hook in `frontend/src/hooks/useChannels.ts`: fetchChannels(), selectChannels()

### Frontend: Batch Creation UI (US1)

- [ ] T068 [P] [US1] Create BatchForm component in `frontend/src/components/batches/BatchForm.tsx` using shadcn Form + react-hook-form
- [ ] T069 [US1] Create batch creation modal in `frontend/src/components/batches/CreateBatchDialog.tsx` triggered from Channels page
- [ ] T070 [US1] Create useBatches hook in `frontend/src/hooks/useBatches.ts`: createBatch(), getBatch()

### Frontend: Message Editor UI (US1)

- [ ] T071 [P] [US1] Create MessageEditor component in `frontend/src/components/templates/MessageEditor.tsx` with Textarea, placeholder picker
- [ ] T072 [P] [US1] Create PlaceholderPicker component in `frontend/src/components/templates/PlaceholderPicker.tsx` shows available {{placeholders}}
- [ ] T073 [US1] Create template preview in `frontend/src/components/templates/TemplatePreview.tsx` renders message with sample data

### Frontend: Campaign Launch UI (US1)

- [ ] T074 [US1] Create CampaignForm component in `frontend/src/components/campaigns/CampaignForm.tsx` with batch selector, template, mode (test/live), throttle config
- [ ] T075 [US1] Create campaign creation page in `frontend/src/pages/CreateCampaign.tsx` with form, preview, launch button
- [ ] T076 [US1] Create useCampaigns hook in `frontend/src/hooks/useCampaigns.ts`: createCampaign(), startCampaign(), getCampaign()

### Frontend: Live Campaign Monitor (US1)

- [ ] T077 [US1] Create CampaignMonitor component in `frontend/src/components/campaigns/CampaignMonitor.tsx` with real-time log stream
- [ ] T078 [US1] Create campaign detail page in `frontend/src/pages/CampaignDetail.tsx` with metrics, progress bar, event log
- [ ] T079 [US1] Implement polling hook in `frontend/src/hooks/usePolling.ts`: polls /api/campaigns/:id every 5s while campaign running

**Checkpoint**: User Story 1 complete - operators can select channels, create batch, write message, send test campaign, monitor live execution

---

## Phase 4: User Story 2 - Manage and Refine Batches (Priority: P2)

**Goal**: Enable batch management, refinement, cloning, and templates

**Independent Test**: Create batch → add/remove channels → clone batch → save as template → export/import

### Backend: Batch Management Services (US2)

- [ ] T080 [P] [US2] Extend batch service in `backend/src/services/batch-service.ts`: updateBatch(), deleteBatch(), cloneBatch()
- [ ] T081 [P] [US2] Add batch export/import logic in batch service: exportBatchToCSV(), importBatchFromCSV()
- [ ] T082 [US2] Add batch template functionality in batch service: saveAsTemplate(), listTemplates()

### Backend: Batch Management APIs (US2)

- [ ] T083 [P] [US2] Add batch management endpoints in `backend/src/api/batches.ts`: PATCH /api/batches/:id, DELETE /api/batches/:id
- [ ] T084 [P] [US2] Add batch cloning endpoint in `backend/src/api/batches.ts`: POST /api/batches/:id/clone
- [ ] T085 [US2] Add batch export/import endpoints in `backend/src/api/batches.ts`: GET /api/batches/:id/export, POST /api/batches/import

### Frontend: Batch List & Management UI (US2)

- [ ] T086 [P] [US2] Create BatchList component in `frontend/src/components/batches/BatchList.tsx` displays all batches with status
- [ ] T087 [P] [US2] Create Batches page in `frontend/src/pages/Batches.tsx` with list, create button, search/filter
- [ ] T088 [US2] Add edit batch dialog in `frontend/src/components/batches/EditBatchDialog.tsx` for adding/removing channels

### Frontend: Batch Operations UI (US2)

- [ ] T089 [P] [US2] Add clone batch action in BatchList component with confirmation dialog
- [ ] T090 [P] [US2] Add delete batch action in BatchList component with confirmation (only for draft batches)
- [ ] T091 [US2] Create batch export button in `frontend/src/components/batches/ExportBatchButton.tsx` downloads CSV/NDJSON
- [ ] T092 [US2] Create batch import dialog in `frontend/src/components/batches/ImportBatchDialog.tsx` with file upload, validation

**Checkpoint**: User Story 2 complete - operators can manage, refine, clone, export/import batches

---

## Phase 5: User Story 3 - Advanced Message Personalization (Priority: P2)

**Goal**: Sophisticated templates with media, validation, preview

**Independent Test**: Create template with placeholders → attach media → validate limits → preview for channels → save template

### Backend: Template Enhancement Services (US3)

- [ ] T093 [P] [US3] Extend template service in `backend/src/services/template-service.ts`: validateTemplateLength(), uploadMedia()
- [ ] T094 [P] [US3] Add media attachment support in template service: validateMediaSize(), processBase64Media()
- [ ] T095 [US3] Add template preview logic in template service: previewTemplateForChannel() renders with actual channel data

### Backend: Template APIs (US3)

- [ ] T096 [P] [US3] Extend templates API in `backend/src/api/templates.ts`: GET /api/templates, PATCH /api/templates/:id
- [ ] T097 [US3] Add template preview endpoint in `backend/src/api/templates.ts`: POST /api/templates/:id/preview with channel ID

### Frontend: Advanced Message Editor (US3)

- [ ] T098 [P] [US3] Enhance MessageEditor component in `frontend/src/components/templates/MessageEditor.tsx` with character count, warning indicator
- [ ] T099 [P] [US3] Create MediaUploader component in `frontend/src/components/templates/MediaUploader.tsx` supports URL, file upload, base64
- [ ] T100 [US3] Add media validation in MessageEditor: check file size <50MB, supported MIME types
- [ ] T101 [US3] Create media preview in MessageEditor: display image/video thumbnail

### Frontend: Template Library UI (US3)

- [ ] T102 [P] [US3] Create TemplateList component in `frontend/src/components/templates/TemplateList.tsx` displays saved templates
- [ ] T103 [P] [US3] Create Templates page in `frontend/src/pages/Templates.tsx` with list, create button, selection dropdown
- [ ] T104 [US3] Add template preview modal in `frontend/src/components/templates/PreviewTemplateDialog.tsx` shows rendered message for selected channel

### Frontend: Template Preview (US3)

- [ ] T105 [US3] Create channel selector in preview dialog: dropdown to pick any channel from batch
- [ ] T106 [US3] Implement preview fetching in useTemplates hook: previewTemplate(templateId, channelId)

**Checkpoint**: User Story 3 complete - operators can create sophisticated templates with media, validate, preview for any channel

---

## Phase 6: User Story 4 - Delivery Configuration & Safety (Priority: P1)

**Goal**: Configure throttling, retries, proxies, scheduling, limits

**Independent Test**: Configure throttle → set retry policy → select proxy → schedule campaign → set daily limits

### Backend: Delivery Configuration (US4)

- [ ] T107 [P] [US4] Extend campaign service in `backend/src/services/campaign-service.ts`: validateDeliveryConfig(), calculateEstimatedDuration()
- [ ] T108 [P] [US4] Add scheduling logic in campaign service: scheduleCampaign() creates scheduled job in BullMQ
- [ ] T109 [US4] Implement quota enforcement in campaign service: checkDailyQuota(), validateBatchLimit()

### Backend: Proxy Management (US4)

- [ ] T110 [P] [US4] Create proxy service in `backend/src/services/proxy-service.ts`: listProxyGroups(), testProxyConnection()
- [ ] T111 [US4] Add proxy selection to GramJS client creation in telegram client pool

### Backend: Concurrency & Rate Limiting (US4)

- [ ] T112 [US4] Implement session concurrency manager in `backend/src/workers/session-manager.ts`: manages N parallel GramJS clients
- [ ] T113 [US4] Update BullMQ worker in campaign-worker.ts to support configurable concurrency (1-5 workers)
- [ ] T114 [US4] Implement global rate limit coordinator in `backend/src/workers/rate-limiter.ts`: enforces cross-campaign throttle

### Frontend: Delivery Configuration UI (US4)

- [ ] T115 [P] [US4] Create DeliveryConfigForm component in `frontend/src/components/campaigns/DeliveryConfigForm.tsx` with throttle, retry, proxy, schedule inputs
- [ ] T116 [P] [US4] Add throttle configuration in CampaignForm: messages/second slider, delay between sends
- [ ] T117 [P] [US4] Add retry policy configuration in CampaignForm: retry count (0-5), backoff strategy (linear/exponential)
- [ ] T118 [P] [US4] Add proxy selection dropdown in CampaignForm: lists proxy groups, "no proxy" option
- [ ] T119 [P] [US4] Add scheduling date/time picker in CampaignForm using shadcn Calendar component
- [ ] T120 [US4] Add campaign limits configuration in CampaignForm: max messages/day, per-batch limit

### Frontend: Configuration Validation (US4)

- [ ] T121 [US4] Implement pre-launch validation in CampaignForm: validates batch size against limits, checks quota
- [ ] T122 [US4] Display estimated completion time in CampaignForm based on throttle settings and batch size

**Checkpoint**: User Story 4 complete - operators can configure delivery parameters, throttling, retries, proxies, scheduling, safety limits

---

## Phase 7: User Story 5 - Test Mode & A/B Testing (Priority: P2)

**Goal**: Validate campaigns through test sends, dry runs, A/B testing

**Independent Test**: Run dry-run → send test message → configure A/B test with 2 variants

### Backend: Test Mode Services (US5)

- [ ] T123 [P] [US5] Implement dry-run mode in campaign service: executeDryRun() logs actions without sending
- [ ] T124 [P] [US5] Add test mode logic in job processor: sendTestMessage() overrides recipient with operator's account
- [ ] T125 [US5] Implement A/B test service in `backend/src/services/ab-test-service.ts`: splitBatch(), trackVariantMetrics()

### Backend: Test Mode APIs (US5)

- [ ] T126 [P] [US5] Add dry-run endpoint in `backend/src/api/campaigns.ts`: POST /api/campaigns/:id/dry-run
- [ ] T127 [US5] Add test send endpoint in `backend/src/api/campaigns.ts`: POST /api/campaigns/:id/test with target chat ID

### Frontend: Test Mode UI (US5)

- [ ] T128 [P] [US5] Add test mode toggle in CampaignForm: "Dry Run" checkbox, "Test Mode" radio button
- [ ] T129 [P] [US5] Create test send dialog in `frontend/src/components/campaigns/TestSendDialog.tsx`: input for test chat ID, send button
- [ ] T130 [US5] Display dry-run results in `frontend/src/components/campaigns/DryRunResults.tsx`: shows log of intended actions

### Frontend: A/B Testing UI (US5)

- [ ] T131 [US5] Create ABTestConfig component in `frontend/src/components/campaigns/ABTestConfig.tsx`: 2 template selectors, sample percentage slider
- [ ] T132 [US5] Add A/B test section to CampaignForm: enable checkbox, variant A/B template selection, sample size input

**Checkpoint**: User Story 5 complete - operators can run dry-runs, send test messages, configure A/B tests

---

## Phase 8: User Story 6 - Real-Time Monitoring & Control (Priority: P1)

**Goal**: Monitor campaign progress, view metrics, pause/resume execution

**Independent Test**: Launch campaign → view live log → check metrics → pause → resume

### Backend: Campaign Control Services (US6)

- [ ] T133 [P] [US6] Implement pause campaign in campaign service: pauseCampaign() updates status, pauses BullMQ queue
- [ ] T134 [P] [US6] Implement resume campaign in campaign service: resumeCampaign() updates status, resumes BullMQ queue
- [ ] T135 [US6] Implement metrics aggregation in campaign service: getCampaignMetrics() queries job counts by status

### Backend: Campaign Control APIs (US6)

- [ ] T136 [P] [US6] Add campaign control endpoints in `backend/src/api/campaigns.ts`: POST /api/campaigns/:id/pause, POST /api/campaigns/:id/resume
- [ ] T137 [US6] Enhance campaign status endpoint in campaigns API: returns job metrics (queued, sending, sent, failed counts)

### Frontend: Live Event Log (US6)

- [ ] T138 [P] [US6] Create EventLog component in `frontend/src/components/campaigns/EventLog.tsx`: displays streaming job events
- [ ] T139 [US6] Implement log polling in EventLog: fetches recent job updates every 2-3 seconds
- [ ] T140 [US6] Add event type badges in EventLog: colored badges for queued/sent/failed status

### Frontend: Campaign Metrics Dashboard (US6)

- [ ] T141 [P] [US6] Create CampaignMetrics component in `frontend/src/components/campaigns/CampaignMetrics.tsx`: displays total sent, delivery rate, speed, error breakdown
- [ ] T142 [P] [US6] Add progress bar to CampaignMonitor: shows percentage complete (sent + failed / total)
- [ ] T143 [US6] Create error breakdown chart in CampaignMetrics: pie chart of error types (FLOOD_WAIT, PEER_ID_INVALID, etc.)

### Frontend: Campaign Control Buttons (US6)

- [ ] T144 [P] [US6] Add pause button to campaign detail page: calls POST /api/campaigns/:id/pause
- [ ] T145 [US6] Add resume button to campaign detail page: calls POST /api/campaigns/:id/resume, enabled only when status=paused

**Checkpoint**: User Story 6 complete - operators can monitor campaigns in real-time, view metrics, pause/resume execution

---

## Phase 9: User Story 7 - Campaign History & Reporting (Priority: P3)

**Goal**: View campaign history, download reports, risk assessment

**Independent Test**: View history table → filter by date/status → download CSV/JSON report → check risk indicators

### Backend: History & Reporting Services (US7)

- [ ] T146 [P] [US7] Implement campaign history service in `backend/src/services/history-service.ts`: listCampaignHistory() with filters
- [ ] T147 [P] [US7] Implement report generation in history service: generateReport() exports CSV/JSON
- [ ] T148 [US7] Implement risk scoring in `backend/src/services/risk-service.ts`: calculateBatchRisk() based on size, failure rates

### Backend: History & Reporting APIs (US7)

- [ ] T149 [P] [US7] Create history API routes in `backend/src/api/history.ts`: GET /api/campaigns/history with date, status, owner filters
- [ ] T150 [US7] Add report download endpoint in history API: GET /api/campaigns/:id/report with format=csv|json query param

### Frontend: Campaign History UI (US7)

- [ ] T151 [P] [US7] Create CampaignHistory component in `frontend/src/components/campaigns/CampaignHistory.tsx`: table with all past campaigns
- [ ] T152 [P] [US7] Create History page in `frontend/src/pages/History.tsx` with table, filters (date range, status, owner)
- [ ] T153 [US7] Add report download button in History page: downloads CSV/JSON file for selected campaign

### Frontend: Risk Assessment UI (US7)

- [ ] T154 [P] [US7] Create RiskIndicator component in `frontend/src/components/batches/RiskIndicator.tsx`: displays Low/Medium/High badge
- [ ] T155 [US7] Add risk indicator to BatchList: shows risk score for each batch
- [ ] T156 [US7] Display risk warning in CampaignForm: alerts if batch risk is Medium/High before launch

**Checkpoint**: User Story 7 complete - operators can view campaign history, download reports, see risk indicators

---

## Phase 10: User Story 8 - Channel Discovery & Verification (Priority: P3)

**Goal**: Powerful filtering, availability verification, channel previews

**Independent Test**: Apply multi-criteria filters → check channel availability → view channel preview

### Backend: Channel Discovery Services (US8)

- [ ] T157 [P] [US8] Extend channel service in `backend/src/services/channel-service.ts`: advancedSearch() with multi-criteria filters
- [ ] T158 [P] [US8] Implement availability check in channel service: checkChannelAvailability() queries Telegram API
- [ ] T159 [US8] Implement channel preview in channel service: getChannelPreview() fetches description, media, subscribers

### Backend: Channel Discovery APIs (US8)

- [ ] T160 [P] [US8] Extend channels API in `backend/src/api/channels.ts`: GET /api/channels with advanced filters (category, date, media, geo)
- [ ] T161 [US8] Add availability check endpoint in channels API: POST /api/channels/check-availability with channel IDs array

### Frontend: Advanced Channel Filters (US8)

- [ ] T162 [P] [US8] Enhance ChannelFilters component in `frontend/src/components/channels/ChannelFilters.tsx`: add date range, media presence, geo-tags
- [ ] T163 [US8] Create multi-select filter dropdowns using shadcn Select: category (multi), geo-tags (multi)
- [ ] T164 [US8] Add live filter result count in ChannelFilters: displays "X channels match filters"

### Frontend: Channel Availability Check (US8)

- [ ] T165 [P] [US8] Add "Check Availability" button to ChannelTable: enabled for multiselected channels
- [ ] T166 [US8] Display availability status in ChannelTable: colored indicator (reachable/blocked/deleted)

### Frontend: Channel Preview (US8)

- [ ] T167 [P] [US8] Create ChannelPreview component in `frontend/src/components/channels/ChannelPreview.tsx`: modal with description, media, stats
- [ ] T168 [US8] Add preview icon to ChannelTable: clicking opens ChannelPreview modal for that channel

**Checkpoint**: User Story 8 complete - operators can apply advanced filters, check availability, preview channels

---

## Phase 11: User Story 9 - Security & Compliance (Priority: P1)

**Goal**: RBAC, credential encryption, audit logs, opt-out enforcement

**Independent Test**: Create users with roles → verify permissions → check session encryption → view audit logs → attempt opt-out channel addition

### Backend: User Management Services (US9)

- [ ] T169 [P] [US9] Implement user service in `backend/src/services/user-service.ts`: createUser(), updateUserRole(), deleteUser()
- [ ] T170 [US9] Implement permission checker in user service: hasPermission(user, resource, action)

### Backend: User Management APIs (US9)

- [ ] T171 [P] [US9] Create auth API routes in `backend/src/api/auth.ts`: POST /api/auth/login, POST /api/auth/logout (from contracts/auth.yaml)
- [ ] T172 [US9] Create users API routes in `backend/src/api/users.ts`: GET /api/users, POST /api/users, PATCH /api/users/:id (admin only)

### Backend: Opt-Out Enforcement (US9)

- [ ] T173 [US9] Add opt-out validation in batch service: validateChannelOptOut() checks opt_out flag before adding to batch
- [ ] T174 [US9] Implement opt-out warning in batch API: returns error or warning if opt-out channels detected

### Backend: Auto-Pause on FLOOD Errors (US9)

- [ ] T175 [US9] Implement FLOOD error threshold checker in rate-limit tracker: pauseOnFloodThreshold() auto-pauses after 3 consecutive FLOOD_WAIT
- [ ] T176 [US9] Add alert notification in rate-limit tracker: sendFloodAlert() notifies operators/admins

### Frontend: Authentication UI (US9)

- [ ] T177 [P] [US9] Create Login page in `frontend/src/pages/Login.tsx` with username/password form
- [ ] T178 [US9] Implement login flow in auth store: sets token, fetches user info, redirects to dashboard

### Frontend: User Management UI (US9 - Admin only)

- [ ] T179 [P] [US9] Create UserList component in `frontend/src/components/users/UserList.tsx`: displays all users with roles
- [ ] T180 [P] [US9] Create Users page in `frontend/src/pages/Users.tsx` (admin only): list, create, edit users
- [ ] T181 [P] [US9] Create UserForm component in `frontend/src/components/users/UserForm.tsx`: username, role selector
- [ ] T182 [US9] Add role-based route protection in App.tsx: admin-only routes, operator routes, auditor read-only

### Frontend: Audit Log UI (US9 - Admin/Auditor)

- [ ] T183 [P] [US9] Create AuditLog component in `frontend/src/components/audit/AuditLog.tsx`: table with timestamp, user, action, entity
- [ ] T184 [US9] Create AuditLog page in `frontend/src/pages/AuditLog.tsx` (admin/auditor only): view all audit logs with filters

### Frontend: Opt-Out Warning (US9)

- [ ] T185 [US9] Add opt-out warning dialog in CreateBatchDialog: displays alert if opt-out channels selected
- [ ] T186 [US9] Require admin override for opt-out channels: checkbox "Admin override" with justification text input

**Checkpoint**: User Story 9 complete - system enforces RBAC, encrypts credentials, logs all actions, prevents opt-out violations

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Vercel Deployment Configuration

- [ ] T187 [P] Create `vercel.json` in root with build config: frontend static build, backend API routes
- [ ] T188 [P] Configure Vercel environment variables: JWT_SECRET, DATABASE_URL, BACKEND_WORKER_URL
- [ ] T189 [P] Set up Vercel deployment: connect GitHub repo, configure production/preview environments

### Railway Worker Deployment

- [ ] T190 [P] Create `railway.toml` in root with worker config: start command for campaign-worker
- [ ] T191 [P] Configure Railway environment variables: DATABASE_URL, REDIS_URL, TELEGRAM_API_ID, TELEGRAM_API_HASH, SESSION_STRING, ENCRYPTION_KEY
- [ ] T192 [P] Set up Railway deployment: connect GitHub repo, add Redis addon, configure worker service

### Documentation & Developer Experience

- [ ] T193 [P] Create root `README.md` with project overview, architecture diagram, getting started guide
- [ ] T194 [P] Validate quickstart.md instructions: test local setup process, update any outdated steps
- [ ] T195 [P] Add inline code comments in complex services: campaign execution flow, rate limiting logic, encryption utilities

### Performance Optimization

- [ ] T196 [P] Implement frontend bundle size optimization: analyze with vite-plugin-visualizer, ensure <500 KB gzipped
- [ ] T197 [P] Add database query optimization: review slow queries in Prisma Studio, add missing indexes
- [ ] T198 [P] Configure CDN caching for Vercel: set Cache-Control headers for static assets

### Security Hardening

- [ ] T199 [P] Add security headers in Express app: helmet configuration, CORS whitelist
- [ ] T200 [P] Implement rate limiting on auth endpoints: prevent brute force attacks (5 attempts per minute)
- [ ] T201 [P] Audit session string encryption: verify AES-256-GCM implementation, test key rotation

### Final Validation

- [ ] T202 Run end-to-end test scenario from quickstart.md: import channels → create batch → launch campaign → monitor completion
- [ ] T203 Verify all constitutional principles: rate-limit protection, job persistence, test mode, batch independence, security, frontend stack, Vercel deployment
- [ ] T204 Check all success criteria from spec.md: 18 measurable outcomes validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if team capacity allows)
  - Or sequentially in priority order: US1 (P1) → US4 (P1) → US6 (P1) → US9 (P1) → US2 (P2) → US3 (P2) → US5 (P2) → US7 (P3) → US8 (P3)
- **Polish (Phase 12)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational - No dependencies on other stories
- **US2 (P2)**: Can start after Foundational - Extends US1 batch functionality but independently testable
- **US3 (P2)**: Can start after Foundational - Extends US1 template functionality but independently testable
- **US4 (P1)**: Can start after Foundational - Extends US1 campaign configuration but independently testable
- **US5 (P2)**: Can start after Foundational - Uses US1 campaign infrastructure but independently testable
- **US6 (P1)**: Can start after Foundational - Uses US1 campaign infrastructure but independently testable
- **US7 (P3)**: Can start after Foundational - Reads US1 campaign data but independently testable
- **US8 (P3)**: Can start after Foundational - Extends US1 channel catalog but independently testable
- **US9 (P1)**: Can start after Foundational - Adds security layer across all features

### Within Each User Story

- Backend services before APIs
- APIs before frontend hooks
- Frontend hooks before UI components
- Core components before page assembly
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup tasks (T001-T013)**: All marked [P] can run in parallel
- **Foundational tasks**: Within each subsection, [P] tasks can run in parallel
- **Once Foundational completes**: All 9 user stories can start in parallel (if team capacity allows)
- **Within each user story**: Tasks marked [P] can run in parallel
- **Different user stories**: Can be worked on in parallel by different team members

---

## Parallel Execution Examples

### Phase 1: Setup (All Parallel)
```bash
# Can launch all these tasks simultaneously:
T002: Initialize frontend package
T003: Initialize backend package
T004: Initialize shared package
T005: Configure frontend TypeScript
T006: Configure backend TypeScript
T007: Configure Vite
T008: Configure Tailwind
T009: Initialize shadcn UI
T010: Add shadcn components
```

### Phase 2: Foundational (Parallel within subsections)
```bash
# Database setup (sequential due to dependencies)
T014 → T015 → T016 → T017 → T018

# Auth framework (all parallel):
T019: JWT utilities
T020: bcrypt utilities
T021: auth middleware
T022: RBAC middleware
T023: encryption utilities

# API infrastructure (all parallel):
T024: Express app setup
T025: Error handler
T026: Validation middleware
T027: Audit logger
T028: API routing
```

### Phase 3: User Story 1 (Parallel within domains)
```bash
# Backend services (all parallel):
T050: Channel service
T053: Batch service
T055: Template service

# Frontend components (all parallel):
T064: ChannelTable
T065: ChannelFilters
T068: BatchForm
T071: MessageEditor
T072: PlaceholderPicker
```

### Multiple User Stories in Parallel
```bash
# If 3 developers available after Foundational:
Developer A: Phase 3 (US1) - Create and Send First Campaign
Developer B: Phase 4 (US2) - Manage and Refine Batches
Developer C: Phase 6 (US6) - Real-Time Monitoring & Control

# Each developer works on their story independently
# Stories integrate seamlessly due to foundational infrastructure
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T013)
2. Complete Phase 2: Foundational (T014-T049) - CRITICAL
3. Complete Phase 3: User Story 1 (T050-T079)
4. **STOP and VALIDATE**: Test end-to-end campaign flow
5. Deploy to Vercel + Railway if ready

**MVP Deliverable**: Operators can import channels, create batches, write messages, send campaigns, monitor execution

### Incremental Delivery (Priority-Based)

1. Setup + Foundational → Foundation ready
2. Add US1 (P1) → Test → Deploy (MVP!)
3. Add US4 (P1) → Test → Deploy (adds safety controls)
4. Add US6 (P1) → Test → Deploy (adds monitoring)
5. Add US9 (P1) → Test → Deploy (adds security)
6. Add US2 (P2) → Test → Deploy (batch management)
7. Add US3 (P2) → Test → Deploy (advanced templates)
8. Add US5 (P2) → Test → Deploy (testing features)
9. Add US7 (P3) → Test → Deploy (reporting)
10. Add US8 (P3) → Test → Deploy (discovery)

### Parallel Team Strategy

With 3 developers:

1. **Week 1**: All developers complete Setup + Foundational together
2. **Week 2-3**:
   - Dev A: US1 (Create campaign) + US6 (Monitor)
   - Dev B: US4 (Delivery config) + US9 (Security)
   - Dev C: US2 (Batch mgmt) + US3 (Templates)
3. **Week 4**: All developers on US5, US7, US8 in parallel
4. **Week 5**: Polish, deployment, documentation

---

## Notes

- **[P] tasks**: Different files, no dependencies - safe to run in parallel
- **[Story] labels**: US1-US9 map to user stories in spec.md for traceability
- **Each user story**: Independently completable and testable
- **No tests included**: Tests not requested in specification (FR does not mention TDD)
- **File paths**: Use web app convention (backend/src/, frontend/src/, shared/)
- **Commit frequency**: After each task or logical group (e.g., complete service + API + UI for a feature)
- **Checkpoint validation**: Stop after each user story phase to test independently
- **Constitutional compliance**: All tasks align with 7 principles from constitution.md

---

## Task Count Summary

- **Total Tasks**: 204
- **Phase 1 (Setup)**: 13 tasks
- **Phase 2 (Foundational)**: 36 tasks
- **Phase 3 (US1 - P1)**: 30 tasks 🎯 MVP
- **Phase 4 (US2 - P2)**: 13 tasks
- **Phase 5 (US3 - P2)**: 14 tasks
- **Phase 6 (US4 - P1)**: 16 tasks
- **Phase 7 (US5 - P2)**: 10 tasks
- **Phase 8 (US6 - P1)**: 13 tasks
- **Phase 9 (US7 - P3)**: 11 tasks
- **Phase 10 (US8 - P3)**: 12 tasks
- **Phase 11 (US9 - P1)**: 18 tasks
- **Phase 12 (Polish)**: 18 tasks

**Parallel Opportunities**: 87 tasks marked [P] can run in parallel with other tasks in same phase

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (US1) = 79 tasks for minimum viable product
