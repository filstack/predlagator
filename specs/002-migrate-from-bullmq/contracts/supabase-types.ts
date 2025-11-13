/**
 * Supabase Database Types
 *
 * TypeScript interfaces for Supabase SDK operations.
 * Maps to PostgreSQL schema after BullMQ migration.
 *
 * Note: In production, use Supabase CLI to auto-generate these types:
 *   npx supabase gen types typescript --project-id qjnxcjbzwelokluaiqmk
 */

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'ADMIN' | 'OPERATOR' | 'AUDITOR'

export type MediaType = 'PHOTO' | 'VIDEO' | 'DOCUMENT'

export type CampaignMode = 'TEST' | 'LIVE'

export type CampaignStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export type JobStatus =
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'FAILED'

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_LOGIN_FAILED'
  | 'PERMISSION_DENIED'
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_STARTED'
  | 'CAMPAIGN_PAUSED'
  | 'CAMPAIGN_RESUMED'
  | 'CAMPAIGN_CANCELLED'
  | 'BATCH_CREATED'
  | 'BATCH_UPDATED'
  | 'BATCH_DELETED'
  | 'CHANNEL_IMPORTED'
  | 'CHANNEL_DEACTIVATED'
  | 'SESSION_STRING_ADDED'
  | 'SESSION_STRING_ROTATED'
  | 'FLOOD_WAIT_TRIGGERED'
  | 'ACCOUNT_BANNED'
  | 'WORKER_STARTED'
  | 'WORKER_STOPPED'
  | 'DATABASE_MIGRATION'

export type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

// ============================================================================
// TABLE TYPES (database representation)
// ============================================================================

/**
 * User table (users)
 */
export interface User {
  id: string
  username: string
  password_hash: string
  role: UserRole
  created_at: string  // ISO 8601 timestamp
  updated_at: string
  last_login_at: string | null
}

/**
 * Channel table (channels)
 */
export interface Channel {
  id: string
  username: string         // Telegram username with @ prefix
  category: string
  tgstat_url: string | null
  collected_at: string
  created_at: string
  updated_at: string
  title: string | null
  description: string | null
  member_count: number | null
  is_verified: boolean
  last_checked: string | null
  is_active: boolean       // Deactivated after errors
  error_count: number      // Consecutive error counter
  last_error: string | null
}

/**
 * Batch table (batches)
 */
export interface Batch {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  created_by_id: string
  channel_count: number    // Cached count
}

/**
 * Template table (templates)
 */
export interface Template {
  id: string
  name: string
  content: string
  description: string | null
  created_at: string
  updated_at: string
  media_type: MediaType | null
  media_url: string | null
  usage_count: number
}

/**
 * Campaign table (campaigns)
 */
export interface Campaign {
  id: string
  name: string
  description: string | null
  batch_id: string
  template_id: string
  params: Record<string, any>  // JSONB template parameters
  mode: CampaignMode
  delivery_rate: number        // Messages per minute
  retry_limit: number
  status: CampaignStatus
  progress: number             // 0-100
  total_jobs: number
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  created_by_id: string
}

/**
 * Job table (jobs)
 *
 * Note: bullJobId field removed in migration
 */
export interface Job {
  id: string
  campaign_id: string
  channel_id: string
  status: JobStatus
  attempts: number
  error_message: string | null
  created_at: string
  started_at: string | null
  sent_at: string | null
  failed_at: string | null
}

/**
 * Audit log table (audit_logs)
 */
export interface AuditLog {
  id: string
  user_id: string | null
  action: AuditAction
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, any> | null
  severity: LogSeverity
  timestamp: string
  ip_address: string | null
}

// ============================================================================
// INSERT TYPES (for .insert() operations)
// ============================================================================

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
  last_login_at?: string | null
}

export type ChannelInsert = Omit<Channel, 'id' | 'created_at' | 'updated_at' | 'is_verified' | 'is_active' | 'error_count'> & {
  id?: string
  created_at?: string
  updated_at?: string
  is_verified?: boolean
  is_active?: boolean
  error_count?: number
}

export type BatchInsert = Omit<Batch, 'id' | 'created_at' | 'updated_at' | 'channel_count'> & {
  id?: string
  created_at?: string
  updated_at?: string
  channel_count?: number
}

export type TemplateInsert = Omit<Template, 'id' | 'created_at' | 'updated_at' | 'usage_count'> & {
  id?: string
  created_at?: string
  updated_at?: string
  usage_count?: number
}

export type CampaignInsert = Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'started_at' | 'completed_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
  started_at?: string | null
  completed_at?: string | null
}

export type JobInsert = Omit<Job, 'id' | 'created_at' | 'started_at' | 'sent_at' | 'failed_at' | 'attempts'> & {
  id?: string
  created_at?: string
  started_at?: string | null
  sent_at?: string | null
  failed_at?: string | null
  attempts?: number
}

export type AuditLogInsert = Omit<AuditLog, 'id' | 'timestamp'> & {
  id?: string
  timestamp?: string
}

// ============================================================================
// UPDATE TYPES (for .update() operations)
// ============================================================================

export type UserUpdate = Partial<Omit<User, 'id' | 'created_at'>>

export type ChannelUpdate = Partial<Omit<Channel, 'id' | 'created_at'>>

export type BatchUpdate = Partial<Omit<Batch, 'id' | 'created_at'>>

export type TemplateUpdate = Partial<Omit<Template, 'id' | 'created_at'>>

export type CampaignUpdate = Partial<Omit<Campaign, 'id' | 'created_at'>>

export type JobUpdate = Partial<Omit<Job, 'id' | 'created_at'>>

// ============================================================================
// RELATION TYPES (for .select() with joins)
// ============================================================================

/**
 * Campaign with related data
 */
export interface CampaignWithRelations extends Campaign {
  batch?: Batch
  template?: Template
  created_by?: Pick<User, 'id' | 'username' | 'role'>
  jobs?: Job[]
}

/**
 * Job with related data
 */
export interface JobWithRelations extends Job {
  campaign?: Campaign
  channel?: Channel
}

/**
 * Batch with channels
 */
export interface BatchWithChannels extends Batch {
  channels?: Channel[]
  created_by?: Pick<User, 'id' | 'username'>
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Database table names (for type-safe table references)
 */
export const TABLE_NAMES = {
  USERS: 'users',
  CHANNELS: 'channels',
  BATCHES: 'batches',
  TEMPLATES: 'templates',
  CAMPAIGNS: 'campaigns',
  JOBS: 'jobs',
  AUDIT_LOGS: 'audit_logs'
} as const

export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES]

/**
 * Type mapping: table name → table type
 */
export type TableTypeMap = {
  users: User
  channels: Channel
  batches: Batch
  templates: Template
  campaigns: Campaign
  jobs: Job
  audit_logs: AuditLog
}

/**
 * Supabase query result wrapper
 */
export interface SupabaseResult<T> {
  data: T | null
  error: Error | null
}

/**
 * Supabase query result for arrays
 */
export interface SupabaseArrayResult<T> {
  data: T[] | null
  error: Error | null
}

// ============================================================================
// USAGE EXAMPLES (for documentation)
// ============================================================================

/**
 * Example: Query campaign with relations
 *
 * ```typescript
 * const { data, error } = await supabase
 *   .from(TABLE_NAMES.CAMPAIGNS)
 *   .select(`
 *     *,
 *     batch:batches(*),
 *     template:templates(*),
 *     created_by:users!campaigns_created_by_id_fkey(id, username)
 *   `)
 *   .eq('id', campaignId)
 *   .single()
 *
 * const campaign: CampaignWithRelations | null = data
 * ```
 */

/**
 * Example: Insert new job
 *
 * ```typescript
 * const newJob: JobInsert = {
 *   id: generateCuid(),
 *   campaign_id: campaignId,
 *   channel_id: channelId,
 *   status: 'QUEUED'
 * }
 *
 * const { data, error } = await supabase
 *   .from(TABLE_NAMES.JOBS)
 *   .insert(newJob)
 *   .select()
 *   .single()
 * ```
 */

/**
 * Example: Update job status
 *
 * ```typescript
 * const update: JobUpdate = {
 *   status: 'SENDING',
 *   started_at: new Date().toISOString(),
 *   attempts: currentAttempts + 1
 * }
 *
 * const { data, error } = await supabase
 *   .from(TABLE_NAMES.JOBS)
 *   .update(update)
 *   .eq('id', jobId)
 * ```
 */
