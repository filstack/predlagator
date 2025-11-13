# Implementation Plan: Feature 003 - Мультитенантность с Supabase Auth

## Метаданные

- **Feature ID**: 003-multitenancy-supabase-auth
- **Дата создания**: 2025-10-16
- **Статус**: Planning
- **MVP Scope**: US1, US2, US3, US5, US6

## Технический контекст

### Существующая архитектура

**Backend:**
- TypeScript 5.3 + Node.js 20+
- Express 4.18 (API server)
- pg-boss ^10.1.3 (PostgreSQL job queue)
- Supabase SDK (@supabase/supabase-js ^2.75.0)
- GramJS (telegram ^2.26.22)

**Database:**
- PostgreSQL (через Supabase)
- Существующие таблицы: users, channels, batches, templates, campaigns, jobs, audit_logs
- Текущая users таблица использует TEXT id и password_hash

**Frontend:**
- React + TypeScript
- Vite
- React Router
- Axios для API запросов

### Интеграции

1. **Supabase Auth** - готов к использованию, требуется включить email provider
2. **Supabase Database** - прямое подключение через SDK
3. **Telegram API** - через GramJS, требует credentials для каждого аккаунта
4. **pg-boss** - уже настроен для queue processing

### Зависимости

**Новые зависимости:**
- Backend: `crypto` (Node.js встроенный модуль для AES-256 encryption)
- Frontend: `@supabase/supabase-js` (уже установлен), `react-router-dom` (проверить версию)

**Environment variables:**
```env
# Существующие
SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<existing>
SUPABASE_DIRECT_URL=<existing>

# Новые
ENCRYPTION_KEY=<generate 32 byte hex string>
SUPABASE_ANON_KEY=<from dashboard>
```

### Технические решения (из Clarifications)

1. **Telegram client cache**: Ограниченный кеш (max 50 clients, TTL 30 min, LRU eviction)
2. **Email verification**: Не требовать на MVP этапе
3. **Telegram accounts**: Неограниченное количество (отдельная таблица telegram_accounts)
4. **Password reset**: Отложить до post-MVP
5. **Multi-device**: Поддерживать множественные активные сессии (default Supabase)

## Constitution Check

**Статус**: Конституция не определена (используется template)

## Phase 0: Research & Discovery

### Исследовательские задачи

#### 1. Supabase Auth Best Practices
- **Цель**: Определить оптимальные паттерны интеграции Supabase Auth в Express backend
- **Вопросы**:
  - Как корректно проверять JWT токены на бэкенде?
  - Как создавать user-scoped Supabase клиентов для RLS?
  - Как обрабатывать refresh tokens?
- **Выход**: Документация паттернов в research.md

#### 2. AES-256 Encryption для Credentials
- **Цель**: Реализовать безопасное шифрование Telegram credentials
- **Вопросы**:
  - Как генерировать надежный ENCRYPTION_KEY?
  - Как хранить IV (initialization vector)?
  - Лучшие практики для Node.js crypto module?
- **Выход**: Utility функции encrypt/decrypt с примерами

#### 3. Row Level Security (RLS) Patterns
- **Цель**: Спроектировать эффективные RLS политики
- **Вопросы**:
  - Какие RLS политики нужны для каждой таблицы?
  - Как тестировать RLS локально?
  - Performance implications RLS?
- **Выход**: SQL скрипты для RLS policies

#### 4. Multi-Telegram-Account Architecture
- **Цель**: Определить структуру данных для множественных аккаунтов
- **Вопросы**:
  - Как выбирать telegram_account при создании campaign?
  - Как обрабатывать default account?
  - UI/UX для управления множественными аккаунтами?
- **Выход**: Data model и UI mockups

#### 5. Миграция существующих данных
- **Цель**: Безопасный план миграции с нулевым downtime
- **Вопросы**:
  - Как мигрировать users.id с TEXT на UUID?
  - Как перенести существующие credentials в зашифрованном виде?
  - Rollback strategy если миграция fails?
- **Выход**: SQL миграция + rollback скрипты

### Результаты исследования

**Статус**: ✅ Все решения приняты в Clarifications

**Ключевые решения:**
1. Supabase Auth JWT проверка через `supabase.auth.getUser(token)`
2. Шифрование: AES-256-CBC с уникальным IV на каждую запись
3. RLS: Стандартные политики `auth.uid() = user_id` для всех таблиц
4. Telegram accounts: Отдельная таблица `telegram_accounts` с 1:N связью к users
5. Миграция: Создать admin user через Supabase Auth, связать с существующими данными

**Документ**: `specs/003-multitenancy-supabase-auth/research.md` (будет создан)

## Phase 1: Design & Contracts

### Data Model

**Основные изменения:**

1. **Новая таблица `telegram_accounts`:**
```sql
CREATE TABLE telegram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  telegram_api_id TEXT NOT NULL,
  telegram_api_hash TEXT NOT NULL, -- encrypted
  telegram_session TEXT, -- encrypted
  telegram_phone TEXT NOT NULL,

  telegram_connected BOOLEAN DEFAULT FALSE,
  telegram_user_id TEXT,
  telegram_username TEXT,
  telegram_first_name TEXT,

  name TEXT, -- Friendly name
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT telegram_accounts_phone_unique UNIQUE (telegram_phone)
);
```

2. **Обновление таблицы `users`:**
```sql
-- Удалить старые поля
ALTER TABLE users DROP COLUMN username;
ALTER TABLE users DROP COLUMN password_hash;

-- Изменить id на UUID с референсом на auth.users
ALTER TABLE users ALTER COLUMN id TYPE UUID;
ALTER TABLE users ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

3. **Обновление связанных таблиц:**
```sql
ALTER TABLE campaigns ADD COLUMN telegram_account_id UUID REFERENCES telegram_accounts(id);
ALTER TABLE channels ADD COLUMN user_id UUID REFERENCES users(id); -- если еще нет
ALTER TABLE batches ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE templates ADD COLUMN user_id UUID REFERENCES users(id);
```

4. **RLS Policies:**
```sql
-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- Telegram Accounts
ALTER TABLE telegram_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telegram_accounts_all_own" ON telegram_accounts
  FOR ALL USING (user_id = auth.uid());

-- Campaigns (и аналогично для других таблиц)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_all_own" ON campaigns
  FOR ALL USING (user_id = auth.uid());
```

**Документ**: `specs/003-multitenancy-supabase-auth/data-model.md`

### API Contracts

#### Backend Auth API

**POST /api/auth/register**
```typescript
Request:
{
  email: string;
  password: string;
}

Response:
{
  user: { id: string; email: string };
  session: { access_token: string; refresh_token: string };
}
```

**POST /api/auth/login**
```typescript
Request:
{
  email: string;
  password: string;
}

Response:
{
  user: { id: string; email: string };
  session: { access_token: string; refresh_token: string };
}
```

**POST /api/auth/logout**
```typescript
Headers: Authorization: Bearer <token>

Response:
{
  success: true;
}
```

**GET /api/auth/me**
```typescript
Headers: Authorization: Bearer <token>

Response:
{
  id: string;
  role: string;
  telegram_accounts: Array<{
    id: string;
    name: string;
    telegram_username: string;
    is_active: boolean;
  }>;
  created_at: string;
}
```

#### Telegram Accounts API

**GET /api/telegram-accounts**
```typescript
Headers: Authorization: Bearer <token>

Response:
{
  accounts: Array<{
    id: string;
    name: string;
    telegram_phone: string;
    telegram_connected: boolean;
    telegram_username: string;
    is_active: boolean;
  }>;
}
```

**POST /api/telegram-accounts**
```typescript
Headers: Authorization: Bearer <token>

Request:
{
  name: string;
  apiId: string;
  apiHash: string;
  phone: string;
}

Response:
{
  accountId: string;
  sessionId: string; // Для auth flow
}
```

**PUT /api/telegram-accounts/:id/session**
```typescript
Headers: Authorization: Bearer <token>

Request:
{
  sessionString: string;
}

Response:
{
  success: true;
}
```

**DELETE /api/telegram-accounts/:id**
```typescript
Headers: Authorization: Bearer <token>

Response:
{
  success: true;
}
```

#### Updated Campaign API

**POST /api/campaigns**
```typescript
Headers: Authorization: Bearer <token>

Request:
{
  name: string;
  telegram_account_id: string; // NEW: выбор аккаунта
  template_id: string;
  batch_ids: string[];
  schedule?: {
    start_time: string;
    rate_limit: number;
  };
}

Response:
{
  campaign: {
    id: string;
    name: string;
    status: string;
    telegram_account_id: string;
  };
}
```

**Документ**: `specs/003-multitenancy-supabase-auth/contracts/api-contracts.ts`

### Implementation Checklist

#### Phase 1.1: Database Migration (US6)

- [ ] Создать SQL миграцию для telegram_accounts таблицы
- [ ] Создать SQL скрипт для изменения users.id на UUID
- [ ] Создать RLS policies для всех таблиц
- [ ] Создать migration script для существующих данных
- [ ] Протестировать миграцию на dev environment
- [ ] Создать rollback script

#### Phase 1.2: Encryption Utilities (US3, US5)

- [ ] Реализовать `src/utils/encryption.ts` (encrypt/decrypt)
- [ ] Сгенерировать ENCRYPTION_KEY и добавить в .env
- [ ] Написать unit tests для encryption/decryption
- [ ] Проверить совместимость с длинными строками (session strings)

#### Phase 1.3: Backend Auth Integration (US1)

- [ ] Создать `src/lib/supabase-auth.ts` (createUserClient, createAnonClient)
- [ ] Обновить `src/middleware/auth.ts` для проверки JWT
- [ ] Создать `src/api/auth.ts` (register, login, logout, me)
- [ ] Добавить SUPABASE_ANON_KEY в .env
- [ ] Протестировать auth flow с Postman

#### Phase 1.4: Telegram Accounts Management (US3, US5)

- [ ] Создать `src/api/telegram-accounts.ts` (CRUD endpoints)
- [ ] Обновить `src/lib/telegram-client.ts` (TelegramClientManager с cache)
- [ ] Обновить `src/services/telegram.ts` (принимать telegram_account_id)
- [ ] Обновить `src/workers/message-worker.ts` (использовать telegram_account_id)
- [ ] Обновить job data types в contracts

#### Phase 1.5: Frontend Auth (US2)

- [ ] Создать `src/contexts/AuthContext.tsx`
- [ ] Создать `src/components/PrivateRoute.tsx`
- [ ] Создать страницу `/login`
- [ ] Создать страницу `/register`
- [ ] Обновить `src/lib/api.ts` (добавить JWT в headers)
- [ ] Обновить App.tsx (wrap с AuthProvider)
- [ ] Обновить routing (защитить все routes)

#### Phase 1.6: Onboarding Flow (US4)

- [ ] Создать страницу `/onboarding` (3-step wizard)
- [ ] Шаг 1: Ввод Telegram credentials
- [ ] Шаг 2: Авторизация Telegram (SMS + 2FA)
- [ ] Шаг 3: Подтверждение и сохранение session
- [ ] Автоматический редирект на onboarding после регистрации

#### Phase 1.7: UI Updates for Multiple Accounts (US3, US7)

- [ ] Создать страницу `/telegram-accounts` (список аккаунтов)
- [ ] Добавить selector аккаунта в форму создания campaign
- [ ] Добавить indicator текущего аккаунта в UI
- [ ] Обновить profile page (управление аккаунтами)

#### Phase 1.8: Data Migration Execution (US6)

- [ ] Создать admin user через Supabase Auth
- [ ] Запустить SQL миграцию
- [ ] Перенести существующие Telegram credentials из .env
- [ ] Связать все existing данные с admin user
- [ ] Верифицировать успешность миграции

#### Phase 1.9: Testing & Validation

- [ ] Unit tests для encryption utilities
- [ ] Integration tests для auth flow
- [ ] Integration tests для telegram accounts CRUD
- [ ] E2E test: регистрация → onboarding → создание campaign → отправка
- [ ] RLS tests (попытка доступа к чужим данным)
- [ ] Performance test (cache strategy для telegram clients)

#### Phase 1.10: Documentation

- [ ] Обновить README.md (новый auth flow)
- [ ] Создать MIGRATION_GUIDE.md (для существующих пользователей)
- [ ] Обновить API documentation
- [ ] Создать quickstart.md для новых разработчиков

### Deliverables

- [ ] `data-model.md` - полная схема БД с миграциями
- [ ] `contracts/api-contracts.ts` - TypeScript типы для API
- [ ] `contracts/queue-jobs.ts` - обновленные типы для pg-boss jobs
- [ ] `quickstart.md` - инструкции для local dev setup
- [ ] `research.md` - решения по технологиям и паттернам

## Phase 2: Validation Gates

### Pre-Implementation Checklist

- [ ] Все исследовательские задачи завершены
- [ ] Data model review completed
- [ ] API contracts утверждены
- [ ] Миграционная стратегия протестирована на dev
- [ ] Encryption key сгенерирован и secured
- [ ] Supabase Auth настроен (email provider enabled)

### Constitution Re-Check

**Статус**: N/A (конституция не определена)

### Risk Assessment

**High Risk:**
1. ⚠️ **Data migration complexity** - миграция users.id с TEXT на UUID может сломать FK
   - Mitigation: Тщательное тестирование на копии prod DB
   - Rollback plan: Сохранить backup перед миграцией

2. ⚠️ **RLS performance** - RLS может замедлить запросы на больших таблицах
   - Mitigation: Добавить индексы на user_id колонки
   - Monitoring: Замерить query performance до/после RLS

3. ⚠️ **Telegram client lifecycle** - сложность управления множеством подключений
   - Mitigation: LRU cache с TTL защищает от memory leaks
   - Monitoring: Отслеживать количество активных connections

**Medium Risk:**
1. ⚠️ **Encryption key management** - потеря ключа = потеря всех credentials
   - Mitigation: Backup ENCRYPTION_KEY в secure vault (не в git!)
   - Documentation: Четкие инструкции по key rotation

**Low Risk:**
1. Frontend breaking changes - обязательная авторизация может сломать dev workflow
   - Mitigation: Seed script для создания test users

### Success Criteria

**MVP Success (US1, US2, US3, US5, US6):**
- [ ] Пользователь может зарегистрироваться через email/password
- [ ] Пользователь может добавить неограниченное количество Telegram аккаунтов
- [ ] Пользователь видит только свои данные (RLS работает)
- [ ] Campaign использует выбранный telegram_account для отправки
- [ ] Существующие данные успешно мигрированы к admin user

**Quality Gates:**
- [ ] Все unit tests проходят
- [ ] RLS tests проходят (невозможно получить чужие данные)
- [ ] Performance: < 200ms для auth middleware
- [ ] Performance: cache hit rate для telegram clients > 80%
- [ ] Security: credentials encrypted в БД
- [ ] Security: JWT validation работает корректно

**Post-MVP (US4, US7):**
- [ ] Onboarding flow интуитивен (<5 минут)
- [ ] Можно обновить Telegram credentials в профиле
- [ ] UI для управления множественными аккаунтами удобен

## Timeline Estimate

**Phase 0 (Research):** 1 день
- Все решения уже приняты в Clarifications
- Нужно только документировать в research.md

**Phase 1.1-1.4 (Backend Core):** 3-4 дня
- Database migration: 1 день
- Encryption + Auth: 1 день
- Telegram accounts management: 1-2 дня

**Phase 1.5-1.6 (Frontend + Onboarding):** 3 дня
- Auth context + pages: 1.5 дня
- Onboarding flow: 1.5 дня

**Phase 1.7 (UI Updates):** 1 день
- Multiple accounts UI

**Phase 1.8 (Migration):** 0.5 дня
- Execution + verification

**Phase 1.9-1.10 (Testing + Docs):** 2 дня
- Tests + documentation

**Total MVP:** ~10-11 дней

## Next Steps

1. ✅ Завершить Phase 0 - создать research.md
2. ⏳ Создать data-model.md с полными SQL миграциями
3. ⏳ Создать API contracts в contracts/
4. ⏳ Обновить tasks.md если есть изменения после планирования
5. ⏳ Начать Phase 1.1 (Database Migration)

## Appendix

### Generated Artifacts

- `specs/003-multitenancy-supabase-auth/plan.md` (этот файл)
- `specs/003-multitenancy-supabase-auth/research.md` (todo)
- `specs/003-multitenancy-supabase-auth/data-model.md` (todo)
- `specs/003-multitenancy-supabase-auth/contracts/` (todo)
- `specs/003-multitenancy-supabase-auth/quickstart.md` (todo)

### References

- Feature Spec: `specs/003-multitenancy-supabase-auth/spec.md`
- Tasks: `specs/003-multitenancy-supabase-auth/tasks.md`
- Clarifications: См. spec.md, Session 2025-10-16
