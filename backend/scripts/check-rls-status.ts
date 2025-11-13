/**
 * Проверка статуса Row Level Security (RLS)
 * Usage: npx tsx backend/scripts/check-rls-status.ts
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function checkRLS() {
  const connectionString = process.env.SUPABASE_DIRECT_URL;

  if (!connectionString) {
    console.error('❌ SUPABASE_DIRECT_URL не настроен в .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('\n🔍 Проверка Row Level Security (RLS)\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Проверка статуса RLS для всех таблиц
    const tables = [
      'users',
      'telegram_accounts',
      'channels',
      'batches',
      'templates',
      'campaigns',
      'jobs',
      'audit_logs'
    ];

    console.log('📊 Статус RLS для таблиц:\n');

    for (const table of tables) {
      const result = await client.query(`
        SELECT
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE tablename = $1
          AND schemaname = 'public'
      `, [table]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const rlsEnabled = row.rowsecurity;
        const status = rlsEnabled ? '✅ Включен' : '❌ ВЫКЛЮЧЕН';
        console.log(`${status.padEnd(20)} ${table}`);
      } else {
        console.log(`⚠️  Не найдена        ${table}`);
      }
    }

    console.log('\n📋 Политики RLS:\n');

    // Проверка политик для каждой таблицы
    for (const table of tables) {
      const result = await client.query(`
        SELECT
          polname as policy_name,
          polcmd as command,
          polpermissive as permissive,
          CASE
            WHEN polcmd = 'r' THEN 'SELECT'
            WHEN polcmd = 'a' THEN 'INSERT'
            WHEN polcmd = 'w' THEN 'UPDATE'
            WHEN polcmd = 'd' THEN 'DELETE'
            WHEN polcmd = '*' THEN 'ALL'
            ELSE polcmd
          END as operation
        FROM pg_policies
        WHERE tablename = $1
          AND schemaname = 'public'
        ORDER BY polname
      `, [table]);

      if (result.rows.length > 0) {
        console.log(`\n${table}:`);
        result.rows.forEach(row => {
          console.log(`  - ${row.policy_name} (${row.operation})`);
        });
      }
    }

    console.log('\n\n═══════════════════════════════════════════════════════════');

    // Проверка таблицы users - есть ли колонка id типа UUID
    console.log('\n🔎 Проверка структуры таблицы users:\n');
    const userStructure = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    userStructure.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} ${row.data_type.padEnd(30)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkRLS().catch(console.error);
