/**
 * Run SQL migrations for Feature 003: Multitenancy
 * Usage: npx tsx backend/scripts/run-migrations.ts
 *
 * IMPORTANT: Execute these SQL files manually in Supabase SQL Editor:
 * 1. backend/migrations/003_001_create_telegram_accounts.sql
 * 2. backend/migrations/003_002_add_user_id_columns.sql
 * 3. backend/migrations/003_003_enable_rls.sql
 *
 * This script verifies that migrations have been applied.
 */

import 'dotenv/config';
import { getSupabase } from '../src/lib/supabase';

async function verifyMigrations() {
  const supabase = getSupabase();

  console.log('\n🔍 Verifying database migrations...\n');

  // Check if telegram_accounts table exists
  console.log('1️⃣ Checking telegram_accounts table...');
  const { data: telegramAccountsTable, error: table1Error } = await supabase
    .from('telegram_accounts')
    .select('id')
    .limit(1);

  if (table1Error) {
    if (table1Error.message.includes('does not exist')) {
      console.error('❌ telegram_accounts table not found');
      console.log('\n⚠️  Please run migration 003_001 in Supabase SQL Editor\n');
      return false;
    }
    throw table1Error;
  }
  console.log('✅ telegram_accounts table exists');

  // Check if user_id column exists in campaigns
  console.log('\n2️⃣ Checking user_id columns...');
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, user_id')
    .limit(1);

  if (campaignsError) {
    console.error('❌ user_id column not found in campaigns');
    console.log('\n⚠️  Please run migration 003_002 in Supabase SQL Editor\n');
    return false;
  }
  console.log('✅ user_id columns exist');

  // Check if RLS is enabled (try to query without auth context)
  console.log('\n3️⃣ Checking RLS policies...');
  // Note: This will fail if RLS is enabled and no user context
  // For verification, we just check that tables have RLS
  console.log('⚠️  RLS verification requires checking Supabase Dashboard');
  console.log('   Navigate to: Database → Tables → [table] → Policies');

  console.log('\n✅ Basic migration checks passed!\n');
  console.log('Next step: Run setup-admin.ts to create admin user\n');
  return true;
}

verifyMigrations()
  .then((success) => {
    if (!success) {
      console.log('Migration verification failed.');
      console.log('\nTo apply migrations:');
      console.log('1. Open Supabase Dashboard → SQL Editor');
      console.log('2. Copy content from backend/migrations/003_001_create_telegram_accounts.sql');
      console.log('3. Run the SQL');
      console.log('4. Repeat for 003_002 and 003_003\n');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
