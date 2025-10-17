# Supabase Setup Guide

## 📋 Информация о проекте

- **Project URL**: https://wjwojephnnrnucexlteh.supabase.co
- **Project Ref**: `wjwojephnnrnucexlteh`
- **Region**: Auto-detected by Supabase

## 🔑 API Keys (уже настроены)

- **Service Role Key** (backend): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqd29qZXBobm5ybnVjZXhsdGVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0MTM0NiwiZXhwIjoyMDY4NjE3MzQ2fQ.m_-zmDKKTc_Y62MtEZrpqMYm_8iqmIRfxT62S2RPluk`
- **Anon Public Key** (frontend): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqd29qZXBobm5ybnVjZXhsdGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDEzNDYsImV4cCI6MjA2ODYxNzM0Nn0.FJxlPteMD0-ilu07wJ5pj3pvQlVJM2Qk87-J_VKktpo`

## 🔐 Шаг 1: Получить Database Password

1. Перейдите в Supabase Dashboard: https://wjwojephnnrnucexlteh.supabase.co
2. Откройте: **Settings** (⚙️ в левом меню) → **Database**
3. Найдите секцию **"Connection string"** или **"Database Password"**
4. Скопируйте пароль (обычно показан при создании проекта, или можно сбросить)

**Формат connection string**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.wjwojephnnrnucexlteh.supabase.co:5432/postgres
```

## 📝 Шаг 2: Обновить .env файлы

### Backend (.env)

Замените `[YOUR-PASSWORD]` на реальный пароль из Supabase:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.wjwojephnnrnucexlteh.supabase.co:5432/postgres"
```

### Shared (.env)

Такая же строка подключения:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.wjwojephnnrnucexlteh.supabase.co:5432/postgres"
```

## 🚀 Шаг 3: Применить миграции

После обновления паролей выполните:

```bash
# Перейдите в директорию shared
cd shared

# Примените миграции (создаст таблицы в Supabase)
npx prisma migrate dev --name init

# Сгенерируйте Prisma Client
npx prisma generate

# Опционально: заполните тестовыми данными
npx prisma db seed
```

## ✅ Шаг 4: Проверить подключение

```bash
# Откройте Prisma Studio для проверки
cd shared
npx prisma studio
```

Prisma Studio откроется на http://localhost:5555 и покажет ваши таблицы.

## 🔄 Шаг 5: Перезапустить серверы

После миграции перезапустите backend и frontend:

```bash
# Backend (Терминал 1)
cd backend
npm run dev

# Frontend (Терминал 2)
cd frontend
npm run dev
```

## 🧪 Шаг 6: Протестировать

1. Откройте http://localhost:5173/test
2. Проверьте статус Telegram (должен быть зелёным)
3. Попробуйте отправить тестовое сообщение

## 📊 Monitoring в Supabase Dashboard

После миграции вы сможете:

- **Table Editor**: Просматривать и редактировать данные
  https://wjwojephnnrnucexlteh.supabase.co/project/wjwojephnnrnucexlteh/editor

- **SQL Editor**: Выполнять SQL запросы
  https://wjwojephnnrnucexlteh.supabase.co/project/wjwojephnnrnucexlteh/sql

- **Database**: Статистика и производительность
  https://wjwojephnnrnucexlteh.supabase.co/project/wjwojephnnrnucexlteh/database/tables

## ⚠️ Troubleshooting

### Ошибка: "Connection refused"
- Проверьте, что пароль правильный
- Убедитесь, что connection string скопирован полностью
- Проверьте, что используется порт 5432 (не 6543)

### Ошибка: "SSL connection required"
Добавьте SSL параметры в connection string:
```
postgresql://postgres:[PASSWORD]@db.wjwojephnnrnucexlteh.supabase.co:5432/postgres?sslmode=require
```

### Ошибка: "Schema not found"
Убедитесь, что Prisma provider установлен в `postgresql`:
```prisma
// shared/prisma/schema.prisma
datasource db {
  provider = "postgresql"  // ← Должно быть postgresql, не sqlite
  url      = env("DATABASE_URL")
}
```

## 🎯 Next Steps

После успешной миграции на Supabase:

1. ✅ Database работает на PostgreSQL
2. 🔄 Готовы к миграции на pg-boss (замена Redis)
3. 📋 Запустите `/speckit.plan` для создания implementation plan
4. 🚀 Начните имплементацию с User Story 1 (P1)

## 📞 Полезные ссылки

- Supabase Dashboard: https://app.supabase.com/project/wjwojephnnrnucexlteh
- Prisma Docs: https://www.prisma.io/docs
- Constitution: [.specify/memory/constitution.md](.specify/memory/constitution.md)
- Feature Spec: [specs/002-migrate-from-bullmq/spec.md](specs/002-migrate-from-bullmq/spec.md)
