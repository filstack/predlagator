import PgBoss from 'pg-boss';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkPgBossTables() {
  const connectionString = process.env.SUPABASE_DIRECT_URL;

  if (!connectionString) {
    console.error('❌ SUPABASE_DIRECT_URL not found');
    process.exit(1);
  }

  console.log('🔍 Проверяем таблицы pg-boss...\n');

  const boss = new PgBoss({
    connectionString,
    schema: 'pgboss',
    max: 1,
    ssl: {
      rejectUnauthorized: false,
    },
    migrate: true, // Включим миграции для теста
  });

  try {
    await boss.start();
    console.log('✅ pg-boss successfully started with migrate: true');
    console.log('📊 Это означает, что таблицы созданы или уже существуют\n');

    // Попробуем добавить тестовую задачу
    const jobId = await boss.send('test-queue', { test: 'data' });
    console.log('✅ Test job created with ID:', jobId);

    // Проверим состояние очереди
    const queueSize = await boss.getQueueSize('test-queue');
    console.log('📊 Test queue size:', queueSize);

    await boss.stop();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPgBossTables();
