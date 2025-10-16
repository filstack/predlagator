/**
 * Helper script to encrypt Telegram credentials for data migration.
 * Reads credentials from .env and outputs encrypted values for SQL migration.
 *
 * Usage: npx tsx backend/scripts/encrypt-credentials.ts
 */

import 'dotenv/config';
import { encrypt } from '../src/utils/encryption';

console.log('\n=== Encrypting Telegram Credentials for Migration ===\n');

const apiId = process.env.TELEGRAM_API_ID;
const apiHash = process.env.TELEGRAM_API_HASH;
const session = process.env.TELEGRAM_SESSION;
const phone = process.env.TELEGRAM_PHONE || '+79219124745'; // Default if not in .env

if (!apiId || !apiHash || !session) {
  console.error('❌ Missing required environment variables:');
  console.error('   TELEGRAM_API_ID:', apiId ? '✓' : '✗');
  console.error('   TELEGRAM_API_HASH:', apiHash ? '✓' : '✗');
  console.error('   TELEGRAM_SESSION:', session ? '✓' : '✗');
  process.exit(1);
}

console.log('Original values:');
console.log('  TELEGRAM_API_ID:', apiId);
console.log('  TELEGRAM_API_HASH:', apiHash.substring(0, 10) + '...');
console.log('  TELEGRAM_SESSION:', session.substring(0, 20) + '...');
console.log('  TELEGRAM_PHONE:', phone);
console.log('');

// Encrypt
const encryptedApiHash = encrypt(apiHash);
const encryptedSession = encrypt(session);

console.log('Encrypted values (copy these to SQL migration):');
console.log('');
console.log('-- TELEGRAM_API_ID (not encrypted):');
console.log(`'${apiId}'`);
console.log('');
console.log('-- TELEGRAM_API_HASH (encrypted):');
console.log(`'${encryptedApiHash}'`);
console.log('');
console.log('-- TELEGRAM_SESSION (encrypted):');
console.log(`'${encryptedSession}'`);
console.log('');
console.log('-- TELEGRAM_PHONE:');
console.log(`'${phone}'`);
console.log('');

// Generate complete INSERT statement
console.log('Complete INSERT statement:');
console.log('');
console.log('INSERT INTO telegram_accounts (');
console.log('  user_id,');
console.log('  telegram_api_id,');
console.log('  telegram_api_hash,');
console.log('  telegram_session,');
console.log('  telegram_phone,');
console.log('  telegram_connected,');
console.log('  name');
console.log(') VALUES (');
console.log(`  '<ADMIN_UUID>', -- Replace with actual admin UUID from Supabase Auth`);
console.log(`  '${apiId}',`);
console.log(`  '${encryptedApiHash}',`);
console.log(`  '${encryptedSession}',`);
console.log(`  '${phone}',`);
console.log(`  true,`);
console.log(`  'Admin Account'`);
console.log(');');
console.log('');

// Verify encryption works
console.log('=== Verification ===\n');

try {
  const { decrypt } = require('../src/utils/encryption');

  const decryptedApiHash = decrypt(encryptedApiHash);
  const decryptedSession = decrypt(encryptedSession);

  console.log('Decryption test:');
  console.log('  API Hash match:', decryptedApiHash === apiHash ? '✓' : '✗');
  console.log('  Session match:', decryptedSession === session ? '✓' : '✗');
  console.log('');

  if (decryptedApiHash === apiHash && decryptedSession === session) {
    console.log('✓ Encryption/Decryption verified successfully!');
  } else {
    console.error('✗ Verification failed!');
    process.exit(1);
  }
} catch (error) {
  console.error('✗ Verification error:', error);
  process.exit(1);
}

console.log('');
console.log('Next steps:');
console.log('1. Create admin user in Supabase Dashboard (Authentication → Users)');
console.log('2. Copy admin user UUID');
console.log('3. Replace <ADMIN_UUID> in the INSERT statement above');
console.log('4. Execute SQL in Supabase SQL Editor or psql');
console.log('');
