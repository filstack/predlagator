-- Migration: 006_update_channels_for_tgstat
-- Description: Update channels table to support TGStat scraped data structure
-- Date: 2025-11-13

-- Шаг 1: Добавляем новые поля
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subscribers INTEGER,
  ADD COLUMN IF NOT EXISTS rkn_registered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Шаг 2: Делаем поле user_id опциональным (для массовой загрузки без пользователя)
-- Удаляем NOT NULL constraint
ALTER TABLE channels ALTER COLUMN user_id DROP NOT NULL;

-- Шаг 3: Удаляем старый constraint на username (требовал @ в начале)
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_username_format;

-- Шаг 4: Добавляем новый constraint на username (без требования @)
-- Username может быть как с @, так и без
ALTER TABLE channels
  ADD CONSTRAINT channels_username_valid
  CHECK (username ~ '^@?[A-Za-z0-9_]{4,32}$');

-- Шаг 5: Делаем поле name опциональным (будет заполняться из title)
ALTER TABLE channels ALTER COLUMN name DROP NOT NULL;

-- Шаг 6: Добавляем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
CREATE INDEX IF NOT EXISTS idx_channels_subscribers ON channels(subscribers DESC);
CREATE INDEX IF NOT EXISTS idx_channels_rkn_registered ON channels(rkn_registered);
CREATE INDEX IF NOT EXISTS idx_channels_collected_at ON channels(collected_at DESC);

-- Шаг 7: Комментарии к новым полям
COMMENT ON COLUMN channels.category IS 'Channel category from TGStat (e.g., investments, business)';
COMMENT ON COLUMN channels.subscribers IS 'Number of subscribers in the channel';
COMMENT ON COLUMN channels.rkn_registered IS 'Whether channel is registered with RKN';
COMMENT ON COLUMN channels.collected_at IS 'When the channel was collected for scraping';
COMMENT ON COLUMN channels.scraped_at IS 'When the channel data was scraped from TGStat';
COMMENT ON COLUMN channels.description IS 'Channel description from Telegram';

-- Шаг 8: Обновляем существующие записи (если есть)
-- Устанавливаем дефолтные значения для старых записей
UPDATE channels
SET
  category = 'uncategorized',
  subscribers = 0,
  rkn_registered = false
WHERE category IS NULL;
