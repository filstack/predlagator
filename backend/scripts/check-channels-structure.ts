import { getSupabase } from '../src/lib/supabase.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkChannels() {
  const supabase = getSupabase();

  console.log('📊 Проверяем структуру таблицы channels...\n');

  // Получим один канал
  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }

  if (!channels || channels.length === 0) {
    console.log('⚠️  Нет каналов в базе');
    process.exit(0);
  }

  console.log('✅ Пример канала:');
  console.log(JSON.stringify(channels[0], null, 2));

  console.log('\n📋 Поля:');
  Object.keys(channels[0]).forEach(key => {
    console.log(`   - ${key}: ${typeof channels[0][key]}`);
  });

  process.exit(0);
}

checkChannels();
