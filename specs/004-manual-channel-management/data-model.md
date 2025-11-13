# Data Model: Управление каналами вручную

**Feature**: 004-manual-channel-management
**Date**: 2025-10-18
**Database**: Supabase (PostgreSQL)

## Overview

Модель данных для управления Telegram-каналами с поддержкой CRUD-операций, версионирования (optimistic locking) и multi-tenancy через Row Level Security (RLS).

## Database Schema

### Table: `channels`

**Purpose**: Хранение информации о Telegram-каналах для рассылок

**Naming Convention**: snake_case (соответствует существующей структуре БД)

```sql
CREATE TABLE channels (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Fields (обязательные)
  name VARCHAR(255) NOT NULL,           -- Название канала
  username VARCHAR(100) NOT NULL UNIQUE, -- Telegram username (уникальный)

  -- Optional Fields
  title VARCHAR(255),                    -- Заголовок канала
  tgstat_url VARCHAR(2048),             -- URL статистики TGStat
  telegram_links TEXT[],                 -- Массив ссылок на канал (основная, invite, web)

  -- Status
  status VARCHAR(50) DEFAULT 'active',   -- active | inactive

  -- Metadata для optimistic locking и audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  author_created UUID REFERENCES auth.users(id),  -- Кто создал
  author_updated UUID REFERENCES auth.users(id),  -- Кто последним обновил

  -- Multi-tenancy (RLS support)
  user_id UUID REFERENCES auth.users(id) NOT NULL, -- Владелец канала

  -- Constraints
  CONSTRAINT channels_username_format CHECK (username ~ '^@[A-Za-z0-9_]{4,31}$'),
  CONSTRAINT channels_status_valid CHECK (status IN ('active', 'inactive'))
);

-- Indexes для производительности
CREATE INDEX idx_channels_username ON channels(username);
CREATE INDEX idx_channels_user_id ON channels(user_id);
CREATE INDEX idx_channels_created_at ON channels(created_at DESC);
CREATE INDEX idx_channels_updated_at ON channels(updated_at DESC);
CREATE INDEX idx_channels_status ON channels(status);
CREATE INDEX idx_channels_user_id_username ON channels(user_id, username);

-- Trigger для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channels_updated_at_trigger
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_channels_updated_at();
```

### Row Level Security (RLS)

**Политики безопасности**:

```sql
-- Включить RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Policy: Пользователи видят только свои каналы
CREATE POLICY channels_select_own
  ON channels
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Пользователи могут создавать каналы только для себя
CREATE POLICY channels_insert_own
  ON channels
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Пользователи могут обновлять только свои каналы
CREATE POLICY channels_update_own
  ON channels
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Пользователи могут удалять только свои каналы
CREATE POLICY channels_delete_own
  ON channels
  FOR DELETE
  USING (auth.uid() = user_id);
```

## Entity Relationships

```
┌─────────────────┐
│   auth.users    │
│                 │
│  - id (PK)      │
│  - email        │
│  - ...          │
└────────┬────────┘
         │
         │ 1:N (владелец каналов)
         │
┌────────▼────────────────────────────┐
│           channels                  │
│                                     │
│  - id (PK)                          │
│  - user_id (FK) → auth.users(id)    │
│  - name                             │
│  - username (UNIQUE)                │
│  - title                            │
│  - tgstat_url                       │
│  - telegram_links (array)           │
│  - status                           │
│  - created_at                       │
│  - updated_at (для optimistic lock) │
│  - author_created (FK)              │
│  - author_updated (FK)              │
└──────────────────────────────────────┘
```

**Relationships**:
1. **auth.users → channels**: One-to-Many (один пользователь - множество каналов)
2. **auth.users → channels (author_created)**: One-to-Many (audit trail)
3. **auth.users → channels (author_updated)**: One-to-Many (audit trail)

## Validation Rules

### Field Validations

| Field | Type | Required | Constraint | Example |
|-------|------|----------|------------|---------|
| `id` | UUID | Yes (auto) | Primary key | `550e8400-e29b-41d4-a716-446655440000` |
| `name` | VARCHAR(255) | Yes | Length ≤ 255 | `"Новостной канал IT"` |
| `username` | VARCHAR(100) | Yes | Unique, Regex: `^@[A-Za-z0-9_]{4,31}$` | `"@tech_news_ru"` |
| `title` | VARCHAR(255) | No | Length ≤ 255 | `"IT Новости России"` |
| `tgstat_url` | VARCHAR(2048) | No | Valid URL, Length ≤ 2048 | `"https://tgstat.ru/channel/@tech_news_ru"` |
| `telegram_links` | TEXT[] | No | Each URL ≤ 2048 chars | `["https://t.me/tech_news_ru", "https://t.me/+invite123"]` |
| `status` | VARCHAR(50) | Yes (default: `active`) | `IN ('active', 'inactive')` | `"active"` |
| `created_at` | TIMESTAMP | Yes (auto) | Immutable | `2025-10-18T10:30:00Z` |
| `updated_at` | TIMESTAMP | Yes (auto) | Auto-update on change | `2025-10-18T14:45:00Z` |
| `author_created` | UUID | No | FK to auth.users | `550e8400-...` |
| `author_updated` | UUID | No | FK to auth.users | `550e8400-...` |
| `user_id` | UUID | Yes | FK to auth.users, RLS | `550e8400-...` |

### Business Rules

1. **Username Uniqueness**: `username` must be globally unique across all users
2. **Username Format**: Must start with `@`, followed by 4-31 alphanumeric characters or underscores
3. **Optimistic Locking**: Compare `updated_at` before UPDATE to detect concurrent modifications
4. **Soft Delete**: Consider setting `status = 'inactive'` instead of hard delete if channel used in campaigns
5. **Audit Trail**: Always update `author_updated` on modification

## State Transitions

```
┌─────────┐
│  Create │
└────┬────┘
     │
     ▼
┌─────────────┐
│   Active    │◄──────┐
│ (status =   │       │
│  'active')  │       │
└──┬─────┬────┘       │
   │     │            │
   │     │ Edit       │ Reactivate
   │     └────────────┤
   │                  │
   │ Deactivate       │
   ▼                  │
┌──────────────┐      │
│   Inactive   │──────┘
│ (status =    │
│ 'inactive')  │
└──────┬───────┘
       │
       │ Delete (hard/soft)
       ▼
   [Deleted]
```

**State Descriptions**:
- **Active**: Канал доступен для использования в рассылках
- **Inactive**: Канал деактивирован, но данные сохранены
- **Deleted**: Канал удалён из базы (или помечен deleted)

## Data Access Patterns

### Common Queries

#### 1. List All Channels (with pagination)
```typescript
const { data, error } = await supabase
  .from('channels')
  .select('*')
  .order('created_at', { ascending: false })
  .range(0, 99); // First 100 records
```

#### 2. Get Channel by ID
```typescript
const { data, error } = await supabase
  .from('channels')
  .select('*')
  .eq('id', channelId)
  .single();
```

#### 3. Check Username Uniqueness
```typescript
const { data, error } = await supabase
  .from('channels')
  .select('id')
  .eq('username', username)
  .maybeSingle();
// If data exists → username taken
```

#### 4. Create Channel
```typescript
const { data, error } = await supabase
  .from('channels')
  .insert({
    name,
    username,
    title,
    tgstat_url,
    telegram_links,
    user_id: auth.uid(),
    author_created: auth.uid(),
    author_updated: auth.uid(),
  })
  .select()
  .single();
```

#### 5. Update Channel (with optimistic locking)
```typescript
// Step 1: Check current version
const { data: current } = await supabase
  .from('channels')
  .select('updated_at')
  .eq('id', channelId)
  .single();

if (new Date(current.updated_at) > new Date(clientUpdatedAt)) {
  throw new Error('CONFLICT: Channel was modified by another user');
}

// Step 2: Update with version check
const { data, error } = await supabase
  .from('channels')
  .update({
    name,
    username,
    title,
    tgstat_url,
    telegram_links,
    author_updated: auth.uid(),
    // updated_at автоматически обновится через trigger
  })
  .eq('id', channelId)
  .eq('updated_at', clientUpdatedAt) // Atomic check
  .select()
  .single();

if (data === null) {
  throw new Error('CONFLICT: Channel was modified during update');
}
```

#### 6. Delete Channel
```typescript
// Soft delete (recommended if channel used in campaigns)
const { error } = await supabase
  .from('channels')
  .update({ status: 'inactive' })
  .eq('id', channelId);

// Hard delete
const { error } = await supabase
  .from('channels')
  .delete()
  .eq('id', channelId);
```

#### 7. Search Channels
```typescript
const { data, error } = await supabase
  .from('channels')
  .select('*')
  .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
  .limit(100);
```

## Performance Considerations

### Indexing Strategy
- **Primary**: `id` (UUID) - автоматический clustered index
- **Unique**: `username` - для быстрой проверки уникальности
- **Composite**: `(user_id, username)` - для RLS queries с фильтрацией
- **Timestamp**: `created_at`, `updated_at` - для сортировки по дате

### Query Optimization
- **SELECT только нужные поля**: Avoid `SELECT *` в production
- **Pagination**: Always use `.range()` для больших списков
- **RLS**: Queries автоматически фильтруются по `user_id` через RLS

### Scaling Limits
- **Current Target**: 10,000 каналов per user
- **Database Limit**: PostgreSQL поддерживает millions of rows
- **Expected Load**: 10 concurrent users, 100 requests/min

## Migration Script

См. `shared/migrations/004_add_channels_table.sql` для полного SQL скрипта миграции.

## Next Steps

1. Create contracts (TypeScript types) based on this model
2. Implement API endpoints using these data access patterns
3. Add integration tests for all CRUD operations
4. Verify RLS policies work correctly

