-- ============================================================================
-- Initial Schema Migration for Supabase
-- Execute this in Supabase SQL Editor: https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk/sql/new
-- ============================================================================

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'OPERATOR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,

  CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'OPERATOR', 'AUDITOR'))
);

CREATE INDEX idx_users_username ON users(username);

-- ============================================================================
-- CHANNEL CATALOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  tgstat_url TEXT,
  collected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  title TEXT,
  description TEXT,
  member_count INTEGER,
  is_verified BOOLEAN DEFAULT FALSE,
  last_checked TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT TRUE,
  error_count INTEGER DEFAULT 0,
  last_error TEXT
);

CREATE INDEX idx_channels_category ON channels(category);
CREATE INDEX idx_channels_username ON channels(username);
CREATE INDEX idx_channels_is_active ON channels(is_active);

-- ============================================================================
-- BATCH MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id TEXT NOT NULL REFERENCES users(id),
  channel_count INTEGER DEFAULT 0
);

CREATE INDEX idx_batches_created_by_id ON batches(created_by_id);
CREATE INDEX idx_batches_created_at ON batches(created_at);

-- ============================================================================
-- BATCH-CHANNEL RELATIONSHIP (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS batch_channels (
  batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (batch_id, channel_id)
);

CREATE INDEX idx_batch_channels_batch_id ON batch_channels(batch_id);
CREATE INDEX idx_batch_channels_channel_id ON batch_channels(channel_id);

-- ============================================================================
-- MESSAGE TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  media_type TEXT,
  media_url TEXT,
  usage_count INTEGER DEFAULT 0,

  CONSTRAINT templates_media_type_check CHECK (media_type IN ('PHOTO', 'VIDEO', 'DOCUMENT'))
);

CREATE INDEX idx_templates_name ON templates(name);

-- ============================================================================
-- CAMPAIGNS & JOBS
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  batch_id TEXT NOT NULL REFERENCES batches(id),
  template_id TEXT NOT NULL REFERENCES templates(id),
  params JSONB NOT NULL,

  mode TEXT NOT NULL DEFAULT 'TEST',
  delivery_rate INTEGER DEFAULT 20,
  retry_limit INTEGER DEFAULT 3,

  status TEXT NOT NULL DEFAULT 'QUEUED',
  progress INTEGER DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by_id TEXT NOT NULL REFERENCES users(id),

  CONSTRAINT campaigns_mode_check CHECK (mode IN ('TEST', 'LIVE')),
  CONSTRAINT campaigns_status_check CHECK (status IN ('QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_batch_id ON campaigns(batch_id);
CREATE INDEX idx_campaigns_created_by_id ON campaigns(created_by_id);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES channels(id),

  bull_job_id TEXT UNIQUE,

  status TEXT NOT NULL DEFAULT 'QUEUED',
  attempts INTEGER DEFAULT 0,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  CONSTRAINT jobs_status_check CHECK (status IN ('QUEUED', 'SENDING', 'SENT', 'FAILED'))
);

CREATE INDEX idx_jobs_campaign_id_status ON jobs(campaign_id, status);
CREATE INDEX idx_jobs_channel_id ON jobs(channel_id);
CREATE INDEX idx_jobs_status ON jobs(status);

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  severity TEXT NOT NULL DEFAULT 'INFO',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,

  CONSTRAINT audit_logs_action_check CHECK (action IN (
    'USER_LOGIN', 'USER_LOGOUT', 'USER_LOGIN_FAILED', 'PERMISSION_DENIED',
    'CAMPAIGN_CREATED', 'CAMPAIGN_STARTED', 'CAMPAIGN_PAUSED', 'CAMPAIGN_RESUMED', 'CAMPAIGN_CANCELLED',
    'BATCH_CREATED', 'BATCH_UPDATED', 'BATCH_DELETED',
    'CHANNEL_IMPORTED', 'CHANNEL_DEACTIVATED',
    'SESSION_STRING_ADDED', 'SESSION_STRING_ROTATED',
    'FLOOD_WAIT_TRIGGERED', 'ACCOUNT_BANNED',
    'WORKER_STARTED', 'WORKER_STOPPED',
    'DATABASE_MIGRATION'
  )),
  CONSTRAINT audit_logs_severity_check CHECK (severity IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

-- ============================================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
