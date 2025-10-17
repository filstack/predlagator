// backend/src/services/rate-limit-tracker.ts
import { redis } from '../lib/redis'
import prisma from '../lib/prisma'

/**
 * Информация о rate limit блокировке
 */
export interface RateLimitInfo {
  blockedUntil: Date
  waitSeconds: number
  errorMessage: string
}

/**
 * Статистика rate limits
 */
export interface RateLimitStats {
  totalBlocks: number
  activeBlocks: number
  recentBlocks: Array<{
    key: string
    blockedUntil: Date
    waitSeconds: number
  }>
}

/**
 * Сервис отслеживания rate limits Telegram API
 * Использует Redis для быстрого доступа и TTL
 */
export class RateLimitTracker {
  private readonly REDIS_PREFIX = 'rate_limit:'
  private readonly STATS_KEY = 'rate_limit:stats'

  /**
   * Записать информацию о FLOOD_WAIT блокировке
   */
  async recordFloodWait(
    key: string,
    waitSeconds: number,
    errorMessage: string
  ): Promise<void> {
    const blockedUntil = new Date(Date.now() + waitSeconds * 1000)
    const redisKey = `${this.REDIS_PREFIX}${key}`

    // Сохраняем в Redis с автоматическим истечением
    await redis.setex(
      redisKey,
      waitSeconds,
      JSON.stringify({
        blockedUntil: blockedUntil.toISOString(),
        waitSeconds,
        errorMessage,
      })
    )

    // Инкрементируем счётчик блокировок
    await redis.hincrby(this.STATS_KEY, 'total', 1)
    await redis.hincrby(this.STATS_KEY, 'active', 1)

    // Логируем в БД для аналитики
    await this.logToDatabase(key, waitSeconds, errorMessage)

    console.log(
      `⏱️  Rate limit: ${key} заблокирован на ${waitSeconds}с до ${blockedUntil.toISOString()}`
    )
  }

  /**
   * Проверить, заблокирован ли ключ rate limit'ом
   */
  async isBlocked(key: string): Promise<RateLimitInfo | null> {
    const redisKey = `${this.REDIS_PREFIX}${key}`
    const data = await redis.get(redisKey)

    if (!data) {
      return null
    }

    try {
      const info = JSON.parse(data)
      return {
        blockedUntil: new Date(info.blockedUntil),
        waitSeconds: info.waitSeconds,
        errorMessage: info.errorMessage,
      }
    } catch (error) {
      console.error('Ошибка парсинга rate limit данных:', error)
      return null
    }
  }

  /**
   * Получить оставшееся время блокировки (в секундах)
   */
  async getRemainingWaitTime(key: string): Promise<number> {
    const info = await this.isBlocked(key)
    if (!info) {
      return 0
    }

    const remaining = Math.ceil((info.blockedUntil.getTime() - Date.now()) / 1000)
    return Math.max(0, remaining)
  }

  /**
   * Снять блокировку вручную (если нужно)
   */
  async clearBlock(key: string): Promise<void> {
    const redisKey = `${this.REDIS_PREFIX}${key}`
    const existed = await redis.del(redisKey)

    if (existed) {
      await redis.hincrby(this.STATS_KEY, 'active', -1)
      console.log(`✅ Rate limit снят: ${key}`)
    }
  }

  /**
   * Получить статистику rate limits
   */
  async getStats(): Promise<RateLimitStats> {
    const stats = await redis.hgetall(this.STATS_KEY)

    const totalBlocks = parseInt(stats.total || '0')
    const activeBlocks = parseInt(stats.active || '0')

    // Получаем список активных блокировок
    const keys = await redis.keys(`${this.REDIS_PREFIX}*`)
    const recentBlocks: Array<{
      key: string
      blockedUntil: Date
      waitSeconds: number
    }> = []

    for (const redisKey of keys) {
      const data = await redis.get(redisKey)
      if (data) {
        try {
          const info = JSON.parse(data)
          recentBlocks.push({
            key: redisKey.replace(this.REDIS_PREFIX, ''),
            blockedUntil: new Date(info.blockedUntil),
            waitSeconds: info.waitSeconds,
          })
        } catch (error) {
          // Игнорируем некорректные данные
        }
      }
    }

    // Сортируем по времени окончания блокировки
    recentBlocks.sort((a, b) => b.blockedUntil.getTime() - a.blockedUntil.getTime())

    return {
      totalBlocks,
      activeBlocks,
      recentBlocks: recentBlocks.slice(0, 50), // Последние 50
    }
  }

  /**
   * Сбросить счётчики статистики
   */
  async resetStats(): Promise<void> {
    await redis.del(this.STATS_KEY)
    console.log('📊 Статистика rate limits сброшена')
  }

  /**
   * Логирование в БД для долгосрочной аналитики
   */
  private async logToDatabase(
    key: string,
    waitSeconds: number,
    errorMessage: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: 'RATE_LIMIT_HIT',
          resourceType: 'RateLimit',
          resourceId: key,
          metadata: {
            waitSeconds,
            errorMessage,
            timestamp: new Date().toISOString(),
          },
          severity: 'WARNING',
        },
      })
    } catch (error) {
      console.error('Ошибка логирования rate limit в БД:', error)
      // Не прерываем работу, если логирование не удалось
    }
  }

  /**
   * Очистить все устаревшие блокировки
   * (Redis делает это автоматически через TTL, но можно вызвать вручную)
   */
  async cleanupExpired(): Promise<number> {
    const keys = await redis.keys(`${this.REDIS_PREFIX}*`)
    let cleaned = 0

    for (const key of keys) {
      const ttl = await redis.ttl(key)
      if (ttl === -1) {
        // Нет TTL - удаляем
        await redis.del(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      await redis.hincrby(this.STATS_KEY, 'active', -cleaned)
      console.log(`🧹 Очищено устаревших блокировок: ${cleaned}`)
    }

    return cleaned
  }

  /**
   * Получить все активные блокировки для мониторинга
   */
  async getActiveBlocks(): Promise<
    Array<{
      key: string
      info: RateLimitInfo
      remainingSeconds: number
    }>
  > {
    const keys = await redis.keys(`${this.REDIS_PREFIX}*`)
    const blocks: Array<{
      key: string
      info: RateLimitInfo
      remainingSeconds: number
    }> = []

    for (const redisKey of keys) {
      const key = redisKey.replace(this.REDIS_PREFIX, '')
      const info = await this.isBlocked(key)
      const remaining = await this.getRemainingWaitTime(key)

      if (info && remaining > 0) {
        blocks.push({
          key,
          info,
          remainingSeconds: remaining,
        })
      }
    }

    return blocks
  }
}

// Синглтон экземпляр
export const rateLimitTracker = new RateLimitTracker()

// Периодическая очистка устаревших блокировок (каждые 5 минут)
if (process.env.NODE_ENV !== 'test') {
  setInterval(
    () => {
      rateLimitTracker.cleanupExpired().catch((error) => {
        console.error('Ошибка очистки rate limits:', error)
      })
    },
    5 * 60 * 1000
  )
}
