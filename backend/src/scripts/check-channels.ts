// Скрипт для проверки импортированных каналов
import dotenv from 'dotenv';
import { getSupabase } from '../lib/supabase';

dotenv.config();

async function checkChannels() {
  try {
    const supabase = getSupabase();

    // Получаем общее количество каналов
    const { count: totalCount, error: countError } = await supabase
      .from('channels')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    console.log(`📊 Всего каналов в базе: ${totalCount}`);

    // Получаем последние 5 добавленных каналов
    const { data: channels, error } = await supabase
      .from('channels')
      .select('id, username, category, telegram_links, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    console.log('\n📋 Последние 5 добавленных каналов:');
    channels?.forEach((channel, index) => {
      console.log(`\n${index + 1}. @${channel.username}`);
      console.log(`   Категория: ${channel.category}`);
      console.log(`   Telegram ссылки: ${channel.telegram_links?.length || 0}`);
      if (channel.telegram_links && channel.telegram_links.length > 0) {
        console.log(`   Первая ссылка: ${channel.telegram_links[0]}`);
      }
      console.log(`   Создан: ${new Date(channel.created_at).toLocaleString('ru-RU')}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkChannels();
