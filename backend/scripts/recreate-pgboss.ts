import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function recreatePgBoss() {
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

    console.log('2️⃣ Creating pgboss schema...');
    await client.query('CREATE SCHEMA pgboss');
    console.log('   ✅ Schema created\n');

    await client.end();

    console.log('3️⃣ Starting pg-boss with migrate=true...');
    const PgBoss = (await import('pg-boss')).default;
    const boss = new PgBoss({
      connectionString,
      schema: 'pgboss',
      max: 5,
      ssl: {
        rejectUnauthorized: false,
      },
      migrate: true,
      noScheduling: true, // Disable scheduling to simplify
    });

    boss.on('error', (error) => {
      console.error('❌ pg-boss error:', error);
    });

    await boss.start();
    console.log('   ✅ pg-boss started\n');

    console.log('4️⃣ Testing job creation...');
    const testJobId = await boss.send('test-queue', { test: 'data' });
    console.log('   Test job ID:', testJobId);

    if (testJobId) {
      console.log('   ✅ Job created successfully!');
      const queueSize = await boss.getQueueSize('test-queue');
      console.log('   Queue size:', queueSize);
    } else {
      console.log('   ❌ Job ID is null - still not working');
    }

    await boss.stop();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

recreatePgBoss();
