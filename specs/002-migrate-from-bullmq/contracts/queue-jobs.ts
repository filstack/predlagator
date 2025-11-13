/**
 * pg-boss Queue Job Contracts
 *
 * Defines TypeScript interfaces for pg-boss queue job payloads.
 * These contracts ensure type safety between job producers (API/workers)
 * and job consumers (workers).
 */

// ============================================================================
// JOB PAYLOAD INTERFACES
// ============================================================================

/**
 * Payload for 'send-message' queue jobs
 *
 * Created by: campaign-worker (when starting campaign)
 * Consumed by: message-worker (processes message delivery)
 *
 * Rate limiting: singletonSeconds=3, singletonKey=campaignId (~20 msg/min per campaign)
 * Retry config: retryLimit=3, retryBackoff=true (5s, 10s, 20s)
 * Expiration: expireInMinutes=15
 */
export interface SendMessageJobData {
  /**
   * Reference to Supabase jobs.id
   * Used to update job status in business database
   */
  jobId: string

  /**
   * Campaign identifier
   * Used for rate limiting (singletonKey) and progress tracking
   */
  campaignId: string

  /**
   * Channel identifier
   * Used for error tracking and deactivation
   */
  channelId: string

  /**
   * Telegram channel username (e.g., '@channel_name')
   * Target for message delivery
   */
  channelUsername: string

  /**
   * Rendered message template content
   * Ready to send (no further processing needed)
   */
  templateContent: string

  /**
   * Media type (if message includes media)
   */
  mediaType?: 'PHOTO' | 'VIDEO' | 'DOCUMENT' | null

  /**
   * Media file URL or path (if mediaType is set)
   */
  mediaUrl?: string | null

  /**
   * Current attempt number (for logging/debugging)
   * Incremented by worker on each retry
   */
  attempt: number
}

/**
 * Payload for 'start-campaign' queue jobs
 *
 * Created by: API (when user starts campaign)
 * Consumed by: campaign-worker (orchestrates campaign execution)
 *
 * Singleton: singletonKey=campaignId (prevents duplicate starts)
 * Retry config: retryLimit=1 (no retries for orchestration)
 */
export interface StartCampaignJobData {
  /**
   * Campaign identifier
   */
  campaignId: string

  /**
   * User who initiated the campaign start (for audit logging)
   */
  userId?: string
}

// ============================================================================
// JOB OPTIONS (for reference, not enforced at type level)
// ============================================================================

/**
 * Standard pg-boss send options for 'send-message' jobs
 *
 * Apply via: boss.send('send-message', data, sendMessageOptions)
 */
export const sendMessageOptions = {
  // Retry configuration
  retryLimit: 3,              // Max 3 retries (total 4 attempts)
  retryDelay: 5,              // Initial delay: 5 seconds
  retryBackoff: true,         // Exponential: 5s → 10s → 20s

  // Expiration (prevent stuck jobs)
  expireInMinutes: 15,        // Job expires after 15min in 'active' state

  // Rate limiting (set per-campaign)
  singletonSeconds: 3,        // ~20 messages per minute
  // singletonKey: campaignId (set dynamically)

  // Job prioritization
  priority: 0,                // Default priority (can be adjusted)

  // Retention
  retentionDays: 7            // Keep completed jobs for 7 days
}

/**
 * Standard pg-boss send options for 'start-campaign' jobs
 *
 * Apply via: boss.send('start-campaign', data, startCampaignOptions)
 */
export const startCampaignOptions = {
  // No retries (orchestration errors require manual intervention)
  retryLimit: 1,

  // Singleton (prevent duplicate campaign starts)
  // singletonKey: campaignId (set dynamically)

  // Retention
  retentionDays: 30           // Keep campaign start history for 30 days
}

// ============================================================================
// WORKER HANDLER SIGNATURES
// ============================================================================

/**
 * Type for message worker handler
 *
 * Usage:
 * ```typescript
 * const messageHandler: MessageWorkerHandler = async ([job]) => {
 *   const { jobId, channelUsername, templateContent } = job.data
 *   // ... send message
 * }
 *
 * await boss.work('send-message', { batchSize: 1 }, messageHandler)
 * ```
 */
export type MessageWorkerHandler = (jobs: Array<{
  id: string
  name: string
  data: SendMessageJobData
}>) => Promise<void>

/**
 * Type for campaign worker handler
 *
 * Usage:
 * ```typescript
 * const campaignHandler: CampaignWorkerHandler = async ([job]) => {
 *   const { campaignId, userId } = job.data
 *   // ... orchestrate campaign
 * }
 *
 * await boss.work('start-campaign', { batchSize: 1 }, campaignHandler)
 * ```
 */
export type CampaignWorkerHandler = (jobs: Array<{
  id: string
  name: string
  data: StartCampaignJobData
}>) => Promise<void>

// ============================================================================
// JOB RESULT INTERFACES (optional, for structured responses)
// ============================================================================

/**
 * Result returned from successful message delivery
 */
export interface SendMessageResult {
  success: true
  channel: string
  messageId?: number | string
  sentAt: Date
}

/**
 * Error result from failed message delivery
 */
export interface SendMessageError {
  success: false
  channel: string
  error: string
  errorCode?: string
  retryable: boolean
  waitTime?: number  // For FLOOD_WAIT errors
}

/**
 * Result from campaign orchestration
 */
export interface StartCampaignResult {
  success: boolean
  jobsCreated: number
  estimatedDurationMinutes: number
}

// ============================================================================
// QUEUE NAMES (constants for type safety)
// ============================================================================

/**
 * Queue name constants
 * Use these instead of hardcoded strings
 */
export const QUEUE_NAMES = {
  SEND_MESSAGE: 'send-message',
  START_CAMPAIGN: 'start-campaign'
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]

// ============================================================================
// VALIDATION HELPERS (runtime checks)
// ============================================================================

/**
 * Validate SendMessageJobData at runtime
 * Throws TypeError if invalid
 */
export function validateSendMessageJobData(data: unknown): asserts data is SendMessageJobData {
  const d = data as any

  if (typeof d !== 'object' || d === null) {
    throw new TypeError('SendMessageJobData must be an object')
  }

  if (typeof d.jobId !== 'string' || !d.jobId) {
    throw new TypeError('SendMessageJobData.jobId must be a non-empty string')
  }

  if (typeof d.campaignId !== 'string' || !d.campaignId) {
    throw new TypeError('SendMessageJobData.campaignId must be a non-empty string')
  }

  if (typeof d.channelId !== 'string' || !d.channelId) {
    throw new TypeError('SendMessageJobData.channelId must be a non-empty string')
  }

  if (typeof d.channelUsername !== 'string' || !d.channelUsername.startsWith('@')) {
    throw new TypeError('SendMessageJobData.channelUsername must start with @')
  }

  if (typeof d.templateContent !== 'string' || !d.templateContent) {
    throw new TypeError('SendMessageJobData.templateContent must be a non-empty string')
  }

  if (d.mediaType && !['PHOTO', 'VIDEO', 'DOCUMENT'].includes(d.mediaType)) {
    throw new TypeError('SendMessageJobData.mediaType must be PHOTO, VIDEO, or DOCUMENT')
  }

  if (typeof d.attempt !== 'number' || d.attempt < 0) {
    throw new TypeError('SendMessageJobData.attempt must be a non-negative number')
  }
}

/**
 * Validate StartCampaignJobData at runtime
 * Throws TypeError if invalid
 */
export function validateStartCampaignJobData(data: unknown): asserts data is StartCampaignJobData {
  const d = data as any

  if (typeof d !== 'object' || d === null) {
    throw new TypeError('StartCampaignJobData must be an object')
  }

  if (typeof d.campaignId !== 'string' || !d.campaignId) {
    throw new TypeError('StartCampaignJobData.campaignId must be a non-empty string')
  }

  if (d.userId !== undefined && typeof d.userId !== 'string') {
    throw new TypeError('StartCampaignJobData.userId must be a string if provided')
  }
}
