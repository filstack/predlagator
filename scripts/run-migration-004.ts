/**
 * Migration Script: 004_add_channels_table
 * Run migration against Supabase using service role
 *
 * Usage: npx tsx scripts/run-migration-004.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Read .env file
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🚀 Starting migration 004_add_channels_table...\n');

  try {
    // Read migration file
    const migrationPath = path.join(
      process.cwd(),
      'shared',
      'migrations',
      '004_add_channels_table.sql'
    );

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`📄 Migration file: ${migrationPath}`);
    console.log(`📏 SQL length: ${sql.length} chars\n`);

    // Execute migration using Supabase SQL
    console.log('⏳ Executing migration...');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (!statement) continue;

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement,
        });

        if (error) {
          // Try alternative approach: use REST API
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: statement }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
        }

        successCount++;
        console.log(`✅ Statement ${successCount} executed`);
      } catch (err) {
        errorCount++;
        console.error(`❌ Error executing statement ${successCount + errorCount}:`, err);
        console.error(`Statement: ${statement.substring(0, 100)}...`);
      }
    }

    console.log(`\n✨ Migration completed!`);
    console.log(`   Success: ${successCount} statements`);
    console.log(`   Errors: ${errorCount} statements`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. Check errors above.');
      console.log('💡 You may need to run the migration manually via Supabase Dashboard → SQL Editor');
      process.exit(1);
    }

    console.log('\n🎉 Migration 004 successfully applied!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n💡 Alternative: Run migration manually via Supabase Dashboard → SQL Editor');
    console.log('   Copy content from: shared/migrations/004_add_channels_table.sql');
    process.exit(1);
  }
}

// Check if table already exists
async function checkTableExists(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('channels').select('id').limit(1);

    if (error) {
      // Error 42P01 = table does not exist
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return false;
      }
      throw error;
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Main
async function main() {
  const exists = await checkTableExists();

  if (exists) {
    console.log('⚠️  Table "channels" already exists!');
    console.log('   Skipping migration to avoid data loss.');
    console.log('   If you want to recreate the table, drop it first via SQL Editor.');
    process.exit(0);
  }

  await runMigration();
}

main();
