/**
 * Setup admin user for Feature 003
 *
 * This script:
 * 1. Creates admin user via Supabase Auth
 * 2. Inserts user record into users table
 * 3. Encrypts and stores Telegram credentials
 * 4. Links all existing data to admin user
 *
 * Usage: npx tsx backend/scripts/setup-admin.ts
 */

import 'dotenv/config';
import { getSupabase } from '../src/lib/supabase';
import { encrypt } from '../src/utils/encryption';

const ADMIN_EMAIL = 'admin@predlagator.com';
const ADMIN_PASSWORD = 'SecurePassword123!'; // Change this in production

async function setupAdmin() {
  const supabase = getSupabase();

  console.log('\n🚀 Setting up admin user...\n');

  // Step 1: Create admin user via Supabase Auth
  console.log('1️⃣ Creating admin user in Supabase Auth...');

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true, // Auto-confirm email
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('⚠️  Admin user already exists, fetching existing user...');

      // Get existing user
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

      if (listError) {
        console.error('❌ Failed to list users:', listError);
        throw listError;
      }

      const existingUser = users.find(u => u.email === ADMIN_EMAIL);

      if (!existingUser) {
        console.error('❌ Could not find existing admin user');
        throw new Error('Admin user not found');
      }

      console.log(`✅ Found existing admin user: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}\n`);

      return existingUser.id;
    }

    console.error('❌ Failed to create admin user:', authError);
    throw authError;
  }

  console.log(`✅ Admin user created: ${authData.user.id}`);
  console.log(`   Email: ${authData.user.email}`);
  console.log(`   Password: ${ADMIN_PASSWORD}\n`);

  // Step 2: Insert user record into users table
  console.log('2️⃣ Creating user record in users table...');

  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      role: 'ADMIN',
    });

  if (userError) {
    console.error('❌ Failed to create user record:', userError);
    // Don't throw - user might already exist
  } else {
    console.log(`✅ User record created\n`);
  }

  // Step 3: Encrypt Telegram credentials
  console.log('3️⃣ Encrypting Telegram credentials...');

  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  const session = process.env.TELEGRAM_SESSION;
  const phone = process.env.TELEGRAM_PHONE || '+79219124745';

  if (!apiId || !apiHash || !session) {
    console.error('❌ Missing Telegram credentials in .env');
    throw new Error('Missing TELEGRAM_API_ID, TELEGRAM_API_HASH, or TELEGRAM_SESSION');
  }

  const encryptedApiHash = encrypt(apiHash);
  const encryptedSession = encrypt(session);

  console.log('✅ Credentials encrypted\n');

  // Step 4: Create telegram account
  console.log('4️⃣ Creating telegram_account record...');

  const { data: telegramAccount, error: telegramError } = await supabase
    .from('telegram_accounts')
    .insert({
      user_id: authData.user.id,
      telegram_api_id: apiId,
      telegram_api_hash: encryptedApiHash,
      telegram_session: encryptedSession,
      telegram_phone: phone,
      telegram_connected: true,
      name: 'Admin Account',
    })
    .select()
    .single();

  if (telegramError) {
    console.error('❌ Failed to create telegram_account:', telegramError);
    // Don't throw - account might already exist
  } else {
    console.log(`✅ Telegram account created: ${telegramAccount.id}\n`);
  }

  // Step 5: Link existing data to admin user
  console.log('5️⃣ Linking existing data to admin user...');

  const updates = [
    { table: 'campaigns', column: 'user_id', value: authData.user.id },
    { table: 'channels', column: 'user_id', value: authData.user.id },
    { table: 'batches', column: 'user_id', value: authData.user.id },
    { table: 'templates', column: 'user_id', value: authData.user.id },
    { table: 'jobs', column: 'user_id', value: authData.user.id },
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from(update.table)
      .update({ [update.column]: update.value })
      .is(update.column, null);

    if (error) {
      console.error(`❌ Failed to update ${update.table}:`, error);
    } else {
      console.log(`✅ Updated ${update.table}`);
    }
  }

  // Step 6: Link campaigns to telegram account
  if (telegramAccount) {
    console.log('\n6️⃣ Linking campaigns to telegram account...');

    const { error: campaignError } = await supabase
      .from('campaigns')
      .update({ telegram_account_id: telegramAccount.id })
      .is('telegram_account_id', null);

    if (campaignError) {
      console.error('❌ Failed to update campaigns:', campaignError);
    } else {
      console.log('✅ Campaigns linked to telegram account');
    }
  }

  console.log('\n✅ Admin setup completed successfully!\n');
  console.log('Admin credentials:');
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  User ID: ${authData.user.id}\n`);
  console.log('You can now login at /api/auth/login\n');

  return authData.user.id;
}

setupAdmin().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
