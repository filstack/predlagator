# Research: Telegram Channel Broadcast Management System

**Feature**: [spec.md](spec.md)
**Status**: Technology choices finalized
**Last Updated**: 2025-10-13

## Purpose

This document captures technology decisions, rationale, and best practices for implementing the Telegram Channel Broadcast Management System. All choices align with the [constitution](.specify/memory/constitution.md) principles and support deployment on Vercel free tier.

---

## Technology Decisions

### 1. Frontend Framework: React 18.2 + TypeScript 5.3

**Decision**: Use React 18.2 with TypeScript for the web interface.

**Rationale**:
- **Constitutional alignment**: Principle VI mandates React + TypeScript stack
- **Component ecosystem**: shadcn UI library (requirement FR-F02) is built for React
- **Type safety**: TypeScript prevents runtime errors, improves maintainability (FR-F01)
- **Developer experience**: Excellent tooling (Vite, ESLint, Prettier), large community
- **Performance**: React 18 concurrent features enable better UX (suspense, transitions)
- **Vercel optimization**: First-class React support, automatic code splitting

**Alternatives Considered**:
- **Vue 3 + TypeScript**: Rejected - shadcn UI not available for Vue
- **Svelte + TypeScript**: Rejected - smaller ecosystem for enterprise UI components
- **Next.js 14**: Rejected - SSR unnecessary for this admin dashboard, adds complexity

**Implementation Notes**:
- Use Vite 5.0 for fast dev server and optimized builds (3-5s build time vs 20s+ with CRA)
- Enable strict TypeScript mode (`strict: true` in tsconfig.json)
- Use React.lazy() for route-based code splitting (FR-F06: bundle size <500 KB)

---

### 2. UI Component Library: shadcn/ui + Radix UI

**Decision**: Use shadcn/ui as the primary component library.

**Rationale**:
- **Constitutional requirement**: Principle VI explicitly mandates shadcn UI
- **Accessibility**: Built on Radix UI primitives (WCAG 2.1 AA compliance out of box) - satisfies FR-F04
- **Customization**: Components copied into project, fully customizable (not a black-box dependency)
- **TypeScript native**: Full type safety for all component props
- **Tailwind integration**: Uses Tailwind CSS classes (already required for responsive design)
- **Zero runtime cost**: No additional JS bundle overhead vs custom components

**Alternatives Considered**:
- **Material-UI (MUI)**: Rejected - large bundle size (~300 KB), harder to customize
- **Ant Design**: Rejected - opinionated design system, difficult to match brand identity
- **Chakra UI**: Rejected - runtime CSS-in-JS performance penalty

**Required Components** (from FR-F02):
- Button, Table, Dialog, Form, Select, Input, Textarea
- Badge, Card, Tabs, Alert, Toast

**Implementation Notes**:
```bash
# Install shadcn CLI and initialize
npx shadcn-ui@latest init

# Add required components
npx shadcn-ui@latest add button table dialog form select input textarea badge card tabs alert toast
```

**Best Practices**:
- Use `<Form>` component with react-hook-form for validation (FR-F08)
- Wrap Table with virtualization for large datasets (>1000 rows)
- Use `<Toast>` for success/error feedback instead of alerts

---

### 3. State Management: Zustand 4.4

**Decision**: Use Zustand for global state management.

**Rationale**:
- **Simplicity**: Minimal boilerplate vs Redux (50-80% less code)
- **TypeScript support**: Excellent type inference, no need for action creators
- **Performance**: Selector-based subscriptions prevent unnecessary re-renders
- **DevTools**: Redux DevTools integration for debugging
- **Bundle size**: ~1 KB vs ~10 KB (Redux Toolkit)
- **Constitutional alignment**: Supports clear separation of concerns (Principle VI)

**Alternatives Considered**:
- **Redux Toolkit**: Rejected - overkill for this app's complexity, larger bundle
- **React Context**: Rejected - causes unnecessary re-renders, difficult to optimize
- **Jotai/Recoil**: Rejected - atomic state model unnecessary for this use case

**Store Structure**:
```typescript
// frontend/src/store/channelsStore.ts
interface ChannelsStore {
  channels: Channel[]
  loading: boolean
  error: string | null
  fetchChannels: () => Promise<void>
  importChannels: (file: File) => Promise<void>
}

// frontend/src/store/authStore.ts
interface AuthStore {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}
```

**Best Practices**:
- Separate stores by domain (channels, batches, campaigns, auth)
- Use middleware for persistence (`persist` middleware for auth token)
- Use selectors to prevent re-renders: `const channels = useChannelsStore(state => state.channels)`

---

### 4. Telegram Client: GramJS 2.19

**Decision**: Use GramJS for all Telegram API interactions.

**Rationale**:
- **MTProto implementation**: Official Telegram protocol, most reliable for channel operations
- **Session persistence**: Supports session string storage (constitutional Principle V: encryption required)
- **Rate limit handling**: Built-in FLOOD_WAIT error detection (Principle I requirement)
- **TypeScript native**: Full type definitions for API methods
- **Node.js compatible**: Runs on backend server (not in browser)
- **Active maintenance**: Regular updates for Telegram API changes

**Alternatives Considered**:
- **telegram (node-telegram-bot-api)**: Rejected - bot API only, cannot send to channels without bot membership
- **Telegraf**: Rejected - bot framework, not suitable for user account operations
- **tdlib (TDLight)**: Rejected - C++ binding complexity, harder to deploy on Node.js platforms

**Core Operations**:
```typescript
// backend/src/services/gramjs/client.ts
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'

export async function createClient(sessionString: string): Promise<TelegramClient> {
  const client = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    { connectionRetries: 5 }
  )
  await client.connect()
  return client
}

// Send message with rate limit protection
export async function sendMessage(client: TelegramClient, channel: string, message: string) {
  try {
    await client.sendMessage(channel, { message })
  } catch (err) {
    if (err.errorMessage === 'FLOOD_WAIT') {
      const waitSeconds = err.seconds
      // Log and implement exponential backoff (Principle I)
      throw new FloodWaitError(waitSeconds)
    }
    throw err
  }
}
```

**Best Practices** (Constitutional Principle I - Rate Limit Protection):
- **Connection pooling**: Max 5 concurrent TelegramClient instances (avoid FLOOD triggers)
- **Throttling**: Default 1 message every 3-5 seconds per channel
- **Exponential backoff**: On FLOOD_WAIT error, wait `err.seconds * 1.5` before retry
- **Session reuse**: Never create new sessions during campaigns (increases ban risk)
- **Error classification**:
  - **Transient** (retry): `FLOOD_WAIT`, `NETWORK_ERROR`, `TIMEOUT`
  - **Permanent** (skip): `PEER_ID_INVALID`, `CHAT_WRITE_FORBIDDEN`, `USER_BANNED_IN_CHANNEL`

---

### 5. Job Queue: BullMQ 5.1 + Redis

**Decision**: Use BullMQ with Redis for campaign job persistence.

**Rationale**:
- **Constitutional requirement**: Principle II mandates persistent job queue (survive crashes)
- **Redis persistence**: Jobs stored in Redis with AOF (append-only file) or RDB snapshots
- **Rate limiting**: Built-in rate limiter (e.g., max 20 jobs per minute)
- **Retry logic**: Automatic exponential backoff, configurable max attempts
- **Job prioritization**: Support for priority queues (urgent campaigns first)
- **Progress tracking**: Real-time job status updates (queued → active → completed/failed)
- **TypeScript support**: Full type definitions

**Alternatives Considered**:
- **Bull (v4)**: Rejected - deprecated in favor of BullMQ
- **Agenda**: Rejected - MongoDB-based, no Redis persistence guarantees
- **Bee-Queue**: Rejected - lacks advanced features (priorities, rate limiting)
- **Database polling**: Rejected - inefficient, no real-time updates

**Queue Architecture**:
```typescript
// backend/src/workers/queues.ts
import { Queue, Worker } from 'bullmq'

// Separate queue for each campaign (Principle IV: Batch Independence)
export function createCampaignQueue(campaignId: string) {
  return new Queue(`campaign:${campaignId}`, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: false, // Keep for auditing (Principle II)
      removeOnFail: false
    }
  })
}

// Worker with rate limiting (Principle I)
export function createCampaignWorker(campaignId: string) {
  return new Worker(
    `campaign:${campaignId}`,
    async (job) => {
      // Send message via GramJS
      await sendMessageToChannel(job.data.channelId, job.data.messageText)
    },
    {
      connection: redisConnection,
      limiter: {
        max: 20, // Max 20 messages per minute
        duration: 60000
      }
    }
  )
}
```

**Redis Hosting** (Vercel free tier constraint):
- **Recommended**: Redis Cloud free tier (30 MB, sufficient for ~50K jobs)
- **Alternative**: Upstash Redis (10K requests/day free)
- **Not recommended**: Self-hosted Redis (requires separate server management)

**Best Practices**:
- Use separate queues per campaign (FR-C04: pause/resume campaigns independently)
- Store job results in Postgres (BullMQ events → Postgres audit log)
- Monitor queue health: active jobs, failed jobs, wait time metrics
- Implement dead letter queue for jobs failing after max retries

---

### 6. Database: PostgreSQL 15 + Prisma ORM 5.7

**Decision**: Use PostgreSQL 15 with Prisma ORM.

**Rationale**:
- **Vercel constraint**: Principle VII requires external database (no Vercel persistent storage)
- **ACID compliance**: Critical for campaign state consistency (queued → sending → sent)
- **JSON support**: Store campaign metadata, message templates with placeholders
- **Full-text search**: Efficient channel catalog filtering (FR-C02: search by category, username)
- **Prisma benefits**:
  - Type-safe queries (TypeScript auto-completion)
  - Automatic migrations (version control for schema changes)
  - Excellent developer experience (Prisma Studio for debugging)

**Alternatives Considered**:
- **MySQL**: Rejected - weaker JSON support, no full-text search on JSON fields
- **MongoDB**: Rejected - no ACID guarantees for campaign state transitions
- **Supabase (Postgres)**: **Recommended** - free tier (500 MB, 2 CPU cores), includes auth
- **Neon**: Alternative - free tier (512 MB, 3 GB storage)
- **Railway**: Alternative - $5/month after trial, easier worker deployment

**Schema Overview** (7 core entities):
```prisma
// shared/prisma/schema.prisma
model Channel {
  id          String   @id @default(cuid())
  username    String   @unique
  category    String
  tgstatUrl   String?
  collectedAt DateTime
  createdAt   DateTime @default(now())
}

model Batch {
  id          String    @id @default(cuid())
  name        String
  channelIds  String[]  // Array of Channel IDs
  createdAt   DateTime  @default(now())
  campaigns   Campaign[]
}

model Campaign {
  id          String         @id @default(cuid())
  batchId     String
  templateId  String
  status      CampaignStatus // queued | running | paused | completed | failed
  startedAt   DateTime?
  completedAt DateTime?
  jobs        Job[]
}

model Job {
  id          String    @id @default(cuid())
  campaignId  String
  channelId   String
  status      JobStatus // queued | sending | sent | failed
  sentAt      DateTime?
  error       String?
}

model User {
  id       String   @id @default(cuid())
  username String   @unique
  password String   // bcrypt hash
  role     UserRole // admin | operator | auditor
}

model Template {
  id      String @id @default(cuid())
  name    String
  content String // Message text with {{placeholders}}
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // "campaign.start", "batch.create", etc.
  timestamp DateTime @default(now())
}
```

**Best Practices**:
- Use transactions for campaign state changes (prevent race conditions)
- Index frequently queried fields: `@@index([username])`, `@@index([category])`
- Use `@updatedAt` for optimistic locking (prevent concurrent edits)
- Enable query logging in development: `prisma: { log: ['query'] }`

---

### 7. Authentication: JWT (jose 5.1) + bcrypt 5.1

**Decision**: Use JWT for stateless authentication with bcrypt for password hashing.

**Rationale**:
- **Vercel compatibility**: Stateless tokens work with serverless functions (no session storage)
- **RBAC support**: Embed role in JWT payload (FR-S03: admin/operator/auditor roles)
- **Constitutional Principle V**: Security & Privacy requirement satisfied
- **jose library**: Web Crypto API based, no node-gyp dependencies (Vercel compatible)
- **bcrypt**: Industry standard for password hashing (10 rounds minimum)

**Alternatives Considered**:
- **Passport.js**: Rejected - session-based, requires persistent storage
- **NextAuth.js**: Rejected - tightly coupled to Next.js, unnecessary for Express API
- **Auth0/Clerk**: Rejected - third-party dependency, free tier limits (7,000 users max)

**Implementation**:
```typescript
// backend/src/services/auth/jwt.ts
import * as jose from 'jose'

export async function signJWT(userId: string, role: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  const jwt = await new jose.SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
  return jwt
}

export async function verifyJWT(token: string): Promise<{ userId: string; role: string }> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  const { payload } = await jose.jwtVerify(token, secret)
  return { userId: payload.userId as string, role: payload.role as string }
}
```

**Best Practices**:
- Store JWT in httpOnly cookie (XSS protection) + localStorage (API requests)
- Rotate JWT_SECRET on security incidents (invalidates all tokens)
- Implement refresh token for long-lived sessions (optional for MVP)
- Log all authentication failures (Principle V: security audit requirement)

---

### 8. API Design: RESTful + Express 4.18

**Decision**: Use Express.js with RESTful API design.

**Rationale**:
- **Simplicity**: Minimal overhead, easy to deploy as Vercel serverless functions
- **Vercel compatibility**: Automatic conversion of `/api` routes to serverless functions
- **Ecosystem**: Mature middleware ecosystem (cors, helmet, rate limiting)
- **TypeScript support**: Via `@types/express` package

**Alternatives Considered**:
- **GraphQL (Apollo Server)**: Rejected - overkill for CRUD operations, larger bundle size
- **tRPC**: Rejected - requires tight coupling between frontend/backend, complicates deployment
- **Fastify**: Rejected - performance benefits negligible for Vercel serverless (cold start overhead)

**API Structure** (see `/contracts` directory for full OpenAPI specs):
```
POST   /api/auth/login              # Authenticate user
POST   /api/auth/logout             # Invalidate token

GET    /api/channels                # List channels (pagination, filters)
POST   /api/channels/import         # Import JSONL file
GET    /api/channels/:id            # Get channel details

POST   /api/batches                 # Create batch
GET    /api/batches                 # List batches
PATCH  /api/batches/:id             # Update batch

POST   /api/campaigns               # Create campaign
GET    /api/campaigns/:id           # Get campaign status
PATCH  /api/campaigns/:id/pause     # Pause campaign
PATCH  /api/campaigns/:id/resume    # Resume campaign

GET    /api/templates               # List templates
POST   /api/templates               # Create template
```

**Best Practices**:
- Use middleware for auth: `app.use('/api/campaigns', authenticate, authorize('operator'))`
- Validate request bodies with zod schemas (shared with frontend via `/shared`)
- Return consistent error format: `{ error: { code: 'INVALID_INPUT', message: '...' } }`
- Use 10s timeout for all Vercel API routes (Principle VII requirement)

---

### 9. Deployment: Vercel (Frontend + API) + Railway (Workers)

**Decision**: Deploy frontend and lightweight API to Vercel, workers to Railway.

**Rationale**:
- **Constitutional Principle VII**: Vercel free tier constraints mandate this split
- **Vercel free tier limits**:
  - 10s max serverless function execution (cannot run campaign workers)
  - 100 GB bandwidth/month (sufficient for UI + API traffic)
  - 50 requests/hour per function (API routes are short-lived CRUD operations)
- **Railway for workers**:
  - $5/month for 500 hours execution time (sufficient for continuous workers)
  - Persistent process support (no 10s timeout)
  - Easy Redis + Postgres add-ons
- **Architecture separation**:
  - **Vercel**: React SPA + Express API routes (CRUD only, <10s execution)
  - **Railway**: BullMQ workers + Redis + Postgres (long-running campaigns)

**Alternatives Considered**:
- **All-in-one on Railway**: Rejected - loses Vercel's CDN, slower static asset delivery
- **All-in-one on Vercel**: Rejected - violates 10s function timeout (campaigns take hours)
- **AWS Lambda + EC2**: Rejected - more complex, no free tier for both components
- **Heroku**: Rejected - no free tier as of 2022

**Deployment Flow**:
```yaml
# vercel.json (frontend + API)
{
  "builds": [
    { "src": "frontend/package.json", "use": "@vercel/static-build" },
    { "src": "backend/api/**/*.ts", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/api/$1" },
    { "src": "/(.*)", "dest": "frontend/dist/$1" }
  ]
}

# Railway Procfile (workers only)
worker: node backend/dist/workers/campaign-worker.js
```

**Environment Variables**:
- **Vercel**: `JWT_SECRET`, `DATABASE_URL`, `BACKEND_WORKER_URL` (Railway endpoint)
- **Railway**: `DATABASE_URL`, `REDIS_URL`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `SESSION_STRING` (encrypted)

**Best Practices**:
- Use Vercel preview deployments for PR reviews (automatic staging environments)
- Monitor Railway worker memory usage (free tier: 512 MB limit)
- Use Vercel Analytics for frontend performance (SC-014: page load <3s)
- Set up uptime monitoring for Railway workers (healthcheck endpoint)

---

### 10. Form Validation: react-hook-form 7.48 + zod 3.22

**Decision**: Use react-hook-form with zod for all form validation.

**Rationale**:
- **Type safety**: Zod schemas generate TypeScript types automatically
- **Performance**: Uncontrolled inputs reduce re-renders vs Formik
- **DX**: Simple API, integrates seamlessly with shadcn Form component (FR-F08)
- **Shared validation**: Zod schemas can be shared between frontend/backend (via `/shared`)
- **Error handling**: Automatic error messages, field-level validation

**Alternatives Considered**:
- **Formik + Yup**: Rejected - more boilerplate, slower performance
- **React Final Form**: Rejected - smaller community, less TypeScript support
- **Manual validation**: Rejected - error-prone, duplicates logic

**Implementation**:
```typescript
// shared/src/schemas/batch.schema.ts
import { z } from 'zod'

export const createBatchSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  channelIds: z.array(z.string()).min(1, 'Select at least one channel'),
  description: z.string().optional()
})

export type CreateBatchInput = z.infer<typeof createBatchSchema>
```

```typescript
// frontend/src/pages/batches/CreateBatch.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createBatchSchema, type CreateBatchInput } from '@/shared/schemas/batch.schema'

export function CreateBatch() {
  const form = useForm<CreateBatchInput>({
    resolver: zodResolver(createBatchSchema)
  })

  const onSubmit = (data: CreateBatchInput) => {
    // API call to create batch
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* shadcn Form components */}
      </form>
    </Form>
  )
}
```

**Best Practices**:
- Define all schemas in `/shared/src/schemas` (reuse on backend for API validation)
- Use `z.preprocess()` for data transformation (e.g., trim whitespace)
- Add custom error messages: `z.string().min(3, { message: 'Custom error' })`
- Validate on blur for better UX: `mode: 'onBlur'` in useForm config

---

### 11. Build Tool: Vite 5.0

**Decision**: Use Vite for frontend development and builds.

**Rationale**:
- **Speed**: 10-100x faster dev server vs Webpack (instant HMR)
- **Build performance**: <10s production builds (vs 60s+ with CRA)
- **Vercel constraint**: Principle VII requires <45 min builds (Vite easily meets this)
- **Modern features**: Native ESM, automatic code splitting, tree shaking
- **TypeScript**: Zero-config TypeScript support
- **React support**: Official `@vitejs/plugin-react` plugin

**Alternatives Considered**:
- **Create React App**: Rejected - deprecated, slow builds, large bundle size
- **Webpack 5**: Rejected - complex configuration, slower dev server
- **Parcel**: Rejected - less mature plugin ecosystem

**Configuration**:
```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select']
        }
      }
    }
  }
})
```

**Best Practices**:
- Enable gzip compression in production: `vite-plugin-compression`
- Use `import.meta.env` for environment variables (Vite convention)
- Lazy load routes: `const Campaigns = lazy(() => import('./pages/Campaigns'))`
- Analyze bundle size: `vite-plugin-visualizer` (ensure <500 KB gzipped - FR-F10)

---

## Security Best Practices

### Session String Encryption (Principle V)

**Requirement**: Encrypt Telegram session strings at rest (AES-256).

**Implementation**:
```typescript
// backend/src/services/encryption/session.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex') // 32 bytes

export function encryptSession(sessionString: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)

  let encrypted = cipher.update(sessionString, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decryptSession(encryptedSession: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedSession.split(':')

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(ivHex, 'hex')
  )
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

**Key management**:
- Generate key: `openssl rand -hex 32`
- Store in environment variable: `ENCRYPTION_KEY=<64-char-hex>`
- Rotate annually: re-encrypt all sessions with new key
- Never commit to Git: add to `.gitignore`

---

### Rate Limit Monitoring (Principle I)

**Requirement**: Log all Telegram rate limit violations.

**Implementation**:
```typescript
// backend/src/services/monitoring/rate-limit-tracker.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function logFloodWait(
  channelId: string,
  waitSeconds: number,
  campaignId: string
) {
  await prisma.auditLog.create({
    data: {
      action: 'FLOOD_WAIT',
      metadata: { channelId, waitSeconds, campaignId },
      severity: 'warning',
      timestamp: new Date()
    }
  })

  // If repeated violations, auto-pause campaign (Principle I)
  const recentViolations = await prisma.auditLog.count({
    where: {
      action: 'FLOOD_WAIT',
      campaignId,
      timestamp: { gte: new Date(Date.now() - 600000) } // Last 10 min
    }
  })

  if (recentViolations >= 3) {
    await pauseCampaign(campaignId)
    // Send alert to operators
  }
}
```

---

## Performance Optimization

### Frontend Bundle Size (FR-F10: <500 KB gzipped)

**Techniques**:
1. **Code splitting**: Lazy load routes with React.lazy()
2. **Tree shaking**: Import only used components: `import { Button } from '@/components/ui/button'`
3. **Dynamic imports**: Load heavy libraries on demand (e.g., chart.js for reports)
4. **Bundle analysis**: Use `vite-plugin-visualizer` to identify large dependencies
5. **CDN for heavy assets**: Host images on Vercel Image Optimization API

**Measurement**:
```bash
# Build and check bundle size
npm run build
cd frontend/dist/assets
du -sh *.js | awk '{if ($1 ~ /K/) print; else if ($1 ~ /M/) {split($1, a, "M"); if (a[1] > 0.5) print}}'
```

---

### Database Query Optimization

**Indexes**:
```prisma
model Channel {
  username String @unique
  category String

  @@index([category])
  @@index([username])
}

model Campaign {
  status CampaignStatus
  batchId String

  @@index([status])
  @@index([batchId, status])
}
```

**Pagination** (FR-C02: efficient catalog browsing):
```typescript
// Use cursor-based pagination for large datasets
const channels = await prisma.channel.findMany({
  take: 100,
  skip: 1,
  cursor: { id: lastChannelId },
  orderBy: { createdAt: 'desc' }
})
```

---

## Testing Strategy (OPTIONAL - Only if requested)

**Note**: Tests are not required for MVP unless explicitly requested in specification.

If tests are requested, use:
- **Unit tests**: Vitest (Vite-native test runner)
- **Component tests**: React Testing Library
- **API tests**: Supertest (Express endpoint testing)
- **E2E tests**: Playwright (full user flows)

---

## Deployment Checklist

### Vercel Setup

1. **Connect GitHub repo**: Automatic deployments on push to `main`
2. **Environment variables**:
   ```
   JWT_SECRET=<random-64-char-hex>
   DATABASE_URL=<postgres-connection-string>
   BACKEND_WORKER_URL=<railway-app-url>
   ```
3. **Build settings**:
   - Framework: Vite
   - Build command: `cd frontend && npm run build`
   - Output directory: `frontend/dist`
4. **API routes**: Automatically detected in `/backend/api` directory

### Railway Setup

1. **Create app**: Select "Deploy from GitHub repo"
2. **Add Redis**: From Railway marketplace (free tier)
3. **Add Postgres**: From Railway marketplace (or use Supabase)
4. **Environment variables**:
   ```
   DATABASE_URL=<postgres-connection-string>
   REDIS_URL=<redis-connection-string>
   TELEGRAM_API_ID=<from-my.telegram.org>
   TELEGRAM_API_HASH=<from-my.telegram.org>
   SESSION_STRING=<encrypted-session-string>
   ENCRYPTION_KEY=<32-byte-hex>
   ```
5. **Start command**: `node backend/dist/workers/campaign-worker.js`
6. **Health check**: `GET /health` endpoint (returns 200 if worker alive)

---

## Open Questions & Risks

### 1. JSONL Import Performance

**Question**: How to handle large JSONL files (>100K channels) without timing out Vercel function?

**Proposed Solution**:
- Upload file to temporary storage (S3 or Vercel Blob)
- Trigger Railway worker to process file in background
- Poll `/api/channels/import-status/:jobId` for progress

**Risk**: Low - batched_files sample shows ~2K channels per file (manageable)

---

### 2. Real-Time Campaign Monitoring

**Question**: How to display real-time campaign progress (jobs sent, failed, remaining)?

**Proposed Solution**:
- **Frontend**: Poll `/api/campaigns/:id` every 5 seconds (while campaign is running)
- **Backend**: Aggregate job counts from BullMQ: `queue.getJobCounts()`
- **Alternative**: WebSocket connection (requires separate Railway service, not Vercel)

**Risk**: Medium - polling is less efficient but simpler for MVP

---

### 3. Telegram Session String Acquisition

**Question**: How do operators initially provide session strings?

**Proposed Solution**:
- Admin panel page: "Add Telegram Account"
- User enters phone number → GramJS sends code → user enters code → session string saved (encrypted)
- Security: Only admins can add accounts, session strings never displayed in UI after initial setup

**Risk**: Low - standard GramJS authentication flow

---

## References

- [GramJS Documentation](https://gram.js.org/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Limits](https://vercel.com/docs/limits/overview)
- [Railway Documentation](https://docs.railway.app/)

---

## Next Steps

With research complete, proceed to:
1. **data-model.md**: Full Prisma schema with relationships
2. **contracts/**: OpenAPI specs for all API endpoints
3. **quickstart.md**: Local development setup guide
4. **tasks.md**: Implementation task breakdown (via `/speckit.tasks`)
