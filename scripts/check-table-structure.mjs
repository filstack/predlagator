/**
 * Check table structure and data types
 *
 * Usage: node scripts/check-table-structure.mjs
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Read DATABASE_URL from backend/.env
const envPath = path.join(process.cwd(), 'backend', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/SUPABASE_DIRECT_URL=(.+)/);

if (!urlMatch) {
  console.error('❌ SUPABASE_DIRECT_URL not found in backend/.env');
  process.exit(1);
}

const DATABASE_URL = urlMatch[1].trim();

async function main() {
  console.log('🔍 Checking table structures...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check batches table structure
    const { rows: batchesColumns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'batches'
      ORDER BY ordinal_position
    `);

    console.log('📋 batches table structure:');
    batchesColumns.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    console.log();

    // Check batch_channels table structure
    const { rows: batchChannelsColumns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'batch_channels'
      ORDER BY ordinal_position
    `);

    console.log('📋 batch_channels table structure:');
    batchChannelsColumns.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    console.log();

    // Check channels table structure
    const { rows: channelsColumns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'channels'
      ORDER BY ordinal_position
    `);

    console.log('📋 channels table structure:');
    channelsColumns.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    console.log();

    // Check sample data
    const { rows: batchesSample } = await client.query(`
      SELECT id, name, created_by_id FROM batches LIMIT 3
    `);

    console.log('📊 Sample data from batches:');
    batchesSample.forEach(row => {
      console.log(`   - id: ${row.id} (${typeof row.id}), created_by: ${row.created_by_id} (${typeof row.created_by_id})`);
    });
    console.log();

    const { rows: channelsSample } = await client.query(`
      SELECT id, username, user_id FROM channels LIMIT 3
    `);

    console.log('📊 Sample data from channels:');
    channelsSample.forEach(row => {
      console.log(`   - id: ${row.id} (${typeof row.id}), username: ${row.username}, user_id: ${row.user_id} (${typeof row.user_id})`);
    });
    console.log();

    const { rows: batchChannelsSample } = await client.query(`
      SELECT batch_id, channel_id FROM batch_channels LIMIT 3
    `);

    console.log('📊 Sample data from batch_channels:');
    batchChannelsSample.forEach(row => {
      console.log(`   - batch_id: ${row.batch_id} (${typeof row.batch_id}), channel_id: ${row.channel_id} (${typeof row.channel_id})`);
    });
    console.log();

    // Check foreign key constraints
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
        AND tc.table_name IN ('batch_channels', 'batches')
      ORDER BY tc.table_name, tc.constraint_name
    `);

    console.log('🔗 Existing foreign key constraints:');
    if (foreignKeys.length === 0) {
      console.log('   (none)');
    } else {
      foreignKeys.forEach(fk => {
        console.log(`   - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
    if (error.stack) {
      console.error('\n📜 Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
