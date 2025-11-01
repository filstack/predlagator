/**
 * Debug batch_channels data
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

    // Get all batch_channels
    const { rows: batchChannels } = await client.query(`
      SELECT batch_id, channel_id FROM batch_channels
    `);

    console.log('📊 batch_channels records:');
    for (const bc of batchChannels) {
      console.log(`\n  batch_id: ${bc.batch_id}`);
      console.log(`  channel_id: ${bc.channel_id}`);

      // Check if batch exists
      const { rows: [batch] } = await client.query(`
        SELECT id, name FROM batches WHERE id = $1
      `, [bc.batch_id]);
      console.log(`  ✓ batch exists: ${batch ? 'YES - ' + batch.name : 'NO'}`);

      // Check if channel exists
      const { rows: [channel] } = await client.query(`
        SELECT id, username FROM channels WHERE id::text = $1
      `, [bc.channel_id]);
      console.log(`  ${channel ? '✓' : '✗'} channel exists: ${channel ? 'YES - ' + channel.username : 'NO'}`);
    }

    // List all channels
    console.log('\n\n📋 All channels in database:');
    const { rows: allChannels } = await client.query(`
      SELECT id, username FROM channels ORDER BY username
    `);
    allChannels.forEach(c => {
      console.log(`  - ${c.id} → ${c.username}`);
    });

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
