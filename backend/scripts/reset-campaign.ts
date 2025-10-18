/**
 * Сброс статуса кампании для повторного запуска
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const campaignId = process.argv[2];

if (!campaignId) {
  console.error('❌ Usage: npm run reset-campaign <campaign-id>');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetCampaign() {
  console.log(`🔄 Resetting campaign ${campaignId}...`);

  // Проверим текущий статус
  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('id, name, status, started_at')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) {
    console.error('❌ Campaign not found:', fetchError);
    process.exit(1);
  }

  console.log(`📊 Current status: ${campaign.status}`);
  console.log(`📊 Started at: ${campaign.started_at}`);

  // Сбросим статус на QUEUED
  const { data: updated, error: updateError } = await supabase
    .from('campaigns')
    .update({
      status: 'QUEUED',
      started_at: null,
      completed_at: null
    })
    .eq('id', campaignId)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Failed to update campaign:', updateError);
    process.exit(1);
  }

  console.log(`✅ Campaign reset to QUEUED`);
  console.log(`✅ Теперь можно нажать кнопку "Start" в интерфейсе`);
}

resetCampaign().catch(console.error);
