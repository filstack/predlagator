# Feature Specification: Migrate to pg-boss PostgreSQL Queue

**Feature Branch**: `002-migrate-from-bullmq`
**Created**: 2025-01-15
**Status**: Draft
**Input**: User description: "Migrate from BullMQ+Redis to pg-boss PostgreSQL-based queue via Supabase for campaign message delivery"

## User Scenarios & Testing

### User Story 1 - Campaign Execution Without Redis (Priority: P1)

As a campaign operator, I want to start campaigns and have messages delivered to channels without needing to configure or maintain a separate Redis server, so that I can focus on campaign management rather than infrastructure setup.

**Why this priority**: Eliminates the primary blocker preventing campaigns from functioning (ECONNREFUSED errors due to missing Redis). This is the core functionality that makes the application usable for its intended purpose.

**Independent Test**: Can be fully tested by creating a campaign, starting it, and verifying messages are queued and delivered to Telegram channels. Operator sees campaign progress in real-time without any Redis configuration.

**Acceptance Scenarios**:

1. **Given** a campaign is created with target channels and template, **When** operator clicks "Start Campaign", **Then** campaign status changes to "RUNNING" and jobs are queued without Redis errors
2. **Given** a campaign is running with queued jobs, **When** worker processes jobs, **Then** messages are delivered to Telegram channels at configured rate
3. **Given** a campaign has completed all jobs, **When** operator views campaign status, **Then** campaign shows "COMPLETED" with success/failure statistics

---

### User Story 2 - Throttling and Rate Limiting (Priority: P2)

As a campaign operator, I want the system to automatically control message delivery speed to avoid Telegram's FLOOD_WAIT errors, so that my account doesn't get rate-limited or banned.

**Why this priority**: Protects Telegram accounts from bans and ensures campaigns complete successfully. Essential for production use but can be added after basic queue functionality works.

**Independent Test**: Can be tested by starting a campaign with high volume and verifying delivery stays within configured rate limits (messages per second) without triggering FLOOD_WAIT errors.

**Acceptance Scenarios**:

1. **Given** campaign configured for 5 messages per second, **When** worker processes jobs, **Then** delivery rate does not exceed 5 msg/sec
2. **Given** Telegram returns FLOOD_WAIT error, **When** worker detects the error, **Then** campaign automatically pauses for specified wait time
3. **Given** campaign is paused due to FLOOD_WAIT, **When** wait time expires, **Then** campaign automatically resumes sending

---

### User Story 3 - Retry Logic for Failed Messages (Priority: P3)

As a campaign operator, I want failed message deliveries to be automatically retried with exponential backoff, so that temporary network issues don't result in permanent failures.

**Why this priority**: Improves delivery reliability and success rates. Important for quality but not blocking initial functionality.

**Independent Test**: Can be tested by simulating network errors or channel blocks, verifying jobs are retried up to configured limit, and observing exponential delay between attempts.

**Acceptance Scenarios**:

1. **Given** message delivery fails due to network error, **When** job fails, **Then** job is automatically requeued with exponential backoff delay
2. **Given** job has failed 3 times (max retry limit), **When** next retry fails, **Then** job is marked as "FAILED" permanently and not retried further
3. **Given** channel is blocked or deleted, **When** delivery fails with PEER_BLOCKED, **Then** channel is marked inactive and job marked failed without retries

---

### Edge Cases

- What happens when Supabase PostgreSQL connection is temporarily lost during campaign execution?
- How does system handle campaigns started while Supabase is under maintenance?
- What happens if operator tries to start 10 campaigns simultaneously with 1000+ jobs each?
- How does queue handle jobs that have been "stuck" in processing state for hours (worker crash)?
- What happens when campaign is paused manually during FLOOD_WAIT period?
- How does system recover if worker process crashes mid-job?

## Requirements

### Functional Requirements

- **FR-001**: System MUST queue campaign message delivery jobs in PostgreSQL database via pg-boss library
- **FR-002**: System MUST process queued jobs asynchronously through worker processes without requiring Redis
- **FR-003**: System MUST enforce configurable rate limiting (messages per second) at queue level
- **FR-004**: System MUST automatically pause campaigns when Telegram FLOOD_WAIT errors occur
- **FR-005**: System MUST retry failed message deliveries up to configurable maximum attempts with exponential backoff
- **FR-006**: System MUST mark channels as inactive when PEER_BLOCKED or similar permanent errors occur
- **FR-007**: System MUST track job status transitions (queued → sending → sent/failed) in database
- **FR-008**: System MUST allow operators to manually pause and resume campaigns
- **FR-009**: System MUST clean up completed jobs after configurable retention period (default: 7 days)
- **FR-010**: System MUST prevent duplicate job creation for same campaign-channel combinations
- **FR-011**: System MUST continue existing Test page functionality for direct sending without queues
- **FR-012**: System MUST expose campaign progress metrics (queued, processing, completed, failed counts)

### Key Entities

- **Campaign**: Represents a broadcast operation with target channels, message template, and delivery configuration. Tracks overall status and progress.
- **Job**: Individual message delivery task linking campaign to specific channel. Tracks attempts, errors, and final status (sent/failed).
- **Queue (pg-boss internal)**: PostgreSQL-based job queue managed by pg-boss library. Stores job data, scheduling, and retry state.
- **Channel**: Target Telegram channel with activity status (active/inactive) and error tracking.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Operators can start campaigns and have jobs queued without configuring Redis (zero Redis dependencies)
- **SC-002**: System successfully delivers messages to 100+ channels per campaign with configurable rate limiting
- **SC-003**: Campaign progress updates (job counts, success rate) are visible to operators within 5 seconds of status changes
- **SC-004**: System automatically pauses campaigns within 10 seconds of receiving FLOOD_WAIT error
- **SC-005**: Failed jobs are retried automatically with exponential backoff (1s, 2s, 4s, 8s delays) up to 3 attempts
- **SC-006**: System handles 5 concurrent campaigns with 500 jobs each without degradation
- **SC-007**: Job queue throughput supports at least 20 messages per second (configurable limit)
- **SC-008**: Zero "ECONNREFUSED" errors related to Redis in application logs
- **SC-009**: Campaign completion time remains within 10% of theoretical minimum (jobs / rate limit)

### Assumptions

- Supabase PostgreSQL connection is reliable and provides <100ms query latency
- pg-boss library handles PostgreSQL-based queuing reliably without data loss
- Throughput requirement of 20-100 messages/second is sufficient for current use case
- Existing Telegram client (GramJS) integration remains unchanged
- Campaign creation and management UI requires no changes (only backend queue implementation)
- Job retention of 7 days provides sufficient historical data for debugging
- Exponential backoff with 3 retry attempts is sufficient for transient errors
- Current database schema for Job and Campaign entities is adequate for pg-boss integration

### Out of Scope

- Migration of existing Redis-based BullMQ job data (fresh start after migration)
- Real-time WebSocket-based campaign progress updates (polling remains acceptable)
- Advanced queue features like job prioritization or job dependencies
- Multiple worker instances with distributed locking (single worker sufficient for MVP)
- Queue monitoring dashboard or admin UI
- Integration with external monitoring services (Sentry, DataDog)
- Performance optimization beyond 100 messages/second throughput
