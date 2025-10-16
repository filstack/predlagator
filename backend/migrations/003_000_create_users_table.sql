-- Migration 003_000: Create users table
-- Feature: 003-multitenancy-supabase-auth
-- Date: 2025-10-16
-- Priority: Must run FIRST

BEGIN;

-- Drop old users table if it exists with wrong schema
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (references auth.users from Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Trigger для updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

COMMIT;
