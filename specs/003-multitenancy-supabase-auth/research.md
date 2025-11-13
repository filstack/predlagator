# Research & Technology Decisions: Feature 003

## Дата: 2025-10-16

## Обзор

Этот документ содержит результаты исследования технологий и архитектурных решений для реализации мультитенантности с Supabase Auth.

## 1. Supabase Auth Integration

### Решение
Использовать Supabase Auth для управления пользователями с email/password authentication.

### Обоснование
- **Встроенная безопасность**: Supabase Auth обрабатывает password hashing, JWT generation, session management
- **Row Level Security**: Нативная интеграция с PostgreSQL RLS через `auth.uid()`
- **Готовые функции**: signUp, signIn, signOut, getUser уже реализованы
- **JWT validation**: Автоматическая проверка токенов на стороне сервера

### Рассмотренные альтернативы
1. **Passport.js** - требует больше boilerplate кода, нужно самостоятельно управлять JWT
2. **Auth0** - платный third-party сервис, дополнительная зависимость
3. **Custom auth** - высокий риск безопасности, требует экспертизы

### Паттерны реализации

**Backend JWT Verification:**
```typescript
// src/middleware/auth.ts
import { createClient } from '@supabase/supabase-js';

export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.substring(7); // "Bearer <token>"

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = user;
  req.supabase = createUserClient(token); // Client с RLS context
  next();
}
```

**User-Scoped Supabase Client:**
```typescript
// src/lib/supabase-auth.ts
export function createUserClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  });
}
```

### Ограничения
- Email verification отложен до post-MVP
- Password reset отложен до post-MVP
- Требуется настроить email provider в Supabase Dashboard

---

## 2. AES-256 Encryption для Telegram Credentials

### Решение
Использовать AES-256-CBC encryption через Node.js встроенный `crypto` модуль.

### Обоснование
- **Industry standard**: AES-256 считается безопасным для sensitive data
- **CBC mode**: Cipher Block Chaining обеспечивает дополнительную безопасность
- **Unique IV**: Каждая запись использует уникальный Initialization Vector
- **Native Node.js**: Не требует внешних зависимостей

### Рассмотренные альтернативы
1. **bcrypt/argon2** - предназначены для hashing паролей (one-way), нам нужно обратимое шифрование
2. **AES-256-GCM** - более современный режим, но сложнее в реализации
3. **Database-level encryption** - Supabase не предоставляет column-level encryption

### Реализация

```typescript
// src/utils/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes hex
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Store IV:encrypted
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**Генерация ENCRYPTION_KEY:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Best Practices
1. **Key management**: Хранить ENCRYPTION_KEY в environment variables, НЕ в git
2. **Backup**: Сохранить ключ в secure vault (1Password, AWS Secrets Manager)
3. **Rotation**: При rotation ключа нужно перешифровать все существующие credentials
4. **Testing**: Проверить работу с длинными строками (Telegram session strings ~500+ chars)

### Риски
⚠️ **Потеря ENCRYPTION_KEY = потеря всех credentials пользователей**
- Mitigation: Документировать процедуру backup
- Recovery: Пользователи должны будут заново пройти Telegram auth

---

## 3. Row Level Security (RLS) Strategy

### Решение
Включить RLS для всех пользовательских таблиц с политикой `auth.uid() = user_id`.

### Обоснование
- **Database-level security**: RLS работает на уровне PostgreSQL, невозможно обойти
- **Автоматическая изоляция**: Не нужно вручную фильтровать запросы по user_id
- **Supabase integration**: `auth.uid()` автоматически резолвится из JWT

### Рассмотренные альтернативы
1. **Application-level filtering** - добавлять `.where('user_id', userId)` в каждый запрос
   - Риск: Легко забыть добавить фильтр
2. **Отдельные databases per tenant** - overkill для нашего масштаба
3. **Schema-based multitenancy** - сложнее управлять миграциями

### SQL Policies

```sql
-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Telegram Accounts
ALTER TABLE telegram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_accounts_all_own"
  ON telegram_accounts FOR ALL
  USING (user_id = auth.uid());

-- Campaigns
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

**Повторить для таблиц**: channels, batches, templates, jobs, audit_logs

### Performance Considerations

**Индексы для RLS:**
```sql
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_channels_user_id ON channels(user_id);
CREATE INDEX idx_batches_user_id ON batches(user_id);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
```

**Expected overhead**: RLS добавляет ~5-10ms на запрос (измерено на Supabase benchmarks)

### Testing RLS

```sql
-- Simulate user context
SET request.jwt.claims = '{"sub": "user-uuid-here"}';

-- Try to select another user's data (should return empty)
SELECT * FROM campaigns WHERE user_id != 'user-uuid-here';
```

### Ограничения
- Service role bypasses RLS - использовать аккуратно
- RLS не применяется к database functions (plpgsql) - нужно явно проверять auth.uid()

---

## 4. Multi-Telegram-Account Architecture

### Решение
Создать отдельную таблицу `telegram_accounts` с 1:N связью к `users`.

### Обоснование
- **Гибкость**: Пользователи могут добавлять неограниченное количество аккаунтов
- **Изоляция credentials**: Telegram credentials не загрязняют users таблицу
- **Независимое управление**: Можно disable/delete account без влияния на user
- **Будущие функции**: Легко добавить квоты, billing plans по аккаунтам

### Рассмотренные альтернативы
1. **Embedding в users таблицу** - ограничивает до 1 аккаунта, сложно расширять
2. **JSONB array в users** - плохая нормализация, сложнее делать RLS
3. **Отдельный tenant_id** - overkill, не нужен для нашего use case

### Data Model

```sql
CREATE TABLE telegram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Credentials (encrypted)
  telegram_api_id TEXT NOT NULL,
  telegram_api_hash TEXT NOT NULL,
  telegram_session TEXT,
  telegram_phone TEXT NOT NULL UNIQUE,

  -- Telegram user info
  telegram_connected BOOLEAN DEFAULT FALSE,
  telegram_user_id TEXT,
  telegram_username TEXT,
  telegram_first_name TEXT,

  -- Metadata
  name TEXT, -- Friendly name (e.g., "Main", "Backup")
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_telegram_accounts_user_id ON telegram_accounts(user_id);
CREATE INDEX idx_telegram_accounts_phone ON telegram_accounts(telegram_phone);
```

### UI/UX Considerations

**Выбор account при создании campaign:**
```tsx
<Select name="telegram_account_id" required>
  {accounts.map(acc => (
    <option key={acc.id} value={acc.id}>
      {acc.name} ({acc.telegram_username || acc.telegram_phone})
      {!acc.telegram_connected && ' ⚠️ Not connected'}
    </option>
  ))}
</Select>
```

**Default account logic:**
- Если у пользователя 1 аккаунт → автоматически выбирается
- Если несколько → требовать явный выбор
- Можно добавить `is_default` boolean в будущем

### Cache Strategy (TelegramClientManager)

```typescript
class TelegramClientManager {
  private clients = new Map<string, CachedClient>(); // key = telegram_account_id
  private readonly MAX_CLIENTS = 50;
  private readonly TTL_MS = 30 * 60 * 1000; // 30 min

  async getClient(telegramAccountId: string): Promise<TelegramClient> {
    // Check cache with TTL
    // If miss or expired: fetch from DB, decrypt, connect
    // LRU eviction if cache full
  }
}
```

---

## 5. Data Migration Strategy

### Решение
Двухфазная миграция: (1) создать структуру + admin user, (2) перенести данные.

### Обоснование
- **Zero downtime**: Можем мигрировать в production без простоя
- **Rollback friendly**: Каждая фаза независима и обратима
- **Тестируемость**: Можем протестировать каждую фазу отдельно

### Рассмотренные альтернативы
1. **Big bang migration** - высокий риск, сложно откатить
2. **Dual write** - пишем в обе схемы одновременно - слишком сложно для нашего случая

### Migration Plan

**Phase 1: Schema Changes**
```sql
-- 1. Создать новую таблицу telegram_accounts
CREATE TABLE telegram_accounts (...);

-- 2. Добавить telegram_account_id в campaigns (nullable)
ALTER TABLE campaigns ADD COLUMN telegram_account_id UUID REFERENCES telegram_accounts(id);

-- 3. Добавить user_id в таблицы если нет
ALTER TABLE channels ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE batches ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE templates ADD COLUMN user_id UUID REFERENCES users(id);

-- 4. Enable RLS
-- (см. SQL выше)
```

**Phase 2: Data Migration**
```sql
-- 1. Создать admin user в Supabase Auth (через UI или API)
-- email: admin@example.com, password: <generate>

-- 2. Создать запись в users таблице
INSERT INTO users (id, role) VALUES ('<admin-user-uuid>', 'ADMIN');

-- 3. Создать telegram account для admin
INSERT INTO telegram_accounts (
  user_id,
  telegram_api_id,
  telegram_api_hash,
  telegram_session,
  telegram_phone,
  telegram_connected,
  name
) VALUES (
  '<admin-user-uuid>',
  '<from .env>',
  encrypt('<from .env>'),
  encrypt('<from .env>'),
  '<from .env>',
  true,
  'Admin Account'
);

-- 4. Связать все existing данные с admin user
UPDATE campaigns SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;
UPDATE channels SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;
UPDATE batches SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;
UPDATE templates SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;
UPDATE jobs SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;

-- 5. Связать campaigns с telegram account
UPDATE campaigns
SET telegram_account_id = (SELECT id FROM telegram_accounts WHERE user_id = '<admin-user-uuid>')
WHERE telegram_account_id IS NULL;

-- 6. Сделать поля NOT NULL
ALTER TABLE campaigns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE campaigns ALTER COLUMN telegram_account_id SET NOT NULL;
-- (повторить для других таблиц)
```

**Phase 3: Cleanup**
```sql
-- Удалить старые credentials колонки из users если были
ALTER TABLE users DROP COLUMN IF EXISTS telegram_api_id;
ALTER TABLE users DROP COLUMN IF EXISTS telegram_api_hash;
ALTER TABLE users DROP COLUMN IF EXISTS telegram_session;
```

### Rollback Plan

```sql
-- Если что-то пошло не так:

-- 1. Disable RLS
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
-- (повторить для всех таблиц)

-- 2. Restore from backup
-- (используем pg_dump backup перед миграцией)

-- 3. Drop new tables
DROP TABLE IF EXISTS telegram_accounts CASCADE;
```

### Testing Checklist

- [ ] Backup production database перед миграцией
- [ ] Протестировать миграцию на копии prod DB
- [ ] Verify RLS: попробовать получить чужие данные (должно fail)
- [ ] Verify encryption: проверить что credentials зашифрованы в БД
- [ ] Verify auth: войти как admin, создать campaign
- [ ] Performance test: замерить query latency до/после RLS

---

## 6. Frontend Architecture Decisions

### State Management: React Context

**Решение**: Использовать React Context для auth state.

**Обоснование**:
- Достаточно для MVP (один global state - user/session)
- Не нужна сложность Redux/Zustand
- Официальный Supabase Auth паттерн использует Context

**Альтернативы**:
- Redux - overkill для auth state
- Zustand - хорошо, но дополнительная зависимость

### Routing: React Router v6

**Решение**: Использовать PrivateRoute wrapper для защищенных страниц.

```tsx
<Route path="/campaigns" element={
  <PrivateRoute>
    <CampaignsPage />
  </PrivateRoute>
} />
```

### API Client: Axios Interceptors

**Решение**: Добавлять JWT автоматически через interceptor.

```typescript
api.interceptors.request.use(config => {
  const session = supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
```

---

## Summary of Key Decisions

| Область | Решение | Обоснование |
|---------|---------|-------------|
| Authentication | Supabase Auth (email/password) | Безопасность + RLS integration |
| Encryption | AES-256-CBC | Industry standard |
| Data Isolation | Row Level Security (RLS) | Database-level security |
| Telegram Accounts | Separate table (1:N) | Гибкость + масштабируемость |
| Client Cache | LRU (50 clients, 30 min TTL) | Balance memory/performance |
| Migration | Two-phase migration | Zero downtime + rollback friendly |
| Frontend State | React Context | Достаточно для MVP |

---

## Open Questions Resolved

Все вопросы из spec.md были разрешены в Clarifications (Session 2025-10-16):

1. ✅ **Telegram client cache**: Ограниченный кеш (50 clients, 30 min TTL, LRU)
2. ✅ **Email verification**: Отложить до post-MVP
3. ✅ **Telegram account limits**: Неограниченное количество (separate table)
4. ✅ **Password reset**: Отложить до post-MVP
5. ✅ **Multi-device**: Поддерживать (default Supabase behavior)

---

## Next Steps

1. ✅ Research complete → переходить к data-model.md
2. ⏳ Создать SQL migration scripts
3. ⏳ Реализовать encryption utilities
4. ⏳ Начать Phase 1.1 implementation
