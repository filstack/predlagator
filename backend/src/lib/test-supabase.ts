/**
 * Тест подключения к Supabase
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Загружаем .env файл
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { getSupabase } from './supabase';

async function testConnection() {
  try {
    console.log('🔍 Проверка подключения к Supabase...');
    console.log('URL:', process.env.SUPABASE_URL);

    const supabase = getSupabase();

    // Простой SELECT запрос
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Ошибка подключения:', error.message);
      process.exit(1);
    }

    console.log('✅ Подключение к Supabase успешно!');
    console.log('Найдено пользователей:', data?.length || 0);
    process.exit(0);
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
    process.exit(1);
  }
}

testConnection();
