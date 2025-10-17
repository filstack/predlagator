// backend/src/lib/redis.ts
import { Redis } from 'ioredis'

// Настройка Redis подключения
const redisOptions = {
  maxRetriesPerRequest: null, // Требуется для BullMQ
  enableReadyCheck: false,
  family: 4, // Force IPv4 instead of IPv6
  retryStrategy: (times: number) => {
    if (times > 10) return null // Stop retrying after 10 attempts
    return Math.min(times * 50, 2000) // Retry with exponential backoff
  },
}

// Создаем экземпляр Redis для общего использования
export const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', redisOptions)

// Обработка событий подключения
redis.on('connect', () => {
  console.log('✓ Redis подключен')
})

redis.on('error', (error) => {
  console.error('✗ Ошибка Redis:', error)
})

redis.on('close', () => {
  console.log('✓ Redis соединение закрыто')
})

// Функция для создания новых Redis подключений (для BullMQ)
export function createRedisConnection(): Redis {
  return new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', redisOptions)
}

// Экспорт конфигурации для BullMQ
export const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  family: 4, // Force IPv4
}

export default redis
