import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Check ALL channels without RLS
const { data: channels, error } = await supabase
  .from('channels')
  .select('id, name, username, user_id, created_at')
  .order('created_at', { ascending: false })
  .limit(50);

console.log('\n=== Channels in DB ===');
console.log('Total found:', channels?.length || 0);

if (error) {
  console.error('Error:', error);
} else if (channels && channels.length > 0) {
  console.log('\nChannels:');
  channels.forEach((ch, i) => {
    console.log(`${i + 1}. ${ch.name} (${ch.username})`);
    console.log(`   user_id: ${ch.user_id}`);
    console.log(`   created_at: ${ch.created_at}`);
  });
} else {
  console.log('No channels found');
}

// Check current user
const userId = '9611c386-8443-40f5-b7e9-3431e3ea4a40';
const { data: userChannels, error: userError } = await supabase
  .from('channels')
  .select('id, name, username')
  .eq('user_id', userId);

console.log(`\n=== Channels for user ${userId} ===`);
console.log('Count:', userChannels?.length || 0);

if (userError) {
  console.error('Error:', userError);
} else if (userChannels && userChannels.length > 0) {
  userChannels.forEach((ch, i) => {
    console.log(`${i + 1}. ${ch.name} (${ch.username})`);
  });
}

process.exit(0);
