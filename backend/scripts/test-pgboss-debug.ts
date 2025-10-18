import PgBoss from 'pg-boss';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testPgBoss() {
  const connectionString = process.env.SUPABASE_DIRECT_URL;

  if (!connectionString) {
    console.error('❌ SUPABASE_DIRECT_URL not found');
    process.exit(1);
  }

  console.log('🔍 Testing pg-boss with detailed logging...\n');

  const boss = new PgBoss({
    connectionString,
    schema: 'pgboss',
    max: 5,
    ssl: {
      rejectUnauthorized: false,
    },
    migrate: true,
    archiveCompletedAfterSeconds: 604800,
    retentionDays: 30,
    monitorStateIntervalSeconds: 10,
  });

  // Enable all error logging
  boss.on('error', (error) => {
    console.error('❌ pg-boss error event:', error);
  });

  boss.on('monitor-states', (stats) => {
    console.log('📊 Monitor states:', JSON.stringify(stats, null, 2));
  });

  try {
    console.log('1️⃣ Starting pg-boss...');
    await boss.start();
    console.log('✅ pg-boss started\n');

    // Test 1: Simple send
    console.log('2️⃣ Test 1: Simple send without options');
    const jobId1 = await boss.send('test-queue-1', { test: 'data1' });
    console.log('   Result:', jobId1);
    console.log('   Queue size:', await boss.getQueueSize('test-queue-1'));
    console.log('');

    // Test 2: Send with explicit options
    console.log('3️⃣ Test 2: Send with explicit options');
    const jobId2 = await boss.send('test-queue-2', { test: 'data2' }, {
      retryLimit: 3,
      retryDelay: 60,
      expireInSeconds: 3600
    });
    console.log('   Result:', jobId2);
    console.log('   Queue size:', await boss.getQueueSize('test-queue-2'));
    console.log('');

    // Test 3: Check if worker is needed
    console.log('4️⃣ Test 3: Register worker and send job');
    await boss.work('test-queue-3', async (job) => {
      console.log('   🔨 Worker processing job:', job.id, job.data);
      return { processed: true };
    });
    const jobId3 = await boss.send('test-queue-3', { test: 'data3' });
    console.log('   Job sent:', jobId3);
    console.log('   Queue size:', await boss.getQueueSize('test-queue-3'));

    // Wait for worker to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('   Queue size after processing:', await boss.getQueueSize('test-queue-3'));
    console.log('');

    // Test 4: Check queue directly
    console.log('5️⃣ Test 4: Fetch jobs directly from queue');
    const jobs = await boss.fetch('test-queue-1');
    console.log('   Fetched jobs:', jobs);
    console.log('');

    await boss.stop();
    console.log('✅ Tests complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await boss.stop();
    process.exit(1);
  }
}

testPgBoss();
