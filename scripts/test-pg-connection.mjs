/**
 * Test PostgreSQL connection with different configurations
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Read .env file
const envPath = path.join(process.cwd(), 'backend', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Test configurations
const configs = [
  {
    name: 'Transaction Mode (port 6543) - old password',
    url: 'postgres://postgres.qjnxcjbzwelokluaiqmk:Fku2pz7I82IRFRal@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
  },
  {
    name: 'Transaction Mode (port 6543) - new password',
    url: 'postgres://postgres.qjnxcjbzwelokluaiqmk:73DJmXUXWQdzGGuR@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
  },
  {
    name: 'Session Mode (port 5432) - old password',
    url: 'postgresql://postgres.qjnxcjbzwelokluaiqmk:Fku2pz7I82IRFRal@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
  },
  {
    name: 'Session Mode (port 5432) - new password',
    url: 'postgresql://postgres.qjnxcjbzwelokluaiqmk:73DJmXUXWQdzGGuR@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
  },
];

async function testConnection(config) {
  const client = new Client({
    connectionString: config.url,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log(`\n🔍 Testing: ${config.name}`);
    console.log(`   URL: ${config.url.replace(/:[^:@]+@/, ':****@')}`);

    await client.connect();
    const result = await client.query('SELECT 1 as test');
    console.log(`   ✅ SUCCESS - Connection works!`);
    return true;
  } catch (error) {
    console.log(`   ❌ FAILED - ${error.message}`);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 Testing PostgreSQL connections for pg-boss\n');
  console.log('=' + '='.repeat(60));

  for (const config of configs) {
    await testConnection(config);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Tip: The working configuration should be used for SUPABASE_DIRECT_URL in .env');
}

main().catch(console.error);
