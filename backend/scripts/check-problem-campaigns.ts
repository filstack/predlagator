import { getSupabase } from '../src/lib/supabase.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkCampaigns() {
  const supabase = getSupabase();

  const campaignIds = [
    'b6e2bdad-6f4e-4f4d-b9b3-5e00092c264b',
    '5ff13116-b559-45d3-a2d1-2d54671c250b'
  ];

  for (const campaignId of campaignIds) {
    console.log(`\n🔍 Кампания ${campaignId}:\n`);

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, status, channel:channels(username)')
      .eq('campaign_id', campaignId)
      .order('created_at');

    if (error) {
      console.error('❌ Ошибка:', error);
      continue;
    }

    console.log(`   Всего джобов: ${jobs?.length || 0}`);
    jobs?.forEach(j => {
      console.log(`   @${j.channel.username} - ${j.status}`);
    });
  }

  process.exit(0);
}

checkCampaigns();
