import { getSupabase } from '../src/lib/supabase.js';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function addChannel() {
  const supabase = getSupabase();

  console.log('📝 Добавление канала @GA007B...\n');

  // Получим ID первого пользователя (admin)
  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .limit(1);

  if (!users || users.length === 0) {
    console.error('❌ Не найден пользователь в базе');
    process.exit(1);
  }

  const userId = users[0].id;
  console.log(`✅ Используем пользователя: ${users[0].username} (${userId})\n`);

  // Проверим, существует ли уже канал
  const { data: existing } = await supabase
    .from('channels')
    .select('*')
    .eq('username', 'GA007B')
    .single();

  if (existing) {
    console.log('⚠️  Канал @GA007B уже существует:');
    console.log(`   ID: ${existing.id}`);
    console.log(`   Username: @${existing.username}`);
    console.log(`   Is Active: ${existing.is_active}`);
    process.exit(0);
  }

  // Добавляем новый канал
  const { data: channel, error } = await supabase
    .from('channels')
    .insert({
      id: randomUUID(),
      username: 'GA007B',
      title: 'GA007B',
      description: '',
      category: 'Личный канал',
      member_count: 0,
      is_verified: false,
      is_active: true,
      error_count: 0,
      telegram_links: [`https://t.me/GA007B`],
      collected_at: new Date().toISOString(),
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Ошибка при добавлении канала:', error);
    process.exit(1);
  }

  console.log('✅ Канал успешно добавлен:');
  console.log(`   ID: ${channel.id}`);
  console.log(`   Username: @${channel.username}`);
  console.log(`   Title: ${channel.title}`);
  console.log(`   Category: ${channel.category}`);
  console.log(`   Is Active: ${channel.is_active}`);
  console.log(`   User ID: ${userId}`);

  process.exit(0);
}

addChannel();
