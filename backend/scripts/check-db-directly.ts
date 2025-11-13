import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkDB() {
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

    // Check pgboss schema
    console.log('1️⃣ Checking pgboss schema...');
    const schemaResult = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = 'pgboss'
    `);
    console.log('   pgboss schema exists:', schemaResult.rows.length > 0);
    console.log('');

    // Check pgboss tables
    console.log('2️⃣ Checking pgboss tables...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'pgboss'
      ORDER BY table_name
    `);
    console.log('   Tables:', tablesResult.rows.map(r => r.table_name));
    console.log('');

    // Check if job table has any records
    if (tablesResult.rows.some(r => r.table_name === 'job')) {
      console.log('3️⃣ Checking job table records...');
      const jobsResult = await client.query(`
        SELECT id, name, state, data, created_on
        FROM pgboss.job
        ORDER BY created_on DESC
        LIMIT 10
      `);
      console.log('   Total jobs:', jobsResult.rows.length);
      if (jobsResult.rows.length > 0) {
        console.log('   Recent jobs:');
        jobsResult.rows.forEach(job => {
          console.log(`     - ${job.id}: ${job.name} (${job.state}) - ${job.created_on}`);
        });
      } else {
        console.log('   ⚠️  No jobs found in table!');
      }
      console.log('');

      // Check table structure
      console.log('4️⃣ Checking job table structure...');
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'pgboss' AND table_name = 'job'
        ORDER BY ordinal_position
      `);
      console.log('   Columns:', columnsResult.rows.length);
      columnsResult.rows.forEach(col => {
        console.log(`     - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      console.log('');
    }

    // Test inserting a job directly
    console.log('5️⃣ Testing direct INSERT into job table...');
    try {
      const insertResult = await client.query(`
        INSERT INTO pgboss.job (id, name, data, state, created_on)
        VALUES (
          gen_random_uuid(),
          'test-direct-insert',
          '{"test": "data"}'::jsonb,
          'created',
          NOW()
        )
        RETURNING id, name
      `);
      console.log('   ✅ Direct insert successful:', insertResult.rows[0]);

      // Verify it's there
      const verifyResult = await client.query(`
        SELECT COUNT(*) as count FROM pgboss.job WHERE name = 'test-direct-insert'
      `);
      console.log('   ✅ Verification count:', verifyResult.rows[0].count);
    } catch (insertError: any) {
      console.error('   ❌ Direct insert failed:', insertError.message);
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

checkDB();
