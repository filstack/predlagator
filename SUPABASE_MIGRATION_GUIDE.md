# Руководство по миграции на новую базу данных Supabase

## Шаг 1: Получить пароль базы данных

1. Откройте Supabase Dashboard: https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk
2. Перейдите в Settings → Database
3. Найдите Database Password (или создайте новый пароль)
4. Скопируйте пароль

## Шаг 2: Создать пользователя 'prisma' в Supabase

Откройте SQL Editor в Supabase Dashboard и выполните следующий SQL код:

```sql
-- Создаем пользователя prisma с необходимыми привилегиями
CREATE USER "prisma" WITH PASSWORD 'ваш_безопасный_пароль' BYPASSRLS CREATEDB;

-- Расширяем привилегии prisma на postgres (необходимо для просмотра изменений в Dashboard)
GRANT "prisma" TO "postgres";

-- Предоставляем необходимые права на схему public
GRANT USAGE ON SCHEMA public TO prisma;
GRANT CREATE ON SCHEMA public TO prisma;
GRANT ALL ON ALL TABLES IN SCHEMA public TO prisma;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO prisma;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO prisma;

-- Устанавливаем права по умолчанию
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO prisma;
```

## Шаг 3: Обновить переменные окружения

### shared/.env
Замените `[YOUR-PASSWORD]` на пароль от пользователя `prisma`:

```env
DATABASE_URL="postgresql://prisma.qjnxcjbzwelokluaiqmk:ваш_пароль_prisma@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://prisma.qjnxcjbzwelokluaiqmk:ваш_пароль_prisma@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

### backend/.env
Замените `[YOUR-PASSWORD]` на пароль от пользователя `prisma`:

```env
DATABASE_URL="postgresql://prisma.qjnxcjbzwelokluaiqmk:ваш_пароль_prisma@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

## Шаг 4: Создать миграцию

Выполните в терминале:

```bash
cd shared
npx prisma migrate dev --name init_supabase
```

Или если база данных уже существует с данными:

```bash
cd shared
npx prisma db push
```

## Шаг 5: Применить миграцию (для продакшн)

Для применения миграции на продакшн-сервере:

```bash
cd shared
npx prisma migrate deploy
```

## Шаг 6: Проверить подключение

Создайте тестовый скрипт для проверки подключения:

```bash
cd shared
npx prisma studio
```

Или выполните:

```bash
npx prisma db pull
```

## Параметры подключения

### Информация о новой базе данных:
- **Project Reference**: qjnxcjbzwelokluaiqmk
- **Supabase URL**: https://qjnxcjbzwelokluaiqmk.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbnhjamJ6d2Vsb2tsdWFpcW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTE1NjcsImV4cCI6MjA3NjEyNzU2N30.eF91eQwDO8TfPdJRHYZ1jMgdUnxsytwYazmWClu4h84

### Форматы строк подключения:

1. **Transaction Mode (для приложения)**: Порт 6543 с pgbouncer=true
2. **Session Mode (для миграций)**: Порт 5432 без pgbouncer

## Важные замечания

1. **connection_limit=1** - рекомендуется для serverless окружений
2. **pgbouncer=true** - обязательно для Transaction Mode
3. Используйте пользователя `prisma` вместо `postgres` для лучшего контроля
4. Храните пароли в безопасном месте (используйте .env и добавьте в .gitignore)

## Устранение неполадок

### Ошибка "Can't reach database server"
Добавьте параметр `connect_timeout`:
```
?connect_timeout=30
```

### Ошибка "Timed out fetching a new connection"
Увеличьте `pool_timeout`:
```
?pool_timeout=30
```

### Проверка текущих миграций
```bash
npx prisma migrate status
```

## Следующие шаги

После успешной миграции:
1. Запустите seed для заполнения базы тестовыми данными
2. Обновите frontend/.env с новыми Supabase credentials
3. Протестируйте все API endpoints
