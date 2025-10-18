import PgBoss from 'pg-boss';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testJobCreation() {
  const connectionString = process.env.SUPABASE_DIRECT_URL;

  if (!connectionString) {
    console.error('❌ SUPABASE_DIRECT_URL not found');
    process.exit(1);
  }

  console.log('🧪 Testing job creation with new configuration...\n');

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
    monitorStateIntervalSeconds: 60,
    noSupervisor: false,
  });

  try {
    await boss.start();
    console.log('✅ pg-boss started\n');

    // Test 1: Send a simple job
    console.log('1️⃣ Sending test job...');
    const jobId1 = await boss.send('test-queue', { test: 'data', timestamp: new Date().toISOString() });
    console.log('   Job ID:', jobId1);
    console.log('   Queue size:', await boss.getQueueSize('test-queue'));
    console.log('');

    // Test 2: Send campaign job
    console.log('2️⃣ Sending start-campaign job...');
    const jobId2 = await boss.send('start-campaign', {
      campaignId: 'fd8a0602-48ed-40d7-b6a3-100b16ae12d5',
      userId: '9611c386-8443-40f5-b7e9-3431e3ea4a40'
    });
    console.log('   Job ID:', jobId2);
    console.log('   Queue size:', await boss.getQueueSize('start-campaign'));
    console.log('');

    // Test 3: Fetch job from queue
    console.log('3️⃣ Fetching jobs from queue...');
    const jobs = await boss.fetch('test-queue', 1);
    if (jobs && jobs.length > 0) {
      console.log('   ✅ Fetched job:', jobs[0].id, jobs[0].data);
      await boss.complete(jobs[0].id);
      console.log('   ✅ Job marked as complete');
    } else {
      console.log('   ⚠️  No jobs to fetch (might be already processed by worker)');
    }

    await boss.stop();
    console.log('\n✅ All tests complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await boss.stop();
    process.exit(1);
  }
}

testJobCreation();
