// Скрипт для выполнения SQL миграции в Supabase
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Client } = pg;

async function runMigration() {
  const connectionString = process.env.SUPABASE_DIRECT_URL;

  if (!connectionString) {
    console.error('❌ SUPABASE_DIRECT_URL не установлен в .env');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log('🔌 Подключение к Supabase...');
    await client.connect();
    console.log('✅ Подключено');

    // Читаем SQL файл
    const migrationPath = join(__dirname, '../../../shared/migrations/002_add_telegram_links.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Выполнение миграции 002_add_telegram_links.sql...');
    await client.query(sql);
    console.log('✅ Миграция выполнена успешно!');

  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Соединение закрыто');
  }
}

runMigration();
