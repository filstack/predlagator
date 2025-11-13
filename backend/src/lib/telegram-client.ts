// backend/src/lib/telegram-client.ts
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { Api } from 'telegram/tl'
import { NewMessage } from 'telegram/events'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Telegram клиент для работы с API
 * Использует GramJS (telegram npm package)
 */
class TelegramClientManager {
  private client: TelegramClient | null = null
  private isConnecting: boolean = false
  private sessionPath: string

  constructor() {
    this.sessionPath = path.join(__dirname, '..', '..', 'sessions')
  }

  /**
   * Инициализировать и подключить клиента
   */
  async connect(): Promise<void> {
    if (this.client?.connected) {
      console.log('✓ Telegram клиент уже подключен')
      return
    }

    if (this.isConnecting) {
      console.log('⏳ Подключение к Telegram уже в процессе...')
      return
    }

    this.isConnecting = true

    try {
      console.log('🔌 Подключение к Telegram...')

      const apiId = parseInt(process.env.TELEGRAM_API_ID || '')
      const apiHash = process.env.TELEGRAM_API_HASH || ''
      const sessionString = process.env.TELEGRAM_SESSION || ''

      if (!apiId || !apiHash) {
        throw new Error('TELEGRAM_API_ID и TELEGRAM_API_HASH должны быть установлены')
      }

      // Создаем сессию из строки
      const session = new StringSession(sessionString)

      // Создаем клиента
      this.client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
        retryDelay: 1000,
        autoReconnect: true,
        useWSS: false,
      })

      // Подключаемся
      await this.client.connect()

      // Проверяем авторизацию
      if (!sessionString) {
        console.warn('⚠️ TELEGRAM_SESSION пуст - клиент НЕ авторизован!')
        console.warn('   Используйте /api/auth-telegram/start для авторизации')
        this.isConnecting = false
        return
      }

      console.log('✓ Telegram клиент успешно подключен')

      // Получаем информацию об аккаунте
      try {
        const me = await this.client.getMe()
        console.log(`📱 Аккаунт: ${me.firstName} (ID: ${me.id})`)

        // Сохраняем обновленную сессию
        const newSession = this.client.session.save()
        if (newSession !== sessionString) {
          console.log('🔄 Сессия обновлена (сохраните в .env если изменилась)')
        }
      } catch (authError: any) {
        console.error('❌ Клиент подключен, но НЕ авторизован:', authError.message)
        console.error('   Используйте /api/auth-telegram/start для новой авторизации')
        throw new Error('Telegram клиент не авторизован. Требуется повторная авторизация через /api/auth-telegram/start')
      }

      this.isConnecting = false
    } catch (error: any) {
      this.isConnecting = false
      console.error('❌ Ошибка подключения к Telegram:', error.message)
      throw error
    }
  }

  /**
   * Получить активного клиента
   * Автоматически подключается если не подключен
   */
  async getClient(): Promise<TelegramClient> {
    if (!this.client || !this.client.connected) {
      await this.connect()
    }

    if (!this.client) {
      throw new Error('Не удалось подключиться к Telegram')
    }

    // Дополнительная проверка: клиент подключен, но авторизован ли?
    // Попробуем получить информацию о пользователе
    try {
      await this.client.getMe()
    } catch (error: any) {
      if (error.message.includes('AUTH_KEY_UNREGISTERED') ||
          error.message.includes('SESSION_REVOKED') ||
          error.message.includes('AUTH_KEY_DUPLICATED')) {
        throw new Error(
          'Telegram сессия невалидна или устарела. ' +
          'Используйте /api/auth-telegram/start для повторной авторизации. ' +
          `Детали: ${error.message}`
        )
      }
      throw error
    }

    return this.client
  }

  /**
   * Отключить клиента
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect()
      this.client = null
      console.log('🔌 Telegram клиент отключен')
    }
  }

  /**
   * Проверить подключение
   */
  isConnected(): boolean {
    return this.client?.connected || false
  }

  /**
   * Переподключиться
   */
  async reconnect(): Promise<void> {
    await this.disconnect()
    await this.connect()
  }

  /**
   * Обновить session string и переподключиться
   */
  async updateSession(newSessionString: string): Promise<void> {
    await this.disconnect()
    process.env.TELEGRAM_SESSION = newSessionString
    await this.connect()
  }
}

// Синглтон экземпляр
export const telegramClient = new TelegramClientManager()

// Автоматическое подключение отключено - подключение произойдёт при первом вызове getClient()
// Это решает проблему AUTH_KEY_DUPLICATED когда запущены несколько процессов (API server + Worker)
// if (process.env.NODE_ENV !== 'test') {
//   telegramClient.connect().catch((error) => {
//     console.error('❌ Не удалось подключиться к Telegram при запуске:', error)
//   })
// }

// Graceful shutdown
process.on('SIGTERM', async () => {
  await telegramClient.disconnect()
})

process.on('SIGINT', async () => {
  await telegramClient.disconnect()
})
