-- ============================================================================
-- Add telegram_links column to channels table
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- Добавляем поле для хранения массива Telegram ссылок
ALTER TABLE channels
ADD COLUMN IF NOT EXISTS telegram_links TEXT[];

-- Создаем индекс для поиска по ссылкам (используем GIN индекс для массивов)
CREATE INDEX IF NOT EXISTS idx_channels_telegram_links ON channels USING GIN (telegram_links);

-- Комментарий для документации
COMMENT ON COLUMN channels.telegram_links IS 'Массив всех Telegram ссылок из scraped_content.links[]';
