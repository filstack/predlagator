// backend/scripts/add-channel.ts
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

import { randomUUID } from 'crypto';
import { getSupabase } from '../src/lib/supabase';

async function addChannel() {
  const supabase = getSupabase();
  const channelId = randomUUID();

  const { data, error } = await supabase
    .from('channels')
    .insert({
      id: channelId,
      username: 'fil_mossi',
      category: 'Test',
      tgstat_url: null,
      title: 'fil_mossi',
      description: 'Test channel',
      member_count: 0,
      is_verified: false,
      collected_at: new Date().toISOString(),
      is_active: true,
      error_count: 0,
      telegram_links: ['https://t.me/fil_mossi']
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating channel:', error);
    process.exit(1);
  }

  console.log('✅ Channel created successfully!');
  console.log('Channel ID:', data.id);
  console.log('Username:', data.username);
  console.log('Telegram link: https://t.me/' + data.username);

  process.exit(0);
}

addChannel();
