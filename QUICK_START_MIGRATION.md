# Быстрый старт: Миграция на Supabase

## Краткая инструкция (5 минут)

### 1️⃣ Создайте пользователя в Supabase

Откройте SQL Editor в Supabase Dashboard:
https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk/sql/new

Выполните скрипт из файла: `shared/setup-supabase.sql`

**Важно:** Замените `ваш_безопасный_пароль` на надежный пароль (запомните его!)

### 2️⃣ Обновите пароли в .env файлах

Замените `[YOUR-PASSWORD]` на пароль пользователя `prisma` в этих файлах:

- ✅ `shared/.env` - DATABASE_URL и DIRECT_URL
- ✅ `backend/.env` - DATABASE_URL
- ✅ `.env` - DATABASE_URL (корневой файл)

**Формат строки подключения:**
```
postgresql://prisma.qjnxcjbzwelokluaiqmk:ВАШ_ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### 3️⃣ Запустите миграцию

Откройте PowerShell в папке `shared` и выполните:

```powershell
cd shared
.\migrate-to-supabase.ps1
```

Или вручную:

```powershell
cd shared
npx prisma generate
npx prisma migrate dev --name init_supabase
```

### 4️⃣ Проверьте результат

```powershell
npx prisma studio
```

Откроется браузер с GUI для просмотра базы данных.

---

## Альтернативный способ (без PowerShell скрипта)

```bash
# Переход в папку shared
cd shared

# Генерация Prisma Client
npx prisma generate

# Вариант 1: Создать миграцию (для разработки)
npx prisma migrate dev --name init_supabase

# Вариант 2: Применить схему напрямую (быстрее, без истории)
npx prisma db push

# Вариант 3: Применить существующие миграции (для продакшн)
npx prisma migrate deploy
```

---

## Заполнение тестовыми данными

После успешной миграции заполните базу тестовыми данными:

```powershell
cd shared
npx prisma db seed
```

---

## Подробная документация

Смотрите полную документацию в файле: **SUPABASE_MIGRATION_GUIDE.md**

---

## Возможные проблемы

### Ошибка: "Can't reach database server"
Проверьте:
- Правильность пароля в .env файлах
- Доступность интернета
- Добавьте параметр `?connect_timeout=30` в конец DATABASE_URL

### Ошибка: "User prisma does not exist"
Выполните SQL скрипт `shared/setup-supabase.sql` в Supabase Dashboard

### Ошибка при миграции
Проверьте файл `shared/.env`:
- DATABASE_URL должен использовать порт 6543 с pgbouncer=true
- DIRECT_URL должен использовать порт 5432 без pgbouncer

---

## Контакты проекта

- **Проект ID**: qjnxcjbzwelokluaiqmk
- **Supabase URL**: https://qjnxcjbzwelokluaiqmk.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk

---

**Готово!** 🎉 Теперь ваша база данных работает на новом Supabase проекте.
