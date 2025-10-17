/**
 * Supabase Helper Functions
 * Common query patterns for API endpoints
 */

import { getSupabase } from './supabase';

/**
 * Get campaign with full relations
 */
export async function getCampaignWithRelations(campaignId: string) {
  const supabase = getSupabase();

  return await supabase
    .from('campaigns')
    .select(`
      *,
      batch:batches(*),
      template:templates(*),
      created_by:users!campaigns_created_by_id_fkey(id, username, role),
      jobs(*)
    `)
    .eq('id', campaignId)
    .single();
}

/**
 * Get job statistics for campaign
 */
export async function getCampaignStats(campaignId: string) {
  const supabase = getSupabase();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('status')
    .eq('campaign_id', campaignId);

  if (!jobs) {
    return { queued: 0, sending: 0, sent: 0, failed: 0 };
  }

  return {
    queued: jobs.filter(j => j.status === 'QUEUED').length,
    sending: jobs.filter(j => j.status === 'SENDING').length,
    sent: jobs.filter(j => j.status === 'SENT').length,
    failed: jobs.filter(j => j.status === 'FAILED').length
  };
}

/**
 * Create jobs for all active channels in batch
 */
export async function createJobsForCampaign(campaignId: string, batchId: string) {
  const supabase = getSupabase();

  // Get active channels from batch
  const { data: batchChannels } = await supabase
    .from('batch_channels')
    .select(`
      channel:channels(id, is_active)
    `)
    .eq('batch_id', batchId);

  if (!batchChannels) return 0;

  const activeChannels = batchChannels
    .map((bc: any) => bc.channel)
    .filter((ch: any) => ch?.is_active);

  if (activeChannels.length === 0) return 0;

  // Create jobs
  const jobsData = activeChannels.map((channel: any) => ({
    campaign_id: campaignId,
    channel_id: channel.id,
    status: 'QUEUED'
  }));

  const { error } = await supabase
    .from('jobs')
    .insert(jobsData);

  if (error) throw error;

  return activeChannels.length;
}
