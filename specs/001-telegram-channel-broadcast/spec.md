# Feature Specification: Telegram Channel Broadcast Management System

**Feature Branch**: `001-telegram-channel-broadcast`
**Created**: 2025-10-13
**Status**: Draft
**Input**: 41 user stories covering catalog management, batch/campaign creation, message templating, delivery configuration, testing, monitoring, reporting, and security

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Send First Campaign (Priority: P1)

An operator wants to send a personalized message to a curated list of Telegram channels from the scraped catalog to promote a product or service.

**Why this priority**: This is the core MVP functionality - the ability to select channels, create a message, and send it. Without this, the system delivers no value.

**Independent Test**: Can be fully tested by: (1) viewing channel catalog, (2) creating a batch with selected channels, (3) writing a message template with placeholders, (4) sending in test mode to own account, (5) executing live campaign. Delivers immediate value by enabling first successful broadcast.

**Acceptance Scenarios**:

1. **Given** operator has logged into the web panel, **When** they navigate to the Channel Catalog, **Then** they see a table displaying all scraped channels with columns: username, tgstat_url, category, last_scraped, status, tags, subscribers
2. **Given** operator is viewing the catalog, **When** they use multiselect to choose 10 channels and click "Add to Batch", **Then** a new batch is created in draft status with those 10 channels
3. **Given** operator has created a batch, **When** they open the message editor and write "Hello {{username}}! Check out our offer at {{tgstat_url}}", **Then** the system shows placeholder options and allows saving the template
4. **Given** operator has written a message, **When** they select test mode and click "Send to me first", **Then** one test message with substituted placeholders is delivered to their own Telegram account
5. **Given** test message looks correct, **When** operator switches to live mode, sets throttle to 2 msg/sec, and clicks "Send Campaign", **Then** the system queues all 10 messages and begins sending with appropriate delays
6. **Given** campaign is running, **When** operator views the live log, **Then** they see real-time events: queued → sent → delivered/failed with timestamps

---

### User Story 2 - Manage and Refine Batches (Priority: P2)

An operator needs to organize channel lists into reusable batches, refine them by adding/removing channels, and save templates for future campaigns.

**Why this priority**: Batch management improves operational efficiency by enabling reuse, refinement, and organization of target audiences.

**Independent Test**: Can be tested by creating multiple batches, editing them (add/remove channels), cloning existing batches, and saving as audience templates. Delivers value by reducing repetitive work.

**Acceptance Scenarios**:

1. **Given** operator has channels in catalog, **When** they create a batch named "Tech Channels Q4" with 50 channels, **Then** the batch appears in the batches list with status=draft, count=50
2. **Given** operator has a draft batch, **When** they add 10 more channels and remove 5 channels, **Then** the batch count updates to 55 and changes are persisted
3. **Given** operator wants to reuse a successful campaign, **When** they select a batch and click "Clone", **Then** a new draft batch is created with identical channels and a copied name
4. **Given** operator has refined a batch, **When** they click "Save as Template", **Then** the batch is saved as an audience template available for future batch creation
5. **Given** operator has created batches, **When** they view the batches list, **Then** they see all batches with name, count, created_by, status (draft/scheduled/sending/completed/paused), created_at
6. **Given** operator has a draft batch, **When** they click "Delete", **Then** the batch is removed from the system (only allowed for draft status)
7. **Given** operator needs to transfer batches, **When** they export a batch to CSV/NDJSON, **Then** a file downloads with all channel data; when imported, channels are validated and added to a new batch

---

### User Story 3 - Advanced Message Personalization and Preview (Priority: P2)

An operator wants to create sophisticated message templates with placeholders, attach media, validate against Telegram limits, and preview how messages will appear to each recipient.

**Why this priority**: Message quality and personalization directly impact campaign effectiveness. Preview and validation prevent errors and improve deliverability.

**Independent Test**: Can be tested by creating templates with multiple placeholders, attaching media (URL/upload/base64), checking length warnings, previewing for different channels, and saving templates for reuse.

**Acceptance Scenarios**:

1. **Given** operator is in message editor, **When** they click placeholder button, **Then** a list shows available placeholders: {{username}}, {{channel_title}}, {{meta.field}}, etc.
2. **Given** operator writes a message, **When** they type text exceeding Telegram's character limit, **Then** system displays a warning indicator showing how many characters over the limit
3. **Given** operator wants to include media, **When** they upload an image or provide a URL, **Then** system validates file size (<50MB) and displays preview
4. **Given** operator has media attached via base64, **When** they provide the base64 string and filename, **Then** system decodes and validates the media type
5. **Given** operator has written a template, **When** they click "Preview for Channel X", **Then** system shows how the message will look with that channel's specific placeholder values substituted
6. **Given** operator has created a good template, **When** they click "Save as Template", **Then** template is saved and appears in template library for future use with selection dropdown

---

### User Story 4 - Configure Delivery Parameters and Safety Controls (Priority: P1)

An operator needs to configure throttling, retry policies, proxy selection, scheduling, and safety limits to ensure reliable delivery while avoiding Telegram rate limits and bans.

**Why this priority**: This is critical for system safety and compliance with Telegram's terms. Without proper throttling and limits, accounts can be banned permanently.

**Independent Test**: Can be tested by configuring throttle settings, setting retry policies, selecting proxies, scheduling delayed sends, and setting daily/batch limits. Validates that campaigns respect configured constraints.

**Acceptance Scenarios**:

1. **Given** operator is configuring campaign, **When** they set throttle to 3 msg/sec with 500ms delay between sends, **Then** system enforces these limits during execution
2. **Given** operator wants safety, **When** they configure retry policy with 3 attempts and exponential backoff, **Then** transient errors (FLOOD_WAIT, TIMEOUT) trigger retries with increasing delays
3. **Given** operator needs anonymity, **When** they select a proxy group from dropdown, **Then** all messages in campaign route through selected proxy pool
4. **Given** operator wants timed launch, **When** they schedule campaign for specific date/time in the future, **Then** campaign status=scheduled and executes at specified time
5. **Given** operator sets limits, **When** they configure max 1000 messages/day and batch limit 500, **Then** system validates batch size before launch and prevents exceeding daily quota
6. **Given** operator needs parallel processing, **When** they set concurrency to 3 sessions, **Then** system distributes jobs across 3 GramJS worker instances (respecting global throttle)

---

### User Story 5 - Test Mode, Dry Run, and A/B Testing (Priority: P2)

An operator must validate campaigns before going live through test sends, dry runs without actual delivery, and split-testing to compare message variants.

**Why this priority**: Testing capabilities prevent costly mistakes, reduce spam complaints, and enable data-driven optimization of messaging.

**Independent Test**: Can be tested by running dry-run mode (logs only), sending test messages to own account, and configuring A/B tests with two template variants. Delivers value by catching errors pre-launch.

**Acceptance Scenarios**:

1. **Given** operator has configured campaign, **When** they select "Dry Run" mode and start campaign, **Then** system generates complete execution logs showing what would happen, but sends zero actual messages
2. **Given** operator wants visual confirmation, **When** they select "Test Mode" and click "Send to me/test chat", **Then** one message with real placeholder substitution delivers to operator's account or specified test chat
3. **Given** operator wants to optimize, **When** they create A/B test with two message variants and select 20% of batch for testing, **Then** system randomly splits 20% into two groups, sends variant A to group 1, variant B to group 2, and collects delivery metrics for comparison

---

### User Story 6 - Real-Time Monitoring and Campaign Control (Priority: P1)

An operator needs to monitor campaign progress in real-time, view delivery metrics, pause/resume execution, and intervene manually when issues occur.

**Why this priority**: Real-time visibility and control are essential for managing long-running campaigns, preventing waste, and responding to errors quickly.

**Independent Test**: Can be tested by launching a campaign, viewing live event log, checking metrics dashboard, pausing mid-execution, and resuming. Validates operational control.

**Acceptance Scenarios**:

1. **Given** campaign is running, **When** operator views live log, **Then** they see streaming feed of events: queued → sent → delivered/failed with channel username, timestamp, error details
2. **Given** operator sees errors, **When** they click "Pause" button, **Then** campaign status changes to paused, no new messages are sent, queued jobs remain pending
3. **Given** campaign is paused, **When** operator clicks "Resume", **Then** campaign status changes to sending and queued jobs resume processing
4. **Given** campaign is complete, **When** operator views metrics, **Then** dashboard shows: total sent, delivery rate %, speed (msg/sec), error breakdown by type (FLOOD_WAIT, USER_NOT_FOUND, PEER_BLOCKED, etc.)

---

### User Story 7 - Campaign History, Reporting, and Risk Assessment (Priority: P3)

Operators and auditors need comprehensive campaign history with filtering, downloadable reports in CSV/JSON format, and automated risk scoring to identify high-risk campaigns before launch.

**Why this priority**: Historical data enables analysis, compliance auditing, and continuous improvement. Risk assessment prevents problematic campaigns.

**Independent Test**: Can be tested by viewing campaign history table with filters, downloading CSV/JSON reports, and checking risk indicators (Low/Medium/High) on batches.

**Acceptance Scenarios**:

1. **Given** multiple campaigns have been executed, **When** auditor views campaign history, **Then** table displays all past campaigns with filters by date range, status, owner, batch name
2. **Given** operator wants offline analysis, **When** they click "Download Report" on completed campaign, **Then** CSV/JSON file downloads with fields: channel_username, message_id, status, timestamp, error_type, retry_count
3. **Given** operator creates a new batch, **When** system evaluates risk, **Then** risk indicator (Low/Medium/High) displays based on: batch size, channel reputation scores, historical failure rates, opt-out violations
4. **Given** admin needs compliance review, **When** they view opt-out channel list, **Then** table shows all channels marked with opt-out flag and prevents their inclusion in new batches

---

### User Story 8 - Channel Discovery and Availability Verification (Priority: P3)

An operator needs powerful filtering to find target channels quickly and verify their availability status before adding to batches.

**Why this priority**: Efficient channel discovery and pre-validation reduce wasted effort and improve campaign targeting accuracy.

**Independent Test**: Can be tested by applying multi-criteria filters (category, date, media, geo-tags), checking channel availability status, and viewing channel previews.

**Acceptance Scenarios**:

1. **Given** operator has large catalog, **When** they apply filters: category=Tech, last_scraped=last 30 days, has_media=true, geo=EU, **Then** table updates to show only matching channels with live count
2. **Given** operator selects channels, **When** they click "Check Availability" on multiselected items, **Then** system queries Telegram API for each channel and updates status field: reachable/blocked/deleted
3. **Given** operator wants context, **When** they click channel preview icon, **Then** modal/page opens showing channel description, recent media, linked URLs, subscriber count

---

### User Story 9 - Security, Role-Based Access, and Compliance (Priority: P1)

The system must enforce role-based access control (admin/operator/auditor), encrypt sensitive credentials (session strings), log all operations for audit trails, and prevent campaigns targeting opt-out channels.

**Why this priority**: Security and compliance are non-negotiable. Credential leaks enable account hijacking; lack of RBAC allows unauthorized actions; ignoring opt-outs violates consent.

**Independent Test**: Can be tested by creating users with different roles, verifying permission boundaries, checking that session strings are encrypted at rest, reviewing audit logs, and attempting to add opt-out channels to batches.

**Acceptance Scenarios**:

1. **Given** admin creates new user, **When** they assign role=operator, **Then** that user can create/edit batches and launch campaigns but cannot manage users or view encrypted session strings
2. **Given** admin assigns role=auditor, **When** auditor logs in, **Then** they have read-only access to campaign history, logs, reports but cannot create or modify batches/campaigns
3. **Given** session string is stored, **When** system saves it to database, **Then** it is encrypted using AES-256 encryption and only decrypted in-memory by GramJS worker processes
4. **Given** all user actions occur, **When** admin views audit log, **Then** log shows: timestamp, username, action (batch created, template modified, campaign launched), affected entity IDs
5. **Given** operator selects channels, **When** one or more have opt_out=true flag, **Then** system displays warning and either prevents addition or requires explicit admin override with justification
6. **Given** campaign experiences FLOOD_WAIT errors, **When** error threshold (e.g., 3 consecutive FLOOD errors) is exceeded, **Then** system automatically pauses campaign and sends alert notification to operator/admin

---

### Edge Cases

- **What happens when a channel is deleted/blocked mid-campaign?** System marks job as failed with error=PEER_NOT_FOUND, logs it, and continues with remaining channels without interrupting campaign.
- **How does system handle concurrent batch edits?** Batch versioning ensures that once a campaign starts, batch metadata is immutable (snapshot taken). Edits only affect future campaigns.
- **What if operator's Telegram account is banned during campaign?** System detects auth failure, pauses all campaigns using that session, and alerts admin to replace session string.
- **How are placeholder values sanitized?** System escapes special characters in scraped metadata to prevent Telegram markdown parsing errors or injection attacks.
- **What happens when throttle limits conflict with scheduled time?** System calculates estimated completion time based on throttle and displays warning if batch cannot complete before deadline; operator adjusts throttle or splits batch.
- **How does system handle proxy failures?** On proxy connection failure, job retries with exponential backoff; after max retries, job marked failed and campaign continues with remaining jobs.
- **What if scraped channel data is stale?** System allows manual "refresh channel metadata" action that re-queries Telegram API to update subscriber counts, status, descriptions.

## Requirements *(mandatory)*

### Functional Requirements

#### Channel Catalog Management

- **FR-C01**: System MUST display all scraped channels in paginated table with columns: username, tgstat_url, category, last_scraped, status, tags, subscribers
- **FR-C02**: System MUST provide filters for: category (multi-select), date range (last_scraped), media presence (boolean), geo-tags (multi-select)
- **FR-C03**: System MUST support multi-select of channels with bulk actions: "Add to Batch", "Check Availability", "View Preview"
- **FR-C04**: System MUST verify channel availability by querying Telegram API and updating status field (reachable/blocked/deleted)
- **FR-C05**: System MUST display channel preview showing: description, recent posts with media, linked URLs, subscriber count (if available)

#### Batch and Campaign Management

- **FR-B01**: Operators MUST be able to create batches with: unique name, selected channels, draft status
- **FR-B02**: Operators MUST be able to rename batches (draft only) and delete batches (draft only)
- **FR-B03**: System MUST allow adding/removing channels from existing batches (draft status only)
- **FR-B04**: System MUST support batch import from CSV/NDJSON with validation (required fields: username or peer_id) and export to CSV/NDJSON
- **FR-B05**: System MUST allow saving batches as audience templates for reuse in future batch creation
- **FR-B06**: System MUST display batch list with columns: name, channel_count, created_by, status (draft/scheduled/sending/completed/paused/failed), created_at, updated_at
- **FR-B07**: System MUST allow cloning batches (creates new draft with identical channels and copied name)

#### Message Template Editor

- **FR-M01**: System MUST provide message editor supporting: plain text, markdown syntax, emoji input
- **FR-M02**: System MUST offer placeholder insertion UI showing available placeholders: {{username}}, {{channel_title}}, {{category}}, {{scraped_field_*}}
- **FR-M03**: System MUST render message preview for each channel with actual placeholder values substituted
- **FR-M04**: System MUST validate message length against Telegram limits (4096 characters for text) and display warnings when exceeded
- **FR-M05**: System MUST support media attachment via: file upload, URL input, base64 string with filename
- **FR-M06**: System MUST validate media: file size (<50MB), supported MIME types (image/*, video/*), and display preview
- **FR-M07**: System MUST allow saving message templates with name for reuse and display template library with selection dropdown

#### Delivery Configuration

- **FR-D01**: System MUST provide throttle configuration: messages per second (1-30 range), delay between sends (milliseconds), with defaults conservative (2 msg/sec)
- **FR-D02**: System MUST offer mode selection: test (sends to operator account or specified test chat) or live (sends to batch channels)
- **FR-D03**: System MUST allow retry policy configuration: retry count (0-5), backoff strategy (linear/exponential), timeout duration
- **FR-D04**: System MUST provide proxy selection: dropdown of proxy groups, "no proxy" option, with connection testing capability
- **FR-D05**: System MUST support scheduled sending: date/time picker for delayed campaign start
- **FR-D06**: System MUST enforce campaign limits: max messages per day (configurable), per-batch limit (configurable), with pre-launch validation
- **FR-D07**: System MUST allow concurrency configuration: number of parallel GramJS sessions (1-5 range, default 1), with global throttle coordination

#### Testing and Quality Assurance

- **FR-Q01**: System MUST provide dry-run mode that simulates campaign execution, generates detailed logs of intended actions, but sends zero messages
- **FR-Q02**: System MUST offer test mode that sends one message with real placeholder substitution to operator's own account or specified test chat
- **FR-Q03**: System MUST support A/B testing: accept two message variants, select sample percentage of batch (1-100%), randomly split sample into two groups, send variant A to group 1 and variant B to group 2, collect delivery metrics for comparison

#### Monitoring and Campaign Control

- **FR-R01**: System MUST display real-time event log during campaign execution showing: event type (queued/sent/failed), channel username, timestamp, error details (if failed)
- **FR-R02**: Operators MUST be able to pause running campaigns (status changes to paused, no new sends, queued jobs preserved) and resume paused campaigns (status changes to sending, queued jobs resume)
- **FR-R03**: System MUST display campaign metrics: total messages sent, delivery success rate (%), sending speed (msg/sec), error breakdown by type (FLOOD_WAIT, USER_NOT_FOUND, PEER_BLOCKED, NETWORK_ERROR, etc.)
- **FR-R04**: System MUST generate downloadable reports in CSV and JSON formats containing: channel_username, peer_id, message_id, status (sent/failed), timestamp, error_type, retry_count

#### History and Risk Management

- **FR-H01**: System MUST maintain campaign history with fields: campaign_id, batch_name, owner, start_time, end_time, status, message_count, success_rate
- **FR-H02**: System MUST provide history filtering by: date range, status, owner (username), batch name (search)
- **FR-H03**: System MUST calculate risk score for batches based on: batch size (>500 = higher risk), channel reputation (historical failure rates), opt-out violations (critical risk), and display risk indicator (Low/Medium/High)
- **FR-H04**: System MUST maintain opt-out channel list with flag visible in catalog and prevent (or warn with override requirement) adding opt-out channels to batches

#### Security and Access Control

- **FR-S01**: System MUST implement role-based access control with three roles: admin (full access), operator (create/edit batches, launch campaigns, view own campaigns), auditor (read-only access to all campaigns, logs, reports)
- **FR-S02**: System MUST authenticate all API requests using token-based auth and verify role permissions before allowing actions
- **FR-S03**: System MUST encrypt Telegram session strings at rest using AES-256 encryption and only decrypt in-memory when initializing GramJS clients
- **FR-S04**: System MUST log all significant operations to audit trail with fields: timestamp, username, role, action (batch_created, template_modified, campaign_launched, campaign_paused, etc.), entity_id, previous_value (for updates), new_value (for updates)
- **FR-S05**: System MUST validate opt-out flags when adding channels to batches and display warning/block addition if opt_out=true
- **FR-S06**: System MUST auto-pause campaigns when FLOOD_WAIT error threshold is exceeded (e.g., 3 consecutive flood errors or 10% of batch), send alert notification to operator and admin, and log incident

#### Integration with GramJS and tg-scrap

- **FR-I01**: System MUST integrate with tg-scrap repository to import scraped channel metadata (username, tgstat_url, category, tags, subscribers, last_scraped timestamp)
- **FR-I02**: System MUST use GramJS library for all Telegram API interactions: peer resolution (username → peer_id with caching), message sending, media uploading, availability checking
- **FR-I03**: System MUST implement persistent job queue that survives process restarts and supports job priorities, retries, and state transitions (queued → processing → completed/failed)
- **FR-I04**: System MUST distinguish transient errors (FLOOD_WAIT, NETWORK_ERROR, TIMEOUT) requiring retry from permanent errors (USER_NOT_FOUND, PEER_BLOCKED, CHAT_RESTRICTED) requiring skip
- **FR-I05**: System MUST implement GramJS connection pooling with configurable number of sessions (1-5), session reuse across requests, and automatic reconnection on disconnect
- **FR-I06**: System MUST parse JSONL files from `batched_files/` directory structure: category folders containing batch files with fields: category, tgstat_url, username (nullable), collected_at

#### Frontend (React + shadcn UI)

- **FR-F01**: Web interface MUST be built with React using TypeScript for all components, hooks, and utilities
- **FR-F02**: UI components MUST use shadcn UI library as building blocks: Button, Table, Dialog, Form, Select, Input, Textarea, Badge, Card, Tabs, Alert, Toast
- **FR-F03**: Interface MUST be responsive supporting viewport sizes: desktop (1920x1080), laptop (1366x768), tablet (768x1024) with mobile-first CSS approach
- **FR-F04**: All interactive elements MUST meet WCAG 2.1 AA accessibility standards: keyboard navigation, ARIA labels, screen reader support, semantic HTML
- **FR-F05**: Application MUST implement code splitting and lazy loading: route-based chunks, dynamic imports for heavy components (data tables, charts)
- **FR-F06**: State management MUST use React Context API or lightweight solution (Zustand/Jotai) for global state: user session, active campaign, notifications
- **FR-F07**: API communication MUST use typed client with error handling: axios/fetch wrapper with TypeScript interfaces matching backend contracts
- **FR-F08**: Forms MUST use react-hook-form with zod validation schemas matching backend validation rules
- **FR-F09**: Real-time updates MUST use polling (HTTP long-polling or short-polling every 2-5s) for campaign progress, live logs, metrics dashboard
- **FR-F10**: Frontend bundle size MUST be <500 KB gzipped for initial load (measured with webpack-bundle-analyzer or similar tool)

#### Deployment and Infrastructure

- **FR-V01**: Frontend and lightweight API routes MUST deploy to Vercel free tier and respect all resource limits
- **FR-V02**: Serverless API functions MUST complete execution within 10 seconds (hard limit) or return error with graceful degradation
- **FR-V03**: Long-running operations (campaign execution, job processing, GramJS workers) MUST run on separate backend server (not Vercel serverless functions)
- **FR-V04**: Frontend MUST connect to backend server via environment variable `VITE_BACKEND_URL` or `NEXT_PUBLIC_BACKEND_URL` (never hardcoded)
- **FR-V05**: Database MUST use external service compatible with Vercel: Supabase (Postgres), Railway, Neon, or PlanetScale with connection pooling
- **FR-V06**: File uploads (channel import, media attachments) MUST use external storage: Supabase Storage, Cloudinary, or UploadThing (not Vercel filesystem)
- **FR-V07**: Environment variables MUST be managed via Vercel dashboard (production, preview, development environments) and never committed to repository
- **FR-V08**: Build process MUST complete within 45 minutes (Vercel free tier limit) with optimizations: incremental builds, caching dependencies
- **FR-V09**: Static assets MUST use CDN caching with appropriate `Cache-Control` headers: immutable for hashed assets (JS/CSS), short TTL for HTML
- **FR-V10**: Application MUST monitor bandwidth usage and optimize to stay under 100 GB/month: compress responses, optimize images, lazy-load resources

### Key Entities

- **Channel**: Represents a Telegram channel from scraped data
  - Attributes: id, username, tgstat_url, category, last_scraped, subscribers, status (reachable/blocked/deleted/unknown), tags (array), opt_out (boolean), metadata (flexible scraped fields)
  - Relationships: belongs to many Batches (many-to-many)

- **Batch**: A collection of channels grouped for a campaign
  - Attributes: id, name, owner_id, status (draft/scheduled/sending/completed/paused/failed), created_at, updated_at, is_template (boolean)
  - Relationships: has many Channels (many-to-many), belongs to User (owner), has many Campaigns

- **MessageTemplate**: Reusable message content with placeholders
  - Attributes: id, name, content (text with placeholders), media_url, media_base64, filename, created_by, created_at
  - Relationships: belongs to User (creator), used by many Campaigns

- **Campaign**: An execution instance of sending messages to a batch
  - Attributes: id, batch_id, template_id, owner_id, status (draft/scheduled/sending/completed/paused/failed), mode (test/live), throttle_config, retry_policy, proxy_group, scheduled_start, actual_start, actual_end, total_jobs, successful_jobs, failed_jobs, risk_score (Low/Medium/High)
  - Relationships: belongs to Batch, belongs to MessageTemplate, belongs to User (owner), has many Jobs

- **Job**: A single message delivery task within a campaign
  - Attributes: id, campaign_id, channel_id, status (queued/processing/sent/failed/skipped), attempts, last_error_type, last_error_message, sent_at, message_id (from Telegram)
  - Relationships: belongs to Campaign, belongs to Channel

- **User**: System user with role-based permissions
  - Attributes: id, username, email, role (admin/operator/auditor), created_at, last_login
  - Relationships: owns many Batches, owns many Campaigns, owns many MessageTemplates

- **AuditLog**: Immutable record of all system actions
  - Attributes: id, timestamp, user_id, username, role, action, entity_type, entity_id, previous_value, new_value, ip_address
  - Relationships: belongs to User

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can discover and select channels from catalog, create a batch, write a message template, and launch a test campaign (end-to-end) in under 10 minutes for first-time users
- **SC-002**: System successfully delivers messages to 95% of reachable channels (excluding permanent failures like blocked/deleted) within configured throttle limits
- **SC-003**: Campaign monitoring dashboard updates within 2 seconds of job state changes, enabling real-time visibility into delivery progress
- **SC-004**: Zero Telegram account bans occur during normal operation due to built-in throttle enforcement, flood detection, and auto-pause mechanisms
- **SC-005**: Operators can pause and resume campaigns mid-execution with zero message loss (all queued jobs preserved and resume correctly)
- **SC-006**: Batch creation time scales linearly: creating a batch with 1000 channels completes in under 5 seconds
- **SC-007**: System audit log captures 100% of significant user actions (batch creation, campaign launch, template modification, user management) with complete before/after state
- **SC-008**: Message preview accurately renders placeholders for any channel in under 1 second, enabling rapid quality validation
- **SC-009**: Operators can export campaign reports for batches of 5000+ messages in under 10 seconds
- **SC-010**: A/B test results show statistically significant difference detection with sample sizes as small as 100 messages per variant (50/50 split)
- **SC-011**: System prevents 100% of campaigns targeting opt-out channels unless explicit admin override is provided with justification logged
- **SC-012**: Session string encryption ensures that even with full database access, attackers cannot recover plaintext session strings without encryption keys
- **SC-013**: Role-based access control prevents 100% of unauthorized actions (operator cannot manage users, auditor cannot modify batches/campaigns)
- **SC-014**: Frontend initial page load completes in under 3 seconds on 3G connection (1.6 Mbps), measured with Lighthouse performance score >90
- **SC-015**: Web interface is fully functional on desktop (1920x1080), laptop (1366x768), and tablet (768x1024) viewports without horizontal scrolling or layout breaks
- **SC-016**: All interactive UI elements are keyboard accessible and pass automated accessibility testing (axe-core, WAVE) with zero violations
- **SC-017**: Vercel deployment completes successfully within 45-minute build time limit with zero build failures due to resource constraints
- **SC-018**: Application operates within Vercel free tier limits: bandwidth <100 GB/month, function invocations <12,000/month, function execution time <10s per request

## Assumptions

- **A-001**: Scraped channel data from tg-scrap is provided in structured format (CSV/NDJSON/database) with minimum required fields: username, category, last_scraped timestamp
- **A-002**: Telegram session strings are obtained out-of-band (via manual authentication script) and provided to system administrators for secure storage
- **A-003**: System has network connectivity to Telegram API endpoints; if proxies are required for access, they are pre-configured and accessible
- **A-004**: Operators have basic understanding of Telegram terminology (channels, usernames, media types) and markdown syntax
- **A-005**: GramJS library handles Telegram protocol details (MTProto encryption, flood wait responses, reconnection logic)
- **A-006**: Maximum batch size is 10,000 channels (configurable); batches exceeding this trigger warning to split into multiple batches
- **A-007**: System runs on server infrastructure with sufficient resources for queue persistence and concurrent GramJS sessions
- **A-008**: Telegram rate limits (~30 msg/sec global, 20 msg/min per chat) are enforced by system throttling; exceeding these triggers FLOOD_WAIT errors handled by retry logic
- **A-009**: Media files attached to messages are accessible via public URLs or provided as valid base64-encoded data
- **A-010**: Audit log retention is at least 1 year; older logs may be archived to cold storage with separate retrieval process
- **A-011**: System clock is synchronized (NTP) to ensure accurate timestamps in logs and scheduled campaign execution
- **A-012**: Operator workstations have modern web browsers (Chrome/Firefox/Edge latest 2 versions) for web panel UI
- **A-013**: Channel data from `batched_files/` is in JSONL format organized by category folders, with each line containing: category, tgstat_url, username (nullable), collected_at
- **A-014**: Frontend deployment uses Vercel free tier; backend workers run on separate server (VPS, Railway, Render, or similar) with persistent storage
- **A-015**: Vercel project is connected to Git repository (GitHub/GitLab/Bitbucket) for automatic deployments on push to main/production branch
- **A-016**: External database (Supabase/Railway/Neon) is provisioned with connection string available as environment variable
- **A-017**: React application uses Vite or Next.js build tooling with TypeScript configured for strict type checking
- **A-018**: shadcn UI components are installed and configured following official documentation (Tailwind CSS, class-variance-authority, clsx)
- **A-019**: Operators understand basic web navigation patterns (tabs, modals, forms) and can upload files via browser file picker
