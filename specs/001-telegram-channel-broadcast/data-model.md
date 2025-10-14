# Data Model: Telegram Channel Broadcast Management System

**Feature**: [spec.md](spec.md)
**Status**: Schema finalized
**Last Updated**: 2025-10-13

## Purpose

This document defines the complete database schema for the Telegram Channel Broadcast Management System. All entities support the constitutional principles (job persistence, batch independence, security, auditing).

---

## Entity Relationship Diagram

```
┌──────────────┐
│    User      │
│ (Admin/      │
│  Operator/   │
│  Auditor)    │
└──────┬───────┘
       │ creates
       ├──────────────────────────────────┐
       │                                  │
       ▼                                  ▼
┌──────────────┐                   ┌──────────────┐
│   Channel    │                   │   Template   │
│ (username,   │                   │ (message     │
│  category)   │                   │  content)    │
└──────┬───────┘                   └──────┬───────┘
       │                                  │
       │ belongs to                       │
       ▼                                  │
┌──────────────┐        uses             │
│    Batch     │◄────────────────────────┘
│ (channelIds) │
└──────┬───────┘
       │ has
       ▼
┌──────────────┐
│   Campaign   │
│ (status,     │
│  progress)   │
└──────┬───────┘
       │ contains
       ▼
┌──────────────┐        logs          ┌──────────────┐
│     Job      │───────────────────────▶│  AuditLog    │
│ (channelId,  │                       │ (action,     │
│  status)     │                       │  timestamp)  │
└──────────────┘                       └──────────────┘
```

---

## Core Entities

### 1. User (Authentication & RBAC)

Represents system users with role-based access control (FR-S03, FR-S04).

```prisma
model User {
  id           String      @id @default(cuid())
  username     String      @unique
  passwordHash String      // bcrypt hash (never store plaintext)
  role         UserRole    @default(OPERATOR)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  lastLoginAt  DateTime?

  // Relationships
  createdBatches   Batch[]     @relation("BatchCreator")
  createdCampaigns Campaign[]  @relation("CampaignCreator")
  auditLogs        AuditLog[]  @relation("UserAuditLogs")

  @@index([username])
  @@map("users")
}

enum UserRole {
  ADMIN     // Full access: manage users, sessions, all operations
  OPERATOR  // Create/manage campaigns, batches, templates
  AUDITOR   // Read-only access to campaigns, reports, audit logs
}
```

**Fields**:
- `id`: Primary key (cuid = collision-resistant unique ID)
- `username`: Login identifier (unique, indexed for fast auth queries)
- `passwordHash`: bcrypt hash (10 rounds minimum per constitution)
- `role`: Determines permissions (see authorization matrix below)
- `lastLoginAt`: For security monitoring (detect inactive accounts)

**Authorization Matrix**:
| Resource         | Admin | Operator | Auditor |
|------------------|-------|----------|---------|
| Users            | CRUD  | -        | R       |
| Channels         | CRUD  | CR       | R       |
| Batches          | CRUD  | CRUD     | R       |
| Templates        | CRUD  | CRUD     | R       |
| Campaigns        | CRUD  | CRUD     | R       |
| Jobs             | RU    | R        | R       |
| Audit Logs       | R     | -        | R       |
| Session Strings  | CRUD  | -        | -       |

---

### 2. Channel (Catalog Management)

Represents Telegram channels to broadcast to (FR-C01, FR-C02, FR-I06).

```prisma
model Channel {
  id          String    @id @default(cuid())
  username    String    @unique // @channelname (without @ prefix in DB)
  category    String    // "новости", "tech", "entertainment", etc.
  tgstatUrl   String?   // Optional: https://tgstat.ru/channel/@username
  collectedAt DateTime  // When channel was scraped/added
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Metadata from Telegram API (populated on first contact)
  title       String?   // Official channel title
  description String?   // Channel description
  memberCount Int?      // Subscriber count
  isVerified  Boolean   @default(false) // Telegram verified badge
  lastChecked DateTime? // Last API metadata refresh

  // Status tracking
  isActive    Boolean   @default(true)  // Can be targeted in campaigns
  errorCount  Int       @default(0)     // Failed send attempts
  lastError   String?   // Last error message (e.g., "PEER_ID_INVALID")

  // Relationships
  batches     Batch[]   @relation("BatchChannels")
  jobs        Job[]     @relation("JobChannel")

  @@index([category])
  @@index([username])
  @@index([isActive])
  @@map("channels")
}
```

**Fields**:
- `username`: Unique Telegram channel username (without @ prefix for consistency)
- `category`: For filtering in catalog (FR-C02: filter by category)
- `tgstatUrl`: Original scraping source (optional)
- `collectedAt`: Timestamp from JSONL file (tracks data freshness)
- `errorCount`: Incremented on send failures (auto-deactivate after threshold)
- `lastError`: Debug info for operators (e.g., "USER_BANNED_IN_CHANNEL")

**Import from JSONL** (FR-I06):
```typescript
// Example JSONL record:
// {"category": "новости", "tgstat_url": "https://tgstat.ru/channel/@proofzzz", "username": "proofzzz", "collected_at": "2025-09-29T11:49:45.782893"}

async function importChannelsFromJSONL(filePath: string) {
  const lines = await fs.readFile(filePath, 'utf-8').split('\n')
  const channels = lines.map(line => {
    const data = JSON.parse(line)
    return {
      username: data.username,
      category: data.category,
      tgstatUrl: data.tgstat_url,
      collectedAt: new Date(data.collected_at)
    }
  })

  await prisma.channel.createMany({
    data: channels,
    skipDuplicates: true // Ignore if username already exists
  })
}
```

---

### 3. Batch (Channel Grouping)

Represents a collection of channels for targeted campaigns (FR-B01, FR-B02, FR-B03).

```prisma
model Batch {
  id          String     @id @default(cuid())
  name        String     // User-friendly name (e.g., "Новостные каналы - Октябрь 2025")
  description String?    // Optional notes
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  createdById String

  // Channel selection (many-to-many via join table)
  channels    Channel[]  @relation("BatchChannels")

  // Metadata
  channelCount Int       @default(0) // Cached count (updated on add/remove)

  // Relationships
  createdBy   User       @relation("BatchCreator", fields: [createdById], references: [id])
  campaigns   Campaign[] @relation("CampaignBatch")

  @@index([createdById])
  @@index([createdAt])
  @@map("batches")
}
```

**Fields**:
- `name`: Display name for batch (shown in UI dropdowns)
- `channelCount`: Cached count (avoid expensive `COUNT(*)` queries in list views)
- `createdById`: Audit trail (who created this batch)

**Many-to-Many Relationship**:
Prisma implicit join table: `_BatchChannels` (auto-generated)

**Usage**:
```typescript
// Create batch with channels
await prisma.batch.create({
  data: {
    name: "Tech Channels - Q1 2025",
    createdById: userId,
    channels: {
      connect: [
        { id: "channel1_id" },
        { id: "channel2_id" }
      ]
    }
  }
})

// Add channels to existing batch
await prisma.batch.update({
  where: { id: batchId },
  data: {
    channels: {
      connect: [{ id: "new_channel_id" }]
    }
  }
})
```

---

### 4. Template (Message Content)

Represents reusable message templates with placeholders (FR-M01, FR-M02).

```prisma
model Template {
  id          String     @id @default(cuid())
  name        String     // Template identifier (e.g., "Promo Q1 2025")
  content     String     @db.Text // Message text with {{placeholders}}
  description String?    // Usage notes
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Media attachments (optional)
  mediaType   MediaType? // photo | video | document
  mediaUrl    String?    // URL or base64-encoded data

  // Metadata
  usageCount  Int        @default(0) // How many campaigns used this template

  // Relationships
  campaigns   Campaign[] @relation("CampaignTemplate")

  @@index([name])
  @@map("templates")
}

enum MediaType {
  PHOTO
  VIDEO
  DOCUMENT
}
```

**Fields**:
- `content`: Message text (supports {{placeholder}} syntax - see FR-M02)
- `mediaType`: Optional media attachment type
- `mediaUrl`: Media source (URL or base64 for small images)
- `usageCount`: Track popular templates (analytics feature)

**Placeholder Syntax** (FR-M02):
```typescript
// Example template content:
"Привет, {{channel_name}}! Спецпредложение для ваших подписчиков: {{offer_text}}"

// Rendering with substitution:
function renderTemplate(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] || '')
}

// Usage:
const message = renderTemplate(template.content, {
  channel_name: "TechNews",
  offer_text: "Скидка 20% на все курсы"
})
// Result: "Привет, TechNews! Спецпредложение для ваших подписчиков: Скидка 20% на все курсы"
```

---

### 5. Campaign (Broadcast Execution)

Represents a broadcast campaign targeting a batch with a template (FR-CA01, FR-CA02, FR-D01).

```prisma
model Campaign {
  id          String         @id @default(cuid())
  name        String         // Campaign identifier
  description String?

  // Configuration
  batchId     String
  templateId  String
  params      Json           // Template placeholder values: {"channel_name": "...", "offer_text": "..."}

  // Delivery settings (FR-D01, FR-D02, FR-D03)
  mode        CampaignMode   @default(TEST) // test | live
  deliveryRate Int           @default(20)   // Messages per minute
  retryLimit  Int            @default(3)    // Max retry attempts per job

  // Status tracking
  status      CampaignStatus @default(QUEUED)
  progress    Int            @default(0)    // Jobs completed (sent + failed)
  totalJobs   Int            @default(0)    // Total channels to broadcast to

  // Timestamps
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  startedAt   DateTime?      // When first job started
  completedAt DateTime?      // When all jobs finished
  createdById String

  // Relationships
  batch       Batch          @relation("CampaignBatch", fields: [batchId], references: [id])
  template    Template       @relation("CampaignTemplate", fields: [templateId], references: [id])
  createdBy   User           @relation("CampaignCreator", fields: [createdById], references: [id])
  jobs        Job[]          @relation("CampaignJobs")

  @@index([status])
  @@index([batchId])
  @@index([createdById])
  @@index([createdAt])
  @@map("campaigns")
}

enum CampaignMode {
  TEST  // Send to operator's own account only (FR-T01)
  LIVE  // Send to all channels in batch
}

enum CampaignStatus {
  QUEUED     // Created, jobs not yet added to queue
  RUNNING    // Jobs being processed
  PAUSED     // Operator paused execution (FR-CA02)
  COMPLETED  // All jobs finished (sent or failed)
  FAILED     // Critical error (e.g., session expired)
  CANCELLED  // Operator cancelled campaign
}
```

**Fields**:
- `params`: JSON object with placeholder values (passed to template renderer)
- `mode`: TEST sends to operator's account, LIVE sends to all channels (FR-T01)
- `deliveryRate`: Rate limiter config (messages/minute) - see constitutional Principle I
- `progress`: Cached count of completed jobs (avoid expensive COUNT queries)
- `totalJobs`: Total channels in batch (set when campaign created)

**Status Transitions**:
```
QUEUED → RUNNING → COMPLETED
           ↓
        PAUSED → RUNNING
           ↓
        CANCELLED
```

**Rate Limiting** (Principle I):
```typescript
// BullMQ queue configuration
const queue = new Queue(`campaign:${campaignId}`, {
  limiter: {
    max: campaign.deliveryRate, // e.g., 20 jobs
    duration: 60000              // per 60 seconds
  }
})
```

---

### 6. Job (Individual Send Task)

Represents a single message send operation (FR-CA03, Principle II: persistence).

```prisma
model Job {
  id          String     @id @default(cuid())
  campaignId  String
  channelId   String

  // BullMQ metadata
  bullJobId   String?    @unique // BullMQ job ID (for status queries)

  // Status tracking
  status      JobStatus  @default(QUEUED)
  attempts    Int        @default(0)      // Retry count
  errorMessage String?   @db.Text         // Last error (e.g., "FLOOD_WAIT_30")

  // Timestamps
  createdAt   DateTime   @default(now())
  startedAt   DateTime?  // When worker picked up job
  sentAt      DateTime?  // When message successfully sent
  failedAt    DateTime?  // When job permanently failed

  // Relationships
  campaign    Campaign   @relation("CampaignJobs", fields: [campaignId], references: [id], onDelete: Cascade)
  channel     Channel    @relation("JobChannel", fields: [channelId], references: [id])

  @@index([campaignId, status])
  @@index([channelId])
  @@index([status])
  @@map("jobs")
}

enum JobStatus {
  QUEUED   // Waiting in BullMQ queue
  SENDING  // Worker is executing send operation
  SENT     // Message successfully sent
  FAILED   // Permanently failed after retries
}
```

**Fields**:
- `bullJobId`: BullMQ job identifier (for querying queue status)
- `attempts`: Incremented on each retry (stop after `campaign.retryLimit`)
- `errorMessage`: Debug info for operators (e.g., "FLOOD_WAIT_30" = wait 30 seconds)

**Job Lifecycle**:
```
QUEUED → SENDING → SENT
           ↓
        FAILED (after retries exhausted)
```

**Error Handling** (Principle I):
```typescript
// Worker job processor
async function processJob(job: BullMQJob) {
  const dbJob = await prisma.job.findUnique({ where: { id: job.data.jobId } })

  try {
    await prisma.job.update({
      where: { id: dbJob.id },
      data: { status: 'SENDING', startedAt: new Date() }
    })

    await sendMessageViaGramJS(dbJob.channelId, job.data.messageText)

    await prisma.job.update({
      where: { id: dbJob.id },
      data: { status: 'SENT', sentAt: new Date() }
    })
  } catch (err) {
    if (err.errorMessage === 'FLOOD_WAIT') {
      // Exponential backoff (constitutional requirement)
      throw new Error('FLOOD_WAIT') // BullMQ will retry
    } else {
      // Permanent error (skip channel)
      await prisma.job.update({
        where: { id: dbJob.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
          failedAt: new Date()
        }
      })
    }
  }
}
```

---

### 7. AuditLog (Security & Compliance)

Tracks all security-relevant operations (Principle V: audit logging).

```prisma
model AuditLog {
  id        String       @id @default(cuid())
  userId    String?      // Null for system-generated events
  action    AuditAction
  resourceType String?   // "campaign", "batch", "user", etc.
  resourceId   String?   // ID of affected resource
  metadata  Json?        // Additional context (e.g., {"campaignId": "...", "channelId": "..."})
  severity  LogSeverity  @default(INFO)
  timestamp DateTime     @default(now())
  ipAddress String?      // Request IP (for auth events)

  // Relationships
  user      User?        @relation("UserAuditLogs", fields: [userId], references: [id])

  @@index([userId])
  @@index([action])
  @@index([timestamp])
  @@index([severity])
  @@map("audit_logs")
}

enum AuditAction {
  // Authentication
  USER_LOGIN
  USER_LOGOUT
  USER_LOGIN_FAILED

  // Authorization
  PERMISSION_DENIED

  // Campaign operations
  CAMPAIGN_CREATED
  CAMPAIGN_STARTED
  CAMPAIGN_PAUSED
  CAMPAIGN_RESUMED
  CAMPAIGN_CANCELLED

  // Batch operations
  BATCH_CREATED
  BATCH_UPDATED
  BATCH_DELETED

  // Channel operations
  CHANNEL_IMPORTED
  CHANNEL_DEACTIVATED

  // Security events
  SESSION_STRING_ADDED
  SESSION_STRING_ROTATED
  FLOOD_WAIT_TRIGGERED
  ACCOUNT_BANNED

  // System events
  WORKER_STARTED
  WORKER_STOPPED
  DATABASE_MIGRATION
}

enum LogSeverity {
  DEBUG
  INFO
  WARNING
  ERROR
  CRITICAL
}
```

**Fields**:
- `action`: Enum of all auditable events
- `resourceType` + `resourceId`: Link to affected entity (e.g., campaign ID)
- `metadata`: JSON blob for flexible context (e.g., `{"oldStatus": "running", "newStatus": "paused"}`)
- `severity`: For filtering critical events (e.g., FLOOD_WAIT = WARNING, ACCOUNT_BANNED = CRITICAL)

**Usage Examples**:
```typescript
// Log campaign start
await prisma.auditLog.create({
  data: {
    userId: operatorId,
    action: 'CAMPAIGN_STARTED',
    resourceType: 'campaign',
    resourceId: campaignId,
    severity: 'INFO'
  }
})

// Log rate limit violation
await prisma.auditLog.create({
  data: {
    action: 'FLOOD_WAIT_TRIGGERED',
    resourceType: 'campaign',
    resourceId: campaignId,
    metadata: { waitSeconds: 30, channelId: 'ch_123' },
    severity: 'WARNING'
  }
})

// Log failed login
await prisma.auditLog.create({
  data: {
    action: 'USER_LOGIN_FAILED',
    metadata: { username: 'operator1' },
    severity: 'WARNING',
    ipAddress: req.ip
  }
})
```

**Retention Policy**:
- Keep logs for 90 days minimum (compliance requirement)
- Archive to S3 or similar for long-term storage (>90 days)
- Index on `timestamp` for efficient date-range queries

---

## Complete Prisma Schema

```prisma
// shared/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

model User {
  id           String      @id @default(cuid())
  username     String      @unique
  passwordHash String
  role         UserRole    @default(OPERATOR)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  lastLoginAt  DateTime?

  createdBatches   Batch[]     @relation("BatchCreator")
  createdCampaigns Campaign[]  @relation("CampaignCreator")
  auditLogs        AuditLog[]  @relation("UserAuditLogs")

  @@index([username])
  @@map("users")
}

enum UserRole {
  ADMIN
  OPERATOR
  AUDITOR
}

// ============================================================================
// CHANNEL CATALOG
// ============================================================================

model Channel {
  id          String    @id @default(cuid())
  username    String    @unique
  category    String
  tgstatUrl   String?
  collectedAt DateTime
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  title       String?
  description String?   @db.Text
  memberCount Int?
  isVerified  Boolean   @default(false)
  lastChecked DateTime?

  isActive    Boolean   @default(true)
  errorCount  Int       @default(0)
  lastError   String?   @db.Text

  batches     Batch[]   @relation("BatchChannels")
  jobs        Job[]     @relation("JobChannel")

  @@index([category])
  @@index([username])
  @@index([isActive])
  @@map("channels")
}

// ============================================================================
// BATCH MANAGEMENT
// ============================================================================

model Batch {
  id           String     @id @default(cuid())
  name         String
  description  String?    @db.Text
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  createdById  String
  channelCount Int        @default(0)

  channels     Channel[]  @relation("BatchChannels")
  createdBy    User       @relation("BatchCreator", fields: [createdById], references: [id])
  campaigns    Campaign[] @relation("CampaignBatch")

  @@index([createdById])
  @@index([createdAt])
  @@map("batches")
}

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================

model Template {
  id          String     @id @default(cuid())
  name        String
  content     String     @db.Text
  description String?    @db.Text
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  mediaType   MediaType?
  mediaUrl    String?    @db.Text
  usageCount  Int        @default(0)

  campaigns   Campaign[] @relation("CampaignTemplate")

  @@index([name])
  @@map("templates")
}

enum MediaType {
  PHOTO
  VIDEO
  DOCUMENT
}

// ============================================================================
// CAMPAIGNS & JOBS
// ============================================================================

model Campaign {
  id           String         @id @default(cuid())
  name         String
  description  String?        @db.Text

  batchId      String
  templateId   String
  params       Json

  mode         CampaignMode   @default(TEST)
  deliveryRate Int            @default(20)
  retryLimit   Int            @default(3)

  status       CampaignStatus @default(QUEUED)
  progress     Int            @default(0)
  totalJobs    Int            @default(0)

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  startedAt    DateTime?
  completedAt  DateTime?
  createdById  String

  batch        Batch          @relation("CampaignBatch", fields: [batchId], references: [id])
  template     Template       @relation("CampaignTemplate", fields: [templateId], references: [id])
  createdBy    User           @relation("CampaignCreator", fields: [createdById], references: [id])
  jobs         Job[]          @relation("CampaignJobs")

  @@index([status])
  @@index([batchId])
  @@index([createdById])
  @@index([createdAt])
  @@map("campaigns")
}

enum CampaignMode {
  TEST
  LIVE
}

enum CampaignStatus {
  QUEUED
  RUNNING
  PAUSED
  COMPLETED
  FAILED
  CANCELLED
}

model Job {
  id           String     @id @default(cuid())
  campaignId   String
  channelId    String

  bullJobId    String?    @unique

  status       JobStatus  @default(QUEUED)
  attempts     Int        @default(0)
  errorMessage String?    @db.Text

  createdAt    DateTime   @default(now())
  startedAt    DateTime?
  sentAt       DateTime?
  failedAt     DateTime?

  campaign     Campaign   @relation("CampaignJobs", fields: [campaignId], references: [id], onDelete: Cascade)
  channel      Channel    @relation("JobChannel", fields: [channelId], references: [id])

  @@index([campaignId, status])
  @@index([channelId])
  @@index([status])
  @@map("jobs")
}

enum JobStatus {
  QUEUED
  SENDING
  SENT
  FAILED
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

model AuditLog {
  id           String       @id @default(cuid())
  userId       String?
  action       AuditAction
  resourceType String?
  resourceId   String?
  metadata     Json?
  severity     LogSeverity  @default(INFO)
  timestamp    DateTime     @default(now())
  ipAddress    String?

  user         User?        @relation("UserAuditLogs", fields: [userId], references: [id])

  @@index([userId])
  @@index([action])
  @@index([timestamp])
  @@index([severity])
  @@map("audit_logs")
}

enum AuditAction {
  USER_LOGIN
  USER_LOGOUT
  USER_LOGIN_FAILED
  PERMISSION_DENIED
  CAMPAIGN_CREATED
  CAMPAIGN_STARTED
  CAMPAIGN_PAUSED
  CAMPAIGN_RESUMED
  CAMPAIGN_CANCELLED
  BATCH_CREATED
  BATCH_UPDATED
  BATCH_DELETED
  CHANNEL_IMPORTED
  CHANNEL_DEACTIVATED
  SESSION_STRING_ADDED
  SESSION_STRING_ROTATED
  FLOOD_WAIT_TRIGGERED
  ACCOUNT_BANNED
  WORKER_STARTED
  WORKER_STOPPED
  DATABASE_MIGRATION
}

enum LogSeverity {
  DEBUG
  INFO
  WARNING
  ERROR
  CRITICAL
}
```

---

## Database Migrations

### Initial Migration

```bash
# Generate migration from schema
npx prisma migrate dev --name init

# Apply migration to production
npx prisma migrate deploy
```

### Sample Seed Data (Development)

```typescript
// shared/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN'
    }
  })

  // Create sample channels
  await prisma.channel.createMany({
    data: [
      { username: 'technews', category: 'tech', collectedAt: new Date() },
      { username: 'breakingnews', category: 'новости', collectedAt: new Date() },
      { username: 'cryptoupdates', category: 'crypto', collectedAt: new Date() }
    ]
  })

  // Create sample template
  await prisma.template.create({
    data: {
      name: 'Promo Template',
      content: 'Привет, {{channel_name}}! Специальное предложение: {{offer_text}}'
    }
  })

  console.log('Seed data created successfully')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

```bash
# Run seed
npx prisma db seed
```

---

## Query Examples

### Fetch Campaign with Progress

```typescript
const campaign = await prisma.campaign.findUnique({
  where: { id: campaignId },
  include: {
    batch: {
      include: {
        channels: { select: { id: true, username: true } }
      }
    },
    template: true,
    jobs: {
      select: { status: true },
      where: { status: { in: ['SENT', 'FAILED'] } }
    }
  }
})

// Calculate progress percentage
const completedJobs = campaign.jobs.length
const progressPercentage = (completedJobs / campaign.totalJobs) * 100
```

### List Channels with Filters

```typescript
// Filter by category and search username
const channels = await prisma.channel.findMany({
  where: {
    category: 'tech',
    username: { contains: 'crypto' }, // Partial match
    isActive: true
  },
  orderBy: { memberCount: 'desc' },
  take: 50, // Pagination
  skip: 0
})
```

### Audit Log Report

```typescript
// Get all critical security events in last 24 hours
const criticalEvents = await prisma.auditLog.findMany({
  where: {
    severity: { in: ['ERROR', 'CRITICAL'] },
    timestamp: { gte: new Date(Date.now() - 86400000) }
  },
  include: {
    user: { select: { username: true, role: true } }
  },
  orderBy: { timestamp: 'desc' }
})
```

---

## Performance Considerations

### Indexing Strategy

All indexes defined in schema:
- `User.username`: Fast login queries
- `Channel.category`, `Channel.username`, `Channel.isActive`: Catalog filters
- `Campaign.status`, `Campaign.batchId`: Dashboard queries
- `Job.campaignId + Job.status`: Progress tracking (composite index)
- `AuditLog.timestamp`, `AuditLog.severity`: Log reports

### Query Optimization

1. **Use `select` to fetch only needed fields**:
   ```typescript
   const campaigns = await prisma.campaign.findMany({
     select: { id: true, name: true, status: true } // Don't fetch params JSON
   })
   ```

2. **Cursor-based pagination for large tables**:
   ```typescript
   const channels = await prisma.channel.findMany({
     take: 100,
     skip: 1,
     cursor: { id: lastChannelId }
   })
   ```

3. **Batch operations for imports**:
   ```typescript
   await prisma.channel.createMany({ data: channels, skipDuplicates: true })
   ```

4. **Use transactions for consistency**:
   ```typescript
   await prisma.$transaction([
     prisma.campaign.update({ where: { id }, data: { status: 'PAUSED' } }),
     prisma.auditLog.create({ data: { action: 'CAMPAIGN_PAUSED' } })
   ])
   ```

---

## Next Steps

With data model complete, proceed to:
1. **contracts/**: OpenAPI specs for all API endpoints
2. **quickstart.md**: Local development setup guide
3. **tasks.md**: Implementation task breakdown (via `/speckit.tasks`)
