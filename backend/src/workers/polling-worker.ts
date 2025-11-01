/**
 * Polling Worker - обработка campaigns без pg-boss
 * Периодически проверяет БД и обрабатывает jobs напрямую
 */

import { getSupabase } from '../lib/supabase';
import { telegramService } from '../services/telegram';

interface ProcessingState {
  campaignId: string;
  lastProcessedAt: Date;
  jobIndex: number;
  baseDelay: number;
}

export class PollingWorker {
  private isRunning = false;
  private processingStates = new Map<string, ProcessingState>();
  private processingJobs = new Set<string>(); // для предотвращения дублей
  private pollingInterval = 2000; // 2 секунды между проверками

  /**
   * Запустить worker
   */
  async start() {
    console.log('🚀 Polling Worker запущен');
    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.poll();
      } catch (error) {
        console.error('❌ Ошибка в polling worker:', error);
      }

      await this.sleep(this.pollingInterval);
    }
  }

  /**
   * Остановить worker
   */
  stop() {
    console.log('🛑 Остановка Polling Worker...');
    this.isRunning = false;
  }

  /**
   * Один цикл проверки БД
   */
  private async poll() {
    const supabase = getSupabase();

    console.log('🔍 Проверка БД...');

    // 1. Найти активные campaigns
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        status,
        delivery_rate,
        retry_limit,
        template:templates(*)
      `)
      .eq('status', 'RUNNING');

    if (error) {
      console.error('❌ Ошибка получения campaigns:', error);
      return;
    }

    console.log(`📊 Найдено campaigns: ${campaigns?.length || 0}`);

    if (!campaigns || campaigns.length === 0) {
      return;
    }

    // 2. Обработать каждую campaign
    for (const campaign of campaigns) {
      console.log(`🎯 Обрабатываю campaign ${campaign.id}`);
      await this.processCampaign(campaign);
    }
  }

  /**
   * Обработать одну campaign
   */
  private async processCampaign(campaign: any) {
    const supabase = getSupabase();

    console.log(`  ├─ Ищу jobs для campaign ${campaign.id}...`);

    // Получаем jobs для отправки (без FK relationship)
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, campaign_id, channel_id, status, attempts')
      .eq('campaign_id', campaign.id)
      .eq('status', 'QUEUED')
      .order('created_at', { ascending: true })
      .limit(10); // обрабатываем по 10 jobs за раз

    if (error) {
      console.error(`  ├─ ❌ Ошибка получения jobs:`, error);
      return;
    }

    console.log(`  ├─ Найдено jobs: ${jobs?.length || 0}`);

    if (!jobs || jobs.length === 0) {
      return;
    }

    // Получаем channel usernames отдельным запросом
    const channelIds = jobs.map(j => j.channel_id);
    const { data: channels } = await supabase
      .from('channels')
      .select('id, username')
      .in('id', channelIds);

    // Маппим usernames к jobs
    const channelMap = new Map(channels?.map(ch => [ch.id, ch.username]) || []);
    const jobsWithChannels = jobs.map(job => ({
      ...job,
      channels: { username: channelMap.get(job.channel_id) || '' }
    }));

    // Rate limiting: обрабатываем jobs с задержками
    const baseDelayMs = (60 / campaign.delivery_rate) * 1000; // например, 60/20 = 3000ms

    console.log(`  ├─ Планирую отправку ${jobsWithChannels.length} jobs...`);

    for (const [index, job] of jobsWithChannels.entries()) {
      // Проверяем, не обрабатывается ли уже этот job
      if (this.processingJobs.has(job.id)) {
        continue;
      }

      // Добавляем jitter (±20% случайная вариация)
      const jitter = (Math.random() - 0.5) * 0.4 * baseDelayMs;
      const delayMs = index * baseDelayMs + jitter;

      console.log(`  ├─ Job ${job.id} → @${job.channels.username} (задержка: ${Math.round(delayMs / 1000)}s)`);

      // Запускаем обработку с задержкой (неблокирующе)
      this.scheduleJobProcessing(job, campaign, delayMs);
    }
  }

  /**
   * Запланировать обработку job с задержкой
   */
  private scheduleJobProcessing(job: any, campaign: any, delayMs: number) {
    this.processingJobs.add(job.id);

    setTimeout(async () => {
      try {
        await this.processJob(job, campaign);
      } catch (error) {
        console.error(`❌ Ошибка обработки job ${job.id}:`, error);
      } finally {
        this.processingJobs.delete(job.id);
      }
    }, delayMs);
  }

  /**
   * Обработать один job
   */
  private async processJob(job: any, campaign: any) {
    const supabase = getSupabase();
    const channelUsername = job.channels?.username;

    if (!channelUsername) {
      console.error(`❌ Job ${job.id}: channel username not found`);
      await this.markJobFailed(job.id, 'Channel username not found');
      return;
    }

    try {
      // 1. Обновить статус: SENDING
      await supabase
        .from('jobs')
        .update({
          status: 'SENDING',
          started_at: new Date().toISOString(),
          attempts: (job.attempts || 0) + 1
        })
        .eq('id', job.id);

      console.log(`📤 Отправка сообщения в @${channelUsername} (job ${job.id})`);

      // 2. Отправить сообщение через Telegram
      const result = await telegramService.sendMessage(
        channelUsername,
        campaign.template.content,
        {
          mediaType: campaign.template.media_type,
          mediaUrl: campaign.template.media_url
        }
      );

      // 3. Обработать результат
      if (result.success) {
        await supabase
          .from('jobs')
          .update({
            status: 'SENT',
            sent_at: new Date().toISOString()
          })
          .eq('id', job.id);

        console.log(`✅ Сообщение отправлено в @${channelUsername}`);

        // Обновить прогресс campaign
        await this.updateCampaignProgress(campaign.id);

      } else if (result.errorCode === 'FLOOD_WAIT' && result.waitTime) {
        // FLOOD_WAIT: вернуть в очередь с задержкой
        console.log(`⏳ FLOOD_WAIT для ${channelUsername}: повтор через ${result.waitTime}s`);

        await supabase
          .from('jobs')
          .update({
            status: 'QUEUED',
            error_message: result.error
          })
          .eq('id', job.id);

        // Запланировать повторную обработку
        setTimeout(() => {
          this.processingJobs.delete(job.id);
        }, result.waitTime * 1000);

      } else {
        // Другие ошибки: проверить лимит повторов
        const shouldRetry = (job.attempts || 0) < campaign.retry_limit;

        if (shouldRetry) {
          await supabase
            .from('jobs')
            .update({
              status: 'QUEUED',
              error_message: result.error
            })
            .eq('id', job.id);

          console.log(`🔄 Job ${job.id} вернули в очередь (попытка ${job.attempts + 1}/${campaign.retry_limit})`);
        } else {
          await this.markJobFailed(job.id, result.error || 'Unknown error');
          await this.updateCampaignProgress(campaign.id);
        }
      }

    } catch (error: any) {
      console.error(`❌ Ошибка отправки job ${job.id}:`, error);

      // Проверить лимит повторов
      const shouldRetry = (job.attempts || 0) < campaign.retry_limit;

      if (shouldRetry) {
        await supabase
          .from('jobs')
          .update({
            status: 'QUEUED',
            error_message: error.message
          })
          .eq('id', job.id);
      } else {
        await this.markJobFailed(job.id, error.message);
        await this.updateCampaignProgress(campaign.id);
      }
    }
  }

  /**
   * Пометить job как failed
   */
  private async markJobFailed(jobId: string, errorMessage: string) {
    const supabase = getSupabase();

    await supabase
      .from('jobs')
      .update({
        status: 'FAILED',
        failed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', jobId);

    console.log(`❌ Job ${jobId} помечен как FAILED: ${errorMessage}`);
  }

  /**
   * Обновить прогресс campaign
   */
  private async updateCampaignProgress(campaignId: string) {
    const supabase = getSupabase();

    // Получить статистику jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('status')
      .eq('campaign_id', campaignId);

    if (!jobs || jobs.length === 0) return;

    const total = jobs.length;
    const sent = jobs.filter(j => j.status === 'SENT').length;
    const failed = jobs.filter(j => j.status === 'FAILED').length;
    const progress = Math.floor(((sent + failed) / total) * 100);

    const updateData: any = { progress };

    // Если все jobs обработаны - завершить campaign
    if (progress === 100) {
      updateData.status = 'COMPLETED';
      updateData.completed_at = new Date().toISOString();
      console.log(`🎉 Campaign ${campaignId} завершена! Отправлено: ${sent}, Ошибок: ${failed}`);
    }

    await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId);
  }

  /**
   * Задержка
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
