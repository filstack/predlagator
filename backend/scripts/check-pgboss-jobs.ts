import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkPgBossJobs() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📋 Проверяем pg-boss таблицу job...\n');

    // Получаем последние джобы send-message
    const result = await pool.query(`
      SELECT
        id,
        name,
        data->>'channelUsername' as channel,
        data->>'campaignId' as campaign_id,
        state,
        singletonkey,
        createdon,
        startedon,
        completedon
      FROM pgboss.job
      WHERE name = 'send-message'
      ORDER BY createdon DESC
      LIMIT 10
    `);

    console.log(`Найдено джобов: ${result.rows.length}\n`);

    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. @${row.channel} (Campaign: ${row.campaign_id?.slice(0, 8)}...)`);
      console.log(`   ID: ${row.id}`);
      console.log(`   State: ${row.state}`);
      console.log(`   SingletonKey: ${row.singletonkey}`);
      console.log(`   Created: ${row.createdon}`);
      console.log(`   Started: ${row.startedon || 'N/A'}`);
      console.log(`   Completed: ${row.completedon || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }

  process.exit(0);
}

checkPgBossJobs();
