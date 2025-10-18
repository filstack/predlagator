# Миграции Feature 003: Multitenancy

## Порядок выполнения

**ВАЖНО:** Выполнять строго по порядку!

### 1. `003_000_create_users_table.sql` ✅ ВЫПОЛНЕНА
- Создает таблицу `users` с `id UUID` (references `auth.users`)
- Удаляет старую таблицу users, если существует

### 2. `003_001_create_telegram_accounts.sql` ✅ ВЫПОЛНЕНА
- Создает таблицу `telegram_accounts`
- Включает RLS на `telegram_accounts` (уже имеет политики)

### 3. `003_002_add_user_id_columns.sql` ✅ ВЫПОЛНЕНА
- Добавляет колонку `user_id UUID` во все таблицы
- Добавляет `telegram_account_id` в campaigns

### 4. `003_002b_fix_user_id_types.sql` ⚠️ ВЫПОЛНИТЬ СЕЙЧАС
- Исправляет типы `user_id` с TEXT → UUID (если нужно)
- Идемпотентная - можно выполнять несколько раз

### 5. `003_003_enable_rls.sql` ⚠️ ВЫПОЛНИТЬ ПОСЛЕ 003_002b
- Включает RLS на всех таблицах
- Создает RLS политики для изоляции данных
- Идемпотентная - можно выполнять несколько раз

### 6. `003_004_migrate_data.sql` ✅ ВЫПОЛНЕНА (через скрипт)
- Привязывает существующие данные к admin user

---

## Как выполнить миграции

### Вариант 1: Через Supabase Dashboard (рекомендуется)

1. Откройте: https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk/sql/new

2. **Шаг 1:** Выполните `003_002b_fix_user_id_types.sql`
   - Скопируйте содержимое файла
   - Вставьте в SQL Editor
   - Нажмите RUN
   - Ожидайте: `COMMIT` без ошибок

3. **Шаг 2:** Выполните `003_003_enable_rls.sql`
   - Скопируйте содержимое файла
   - Вставьте в SQL Editor
   - Нажмите RUN
   - Ожидайте: `COMMIT` без ошибок

4. **Проверка:** Запустите тест
   ```bash
   cd backend
   npx tsx scripts/test-rls.ts
   ```

   Ожидаемый результат:
   ```
   ✅ Без auth: 0 записей channels
   ✅ Без auth: 0 записей telegram_accounts
   ✅ Admin видит только свои данные
   ```

### Вариант 2: Через скрипт (если PostgreSQL connection работает)

```bash
cd backend
npx tsx scripts/full-setup.ts
```

---

## Что делает каждая миграция

### 003_002b: Fix user_id Types

```sql
-- Конвертирует TEXT → UUID для:
- campaigns.user_id
- channels.user_id
- batches.user_id
- templates.user_id
- jobs.user_id
- audit_logs.user_id
```

**Почему нужно:** `auth.uid()` возвращает UUID, а некоторые колонки могут быть TEXT

### 003_003: Enable RLS

```sql
-- Включает RLS на:
- users
- telegram_accounts (уже включен, пересоздает политики)
- campaigns
- channels
- batches
- templates
- jobs
- audit_logs

-- Политики:
- users: SELECT/UPDATE только свой профиль
- telegram_accounts: CRUD только свои аккаунты
- campaigns: CRUD только свои кампании
- channels: CRUD только свои каналы
- batches: CRUD только свои батчи
- templates: CRUD только свои шаблоны
- jobs: SELECT только свои jobs (read-only)
- audit_logs: SELECT только свои логи
```

---

## Troubleshooting

### Ошибка: `operator does not exist: text = uuid`

**Причина:** Колонка `user_id` имеет тип TEXT, а `auth.uid()` возвращает UUID

**Решение:** Выполните сначала `003_002b_fix_user_id_types.sql`

### Ошибка: `policy already exists`

**Причина:** Политика уже создана (например, из 003_001)

**Решение:** Миграция 003_003 теперь идемпотентная (использует `DROP POLICY IF EXISTS`), просто запустите снова

### Ошибка: `table does not exist`

**Причина:** Не выполнены предыдущие миграции

**Решение:** Выполните миграции по порядку (003_000 → 003_001 → 003_002 → 003_002b → 003_003)

---

## Проверка статуса миграций

```bash
cd backend
npx tsx scripts/check-db-schema.ts
```

Покажет:
- Существование таблиц
- Типы колонок user_id
- Статус RLS
- Статистику данных
