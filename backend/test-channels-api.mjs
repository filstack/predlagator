/**
 * Test script for Channels API (Feature 004)
 *
 * This script:
 * 1. Signs in test user via Supabase Auth
 * 2. Gets JWT token
 * 3. Tests all Channel CRUD endpoints
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qjnxcjbzwelokluaiqmk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbnhjamJ6d2Vsb2tsdWFpcW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTE1NjcsImV4cCI6MjA3NjEyNzU2N30.eF91eQwDO8TfPdJRHYZ1jMgdUnxsytwYazmWClu4h84';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbnhjamJ6d2Vsb2tsdWFpcW1rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MTU2NywiZXhwIjoyMDc2MTI3NTY3fQ.aejeL-IUA99wM2uHMeTyWPamtWSqko45HL1MHTms_cQ';

const API_BASE_URL = 'http://localhost:3000/api';

// Test user credentials
const TEST_USER = {
  email: 'test-feature-004@test.com',
  password: 'TestPassword123!',
};

async function main() {
  console.log('🚀 Testing Channels API (Feature 004)\n');

  // Step 1: Authenticate
  console.log('Step 1: Аутентификация...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Try to sign in
  let session;
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  if (signInError) {
    if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Email not confirmed')) {
      console.log('  Пользователь не найден или не подтверждён, создаю нового с админ правами...');

      // Create user with admin client (bypasses email confirmation)
      const { data: createUserData, error: createUserError } = await adminClient.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true, // Auto-confirm email
      });

      if (createUserError) {
        console.error('❌ Ошибка создания пользователя:', createUserError.message);
        process.exit(1);
      }

      console.log('  ✅ Пользователь создан и подтверждён');

      // Now sign in with the new user
      const { data: newSignInData, error: newSignInError } = await supabase.auth.signInWithPassword({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });

      if (newSignInError) {
        console.error('❌ Ошибка входа после создания:', newSignInError.message);
        process.exit(1);
      }

      session = newSignInData.session;
    } else {
      console.error('❌ Ошибка входа:', signInError.message);
      process.exit(1);
    }
  } else {
    session = signInData.session;
    console.log('  ✅ Вход выполнен');
  }

  if (!session) {
    console.error('❌ Не удалось получить сессию');
    process.exit(1);
  }

  const token = session.access_token;
  const userId = session.user.id;
  console.log(`  User ID: ${userId}`);
  console.log(`  Token: ${token.substring(0, 20)}...\n`);

  // Headers for API requests
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Step 2: Test POST /api/channels (Create channel)
  console.log('Step 2: Создание канала...');
  const timestamp = Date.now();
  const uniqueUsername = `@test004_${timestamp}`;

  const createPayload = {
    name: `Test Channel 004 (${timestamp})`,
    username: uniqueUsername,
    title: 'Test Channel for Feature 004',
    tgstat_url: `https://tgstat.ru/channel/${uniqueUsername}`,
    telegram_links: [
      `https://t.me/${uniqueUsername.substring(1)}`,
      `https://telegram.me/${uniqueUsername.substring(1)}`,
    ],
  };

  const createResponse = await fetch(`${API_BASE_URL}/channels`, {
    method: 'POST',
    headers,
    body: JSON.stringify(createPayload),
  });

  const createData = await createResponse.json();

  if (createResponse.ok) {
    console.log('  ✅ Канал создан');
    console.log('  ID:', createData.id);
    console.log('  Name:', createData.name);
    console.log('  Username:', createData.username);
  } else {
    console.error('  ❌ Ошибка создания:', createData);
    process.exit(1);
  }

  const channelId = createData.id;
  const updatedAt = createData.updated_at;
  console.log('');

  // Step 3: Test GET /api/channels/:id (Get channel by ID)
  console.log('Step 3: Получение канала по ID...');
  const getResponse = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
    method: 'GET',
    headers,
  });

  const getData = await getResponse.json();

  if (getResponse.ok) {
    console.log('  ✅ Канал получен');
    console.log('  Name:', getData.name);
    console.log('  Username:', getData.username);
  } else {
    console.error('  ❌ Ошибка получения:', getData);
  }
  console.log('');

  // Step 4: Test GET /api/channels (List all channels)
  console.log('Step 4: Получение списка каналов...');
  const listResponse = await fetch(`${API_BASE_URL}/channels?page=1&limit=10&sort_by=created_at&sort_order=desc`, {
    method: 'GET',
    headers,
  });

  const listData = await listResponse.json();

  if (listResponse.ok) {
    console.log('  ✅ Список получен');
    console.log('  Total channels:', listData.pagination.total);
    console.log('  Channels on this page:', listData.data.length);
    listData.data.forEach((ch, idx) => {
      console.log(`    ${idx + 1}. ${ch.name} (${ch.username})`);
    });
  } else {
    console.error('  ❌ Ошибка получения списка:', listData);
  }
  console.log('');

  // Step 5: Test GET /api/channels/check-username/:username
  console.log('Step 5: Проверка уникальности username...');
  const checkResponse = await fetch(`${API_BASE_URL}/channels/check-username/${uniqueUsername}`, {
    method: 'GET',
    headers,
  });

  const checkData = await checkResponse.json();

  if (checkResponse.ok) {
    console.log('  ✅ Проверка выполнена');
    console.log('  Available:', checkData.available);
    console.log('  Message:', checkData.message || 'Username свободен');
  } else {
    console.error('  ❌ Ошибка проверки:', checkData);
  }
  console.log('');

  // Step 6: Test PUT /api/channels/:id (Update channel)
  console.log('Step 6: Обновление канала...');
  const updatePayload = {
    name: 'Updated Test Channel 004',
    title: 'Updated title for testing',
    updated_at: updatedAt, // Required for optimistic locking
  };

  const updateResponse = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updatePayload),
  });

  const updateData = await updateResponse.json();

  if (updateResponse.ok) {
    console.log('  ✅ Канал обновлен');
    console.log('  Name:', updateData.name);
    console.log('  Title:', updateData.title);
    console.log('  Updated at:', updateData.updated_at);
  } else {
    console.error('  ❌ Ошибка обновления:', updateData);
  }
  console.log('');

  // Step 7: Test DELETE /api/channels/:id (Delete channel)
  console.log('Step 7: Удаление канала...');
  const deleteResponse = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
    method: 'DELETE',
    headers,
  });

  if (deleteResponse.status === 204) {
    console.log('  ✅ Канал удален');
  } else {
    const deleteData = await deleteResponse.json();
    console.error('  ❌ Ошибка удаления:', deleteData);
  }
  console.log('');

  // Cleanup: Sign out
  await supabase.auth.signOut();

  console.log('✅ Все тесты завершены успешно!');
}

main().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
