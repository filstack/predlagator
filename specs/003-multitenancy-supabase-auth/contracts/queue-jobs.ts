/**
 * Queue Job Contracts for Feature 003: Multitenancy
 *
 * These types define the payload structure for pg-boss jobs.
 * UPDATED: Added telegramAccountId to support per-user Telegram clients.
 */

// ============================================================================
// Queue Names
// ============================================================================

export const QUEUE_NAMES = {
  START_CAMPAIGN: 'start-campaign',
  SEND_MESSAGE: 'send-message',
} as const;

// ============================================================================
// StartCampaign Job
// ============================================================================

/**
 * Job to orchestrate a campaign by creating individual send-message jobs.
 * Created when user clicks "Start Campaign" in UI.
 */
export interface StartCampaignJobData {
  campaignId: string;
  userId: string; // NEW: For audit logs and RLS
  telegramAccountId: string; // NEW: Which Telegram account to use
}

// ============================================================================
// SendMessage Job
// ============================================================================

/**
 * Job to send a single message to a channel.
 * Created by campaign-worker for each channel in campaign batches.
 */
export interface SendMessageJobData {
  jobId: string; // Reference to jobs table
  campaignId: string;
  userId: string; // NEW: For audit logs
  telegramAccountId: string; // NEW: Which Telegram account to use

  channelId: string;
  channelUsername: string;

  templateContent: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  mediaUrl?: string;

  attempt: number; // Current attempt number (for retry logic)
}

// ============================================================================
// Job Options
// ============================================================================

/**
 * Standard pg-boss options for jobs.
 */
export interface JobOptions {
  /**
   * Delay before job starts (in seconds).
   */
  startAfter?: number;

  /**
   * Maximum number of retry attempts.
   */
  retryLimit?: number;

  /**
   * Exponential backoff multiplier for retries.
   */
  retryBackoff?: boolean;

  /**
   * Retry delay in seconds.
   */
  retryDelay?: number;

  /**
   * Singleton key to prevent duplicate jobs.
   */
  singletonKey?: string;

  /**
   * Singleton duration in seconds.
   */
  singletonSeconds?: number;
}

// ============================================================================
// Job Results
// ============================================================================

/**
 * Result returned by send-message worker.
 */
export interface SendMessageJobResult {
  success: boolean;
  messageId?: number; // Telegram message ID
  error?: string;
  errorCode?: 'FLOOD_WAIT' | 'AUTH_FAILED' | 'CHANNEL_NOT_FOUND' | 'UNKNOWN';
  retryAfterSeconds?: number; // For FLOOD_WAIT errors
}

/**
 * Result returned by start-campaign worker.
 */
export interface StartCampaignJobResult {
  success: boolean;
  totalJobsCreated: number;
  error?: string;
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Creating a start-campaign job:
 *
 * const boss = await getPgBoss();
 * const jobData: StartCampaignJobData = {
 *   campaignId: campaign.id,
 *   userId: req.user.id,
 *   telegramAccountId: campaign.telegram_account_id
 * };
 *
 * await boss.send(
 *   QUEUE_NAMES.START_CAMPAIGN,
 *   jobData,
 *   {
 *     singletonKey: campaign.id,
 *     singletonSeconds: 60
 *   }
 * );
 */

/**
 * Creating a send-message job (in campaign-worker):
 *
 * const jobData: SendMessageJobData = {
 *   jobId: job.id,
 *   campaignId: campaign.id,
 *   userId: campaign.user_id,
 *   telegramAccountId: campaign.telegram_account_id,
 *   channelId: channel.id,
 *   channelUsername: channel.username,
 *   templateContent: renderedTemplate,
 *   attempt: 1
 * };
 *
 * await boss.send(
 *   QUEUE_NAMES.SEND_MESSAGE,
 *   jobData,
 *   {
 *     startAfter: delaySeconds,
 *     retryLimit: campaign.retry_limit,
 *     singletonKey: `${campaign.id}-${channel.id}`
 *   }
 * );
 */
