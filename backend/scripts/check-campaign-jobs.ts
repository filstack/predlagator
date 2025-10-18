import { getSupabase } from '../src/lib/supabase.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkCampaign() {
  const supabase = getSupabase();
  const campaignId = '7774267f-48c4-48b5-bbc9-96a95e4a0fd2';

  console.log('🔍 Проверяем кампанию и её джобы...\n');

  // Получаем кампанию с батчем
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select(`
      *,
      batch:batches(*)
    `)
    .eq('id', campaignId)
    .single();

  if (campaignError) {
    console.error('❌ Ошибка получения кампании:', campaignError);
    process.exit(1);
  }

  console.log('📊 Кампания:');
  console.log(`   ID: ${campaign.id}`);
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Total Jobs: ${campaign.total_jobs}`);
  console.log(`   Batch ID: ${campaign.batch_id}`);
  console.log(`   Batch Name: ${campaign.batch?.name || 'N/A'}\n`);

  // Получаем каналы в батче
  const { data: batchChannels, error: batchError } = await supabase
    .from('batch_channels')
    .select(`
      batch_id,
      channel_id,
      channel:channels(*)
    `)
    .eq('batch_id', campaign.batch_id);

  if (batchError) {
    console.error('❌ Ошибка получения каналов батча:', batchError);
    process.exit(1);
  }

  console.log(`📋 Каналы в батче: ${batchChannels?.length || 0}`);
  batchChannels?.forEach((bc, index) => {
    console.log(`   ${index + 1}. @${bc.channel.username} (ID: ${bc.channel.id}, Active: ${bc.channel.is_active})`);
  });
  console.log('');

  // Получаем джобы кампании
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(`
      id,
      status,
      channel:channels(username, is_active),
      created_at,
      error_message
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (jobsError) {
    console.error('❌ Ошибка получения джобов:', jobsError);
    process.exit(1);
  }

  console.log(`📨 Джобы кампании: ${jobs?.length || 0}`);
  jobs?.forEach((job, index) => {
    console.log(`   ${index + 1}. @${job.channel.username} - ${job.status}`);
    if (job.error_message) {
      console.log(`      ❌ Error: ${job.error_message}`);
    }
  });

  process.exit(0);
}

checkCampaign();
