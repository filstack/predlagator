# Quickstart: Telegram Channel Broadcast Management System

**Feature**: [spec.md](spec.md)
**Last Updated**: 2025-10-13

## Purpose

This guide will get you from zero to a running local development environment in ~15 minutes.

---

## Prerequisites

### Required Software

- **Node.js**: 20 LTS ([download](https://nodejs.org/))
- **Git**: Latest version ([download](https://git-scm.com/))
- **PostgreSQL**: 15+ ([download](https://www.postgresql.org/download/)) OR use Supabase (recommended)
- **Redis**: 7+ ([download](https://redis.io/download/)) OR use Redis Cloud (recommended)

### Optional (Recommended)

- **VSCode**: With extensions: Prisma, ESLint, Prettier
- **Postman/Insomnia**: For API testing
- **Docker Desktop**: For local PostgreSQL + Redis (alternative to cloud services)

---

## Step 1: Clone Repository

```bash
git clone <repository-url>
cd бот_рассылка

# Create feature branch (if not already on it)
git checkout 001-telegram-channel-broadcast
```

---

## Step 2: Database Setup

### Option A: Supabase (Recommended - Free Tier)

1. **Create account**: https://supabase.com/dashboard
2. **Create project**: "telegram-broadcast-dev"
3. **Get connection string**: Settings → Database → Connection string (URI)
4. **Copy connection string**: Format is `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`

### Option B: Local PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Windows (Chocolatey)
choco install postgresql15

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql-15

# Create database
psql -U postgres
CREATE DATABASE telegram_broadcast_dev;
\q
```

**Connection string**: `postgresql://postgres:postgres@localhost:5432/telegram_broadcast_dev`

---

## Step 3: Redis Setup

### Option A: Redis Cloud (Recommended - Free Tier)

1. **Create account**: https://redis.com/try-free/
2. **Create database**: Free 30 MB tier
3. **Get connection string**: Database → Configuration → Public endpoint
4. **Format**: `redis://default:[password]@redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345`

### Option B: Local Redis

```bash
# macOS (Homebrew)
brew install redis
brew services start redis

# Windows (Chocolatey)
choco install redis

# Linux (Ubuntu/Debian)
sudo apt-get install redis-server
sudo systemctl start redis

# Test connection
redis-cli ping
# Should return: PONG
```

**Connection string**: `redis://localhost:6379`

---

## Step 4: Telegram API Credentials

1. **Get API credentials**: Visit https://my.telegram.org/apps
2. **Login**: Use your phone number
3. **Create app**: "Telegram Broadcast Manager"
4. **Copy credentials**: `api_id` and `api_hash`

**Important**: Keep these secret! Never commit to Git.

---

## Step 5: Environment Configuration

### Backend Environment

Create `backend/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Redis
REDIS_URL="redis://default:[password]@redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345"

# JWT Authentication
JWT_SECRET="generate-with-openssl-rand-hex-32"

# Telegram API (from my.telegram.org)
TELEGRAM_API_ID="12345678"
TELEGRAM_API_HASH="abcdef1234567890abcdef1234567890"

# Session Encryption
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"

# Session String (get from Step 6)
SESSION_STRING=""

# Server
PORT=3000
NODE_ENV=development
```

**Generate secrets**:
```bash
# JWT_SECRET and ENCRYPTION_KEY
openssl rand -hex 32
```

### Frontend Environment

Create `frontend/.env`:

```env
# Backend API URL
VITE_BACKEND_URL="http://localhost:3000/api"

# Environment
VITE_NODE_ENV=development
```

---

## Step 6: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install shared dependencies
cd ../shared
npm install

# Return to root
cd ..
```

---

## Step 7: Database Schema Setup

```bash
cd shared

# Generate Prisma client from schema
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Seed database with sample data (optional)
npx prisma db seed
```

**What gets created**:
- Tables: users, channels, batches, templates, campaigns, jobs, audit_logs
- Indexes: For efficient queries
- Sample data: Admin user (username: `admin`, password: `admin123`)

**Verify**:
```bash
# Open Prisma Studio to view data
npx prisma studio
# Opens http://localhost:5555
```

---

## Step 8: Get Telegram Session String

**Important**: This step requires a Telegram account for bot operations.

```bash
cd backend

# Run session generator script
npm run generate-session
```

**Follow prompts**:
1. Enter phone number (with country code, e.g., +1234567890)
2. Enter code sent to Telegram
3. Enter 2FA password (if enabled)
4. Copy session string from output

**Add to backend/.env**:
```env
SESSION_STRING="1AgAOMTQ5LjE1NC4xNjcuNTEBu..."
```

**Security note**: This session string grants full access to the Telegram account. Keep it secret!

---

## Step 9: Start Development Servers

### Terminal 1: Backend API

```bash
cd backend
npm run dev
```

**Expected output**:
```
[backend] Server listening on http://localhost:3000
[backend] Prisma connected to database
[backend] Redis connected
```

### Terminal 2: Backend Worker

```bash
cd backend
npm run worker:dev
```

**Expected output**:
```
[worker] Campaign worker started
[worker] Connected to Redis queue
[worker] Listening for jobs on queue: campaign:*
```

### Terminal 3: Frontend

```bash
cd frontend
npm run dev
```

**Expected output**:
```
[vite] dev server running at:
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
```

---

## Step 10: Verify Setup

### 1. Test Backend API

```bash
# Health check
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"2025-10-13T..."}

# Login (get JWT token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Expected: {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","user":{...}}
```

### 2. Test Frontend

1. Open http://localhost:5173/
2. Login with `admin` / `admin123`
3. Should see dashboard with navigation: Channels, Batches, Templates, Campaigns

### 3. Test Database Connection

```bash
cd shared
npx prisma studio
```

Should show all tables with seed data.

### 4. Test Redis Connection

```bash
redis-cli -u $REDIS_URL ping
# Expected: PONG
```

---

## Step 11: Import Sample Channels

### Option A: Via API (Postman/curl)

```bash
# Get token from login response (Step 10.1)
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Import JSONL file
curl -X POST http://localhost:3000/api/channels/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@batched_files/links_новости_20250929_114926/links_новости_20250929_114926_batch_001.jsonl"

# Expected: {"jobId":"cl9x...","message":"Import job queued..."}

# Check import status
curl http://localhost:3000/api/channels/import-status/cl9x... \
  -H "Authorization: Bearer $TOKEN"

# Expected: {"jobId":"cl9x...","status":"completed","progress":2000,"total":2000}
```

### Option B: Via Frontend

1. Navigate to Channels page
2. Click "Import Channels"
3. Upload JSONL file from `batched_files/`
4. Wait for import to complete (progress bar)

---

## Step 12: Test Campaign Flow

### Create Batch

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3000/api/batches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Batch",
    "channelIds": ["channel_id_1", "channel_id_2"]
  }'
```

### Create Template

```bash
curl -X POST http://localhost:3000/api/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "content": "Привет, {{channel_name}}! Это тестовое сообщение."
  }'
```

### Create Campaign (TEST mode)

```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "batchId": "batch_id_from_step_12.1",
    "templateId": "template_id_from_step_12.2",
    "mode": "TEST",
    "params": {"channel_name": "TestChannel"}
  }'
```

### Start Campaign

```bash
curl -X POST http://localhost:3000/api/campaigns/{campaign_id}/start \
  -H "Authorization: Bearer $TOKEN"
```

**Expected behavior**:
1. Campaign status changes to `RUNNING`
2. Worker processes jobs from queue
3. Messages sent to your Telegram account (TEST mode)
4. Check Telegram to verify message received

---

## Common Issues & Fixes

### Issue 1: "Prisma Client not generated"

**Error**: `@prisma/client did not initialize yet`

**Fix**:
```bash
cd shared
npx prisma generate
```

### Issue 2: "Redis connection failed"

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Fix**:
- Verify Redis is running: `redis-cli ping`
- Check REDIS_URL in backend/.env
- For Redis Cloud: Ensure firewall allows connection

### Issue 3: "Database connection failed"

**Error**: `P1001: Can't reach database server`

**Fix**:
- Verify PostgreSQL is running
- Check DATABASE_URL in backend/.env
- For Supabase: Ensure project is not paused (free tier auto-pauses after inactivity)

### Issue 4: "Telegram API error: SESSION_REVOKED"

**Error**: `RPC error: SESSION_REVOKED`

**Fix**:
- Session string expired or invalidated
- Re-run `npm run generate-session` (Step 8)
- Update SESSION_STRING in backend/.env

### Issue 5: "Port 3000 already in use"

**Error**: `EADDRINUSE: address already in use :::3000`

**Fix**:
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Issue 6: "Frontend not loading shadcn components"

**Error**: Blank page or "Module not found: @/components/ui/button"

**Fix**:
```bash
cd frontend
npx shadcn-ui@latest init
npx shadcn-ui@latest add button table dialog form select input textarea badge card tabs alert toast
```

---

## Development Workflow

### Code Organization

```
бот_рассылка/
├── frontend/           # React SPA (Vite)
│   ├── src/
│   │   ├── components/ # shadcn UI components
│   │   ├── pages/      # Route components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── store/      # Zustand stores
│   │   └── lib/        # Utilities, API client
├── backend/            # Express API + Workers
│   ├── src/
│   │   ├── api/        # REST endpoints
│   │   ├── workers/    # BullMQ job processors
│   │   ├── services/   # Business logic
│   │   ├── middleware/ # Auth, validation
│   │   └── models/     # Prisma models
├── shared/             # Shared types + Prisma schema
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       └── schemas/    # Zod validation schemas
```

### Making Changes

**Frontend changes**:
1. Edit files in `frontend/src/`
2. Vite HMR auto-reloads browser
3. Test in browser

**Backend API changes**:
1. Edit files in `backend/src/api/`
2. nodemon auto-restarts server
3. Test with curl/Postman

**Worker changes**:
1. Edit files in `backend/src/workers/`
2. Manually restart worker terminal (Ctrl+C, then `npm run worker:dev`)
3. Test by creating campaign

**Database schema changes**:
1. Edit `shared/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name describe_change`
3. Run `npx prisma generate`
4. Restart backend server

### Running Tests (if implemented)

```bash
# Backend unit tests
cd backend
npm test

# Backend integration tests
npm run test:integration

# Frontend component tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

---

## Debugging

### Backend Debugging (VSCode)

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/index.ts",
      "preLaunchTask": "tsc: build - backend/tsconfig.json",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Frontend Debugging

Use React DevTools extension in browser.

### Database Queries

Enable Prisma query logging in `backend/src/index.ts`:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})
```

### Redis Queue Inspection

```bash
# Connect to Redis CLI
redis-cli -u $REDIS_URL

# List all queues
KEYS campaign:*

# Get queue stats
HGETALL bull:campaign:cl9x...:meta

# View waiting jobs
LRANGE bull:campaign:cl9x...:wait 0 -1
```

---

## Next Steps

### 1. Explore Codebase

- Read [research.md](research.md) for technology decisions
- Review [data-model.md](data-model.md) for database schema
- Check [contracts/](contracts/) for API specifications

### 2. Start Implementing

- Run `/speckit.tasks` to generate implementation tasks
- Follow task breakdown in `tasks.md`
- Commit after each completed task

### 3. Constitutional Compliance

Review [constitution](.specify/memory/constitution.md) before implementing:
- Principle I: Rate-Limit Protection
- Principle II: Job Persistence
- Principle III: Test Mode First
- Principle IV: Batch Independence
- Principle V: Security & Privacy
- Principle VI: Modern Frontend Stack
- Principle VII: Free-Tier Deployment

---

## Helpful Commands

```bash
# View all npm scripts
cat backend/package.json | grep '"scripts"' -A 20

# Check Prisma schema syntax
cd shared && npx prisma validate

# Format all code
npm run format  # (if configured)

# Lint all code
npm run lint  # (if configured)

# View Redis connection info
redis-cli -u $REDIS_URL INFO

# View PostgreSQL tables
psql $DATABASE_URL -c "\dt"

# Clear all Redis queues (caution!)
redis-cli -u $REDIS_URL FLUSHDB
```

---

## Support

- **Constitution**: `.specify/memory/constitution.md`
- **Specification**: `specs/001-telegram-channel-broadcast/spec.md`
- **Planning**: `specs/001-telegram-channel-broadcast/plan.md`
- **API Contracts**: `specs/001-telegram-channel-broadcast/contracts/`

**Ready to implement?** Run `/speckit.tasks` to generate the implementation task breakdown!
