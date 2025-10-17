# 🚧 Supabase Migration Status

## ✅ Что уже сделано автоматически:

1. **Prisma schema** - Provider изменён на `postgresql` ✅
2. **Конституция проекта** - Создана (v1.0.0) с Supabase principles ✅
3. **pg-boss Specification** - Полная спецификация миграции (Feature 002) ✅
4. **.env файлы** - Обновлены с Supabase connection string ✅
5. **Migration script** - Создан `shared/migrate-supabase.ps1` ✅
6. **Documentation** - Создан `SUPABASE_SETUP.md` ✅

## ⚠️ Проблема: DNS не может разрешить хост Supabase

**Ошибка**: `Can't reach database server at db.wjwojephnnrnucexlteh.supabase.co:5432`

**Возможные причины**:
1. Проект Supabase еще не полностью активирован (нужно подождать 1-2 минуты)
2. Firewall блокирует исходящие подключения к порту 5432
3. Проблема с DNS разрешением (IPv6 vs IPv4)
4. Неправильный Project Ref (проверьте в Supabase Dashboard)

## 🔍 Шаги для решения:

### Шаг 1: Проверьте статус проекта в Supabase

1. Откройте: https://app.supabase.com/project/wjwojephnnrnucexlteh
2. Убедитесь, что статус проекта: **"Active"** (не "Paused" или "Setting up")
3. Если статус "Paused", нажмите "Resume project"

### Шаг 2: Получите правильный Connection String

1. В Supabase Dashboard откройте: **Settings** → **Database**
2. Найдите секцию **"Connection string"**
3. Выберите вкладку **"URI"** (не "Pooler")
4. Скопируйте полный connection string

**Правильный формат**:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

Возможно ваш правильный connection string другой, не `db.wjwojephnnrnucexlteh.supabase.co`.

### Шаг 3: Обновите .env файлы с правильным connection string

**backend/.env**:
```env
DATABASE_URL="[ВСТАВЬТЕ ПРАВИЛЬНЫЙ CONNECTION STRING ИЗ SUPABASE]"
```

**shared/.env**:
```env
DATABASE_URL="[ВСТАВЬТЕ ПРАВИЛЬНЫЙ CONNECTION STRING ИЗ SUPABASE]"
```

**Корневой .env**:
```env
DATABASE_URL="[ВСТАВЬТЕ ПРАВИЛЬНЫЙ CONNECTION STRING ИЗ SUPABASE]"
```

### Шаг 4: Запустите миграцию вручную

Откройте PowerShell и выполните:

```powershell
# Перейдите в shared директорию
cd "D:\00_dev\01_Ведомости\Новая папка\бот_рассылка\shared"

# Запустите migration script
.\migrate-supabase.ps1
```

**Или** запустите напрямую:

```powershell
cd shared
npx prisma migrate dev --name init
npx prisma generate
```

### Шаг 5: Проверьте подключение

```powershell
cd shared
npx prisma studio
```

Если Prisma Studio откроется и покажет пустые таблицы - миграция успешна! ✅

## 📋 Альтернатива: Connection Pooler

Суп база может использовать connection pooler. Попробуйте эти параметры:

**Вариант 1 - Transaction Mode (порт 6543)**:
```
postgresql://postgres:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Вариант 2 - Direct Connection (порт 5432)**:
```
postgresql://postgres:[PASSWORD]@db.wjwojephnnrnucexlteh.supabase.co:5432/postgres
```

**Вариант 3 - Session Mode (порт 6543)**:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

## 🆘 Если ничего не помогает:

1. Проверьте настройки firewall/антивируса
2. Попробуйте с другой сети (мобильный интернет)
3. Проверьте, что проект Supabase создан в правильном регионе
4. Свяжитесь с Supabase Support если проблема персистит

## 📊 После успешной миграции:

1. ✅ Таблицы созданы в Supabase PostgreSQL
2. ✅ Prisma Client сгенерирован
3. ✅ Можно перезапустить backend/frontend серверы
4. ✅ Готовы к тестированию через `/test` page
5. ✅ Готовы к реализации pg-boss (Feature 002)

## 🎯 Следующие шаги после миграции:

```bash
# 1. Заполнить тестовыми данными (опционально)
cd shared
npx prisma db seed

# 2. Перезапустить backend
cd backend
npm run dev

# 3. Перезапустить frontend
cd frontend
npm run dev

# 4. Проверить подключение
# Откройте http://localhost:5173/test
# Проверьте Telegram status (должен быть зелёным)
```

## 📖 Дополнительная информация:

- **Полная инструкция**: `SUPABASE_SETUP.md`
- **Конституция**: `.specify/memory/constitution.md`
- **pg-boss Spec**: `specs/002-migrate-from-bullmq/spec.md`
- **Checklist**: `specs/002-migrate-from-bullmq/checklists/requirements.md`
