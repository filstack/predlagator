/**
 * Тест pg-boss: создание и обработка задачи
 */

import dotenv from 'dotenv';
dotenv.config();

import PgBoss from 'pg-boss';

async function testPgBoss() {
  console.log('🧪 Testing pg-boss...\n');

  const connectionString = process.env.SUPABASE_DIRECT_URL;
  console.log('Connection string:', connectionString?.substring(0, 50) + '...');

  const boss = new PgBoss({
    connectionString,
    schema: 'pgboss',
    max: 2,
    ssl: {
      rejectUnauthorized: false
    }
  });

  await boss.start();
  console.log('✅ pg-boss started');

  // Создадим простую задачу
  const testQueue = 'test-queue';
  const testData = { message: 'Hello from test!' };

  console.log('\n📤 Sending test job...');
  const jobId = await boss.send(testQueue, testData);
  console.log(`Job ID: ${jobId}`);

  if (!jobId) {
    console.error('❌ Job ID is null!');
  } else {
    console.log('✅ Job created successfully!');
  }

  // Проверим размер очереди
  const queueSize = await boss.getQueueSize(testQueue);
  console.log(`\n📊 Queue size: ${queueSize}`);

  // Попробуем получить задачу
  console.log('\n📥 Fetching job...');
  const jobs = await boss.fetch(testQueue);
  console.log(`Fetched jobs:`, jobs?.length || 0);

  if (jobs && jobs.length > 0) {
    console.log('Job data:', jobs[0].data);
    await boss.complete(jobs[0].id);
    console.log('✅ Job completed');
  }

  await boss.stop();
  console.log('\n✅ Test completed');
}

testPgBoss().catch(console.error);
