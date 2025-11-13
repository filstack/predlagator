/**
 * Проверка состояния схемы базы данных для Feature 003
 * Usage: npx tsx backend/scripts/check-db-schema.ts
 */

import 'dotenv/config';
import { getSupabase } from '../src/lib/supabase';

async function checkSchema() {
  const supabase = getSupabase();

  console.log('\n🔍 Проверка состояния базы данных для Feature 003\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  let allGood = true;

  // 1. Проверка таблицы telegram_accounts
  console.log('1️⃣ Проверка таблицы telegram_accounts...');
  try {
    const { data, error } = await supabase
      .from('telegram_accounts')
      .select('id, user_id, telegram_phone, telegram_connected')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Таблица telegram_accounts НЕ существует');
        console.log('   → Нужно выполнить миграцию: 003_001_create_telegram_accounts.sql\n');
        allGood = false;
      } else {
        console.log(`⚠️  Ошибка: ${error.message}\n`);
        allGood = false;
      }
    } else {
      console.log('✅ Таблица telegram_accounts существует');
      console.log(`   Записей: ${data?.length || 0}\n`);
    }
  } catch (err: any) {
    console.log(`❌ Ошибка проверки: ${err.message}\n`);
    allGood = false;
  }

  // 2. Проверка колонки user_id в таблицах
  console.log('2️⃣ Проверка колонки user_id...');

  const tables = ['users', 'channels', 'batches', 'templates', 'campaigns', 'jobs'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id, user_id')
        .limit(1);

      if (error) {
        if (error.message.includes('user_id')) {
          console.log(`❌ ${table}: колонка user_id ОТСУТСТВУЕТ`);
          allGood = false;
        } else {
          console.log(`⚠️  ${table}: ${error.message}`);
        }
      } else {
        console.log(`✅ ${table}: user_id существует`);
      }
    } catch (err: any) {
      console.log(`❌ ${table}: ${err.message}`);
      allGood = false;
    }
  }
  console.log('');

  // 3. Проверка колонки telegram_account_id в campaigns
  console.log('3️⃣ Проверка связи campaigns → telegram_accounts...');
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, telegram_account_id')
      .limit(1);

    if (error) {
      if (error.message.includes('telegram_account_id')) {
        console.log('❌ campaigns: колонка telegram_account_id ОТСУТСТВУЕТ');
        console.log('   → Нужно выполнить миграцию: 003_002_add_user_id_columns.sql\n');
        allGood = false;
      } else {
        console.log(`⚠️  Ошибка: ${error.message}\n`);
      }
    } else {
      console.log('✅ campaigns.telegram_account_id существует\n');
    }
  } catch (err: any) {
    console.log(`❌ Ошибка: ${err.message}\n`);
    allGood = false;
  }

  // 4. Проверка RLS на users
  console.log('4️⃣ Проверка Row Level Security (RLS)...');
  try {
    // Пытаемся прочитать users без авторизации (должно вернуть пустой массив, если RLS включен)
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(10);

    if (error) {
      console.log(`⚠️  users: ${error.message}`);
    } else {
      if (data && data.length === 0) {
        console.log('✅ users: RLS включен (без auth контекста данные скрыты)');
      } else {
        console.log('⚠️  users: RLS возможно НЕ включен (получены данные без auth)');
        console.log(`   Записей доступно: ${data?.length || 0}`);
      }
    }
  } catch (err: any) {
    console.log(`❌ Ошибка проверки RLS: ${err.message}`);
  }
  console.log('');

  // 5. Проверка существования admin пользователя
  console.log('5️⃣ Проверка admin пользователя...');
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.log(`❌ Ошибка получения пользователей: ${error.message}\n`);
    } else {
      const adminUser = users.users.find(u => u.email === 'admin@predlagator.com');

      if (adminUser) {
        console.log('✅ Admin пользователь существует');
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   ID: ${adminUser.id}`);

        // Проверка telegram account для admin
        const { data: telegramAccounts } = await supabase
          .from('telegram_accounts')
          .select('*')
          .eq('user_id', adminUser.id);

        if (telegramAccounts && telegramAccounts.length > 0) {
          console.log(`   Telegram accounts: ${telegramAccounts.length}`);
          telegramAccounts.forEach(acc => {
            console.log(`     - ${acc.telegram_phone} (${acc.telegram_connected ? 'connected' : 'not connected'})`);
          });
        } else {
          console.log('   ⚠️  Telegram account НЕ настроен');
        }
      } else {
        console.log('❌ Admin пользователь НЕ найден');
        console.log('   → Выполните: npx tsx backend/scripts/setup-admin.ts');
      }
    }
  } catch (err: any) {
    console.log(`❌ Ошибка: ${err.message}`);
  }
  console.log('');

  // 6. Статистика данных
  console.log('6️⃣ Статистика данных...');
  const stats = [
    { table: 'users', name: 'Пользователи' },
    { table: 'telegram_accounts', name: 'Telegram аккаунты' },
    { table: 'channels', name: 'Каналы' },
    { table: 'batches', name: 'Батчи' },
    { table: 'templates', name: 'Шаблоны' },
    { table: 'campaigns', name: 'Кампании' },
    { table: 'jobs', name: 'Jobs' },
  ];

  for (const stat of stats) {
    try {
      const { count, error } = await supabase
        .from(stat.table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`   ${stat.name}: ${count || 0}`);
      }
    } catch (err) {
      // Ignore errors
    }
  }
  console.log('');

  // Итоги
  console.log('═══════════════════════════════════════════════════════════');
  if (allGood) {
    console.log('✅ База данных настроена корректно для Feature 003');
  } else {
    console.log('❌ Обнаружены проблемы с базой данных');
    console.log('\nДля исправления:');
    console.log('1. Откройте Supabase Dashboard → SQL Editor');
    console.log('2. Выполните недостающие миграции из backend/migrations/003_*.sql');
    console.log('3. Запустите: npx tsx backend/scripts/setup-admin.ts');
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

checkSchema().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
