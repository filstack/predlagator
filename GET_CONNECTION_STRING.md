# Как получить правильный Connection String из Supabase

## ВАЖНО! Нужно получить правильные credentials из Supabase Dashboard

### Шаг 1: Откройте Supabase Dashboard
https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk

### Шаг 2: Перейдите в Settings → Database

### Шаг 3: Найдите раздел "Connection string"

Там будут ДВА типа строк подключения:

#### A. Session Mode (для миграций - DIRECT_URL):
```
postgres://postgres:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

#### B. Transaction Mode (для приложения - DATABASE_URL):
```
postgres://postgres:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Шаг 4: Скопируйте пароль

В Supabase Dashboard найдите:
- **Settings → Database → Database Password**
- Нажмите "Reset Database Password" если забыли старый
- ИЛИ используйте уже существующий пароль

### Шаг 5: Обновите shared/.env

Замените `kampus123` на ПРАВИЛЬНЫЙ пароль из Supabase:

```env
DATABASE_URL="postgres://postgres:ВАШ_НАСТОЯЩИЙ_ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

DIRECT_URL="postgres://postgres:ВАШ_НАСТОЯЩИЙ_ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

### ВАЖНО:
- Пароль НЕ "kampus123" - это тестовый пароль
- Нужен РЕАЛЬНЫЙ пароль от вашей Supabase базы данных
- Пароль можно найти или сбросить в Settings → Database
