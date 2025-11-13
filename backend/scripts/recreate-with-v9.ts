import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function recreateWithV9() {
  const connectionString = process.env.SUPABASE_DIRECT_URL;

  if (!connectionString) {
    console.error('❌ SUPABASE_DIRECT_URL not found');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('1️⃣ Dropping entire pgboss schema...');
    await client.query('DROP SCHEMA IF EXISTS pgboss CASCADE');
    console.log('   ✅ Schema dropped\n');

    await client.end();

    console.log('2️⃣ Creating new schema with pg-boss v9...');
    const PgBoss = (await import('pg-boss')).default;
    const boss = new PgBoss({
      connectionString,
      schema: 'pgboss',
      max: 5,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await boss.start();
    console.log('   ✅ pg-boss v9 started and tables created\n');

    console.log('3️⃣ Testing job creation...');
    const jobId = await boss.send('test-queue', { test: 'data' });
    console.log('   Job ID:', jobId);

    if (jobId) {
      console.log('   ✅ SUCCESS! Job created with ID:', jobId);
      const queueSize = await boss.getQueueSize('test-queue');
      console.log('   Queue size:', queueSize);
    } else {
      console.log('   ❌ FAILED! Job ID is still null');
    }

    await boss.stop();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

recreateWithV9();
