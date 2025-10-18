-- Migration: 004_add_channels_table
-- Feature: 004-manual-channel-management
-- Description: Create channels table with RLS policies for multi-tenancy
-- Date: 2025-10-18

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS channels CASCADE;

-- Create channels table
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
  status VARCHAR(50) DEFAULT 'active' NOT NULL,   -- active | inactive

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

-- Row Level Security (RLS)
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

-- Grant permissions (если требуется)
-- GRANT ALL ON channels TO authenticated;
-- GRANT ALL ON channels TO service_role;

-- Comments
COMMENT ON TABLE channels IS 'Telegram channels for broadcast campaigns';
COMMENT ON COLUMN channels.username IS 'Telegram username starting with @';
COMMENT ON COLUMN channels.telegram_links IS 'Array of Telegram URLs (main, invite, web)';
COMMENT ON COLUMN channels.updated_at IS 'Used for optimistic locking check';
