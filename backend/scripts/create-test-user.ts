// backend/scripts/create-test-user.ts
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

import { randomUUID } from 'crypto';
import { getSupabase } from '../src/lib/supabase';

async function createTestUser() {
  const supabase = getSupabase();

  const userId = randomUUID();

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      username: 'admin',
      password_hash: 'dummy-password-hash', // В реальности должен быть хэш пароля
      role: 'ADMIN'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }

  console.log('✅ Test user created successfully!');
  console.log('User ID:', data.id);
  console.log('Username:', data.username);
  console.log('Role:', data.role);

  process.exit(0);
}

createTestUser();
