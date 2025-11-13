# Data Model: Feature 003 - Multitenancy

## Overview

Этот документ описывает изменения в data model для поддержки мультитенантности с Supabase Auth и множественными Telegram аккаунтами.

## Entity Relationship Diagram

```
auth.users (Supabase)
    ↓ 1:1
  users
    ↓ 1:N
telegram_accounts
    ↓ 1:N
 campaigns
    ↓ N:N
  batches
    ↓ 1:N
  channels
```

## Core Tables

### 1. users

**Назначение**: Расширенный профиль пользователя, связанный с Supabase Auth.

**Изменения от текущей схемы**:
- `id` изменен с TEXT на UUID (FK to auth.users)
- Удалены `username`, `password_hash` (управляется Supabase Auth)
- Удалены все Telegram credentials (перенесены в telegram_accounts)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User metadata
  role TEXT NOT NULL DEFAULT 'OPERATOR'
    CHECK (role IN ('ADMIN', 'OPERATOR', 'AUDITOR')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Trigger для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Indexes**:
- `id` (PRIMARY KEY) - automatic
- Дополнительные индексы не требуются

---

### 2. telegram_accounts (NEW)

**Назначение**: Хранит Telegram API credentials для каждого аккаунта пользователя. Поддерживает неограниченное количество аккаунтов на пользователя.

```sql
CREATE TABLE telegram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Telegram credentials (ENCRYPTED)
  telegram_api_id TEXT NOT NULL,
  telegram_api_hash TEXT NOT NULL, -- Encrypted with AES-256
  telegram_session TEXT, -- Encrypted with AES-256
  telegram_phone TEXT NOT NULL,

  -- Telegram user info (filled after auth)
  telegram_connected BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_user_id TEXT,
  telegram_username TEXT,
  telegram_first_name TEXT,

  -- Account metadata
  name TEXT, -- Friendly name (e.g., "Main", "Backup")
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT telegram_accounts_phone_unique UNIQUE (telegram_phone)
);

-- Indexes
CREATE INDEX idx_telegram_accounts_user_id ON telegram_accounts(user_id);
CREATE INDEX idx_telegram_accounts_phone ON telegram_accounts(telegram_phone);
CREATE INDEX idx_telegram_accounts_active ON telegram_accounts(user_id, is_active)
  WHERE is_active = TRUE;

-- RLS
ALTER TABLE telegram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_accounts_select_own"
  ON telegram_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "telegram_accounts_insert_own"
  ON telegram_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "telegram_accounts_update_own"
  ON telegram_accounts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "telegram_accounts_delete_own"
  ON telegram_accounts FOR DELETE
  USING (user_id = auth.uid());

-- Trigger для updated_at
CREATE TRIGGER telegram_accounts_updated_at
  BEFORE UPDATE ON telegram_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Validation Rules**:
- `telegram_phone` должен быть уникальным (один номер = один аккаунт globally)
- `telegram_api_hash` и `telegram_session` должны храниться зашифрованными
- `telegram_connected` = TRUE только когда `telegram_session` заполнен

**State Transitions**:
1. **Created**: user_id + credentials → `telegram_connected = FALSE`
2. **Authenticating**: SMS code sent via auth-telegram API
3. **Connected**: session saved → `telegram_connected = TRUE`
4. **Disconnected**: session invalidated → `telegram_connected = FALSE`
5. **Deactivated**: `is_active = FALSE` (soft delete)

---

### 3. campaigns (UPDATED)

**Изменения**:
- Добавлено `user_id UUID NOT NULL` - владелец campaign
- Добавлено `telegram_account_id UUID NOT NULL` - какой аккаунт использовать для отправки

```sql
ALTER TABLE campaigns ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE campaigns ADD COLUMN telegram_account_id UUID REFERENCES telegram_accounts(id);

-- После data migration:
ALTER TABLE campaigns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE campaigns ALTER COLUMN telegram_account_id SET NOT NULL;

-- Index
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_telegram_account_id ON campaigns(telegram_account_id);

-- RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_own"
  ON campaigns FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "campaigns_insert_own"
  ON campaigns FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaigns_update_own"
  ON campaigns FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "campaigns_delete_own"
  ON campaigns FOR DELETE
  USING (user_id = auth.uid());
```

**Validation Rules**:
- `telegram_account_id` должен принадлежать `user_id` (enforced by application logic)
- `telegram_account.is_active` должен быть TRUE при создании campaign

---

### 4. channels (UPDATED)

**Изменения**:
- Добавлено `user_id UUID NOT NULL`

```sql
ALTER TABLE channels ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- После data migration:
ALTER TABLE channels ALTER COLUMN user_id SET NOT NULL;

-- Index
CREATE INDEX idx_channels_user_id ON channels(user_id);

-- RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_all_own"
  ON channels FOR ALL
  USING (user_id = auth.uid());
```

---

### 5. batches (UPDATED)

**Изменения**:
- Добавлено `user_id UUID NOT NULL`

```sql
ALTER TABLE batches ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- После data migration:
ALTER TABLE batches ALTER COLUMN user_id SET NOT NULL;

-- Index
CREATE INDEX idx_batches_user_id ON batches(user_id);

-- RLS
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batches_all_own"
  ON batches FOR ALL
  USING (user_id = auth.uid());
```

---

### 6. templates (UPDATED)

**Изменения**:
- Добавлено `user_id UUID NOT NULL`

```sql
ALTER TABLE templates ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- После data migration:
ALTER TABLE templates ALTER COLUMN user_id SET NOT NULL;

-- Index
CREATE INDEX idx_templates_user_id ON templates(user_id);

-- RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_all_own"
  ON templates FOR ALL
  USING (user_id = auth.uid());
```

---

### 7. jobs (UPDATED)

**Изменения**:
- Добавлено `user_id UUID NOT NULL` - для audit logs

```sql
ALTER TABLE jobs ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- После data migration:
ALTER TABLE jobs ALTER COLUMN user_id SET NOT NULL;

-- Index
CREATE INDEX idx_jobs_user_id ON jobs(user_id);

-- RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_select_own"
  ON jobs FOR SELECT
  USING (user_id = auth.uid());

-- Jobs нельзя update/delete через API (управляются worker)
```

---

### 8. audit_logs (UPDATED)

**Изменения**:
- Добавлено `user_id UUID` (nullable для system events)

```sql
ALTER TABLE audit_logs ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_own"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Audit logs read-only для users
```

---

## Migration Scripts

### Migration 001: Create telegram_accounts table

```sql
-- File: migrations/003_001_create_telegram_accounts.sql

BEGIN;

-- Create telegram_accounts table
CREATE TABLE telegram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  telegram_api_id TEXT NOT NULL,
  telegram_api_hash TEXT NOT NULL,
  telegram_session TEXT,
  telegram_phone TEXT NOT NULL,

  telegram_connected BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_user_id TEXT,
  telegram_username TEXT,
  telegram_first_name TEXT,

  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT telegram_accounts_phone_unique UNIQUE (telegram_phone)
);

-- Indexes
CREATE INDEX idx_telegram_accounts_user_id ON telegram_accounts(user_id);
CREATE INDEX idx_telegram_accounts_phone ON telegram_accounts(telegram_phone);
CREATE INDEX idx_telegram_accounts_active ON telegram_accounts(user_id, is_active)
  WHERE is_active = TRUE;

-- RLS
ALTER TABLE telegram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_accounts_select_own"
  ON telegram_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "telegram_accounts_insert_own"
  ON telegram_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "telegram_accounts_update_own"
  ON telegram_accounts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "telegram_accounts_delete_own"
  ON telegram_accounts FOR DELETE
  USING (user_id = auth.uid());

-- Trigger
CREATE TRIGGER telegram_accounts_updated_at
  BEFORE UPDATE ON telegram_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

### Migration 002: Add user_id columns

```sql
-- File: migrations/003_002_add_user_id_columns.sql

BEGIN;

-- Add user_id to all tables (nullable for now)
ALTER TABLE campaigns ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE campaigns ADD COLUMN telegram_account_id UUID REFERENCES telegram_accounts(id);

ALTER TABLE channels ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE batches ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE templates ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE jobs ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_telegram_account_id ON campaigns(telegram_account_id);
CREATE INDEX idx_channels_user_id ON channels(user_id);
CREATE INDEX idx_batches_user_id ON batches(user_id);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

COMMIT;
```

### Migration 003: Enable RLS on all tables

```sql
-- File: migrations/003_003_enable_rls.sql

BEGIN;

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_own" ON campaigns FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "campaigns_insert_own" ON campaigns FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "campaigns_update_own" ON campaigns FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "campaigns_delete_own" ON campaigns FOR DELETE USING (user_id = auth.uid());

-- Channels
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels_all_own" ON channels FOR ALL USING (user_id = auth.uid());

-- Batches
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batches_all_own" ON batches FOR ALL USING (user_id = auth.uid());

-- Templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_all_own" ON templates FOR ALL USING (user_id = auth.uid());

-- Jobs (read-only)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select_own" ON jobs FOR SELECT USING (user_id = auth.uid());

-- Audit Logs (read-only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select_own" ON audit_logs FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

COMMIT;
```

### Migration 004: Data migration script

```sql
-- File: migrations/003_004_migrate_data.sql
-- IMPORTANT: This must be run AFTER creating admin user in Supabase Auth

BEGIN;

-- Variables (replace with actual values)
-- \set ADMIN_UUID 'UUID-from-supabase-auth'
-- \set ENCRYPTED_API_HASH 'result-of-encrypt(process.env.TELEGRAM_API_HASH)'
-- \set ENCRYPTED_SESSION 'result-of-encrypt(process.env.TELEGRAM_SESSION)'

-- 1. Create admin user in users table
-- INSERT INTO users (id, role) VALUES (:'ADMIN_UUID', 'ADMIN');

-- 2. Create admin telegram account
-- INSERT INTO telegram_accounts (
--   user_id, telegram_api_id, telegram_api_hash, telegram_session,
--   telegram_phone, telegram_connected, name
-- ) VALUES (
--   :'ADMIN_UUID',
--   '<TELEGRAM_API_ID from .env>',
--   :'ENCRYPTED_API_HASH',
--   :'ENCRYPTED_SESSION',
--   '<TELEGRAM_PHONE from .env>',
--   true,
--   'Admin Account'
-- );

-- 3. Link all existing data to admin user
-- UPDATE campaigns SET user_id = :'ADMIN_UUID' WHERE user_id IS NULL;
-- UPDATE channels SET user_id = :'ADMIN_UUID' WHERE user_id IS NULL;
-- UPDATE batches SET user_id = :'ADMIN_UUID' WHERE user_id IS NULL;
-- UPDATE templates SET user_id = :'ADMIN_UUID' WHERE user_id IS NULL;
-- UPDATE jobs SET user_id = :'ADMIN_UUID' WHERE user_id IS NULL;

-- 4. Link campaigns to admin telegram account
-- UPDATE campaigns
-- SET telegram_account_id = (
--   SELECT id FROM telegram_accounts WHERE user_id = :'ADMIN_UUID' LIMIT 1
-- )
-- WHERE telegram_account_id IS NULL;

-- 5. Make user_id NOT NULL
-- ALTER TABLE campaigns ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE campaigns ALTER COLUMN telegram_account_id SET NOT NULL;
-- ALTER TABLE channels ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE batches ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE templates ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE jobs ALTER COLUMN user_id SET NOT NULL;

COMMIT;
```

**ВАЖНО**: Migration 004 требует ручного выполнения с заменой переменных. Создать отдельный Node.js скрипт `migrate-data.ts` для автоматизации.

---

## Validation Rules Summary

| Table | Field | Rule |
|-------|-------|------|
| telegram_accounts | telegram_phone | UNIQUE globally |
| telegram_accounts | telegram_api_hash | Must be encrypted (format: `<iv_hex>:<encrypted_hex>`) |
| telegram_accounts | telegram_session | Must be encrypted if not NULL |
| telegram_accounts | telegram_connected | TRUE only if telegram_session IS NOT NULL |
| campaigns | telegram_account_id | Must belong to user_id (app-level check) |
| campaigns | telegram_account_id | telegram_accounts.is_active must be TRUE |
| All tables | user_id | Must equal auth.uid() (enforced by RLS) |

---

## Performance Considerations

**Index Coverage**:
- ✅ All `user_id` columns indexed for RLS filtering
- ✅ `telegram_accounts(user_id, is_active)` partial index for active accounts
- ✅ Foreign key columns indexed

**Expected Query Performance**:
- SELECT with RLS: +5-10ms overhead (acceptable)
- INSERT/UPDATE: minimal overhead
- Large scans (>100k rows): RLS may add 10-20ms

**Optimization Opportunities**:
1. Materialize "default telegram account" to avoid JOIN
2. Cache telegram account info in Redis for worker
3. Partition audit_logs by user_id if grows large

---

## Rollback Strategy

```sql
-- Rollback Script: rollback_003.sql

BEGIN;

-- 1. Disable RLS
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Drop RLS policies
DROP POLICY IF EXISTS "campaigns_select_own" ON campaigns;
DROP POLICY IF EXISTS "campaigns_insert_own" ON campaigns;
DROP POLICY IF EXISTS "campaigns_update_own" ON campaigns;
DROP POLICY IF EXISTS "campaigns_delete_own" ON campaigns;
-- (repeat for all tables)

-- 3. Drop user_id columns
ALTER TABLE campaigns DROP COLUMN IF EXISTS user_id;
ALTER TABLE campaigns DROP COLUMN IF EXISTS telegram_account_id;
ALTER TABLE channels DROP COLUMN IF EXISTS user_id;
ALTER TABLE batches DROP COLUMN IF EXISTS user_id;
ALTER TABLE templates DROP COLUMN IF EXISTS user_id;
ALTER TABLE jobs DROP COLUMN IF EXISTS user_id;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_id;

-- 4. Drop telegram_accounts table
DROP TABLE IF EXISTS telegram_accounts CASCADE;

COMMIT;

-- 5. Restore from backup (manual step)
```

---

## Testing Checklist

### Schema Tests
- [ ] All migrations run successfully
- [ ] All foreign keys valid
- [ ] All indexes created
- [ ] RLS policies active

### Data Integrity Tests
- [ ] telegram_phone uniqueness enforced
- [ ] CASCADE deletes work (delete user → delete accounts/campaigns)
- [ ] Encrypted fields are actually encrypted (не plain text)

### RLS Tests
```sql
-- Test 1: User can only see own data
SET request.jwt.claims = '{"sub": "user-1-uuid"}';
SELECT COUNT(*) FROM campaigns; -- Should only see user-1 campaigns

-- Test 2: User cannot insert for another user
INSERT INTO campaigns (user_id, ...) VALUES ('user-2-uuid', ...);
-- Should fail with RLS violation

-- Test 3: Service role bypasses RLS
RESET request.jwt.claims;
SELECT COUNT(*) FROM campaigns; -- Should see all campaigns
```

### Performance Tests
- [ ] Query latency with RLS < 200ms for typical queries
- [ ] Index usage verified with EXPLAIN ANALYZE
- [ ] No full table scans on user-filtered queries

---

## Next Steps

1. ✅ Data model defined
2. ⏳ Create migration scripts (003_001 - 003_004)
3. ⏳ Create rollback script
4. ⏳ Implement data migration Node.js script with encryption
5. ⏳ Write RLS tests
6. ⏳ Execute migrations on dev environment
