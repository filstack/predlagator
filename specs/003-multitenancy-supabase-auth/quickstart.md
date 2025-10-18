# Quickstart Guide: Feature 003 - Multitenancy

Руководство по локальной разработке после внедрения мультитенантности с Supabase Auth.

## Prerequisites

- Node.js 20+
- PostgreSQL (через Supabase)
- Git
- npm или yarn

## 1. Clone & Install

```bash
cd "D:\00_dev\01_Ведомости\Новая папка\бот_рассылка"
git checkout 003-multitenancy-supabase-auth

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## 2. Environment Setup

### Backend (.env)

Создайте `backend/.env`:

```env
# Supabase
SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
SUPABASE_ANON_KEY=<from Supabase Dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard>
SUPABASE_DIRECT_URL=postgresql://postgres.qjnxcjbzwelokluaiqmk:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

# Encryption (generate new key)
ENCRYPTION_KEY=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Server
PORT=3000
NODE_ENV=development
```

**Генерация ENCRYPTION_KEY:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (.env)

Создайте `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
VITE_SUPABASE_ANON_KEY=<same as backend>
```

## 3. Database Setup

### 3.1 Enable Supabase Auth

В Supabase Dashboard:
1. **Authentication** → **Providers**
2. Включить **Email** provider
3. Отключить email confirmation (для MVP)

### 3.2 Run Migrations

```bash
cd backend

# Migration 1: Create telegram_accounts table
npx supabase migration new create_telegram_accounts
# Copy SQL from specs/003-.../data-model.md

# Migration 2: Add user_id columns
npx supabase migration new add_user_id_columns

# Migration 3: Enable RLS
npx supabase migration new enable_rls

# Apply migrations
npx supabase db push
```

Или используйте готовые SQL скрипты из `specs/003-multitenancy-supabase-auth/data-model.md`.

### 3.3 Create Admin User

```bash
# Method 1: Through Supabase Dashboard
# Authentication → Users → Add User
# Email: admin@example.com
# Password: <your-password>
# Copy user UUID

# Method 2: Through API
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
```

### 3.4 Seed Admin Data

Создайте `backend/scripts/seed-admin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '../src/utils/encryption';

const ADMIN_UUID = '<uuid-from-step-3.3>';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedAdmin() {
  // 1. Create admin user record
  await supabase.from('users').insert({
    id: ADMIN_UUID,
    role: 'ADMIN'
  });

  // 2. Create admin telegram account (if migrating from old system)
  const encryptedApiHash = encrypt(process.env.TELEGRAM_API_HASH!);
  const encryptedSession = encrypt(process.env.TELEGRAM_SESSION!);

  await supabase.from('telegram_accounts').insert({
    user_id: ADMIN_UUID,
    telegram_api_id: process.env.TELEGRAM_API_ID!,
    telegram_api_hash: encryptedApiHash,
    telegram_session: encryptedSession,
    telegram_phone: process.env.TELEGRAM_PHONE!,
    telegram_connected: true,
    name: 'Admin Account'
  });

  console.log('✓ Admin user seeded');
}

seedAdmin();
```

Run:
```bash
npx tsx backend/scripts/seed-admin.ts
```

## 4. Start Development Servers

### Terminal 1: Backend API

```bash
cd backend
npm run dev
```

API будет доступен на `http://localhost:3000`

### Terminal 2: Backend Worker

```bash
cd backend
npm run worker
```

Worker обрабатывает pg-boss jobs (campaign orchestration, message sending).

### Terminal 3: Frontend

```bash
cd frontend
npm run dev
```

Frontend будет доступен на `http://localhost:5173`

## 5. Test Auth Flow

### 5.1 Register New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

Response:
```json
{
  "user": { "id": "...", "email": "test@example.com" },
  "session": { "access_token": "...", "refresh_token": "..." }
}
```

### 5.2 Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### 5.3 Get Current User

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### 5.4 Add Telegram Account

```bash
curl -X POST http://localhost:3000/api/telegram-accounts \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Account",
    "apiId": "27562180",
    "apiHash": "<your-api-hash>",
    "phone": "+79219124745"
  }'
```

Response includes `sessionId` для auth flow через `/api/auth-telegram`.

## 6. Frontend Development

### Login Page

Navigate to `http://localhost:5173/login`

1. Введите email/password
2. После успешного входа → redirect to `/onboarding` (если нет telegram accounts)
3. Или redirect to `/campaigns` (если есть telegram accounts)

### Onboarding Flow

1. **Step 1**: Ввести Telegram API credentials
2. **Step 2**: Получить SMS код → ввести код (+ 2FA если включено)
3. **Step 3**: Сохранить session → redirect to `/campaigns`

## 7. Common Issues

### Issue: "Invalid ENCRYPTION_KEY"

**Solution**: Убедитесь, что ENCRYPTION_KEY - это 64-символьная hex строка (32 байта).

```bash
# Правильный формат:
ENCRYPTION_KEY=a1b2c3d4e5f6....(64 chars total)
```

### Issue: "RLS policy violation"

**Solution**: Проверьте, что JWT токен валиден и содержит правильный `sub` claim.

```sql
-- Test RLS в psql:
SET request.jwt.claims = '{"sub": "<user-uuid>"}';
SELECT * FROM campaigns; -- Should only see user's campaigns
```

### Issue: "Telegram AUTH_KEY_UNREGISTERED"

**Solution**: Session string истек. Нужно заново пройти Telegram auth через onboarding.

### Issue: "Worker not processing jobs"

**Solution**: Убедитесь, что worker запущен (`npm run worker`) и подключен к той же БД.

```bash
# Check pg-boss state
SELECT * FROM pgboss.job ORDER BY createdon DESC LIMIT 10;
```

## 8. Testing RLS

### Test Script

```typescript
// backend/scripts/test-rls.ts
import { createClient } from '@supabase/supabase-js';

const user1Token = '<user1-access-token>';
const user2Token = '<user2-access-token>';

async function testRLS() {
  // User 1 creates campaign
  const client1 = createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${user1Token}` } }
  });

  const { data: campaign } = await client1
    .from('campaigns')
    .insert({ name: 'User 1 Campaign', ... })
    .select()
    .single();

  console.log('User 1 created campaign:', campaign.id);

  // User 2 tries to read campaign (should fail)
  const client2 = createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${user2Token}` } }
  });

  const { data: campaigns } = await client2
    .from('campaigns')
    .select()
    .eq('id', campaign.id);

  console.log('User 2 sees campaigns:', campaigns); // Should be []
}

testRLS();
```

Run:
```bash
npx tsx backend/scripts/test-rls.ts
```

## 9. Development Workflow

### Creating New Feature

1. Create feature branch: `git checkout -b feature/my-feature`
2. Update data model if needed (add migration)
3. Update API contracts in `contracts/`
4. Implement backend endpoints with RLS
5. Implement frontend UI
6. Test with multiple users
7. Verify RLS works correctly
8. Create PR

### Adding New Table

```sql
-- Always add user_id column
CREATE TABLE my_new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ...
);

-- Always create index
CREATE INDEX idx_my_new_table_user_id ON my_new_table(user_id);

-- Always enable RLS
ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "my_new_table_all_own"
  ON my_new_table FOR ALL
  USING (user_id = auth.uid());
```

## 10. Debugging

### View Logs

```bash
# Backend API logs
cd backend
npm run dev
# Logs appear in terminal

# Worker logs
cd backend
npm run worker
# Logs appear in terminal

# pg-boss job logs
psql $SUPABASE_DIRECT_URL
SELECT name, state, output, createdon FROM pgboss.job
WHERE name = 'send-message'
ORDER BY createdon DESC LIMIT 20;
```

### Inspect Encrypted Data

```typescript
// backend/scripts/decrypt-test.ts
import { decrypt } from '../src/utils/encryption';

const encryptedHash = '<from database>';
const decrypted = decrypt(encryptedHash);
console.log('Decrypted:', decrypted);
```

### Clear pg-boss Queue

```sql
DELETE FROM pgboss.job WHERE name = 'send-message' AND state = 'created';
```

## 11. Next Steps

- [ ] Read `specs/003-multitenancy-supabase-auth/spec.md`
- [ ] Review `data-model.md` для понимания schema
- [ ] Review `contracts/` для API types
- [ ] Run through onboarding flow
- [ ] Create test campaign with multiple accounts
- [ ] Verify RLS isolation between users

## 12. Resources

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **Supabase RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **pg-boss Docs**: https://github.com/timgit/pg-boss
- **GramJS Docs**: https://gram.js.org/

## Support

Если возникли проблемы:
1. Проверьте логи backend и worker
2. Проверьте Supabase Dashboard → Authentication → Users
3. Проверьте pgboss.job table для failed jobs
4. Проверьте `.env` файлы (все переменные заполнены?)
5. Откройте issue с описанием проблемы и логами
