import PgBoss from 'pg-boss';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSendJob() {
  const boss = new PgBoss({
    connectionString: process.env.SUPABASE_DIRECT_URL,
    schema: 'pgboss',
    max: 5,
    ssl: { rejectUnauthorized: false },
  });

  await boss.start();
  console.log('✅ pg-boss started\n');

  // Send test campaign job
  console.log('📤 Sending start-campaign job...');
  const jobId = await boss.send('start-campaign', {
    campaignId: 'fd8a0602-48ed-40d7-b6a3-100b16ae12d5',
    userId: '9611c386-8443-40f5-b7e9-3431e3ea4a40'
  });

  console.log('✅ Job created with ID:', jobId);
  console.log('📊 Queue size:', await boss.getQueueSize('start-campaign'));

  // Wait a bit for worker to process
  console.log('\n⏳ Waiting 5 seconds for worker to process...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('📊 Queue size after processing:', await boss.getQueueSize('start-campaign'));

  await boss.stop();
  console.log('\n✅ Done!');
  process.exit(0);
}

testSendJob();
