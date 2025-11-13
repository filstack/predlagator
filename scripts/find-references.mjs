/**
 * Find all tables that reference batches or channels
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const envPath = path.join(process.cwd(), 'backend', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/SUPABASE_DIRECT_URL=(.+)/);

if (!urlMatch) {
  console.error('❌ SUPABASE_DIRECT_URL not found in backend/.env');
  process.exit(1);
}

const DATABASE_URL = urlMatch[1].trim();

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // Find all FK constraints
    const { rows: foreignKeys } = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name IN ('batches', 'channels') OR tc.table_name IN ('batches', 'channels'))
      ORDER BY tc.table_name, tc.constraint_name
    `);

    console.log('🔗 Foreign key constraints involving batches or channels:\n');
    foreignKeys.forEach(fk => {
      console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // Check campaigns structure
    console.log('\n\n📋 campaigns table structure:');
    const { rows: campaignsColumns } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'campaigns'
      ORDER BY ordinal_position
    `);
    campaignsColumns.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Check jobs structure
    console.log('\n📋 jobs table structure:');
    const { rows: jobsColumns } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'jobs'
      ORDER BY ordinal_position
    `);
    jobsColumns.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
