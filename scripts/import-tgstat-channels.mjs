import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Отсутствуют переменные SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Путь к NDJSON файлу
const NDJSON_FILE = process.argv[2];

if (!NDJSON_FILE) {
  console.error('❌ Укажите путь к NDJSON файлу:');
  console.error('   node scripts/import-tgstat-channels.mjs "C:\\Users\\flowz\\Downloads\\results-xxx.ndjson"');
  process.exit(1);
}

console.log('📂 Файл:', NDJSON_FILE);
console.log('🔄 Загрузка данных...\n');

try {
  // Читаем NDJSON файл
  const fileContent = readFileSync(NDJSON_FILE, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());

  console.log(`📊 Найдено записей: ${lines.length}\n`);

  // Парсим каждую строку
  const channels = [];
  let skipped = 0;

  for (const line of lines) {
    try {
      const record = JSON.parse(line);

      // Проверяем что скрейпинг был успешным
      if (record.status !== 'success' || !record.scraped_content) {
        skipped++;
        continue;
      }

      // Парсим scraped_content
      const scraped = JSON.parse(record.scraped_content);

      // Парсим количество подписчиков (убираем пробелы)
      const subscribersStr = scraped.subscribers?.replace(/\s/g, '') || '0';
      const subscribers = parseInt(subscribersStr, 10) || 0;

      // Формируем username с @ если его нет
      let username = record.username || scraped.username;
      if (username && !username.startsWith('@')) {
        username = `@${username}`;
      }

      // Создаем запись для БД
      const channel = {
        // Основные поля из NDJSON
        category: record.category || 'uncategorized',
        username: username,
        tgstat_url: record.tgstat_url,
        collected_at: record.collected_at,
        scraped_at: record.scraped_at,

        // Поля из scraped_content
        title: scraped.title || null,
        description: scraped.description || null,
        subscribers: subscribers,
        telegram_links: scraped.telegram_links || [],
        rkn_registered: scraped.rkn_registered || false,

        // Дополнительные поля
        name: scraped.title || username, // name = title или username
        status: 'active',
        user_id: null, // Без привязки к пользователю при массовой загрузке
      };

      channels.push(channel);
    } catch (err) {
      console.error(`⚠️  Ошибка парсинга строки: ${err.message}`);
      skipped++;
    }
  }

  console.log(`✅ Подготовлено записей: ${channels.length}`);
  console.log(`⚠️  Пропущено записей: ${skipped}\n`);

  if (channels.length === 0) {
    console.error('❌ Нет данных для импорта');
    process.exit(1);
  }

  // Опционально: очистить таблицу перед импортом
  const shouldClear = process.argv.includes('--clear');
  if (shouldClear) {
    console.log('🗑️  Очистка таблицы channels...');
    const { error: deleteError } = await supabase
      .from('channels')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все

    if (deleteError) {
      console.error('❌ Ошибка при очистке таблицы:', deleteError);
      process.exit(1);
    }
    console.log('✅ Таблица очищена\n');
  }

  // Вставляем данные пачками по 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < channels.length; i += BATCH_SIZE) {
    const batch = channels.slice(i, i + BATCH_SIZE);
    console.log(`📤 Загрузка пачки ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(channels.length / BATCH_SIZE)} (${batch.length} записей)...`);

    const { data, error } = await supabase
      .from('channels')
      .insert(batch)
      .select();

    if (error) {
      console.error(`   ❌ Ошибка: ${error.message}`);
      errors += batch.length;
    } else {
      console.log(`   ✅ Загружено: ${data.length} записей`);
      inserted += data.length;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Импорт завершен!`);
  console.log(`   Загружено: ${inserted}`);
  console.log(`   Ошибок: ${errors}`);
  console.log(`   Всего в файле: ${lines.length}`);
  console.log('='.repeat(50));

  // Проверяем результат
  const { count } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Всего записей в таблице channels: ${count}`);

} catch (error) {
  console.error('❌ Ошибка при импорте:', error);
  process.exit(1);
}
