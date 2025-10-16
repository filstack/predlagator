/**
 * Full database setup for Feature 003: Multitenancy
 * Usage: npx tsx backend/scripts/full-setup.ts
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import pg from 'pg';
import { getSupabase } from '../src/lib/supabase';
import { encrypt } from '../src/utils/encryption';

const { Client } = pg;

const ADMIN_EMAIL = 'admin@predlagator.com';
const ADMIN_PASSWORD = 'SecurePassword123!';

const migrations = [
  'migrations/003_000_create_users_table.sql',
  'migrations/003_001_create_telegram_accounts.sql',
  'migrations/003_002_add_user_id_columns.sql',
  'migrations/003_003_enable_rls.sql',
];

async function fullSetup() {
  console.log('\n🚀 Starting full database setup for Feature 003\n');

  // Try direct connection first
  const connectionString = process.env.SUPABASE_DIRECT_URL;

  if (!connectionString || connectionString.includes('localhost')) {
    console.log('⚠️  Direct PostgreSQL connection not available');
    console.log('Proceeding with Supabase SDK only (migrations skipped)\n');
    await setupWithSupabaseOnly();
    return;
  }

  // Try running migrations with direct connection
  console.log('1️⃣ Running SQL migrations via PostgreSQL...\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    for (const migrationPath of migrations) {
      console.log(`📄 ${migrationPath}`);

      try {
        const sql = readFileSync(migrationPath, 'utf-8');
        await client.query(sql);
        console.log(`✅ Completed\n`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Skipped (already exists)\n`);
        } else {
          console.error(`❌ Failed:`, error.message);
        }
      }
    }
  } catch (error: any) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    console.log('\nTrying Supabase SDK fallback...\n');
    await setupWithSupabaseOnly();
    return;
  } finally {
    await client.end();
  }

  // Continue with admin setup via Supabase SDK
  await setupAdmin();
}

async function setupWithSupabaseOnly() {
  console.log('📌 Using Supabase SDK for setup\n');
  console.log('⚠️  SQL migrations must be run manually in Supabase SQL Editor');
  console.log('   Files: backend/migrations/003_001 through 003_003\n');

  // Try to create admin anyway
  await setupAdmin();
}

async function setupAdmin() {
  const supabase = getSupabase();

  console.log('2️⃣ Creating admin user via Supabase Auth...\n');

  let adminId: string;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already registered') || authError.code === 'email_exists') {
      console.log('⚠️  Admin user already exists, fetching...');

      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === ADMIN_EMAIL);

      if (!existingUser) {
        throw new Error('Could not find admin user');
      }

      adminId = existingUser.id;
      console.log(`✅ Found admin: ${adminId}\n`);
    } else {
      throw authError;
    }
  } else {
    adminId = authData.user.id;
    console.log(`✅ Admin created: ${adminId}\n`);
  }

  // Insert user record
  console.log('3️⃣ Creating user record...');
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: adminId,
      username: 'admin',
      role: 'ADMIN',
    }, { onConflict: 'id' });

  if (userError) {
    console.log('⚠️  User record error:', userError.message);
  } else {
    console.log('✅ User record created\n');
  }

  // Encrypt Telegram credentials
  console.log('4️⃣ Storing Telegram credentials...');

  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  const session = process.env.TELEGRAM_SESSION;
  const phone = process.env.TELEGRAM_PHONE || '+79219124745';

  if (!apiId || !apiHash || !session) {
    console.error('❌ Missing TELEGRAM_API_ID, TELEGRAM_API_HASH, or TELEGRAM_SESSION in .env');
    throw new Error('Missing Telegram credentials');
  }

  const encryptedApiHash = encrypt(apiHash);
  const encryptedSession = encrypt(session);

  const { data: telegramAccount, error: telegramError } = await supabase
    .from('telegram_accounts')
    .upsert({
      user_id: adminId,
      telegram_api_id: apiId,
      telegram_api_hash: encryptedApiHash,
      telegram_session: encryptedSession,
      telegram_phone: phone,
      telegram_connected: true,
      name: 'Admin Account',
    }, { onConflict: 'telegram_phone' })
    .select()
    .single();

  if (telegramError) {
    console.error('❌ Telegram account error:', telegramError.message);
    console.log('\n⚠️  Make sure telegram_accounts table exists (run migration 003_001)\n');
  } else {
    console.log(`✅ Telegram account: ${telegramAccount.id}\n`);

    // Link existing data
    console.log('5️⃣ Linking existing data...');

    const updates = [
      { table: 'campaigns', userId: adminId, telegramAccountId: telegramAccount.id },
      { table: 'channels', userId: adminId },
      { table: 'batches', userId: adminId },
      { table: 'templates', userId: adminId },
      { table: 'jobs', userId: adminId },
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from(update.table)
        .update({ user_id: update.userId })
        .is('user_id', null);

      if (!error) {
        console.log(`✅ ${update.table}`);
      }
    }

    // Link campaigns to telegram account
    const { error: campaignError } = await supabase
      .from('campaigns')
      .update({ telegram_account_id: telegramAccount.id })
      .is('telegram_account_id', null);

    if (!campaignError) {
      console.log(`✅ campaigns → telegram_account`);
    }
  }

  console.log('\n✅ Setup completed!\n');
  console.log('═══════════════════════════════════════');
  console.log('Admin credentials:');
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  User ID: ${adminId}`);
  console.log('═══════════════════════════════════════');
  console.log('\n🎉 Login at: POST /api/auth/login\n');
}

fullSetup().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
