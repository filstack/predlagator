/**
 * Campaign Worker
 * Orchestrates campaign execution by creating send-message jobs with rate limiting
 */

import PgBoss from 'pg-boss';
import { getSupabase } from '../lib/supabase';
import { StartCampaignJobData, SendMessageJobData, QUEUE_NAMES } from '../types/queue-jobs';

export async function createCampaignWorker(boss: PgBoss) {
  await boss.work<StartCampaignJobData>(
    QUEUE_NAMES.START_CAMPAIGN,
    {
      batchSize: 1,
      pollingIntervalSeconds: 2
    },
    async ([job]) => {
      const { campaignId } = job.data;

      console.log(`🎬 Starting campaign: ${campaignId}`);

      const supabase = getSupabase();

      // 1. Fetch campaign with relations
      const { data: campaign, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          *,
          template:templates(*),
          batch:batches(
            id,
            name,
            channels:batch_channels(
              channel:channels(*)
            )
          )
        `)
        .eq('id', campaignId)
        .single();

      if (fetchError || !campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      // 2. Get queued jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'QUEUED');

      if (!jobs || jobs.length === 0) {
        throw new Error(`No jobs found for campaign: ${campaignId}`);
      }

      // 3. Extract channels from batch
      const channels = campaign.batch.channels
        ?.map((bc: any) => bc.channel)
        .filter((ch: any) => ch && ch.is_active);

      if (!channels || channels.length === 0) {
        throw new Error(`No active channels found for campaign: ${campaignId}`);
      }

      // 4. Calculate delays for rate limiting
      const baseDelaySeconds = 60 / campaign.delivery_rate; // e.g., 60/20 = 3s

      // 5. Send message jobs with delays
      let jobsSent = 0;

      for (const [index, job] of jobs.entries()) {
        const channel = channels.find((ch: any) => ch.id === job.channel_id);
        if (!channel) continue;

        // Add jitter (±20% random variation)
        const jitter = (Math.random() - 0.5) * 0.4 * baseDelaySeconds;
        const delaySeconds = index * baseDelaySeconds + jitter;

        const messageJobData: SendMessageJobData = {
          jobId: job.id,
          campaignId: campaign.id,
          channelId: channel.id,
          channelUsername: channel.username,
          templateContent: campaign.template.content,
          mediaType: campaign.template.media_type,
          mediaUrl: campaign.template.media_url,
          attempt: 0
        };

        await boss.send(
          QUEUE_NAMES.SEND_MESSAGE,
          messageJobData,
          {
            startAfter: delaySeconds,
            retryLimit: campaign.retry_limit,
            retryDelay: 5,
            retryBackoff: true,
            expireInMinutes: 15,
            singletonSeconds: Math.ceil(baseDelaySeconds),
            singletonKey: campaignId
          }
        );

        jobsSent++;
      }

      // 6. Update campaign started timestamp
      await supabase
        .from('campaigns')
        .update({ started_at: new Date().toISOString() })
        .eq('id', campaignId);

      console.log(`✅ Campaign ${campaignId}: ${jobsSent} jobs queued`);
    }
  );

  console.log('👷 Campaign worker registered');
}
