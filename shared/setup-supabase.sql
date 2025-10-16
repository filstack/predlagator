-- ============================================================================
-- Supabase Setup Script
-- Выполните этот скрипт в SQL Editor вашего Supabase проекта
-- ============================================================================

-- Шаг 1: Создать пользователя 'prisma' с необходимыми привилегиями
-- ВАЖНО: Замените 'ваш_безопасный_пароль' на сильный пароль
CREATE USER "prisma" WITH PASSWORD 'ваш_безопасный_пароль' BYPASSRLS CREATEDB;

-- Шаг 2: Расширить привилегии prisma на postgres
-- Это необходимо для просмотра изменений в Supabase Dashboard
GRANT "prisma" TO "postgres";

-- Шаг 3: Предоставить необходимые права на схему public
GRANT USAGE ON SCHEMA public TO prisma;
GRANT CREATE ON SCHEMA public TO prisma;
GRANT ALL ON ALL TABLES IN SCHEMA public TO prisma;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO prisma;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO prisma;

-- Шаг 4: Установить права по умолчанию для будущих объектов
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO prisma;

-- Шаг 5 (Опционально): Проверить созданного пользователя
-- SELECT usename, usecreatedb, usebypassrls FROM pg_user WHERE usename = 'prisma';

-- ============================================================================
-- После выполнения этого скрипта:
-- 1. Скопируйте пароль пользователя 'prisma'
-- 2. Обновите файлы .env:
--    - shared/.env: DATABASE_URL и DIRECT_URL
--    - backend/.env: DATABASE_URL
-- 3. Замените [YOUR-PASSWORD] на пароль пользователя 'prisma'
-- 4. Выполните миграцию: cd shared && npx prisma migrate dev --name init_supabase
-- ============================================================================
