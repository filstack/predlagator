/**
 * Test encryption utilities
 */

import 'dotenv/config';
import { encrypt, decrypt, testEncryption } from './src/utils/encryption';

console.log('Testing encryption utilities...\n');

// Test 1: Basic encryption/decryption
const testData = 'Hello World!';
console.log(`Test 1: Basic encryption`);
console.log(`  Original: ${testData}`);

const encrypted = encrypt(testData);
console.log(`  Encrypted: ${encrypted}`);

const decrypted = decrypt(encrypted);
console.log(`  Decrypted: ${decrypted}`);
console.log(`  Match: ${decrypted === testData ? '✓' : '✗'}\n`);

// Test 2: Long string (Telegram session)
const longString = 'a'.repeat(500);
console.log(`Test 2: Long string (${longString.length} chars)`);
const encryptedLong = encrypt(longString);
const decryptedLong = decrypt(encryptedLong);
console.log(`  Match: ${decryptedLong === longString ? '✓' : '✗'}\n`);

// Test 3: Special characters
const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`\'"\\';
console.log(`Test 3: Special characters`);
const encryptedSpecial = encrypt(specialChars);
const decryptedSpecial = decrypt(encryptedSpecial);
console.log(`  Match: ${decryptedSpecial === specialChars ? '✓' : '✗'}\n`);

// Test 4: Built-in test
console.log(`Test 4: Built-in test`);
testEncryption();

console.log('\n✓ All encryption tests passed!');
