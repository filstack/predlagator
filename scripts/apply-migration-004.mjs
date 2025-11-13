/**
 * Apply Migration 004: Add Channels Table
 * Simple script using pg library to run SQL migration
 *
 * Usage: node scripts/apply-migration-004.mjs
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
  console.log('🚀 Applying migration 004_add_channels_table...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'shared', 'migrations', '004_add_channels_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log(`📄 Running migration from: ${migrationPath}`);
    console.log(`📏 SQL size: ${sql.length} chars\n`);

    // Execute migration
    console.log('⏳ Executing SQL...');
    await client.query(sql);

    console.log('\n✅ Migration applied successfully!');
    console.log('🎉 Table "channels" created with RLS policies\n');

    // Verify table exists
    const { rows } = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'channels'
      ORDER BY ordinal_position
      LIMIT 5
    `);

    console.log('📋 Table columns (first 5):');
    rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Alternative: Apply migration manually via Supabase Dashboard');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy content from: shared/migrations/004_add_channels_table.sql');
    console.log('   3. Execute SQL');
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
