import { getSupabase } from '../src/lib/supabase.js';
import PgBoss from 'pg-boss';
import * as dotenv from 'dotenv';

dotenv.config();

async function processQueuedJob() {
  const supabase = getSupabase();
  const campaignId = '7774267f-48c4-48b5-bbc9-96a95e4a0fd2';

  console.log('🔍 Ищем QUEUED джобы...\n');

  // Получаем QUEUED джобы
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(`
      *,
      campaign:campaigns(*),
      channel:channels(*)
    `)
    .eq('campaign_id', campaignId)
    .eq('status', 'QUEUED');

  if (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }

  if (!jobs || jobs.length === 0) {
    console.log('⚠️  Нет QUEUED джобов');
    process.exit(0);
  }

  console.log(`📨 Найдено ${jobs.length} QUEUED джобов:\n`);

  // Отправляем джобы в pg-boss
  const boss = new PgBoss({
    connectionString: process.env.SUPABASE_DIRECT_URL,
    schema: 'pgboss',
    max: 5,
    ssl: { rejectUnauthorized: false },
  });

  await boss.start();

  for (const job of jobs) {
    console.log(`📤 Отправка джоба для @${job.channel.username}...`);

    const jobId = await boss.send('send-message', {
      jobId: job.id,
      campaignId: job.campaign.id,
      channelId: job.channel.id,
      channelUsername: job.channel.username,
      templateContent: 'тестовое сообщение',
      mediaType: null,
      mediaUrl: null,
      attempt: 0
    });

    console.log(`✅ Job ID: ${jobId}`);
  }

  await boss.stop();
  console.log('\n✅ Все джобы отправлены!');
  process.exit(0);
}

processQueuedJob();
