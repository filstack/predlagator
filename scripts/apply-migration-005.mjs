/**
 * Apply Migration 005: Fix Batch Channels Foreign Keys
 * Simple script using pg library to run SQL migration
 *
 * Usage: node scripts/apply-migration-005.mjs
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  console.log('🚀 Applying migration 005_fix_batch_channels_foreign_keys...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'shared', 'migrations', '005_fix_batch_channels_foreign_keys.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log(`📄 Running migration from: ${migrationPath}`);
    console.log(`📏 SQL size: ${sql.length} chars\n`);

    // Execute migration
    console.log('⏳ Executing SQL...');
    await client.query(sql);

    console.log('\n✅ Migration applied successfully!');
    console.log('🎉 Foreign key constraints restored\n');

    // Verify batch_channels structure
    const { rows: batchChannelsColumns } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'batch_channels'
      ORDER BY ordinal_position
    `);

    console.log('📋 batch_channels columns:');
    batchChannelsColumns.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    // Verify foreign keys
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

    console.log('\n🔗 Foreign key constraints:');
    foreignKeys.forEach(fk => {
      console.log(`   - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('\n📜 Stack trace:');
      console.error(error.stack);
    }
    console.log('\n💡 Alternative: Apply migration manually via Supabase Dashboard');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy content from: shared/migrations/005_fix_batch_channels_foreign_keys.sql');
    console.log('   3. Execute SQL');
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
