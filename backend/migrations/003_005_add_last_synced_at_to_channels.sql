-- 003_005_add_last_synced_at_to_channels.sql
ALTER TABLE channels
ADD COLUMN last_synced_at TIMESTAMPTZ;
