/**
 * Clean batch_channels table from orphaned records
 * Removes records with non-existent batch_id or channel_id
 *
 * Usage: node scripts/clean-batch-channels.mjs
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
  console.log('🧹 Cleaning batch_channels table...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check current state
    const { rows: [currentCount] } = await client.query(`
      SELECT COUNT(*) as count FROM batch_channels
    `);
    console.log(`📊 Current batch_channels records: ${currentCount.count}\n`);

    // Find orphaned records (batch_id not in batches)
    const { rows: orphanedBatches } = await client.query(`
      SELECT bc.batch_id, COUNT(*) as count
      FROM batch_channels bc
      LEFT JOIN batches b ON bc.batch_id = b.id
      WHERE b.id IS NULL
      GROUP BY bc.batch_id
    `);

    if (orphanedBatches.length > 0) {
      console.log('🔍 Found orphaned batch_id references:');
      orphanedBatches.forEach(row => {
        console.log(`   - batch_id: ${row.batch_id} (${row.count} records)`);
      });

      // Delete orphaned batch records
      const { rowCount: deletedBatches } = await client.query(`
        DELETE FROM batch_channels bc
        WHERE NOT EXISTS (
          SELECT 1 FROM batches b
          WHERE b.id = bc.batch_id
        )
      `);
      console.log(`✅ Deleted ${deletedBatches} records with invalid batch_id\n`);
    } else {
      console.log('✅ No orphaned batch_id references found\n');
    }

    // Find orphaned records (channel_id not in channels)
    // Note: batch_channels.channel_id is TEXT, channels.id is UUID
    const { rows: orphanedChannels } = await client.query(`
      SELECT bc.channel_id, COUNT(*) as count
      FROM batch_channels bc
      WHERE NOT EXISTS (
        SELECT 1 FROM channels c
        WHERE c.id::text = bc.channel_id
      )
      GROUP BY bc.channel_id
    `);

    if (orphanedChannels.length > 0) {
      console.log('🔍 Found orphaned channel_id references:');
      orphanedChannels.forEach(row => {
        console.log(`   - channel_id: ${row.channel_id} (${row.count} records)`);
      });

      // Delete orphaned channel records
      const { rowCount: deletedChannels } = await client.query(`
        DELETE FROM batch_channels bc
        WHERE NOT EXISTS (
          SELECT 1 FROM channels c
          WHERE c.id::text = bc.channel_id
        )
      `);
      console.log(`✅ Deleted ${deletedChannels} records with invalid channel_id\n`);
    } else {
      console.log('✅ No orphaned channel_id references found\n');
    }

    // Check final state
    const { rows: [finalCount] } = await client.query(`
      SELECT COUNT(*) as count FROM batch_channels
    `);
    console.log(`📊 Final batch_channels records: ${finalCount.count}`);
    console.log(`🔢 Removed ${currentCount.count - finalCount.count} orphaned records\n`);

    console.log('✅ Cleanup completed successfully!');
    console.log('💡 Now you can run: node scripts/apply-migration-005.mjs\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
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
