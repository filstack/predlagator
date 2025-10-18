import { getSupabase } from '../src/lib/supabase.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkLatestCampaign() {
  const supabase = getSupabase();

  // Получаем последнюю кампанию
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, status, created_at, total_jobs')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('📋 Последняя кампания:');
  console.log('  ID:', campaign.id);
  console.log('  Name:', campaign.name);
  console.log('  Status:', campaign.status);
  console.log('  Total Jobs:', campaign.total_jobs);
  console.log('  Created:', campaign.created_at);
  console.log('');

  // Получаем джобы этой кампании
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, status, channel:channels(username)')
    .eq('campaign_id', campaign.id)
    .order('created_at');

  console.log(`📨 Джобы кампании (${jobs?.length || 0}):`);
  jobs?.forEach((j, i) => {
    console.log(`  ${i + 1}. @${j.channel.username} - ${j.status}`);
  });

  process.exit(0);
}

checkLatestCampaign();
