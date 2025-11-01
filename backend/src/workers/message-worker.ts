/**
 * Message Worker
 * Processes message delivery jobs to Telegram channels
 */

import PgBoss from 'pg-boss';
import { getSupabase } from '../lib/supabase';
import { telegramService } from '../services/telegram';
import { SendMessageJobData, QUEUE_NAMES } from '../types/queue-jobs';

export async function createMessageWorker(boss: PgBoss) {
  await boss.work<SendMessageJobData>(
    QUEUE_NAMES.SEND_MESSAGE,
    {
      batchSize: 10,
      pollingIntervalSeconds: 2
    },
    async (jobs) => {
      // Process jobs in parallel
      await Promise.allSettled(jobs.map(job => processMessageJob(job, boss)));
    }
  );

  console.log('📨 Message worker registered');
}

async function processMessageJob(job: PgBoss.Job<SendMessageJobData>, boss: PgBoss) {
  const { jobId, campaignId, channelId, channelUsername, templateContent, mediaType, mediaUrl } = job.data;
  const supabase = getSupabase();

  try {
    // 1. Update job status: SENDING
    await supabase
      .from('jobs')
      .update({
        status: 'SENDING',
        started_at: new Date().toISOString(),
        attempts: job.data.attempt + 1
      })
      .eq('id', jobId);

    // 2. Send message via Telegram
    const result = await telegramService.sendMessage(channelUsername, templateContent, {
      mediaType,
      mediaUrl
    });

    if (result.success) {
      // 3a. Success: Update job status
      await supabase
        .from('jobs')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString()
        })
        .eq('id', jobId);

      await updateCampaignProgress(campaignId);

      console.log(`✅ Sent message to ${channelUsername}`);

    } else {
      // 3b. Handle errors
      if (result.errorCode === 'FLOOD_WAIT' && result.waitTime) {
        // FLOOD_WAIT: Retry after delay
        console.log(`⏳ FLOOD_WAIT for ${channelUsername}: retry in ${result.waitTime}s`);

        await boss.fail(job.id, { retryDelay: result.waitTime });

        await supabase
          .from('jobs')
          .update({
            status: 'QUEUED',
            error_message: result.error
          })
          .eq('id', jobId);

      } else {
        // Other errors: Mark as failed
        throw new Error(result.error || 'Unknown error');
      }
    }

  } catch (error: any) {
    // 4. Handle failures
    const { data: currentJob } = await supabase
      .from('jobs')
      .select('attempts')
      .eq('id', jobId)
      .single();

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('retry_limit')
      .eq('id', campaignId)
      .single();

    const shouldRetry = currentJob && campaign && currentJob.attempts < campaign.retry_limit;

    if (!shouldRetry) {
      // Final failure
      await supabase
        .from('jobs')
        .update({
          status: 'FAILED',
          failed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', jobId);

      // Note: Channel error tracking removed in Feature 004
      // Channels no longer have error_count or last_error fields

      await updateCampaignProgress(campaignId);
    }

    throw error; // Let pg-boss handle retry
  }
}

async function updateCampaignProgress(campaignId: string) {
  const supabase = getSupabase();

  // Get job counts by status
  const { data: jobs } = await supabase
    .from('jobs')
    .select('status')
    .eq('campaign_id', campaignId);

  if (!jobs) return;

  const total = jobs.length;
  const sent = jobs.filter(j => j.status === 'SENT').length;
  const failed = jobs.filter(j => j.status === 'FAILED').length;
  const progress = Math.floor(((sent + failed) / total) * 100);

  await supabase
    .from('campaigns')
    .update({
      progress,
      ...(progress === 100 && {
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      })
    })
    .eq('id', campaignId);
}
