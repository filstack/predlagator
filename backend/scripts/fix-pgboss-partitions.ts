import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixPartitions() {
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

    // Check if job table is partitioned
    console.log('1️⃣ Checking if job table is partitioned...');
    const partitionCheck = await client.query(`
      SELECT
        c.relname as table_name,
        c.relkind as table_type,
        CASE c.relkind
          WHEN 'p' THEN 'partitioned table'
          WHEN 'r' THEN 'regular table'
          ELSE 'other'
        END as type_description
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'pgboss' AND c.relname = 'job'
    `);
    console.log('   Table info:', partitionCheck.rows[0]);
    console.log('');

    if (partitionCheck.rows[0]?.table_type === 'p') {
      console.log('⚠️  Table is PARTITIONED!\n');

      // Check existing partitions
      console.log('2️⃣ Checking existing partitions...');
      const partitionsResult = await client.query(`
        SELECT
          c.relname as partition_name,
          pg_get_expr(c.relpartbound, c.oid) as partition_bounds
        FROM pg_class c
        JOIN pg_inherits i ON i.inhrelid = c.oid
        JOIN pg_class p ON p.oid = i.inhparent
        JOIN pg_namespace n ON n.oid = p.relnamespace
        WHERE n.nspname = 'pgboss' AND p.relname = 'job'
        ORDER BY c.relname
      `);
      console.log('   Existing partitions:', partitionsResult.rows.length);
      partitionsResult.rows.forEach(p => {
        console.log(`     - ${p.partition_name}: ${p.partition_bounds}`);
      });
      console.log('');

      // Drop and recreate as regular table
      console.log('3️⃣ Recreating job table as regular (non-partitioned) table...\n');
      console.log('⚠️  This will drop all existing jobs! Continuing...\n');

      // Drop old partitioned table
      await client.query('DROP TABLE IF EXISTS pgboss.job CASCADE');
      console.log('   ✅ Dropped partitioned table');

      // Recreate as regular table using pg-boss migration
      console.log('   ⏳ Reconnecting with migrate=true to recreate tables...');
      await client.end();

      // Now use pg-boss to recreate tables
      const PgBoss = (await import('pg-boss')).default;
      const boss = new PgBoss({
        connectionString,
        schema: 'pgboss',
        max: 1,
        ssl: {
          rejectUnauthorized: false,
        },
        migrate: true, // Enable migration
      });

      await boss.start();
      console.log('   ✅ pg-boss started with migration');

      // Test insert
      const testJobId = await boss.send('test-queue', { test: 'data' });
      console.log('   ✅ Test job created:', testJobId);

      const queueSize = await boss.getQueueSize('test-queue');
      console.log('   ✅ Queue size:', queueSize);

      await boss.stop();
      console.log('\n✅ Tables recreated successfully!');
    } else {
      console.log('✅ Table is NOT partitioned, should work fine');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

fixPartitions();
