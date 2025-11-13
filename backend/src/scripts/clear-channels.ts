// Скрипт для удаления всех каналов
import dotenv from 'dotenv';
import { getSupabase } from '../lib/supabase';

dotenv.config();

async function clearChannels() {
  try {
    const supabase = getSupabase();

    console.log('🗑️  Удаление всех каналов...');

    const { error } = await supabase
      .from('channels')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все записи

    if (error) throw error;

    console.log('✅ Все каналы удалены');

    // Проверяем
    const { count } = await supabase
      .from('channels')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Осталось каналов: ${count}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

clearChannels();
