import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkPgBossForCampaign() {
  const campaignId = '79716123-60bc-42da-af13-c185c4a78a46';

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        data->>'channelUsername' as channel,
        data->>'campaignId' as campaign_id,
        state,
        singletonkey,
        startafter,
        createdon,
        startedon
      FROM pgboss.job
      WHERE data->>'campaignId' = $1
      ORDER BY createdon
    `, [campaignId]);

    console.log('📋 pg-boss джобы для кампании:', campaignId.slice(0, 8) + '...');
    console.log('Найдено:', result.rows.length);
    console.log('');

    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. Channel: @${row.channel}`);
      console.log(`   State: ${row.state}`);
      console.log(`   SingletonKey: ${row.singletonkey || 'null'}`);
      console.log(`   Start After: ${row.startafter}`);
      console.log(`   Created: ${row.createdon}`);
      console.log(`   Started: ${row.startedon || 'not yet'}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }

  process.exit(0);
}

checkPgBossForCampaign();
