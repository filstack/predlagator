/**
 * Тест RLS - проверка работы Row Level Security
 * Usage: npx tsx backend/scripts/test-rls.ts
 */

import 'dotenv/config';
import { createAnonClient, createUserClient, getSupabase } from '../src/lib/supabase';

async function testRLS() {
  console.log('\n🧪 Тестирование Row Level Security (RLS)\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Попытка чтения данных БЕЗ авторизации (должно вернуть пустой массив)
  console.log('1️⃣ Тест: Чтение channels БЕЗ авторизации (ожидаем: 0 записей)\n');

  const anonClient = createAnonClient();

  const { data: channelsNoAuth, error: channelsNoAuthError } = await anonClient
    .from('channels')
    .select('id, username')
    .limit(10);

  if (channelsNoAuthError) {
    console.log(`⚠️  Ошибка: ${channelsNoAuthError.message}`);
  } else {
    if (channelsNoAuth && channelsNoAuth.length === 0) {
      console.log('✅ RLS работает! Без auth контекста данные скрыты.');
    } else {
      console.log(`❌ RLS НЕ РАБОТАЕТ! Получено ${channelsNoAuth?.length || 0} записей без авторизации.`);
      console.log('   → Нужно включить RLS: ALTER TABLE channels ENABLE ROW LEVEL SECURITY;\n');
    }
  }

  // 2. Проверка через сервисный роль (должен видеть все)
  console.log('\n2️⃣ Тест: Чтение channels через service_role (ожидаем: все записи)\n');

  const serviceClient = getSupabase();
  const { data: channelsService, error: channelsServiceError } = await serviceClient
    .from('channels')
    .select('id, username, user_id')
    .limit(5);

  if (channelsServiceError) {
    console.log(`❌ Ошибка: ${channelsServiceError.message}`);
  } else {
    console.log(`✅ Service role видит ${channelsService?.length || 0} записей`);
    if (channelsService && channelsService.length > 0) {
      console.log(`   Пример: ${channelsService[0].username} (user_id: ${channelsService[0].user_id || 'NULL'})`);
    }
  }

  // 3. Логин как admin и проверка доступа
  console.log('\n3️⃣ Тест: Логин как admin и чтение своих данных\n');

  const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
    email: 'admin@predlagator.com',
    password: 'SecurePassword123!'
  });

  if (loginError) {
    console.log(`❌ Ошибка входа: ${loginError.message}`);
    console.log('   → Возможно admin не создан. Запустите: npx tsx backend/scripts/setup-admin.ts\n');
  } else {
    console.log(`✅ Успешный вход: ${loginData.user?.email} (${loginData.user?.id})`);

    // Создаем клиент с user контекстом
    const userClient = createUserClient(loginData.session!.access_token);

    // Читаем channels как залогиненный пользователь
    const { data: channelsUser, error: channelsUserError } = await userClient
      .from('channels')
      .select('id, username, user_id')
      .limit(5);

    if (channelsUserError) {
      console.log(`❌ Ошибка чтения: ${channelsUserError.message}`);
    } else {
      console.log(`✅ Admin видит ${channelsUser?.length || 0} своих каналов`);

      // Проверка - все ли каналы принадлежат этому пользователю
      const allBelongToUser = channelsUser?.every(c => c.user_id === loginData.user!.id);

      if (allBelongToUser) {
        console.log('✅ RLS работает корректно - видны только собственные данные');
      } else {
        const foreignChannels = channelsUser?.filter(c => c.user_id !== loginData.user!.id);
        console.log(`⚠️  Обнаружены чужие каналы: ${foreignChannels?.length || 0}`);
      }
    }

    // Выход
    await userClient.auth.signOut();
  }

  // 4. Проверка users table
  console.log('\n4️⃣ Тест: Структура таблицы users\n');

  const { data: usersData, error: usersError } = await serviceClient
    .from('users')
    .select('id, username, role')
    .limit(3);

  if (usersError) {
    console.log(`❌ Ошибка: ${usersError.message}`);
  } else {
    console.log(`✅ Найдено пользователей: ${usersData?.length || 0}`);
    usersData?.forEach(user => {
      console.log(`   - ${user.username || 'no username'} (${user.role}) - ID: ${user.id}`);

      // Проверка, что ID - это UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      if (!isUUID) {
        console.log(`      ⚠️  ID не UUID формат! Нужна миграция 003_000_create_users_table.sql`);
      }
    });
  }

  // 5. Проверка telegram_accounts с RLS
  console.log('\n5️⃣ Тест: telegram_accounts с RLS\n');

  const { data: telegramNoAuth, error: telegramNoAuthError } = await anonClient
    .from('telegram_accounts')
    .select('id, telegram_phone')
    .limit(10);

  if (telegramNoAuthError) {
    console.log(`⚠️  Ошибка: ${telegramNoAuthError.message}`);
  } else {
    if (telegramNoAuth && telegramNoAuth.length === 0) {
      console.log('✅ RLS на telegram_accounts работает!');
    } else {
      console.log(`❌ RLS НЕ РАБОТАЕТ! Получено ${telegramNoAuth?.length || 0} аккаунтов без auth.`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Тестирование завершено!\n');
}

testRLS().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
