// backend/src/workers/message-worker.ts
import { Worker, Job } from 'bullmq'
import { redisConnection } from '../lib/redis'
import prisma from '../lib/prisma'
import { SendMessageJobData } from '../queues/campaign-queue'
import { telegramService } from '../services/telegram'

/**
 * Воркер для отправки сообщений в Telegram каналы
 */
export function createMessageWorker() {
  const worker = new Worker<SendMessageJobData>(
    'message-sending',
    async (job: Job<SendMessageJobData>) => {
      const { jobId, campaignId, channelId, channelUsername, templateContent, mediaType, mediaUrl } =
        job.data

      console.log(`🔄 Обработка джоба ${jobId}: @${channelUsername}`)

      try {
        // Обновляем статус джоба в БД
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'SENDING',
            startedAt: new Date(),
            attempts: {
              increment: 1,
            },
          },
        })

        // Отправляем сообщение через Telegram
        const result = await telegramService.sendMessage(channelUsername, templateContent, {
          mediaType,
          mediaUrl,
        })

        if (result.success) {
          // Успешная отправка
          await prisma.job.update({
            where: { id: jobId },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          })

          // Обновляем прогресс кампании
          await updateCampaignProgress(campaignId)

          console.log(`✅ Сообщение отправлено в @${channelUsername}`)

          return {
            success: true,
            channel: channelUsername,
            messageId: result.messageId,
          }
        } else {
          // Ошибка отправки - обрабатываем FLOOD_WAIT отдельно
          if (result.errorCode === 'FLOOD_WAIT' && result.waitTime) {
            console.log(
              `⏳ FLOOD_WAIT для @${channelUsername}: повтор через ${result.waitTime}с`
            )

            // Обновляем джоб со статусом QUEUED для повтора
            await prisma.job.update({
              where: { id: jobId },
              data: {
                status: 'QUEUED',
                errorMessage: result.error,
              },
            })

            // Выбрасываем ошибку с задержкой для BullMQ
            const error = new Error(result.error || 'FLOOD_WAIT')
            ;(error as any).delay = result.waitTime * 1000 // Задержка в мс
            throw error
          }

          // Другие ошибки
          throw new Error(result.error || 'Unknown error')
        }
      } catch (error: any) {
        console.error(`❌ Ошибка отправки в @${channelUsername}:`, error.message)

        // Получаем информацию для принятия решения о retry
        const currentJob = await prisma.job.findUnique({
          where: { id: jobId },
          select: { attempts: true },
        })

        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { retryLimit: true },
        })

        const shouldRetry = currentJob && campaign && currentJob.attempts < campaign.retryLimit

        // Для FLOOD_WAIT не увеличиваем errorCount канала (это не проблема канала)
        const isFloodWait = error.message.includes('FLOOD_WAIT') || error.message.includes('Rate limit')

        if (!isFloodWait) {
          // Обновляем errorCount канала только для реальных ошибок
          await prisma.channel.update({
            where: { id: channelId },
            data: {
              errorCount: {
                increment: 1,
              },
              lastError: error.message,
            },
          })

          // Проверяем, нужно ли деактивировать канал
          const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            select: { errorCount: true },
          })

          if (channel && channel.errorCount >= 5) {
            await prisma.channel.update({
              where: { id: channelId },
              data: {
                isActive: false,
              },
            })
            console.warn(`⚠️ Канал @${channelUsername} деактивирован после 5 ошибок`)
          }
        }

        // Обновляем статус джоба
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: shouldRetry ? 'QUEUED' : 'FAILED',
            errorMessage: error.message,
            failedAt: shouldRetry ? null : new Date(),
          },
        })

        // Обновляем прогресс кампании
        await updateCampaignProgress(campaignId)

        throw error // Пробрасываем ошибку для BullMQ
      }
    },
    {
      connection: redisConnection,
      concurrency: 10, // Параллельная отправка до 10 сообщений
      limiter: {
        max: 20, // Максимум 20 джобов
        duration: 60000, // за 60 секунд (rate limiting)
      },
    }
  )

  // Слушатели событий
  worker.on('completed', (job) => {
    console.log(`✅ Воркер сообщений завершил джоб ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Воркер сообщений провалил джоб ${job?.id}:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('❌ Ошибка воркера сообщений:', err)
  })

  worker.on('stalled', (jobId) => {
    console.warn(`⚠️ Джоб ${jobId} застрял (stalled)`)
  })

  return worker
}

/**
 * Обновить прогресс кампании
 */
async function updateCampaignProgress(campaignId: string) {
  const stats = await prisma.job.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { status: true },
  })

  const totalJobs = stats.reduce((sum, stat) => sum + stat._count.status, 0)
  const completedJobs = stats.find((s) => s.status === 'SENT')?._count.status || 0
  const failedJobs = stats.find((s) => s.status === 'FAILED')?._count.status || 0

  const progress = Math.floor(((completedJobs + failedJobs) / totalJobs) * 100)

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      progress,
      // Если все джобы завершены, обновляем статус кампании
      ...(progress === 100 && {
        status: 'COMPLETED',
        completedAt: new Date(),
      }),
    },
  })
}
