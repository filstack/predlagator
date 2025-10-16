// backend/src/services/telegram.ts
import { Api } from 'telegram/tl'
import { telegramClient } from '../lib/telegram-client'
import { rateLimitTracker } from './rate-limit-tracker'
import * as path from 'path'
import * as fs from 'fs/promises'

/**
 * Интерфейс результата отправки сообщения
 */
export interface SendMessageResult {
  success: boolean
  messageId?: number
  error?: string
  errorCode?: string
  waitTime?: number // Время ожидания в секундах (для FLOOD_WAIT)
}

/**
 * Telegram сервис для отправки сообщений
 * Использует GramJS клиент
 */
export class TelegramService {
  private uploadDir: string

  constructor() {
    this.uploadDir = path.join(__dirname, '..', '..', 'uploads')
  }

  /**
   * Отправить сообщение в канал
   */
  async sendMessage(
    channelUsername: string,
    content: string,
    options?: {
      mediaType?: 'PHOTO' | 'VIDEO' | 'DOCUMENT' | null
      mediaUrl?: string | null
    }
  ): Promise<SendMessageResult> {
    console.log(`📤 Отправка сообщения в @${channelUsername}`)
    console.log(`   Контент: ${content.substring(0, 50)}...`)
    if (options?.mediaType) {
      console.log(`   Медиа: ${options.mediaType} - ${options.mediaUrl}`)
    }

    try {
      // Проверяем rate limit перед отправкой
      const rateLimitKey = 'telegram:global' // Можно использовать более специфичные ключи
      const blocked = await rateLimitTracker.isBlocked(rateLimitKey)

      if (blocked) {
        const remaining = await rateLimitTracker.getRemainingWaitTime(rateLimitKey)
        console.log(`⏸️  Rate limit активен, осталось ${remaining}с`)
        return {
          success: false,
          error: `Rate limit active, wait ${remaining} seconds`,
          errorCode: 'FLOOD_WAIT',
          waitTime: remaining,
        }
      }

      // Получаем клиента
      const client = await telegramClient.getClient()

      // Подготавливаем юзернейм (убираем @ если есть)
      const username = channelUsername.replace('@', '')

      // Получаем entity канала
      const entity = await client.getEntity(username)

      // Отправляем сообщение
      let result: any

      if (options?.mediaType && options?.mediaUrl) {
        // Отправка с медиа
        result = await this.sendMediaMessage(client, entity, content, options)
      } else {
        // Обычное текстовое сообщение
        result = await client.sendMessage(entity, {
          message: content,
        })
      }

      console.log(`✅ Сообщение отправлено в @${username} (ID: ${result.id})`)

      return {
        success: true,
        messageId: result.id,
      }
    } catch (error: any) {
      console.error(`❌ Ошибка отправки в @${channelUsername}:`, error)

      return this.handleError(error, channelUsername)
    }
  }

  /**
   * Отправить сообщение с медиа
   */
  private async sendMediaMessage(
    client: any,
    entity: any,
    content: string,
    options: { mediaType: string; mediaUrl: string }
  ): Promise<any> {
    const { mediaType, mediaUrl } = options

    // Проверяем, является ли URL локальным файлом или удаленным
    let file: any

    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      // Удаленный файл - GramJS может загрузить напрямую
      file = mediaUrl
    } else {
      // Локальный файл - читаем и загружаем
      const filePath = path.join(this.uploadDir, mediaUrl)
      file = await client.uploadFile({
        file: await fs.readFile(filePath),
        workers: 1,
      })
    }

    // Определяем тип медиа
    let media: any

    switch (mediaType) {
      case 'PHOTO':
        media = new Api.InputMediaUploadedPhoto({
          file,
        })
        break

      case 'VIDEO':
        media = new Api.InputMediaUploadedDocument({
          file,
          mimeType: 'video/mp4',
          attributes: [
            new Api.DocumentAttributeVideo({
              duration: 0,
              w: 0,
              h: 0,
            }),
          ],
        })
        break

      case 'DOCUMENT':
        media = new Api.InputMediaUploadedDocument({
          file,
          mimeType: 'application/octet-stream',
          attributes: [
            new Api.DocumentAttributeFilename({
              fileName: path.basename(mediaUrl),
            }),
          ],
        })
        break

      default:
        throw new Error(`Неподдерживаемый тип медиа: ${mediaType}`)
    }

    // Отправляем сообщение с медиа
    return await client.sendMessage(entity, {
      message: content,
      file: media,
    })
  }

  /**
   * Обработка ошибок Telegram API
   */
  private async handleError(error: any, channelUsername?: string): Promise<SendMessageResult> {
    const errorMessage = error.message || error.toString()

    // FLOOD_WAIT - слишком много запросов
    if (errorMessage.includes('FLOOD_WAIT')) {
      const match = errorMessage.match(/FLOOD_WAIT_(\d+)/)
      const waitTime = match ? parseInt(match[1]) : 30

      // Записываем в rate limit tracker
      const rateLimitKey = 'telegram:global'
      await rateLimitTracker.recordFloodWait(rateLimitKey, waitTime, errorMessage)

      return {
        success: false,
        error: `Rate limit exceeded, wait ${waitTime} seconds`,
        errorCode: 'FLOOD_WAIT',
        waitTime,
      }
    }

    // CHAT_WRITE_FORBIDDEN - нет прав на запись
    if (errorMessage.includes('CHAT_WRITE_FORBIDDEN')) {
      return {
        success: false,
        error: 'No permissions to write to this chat',
        errorCode: 'CHAT_WRITE_FORBIDDEN',
      }
    }

    // USER_BANNED_IN_CHANNEL - пользователь забанен
    if (errorMessage.includes('USER_BANNED_IN_CHANNEL')) {
      return {
        success: false,
        error: 'User is banned in this channel',
        errorCode: 'USER_BANNED_IN_CHANNEL',
      }
    }

    // CHANNEL_PRIVATE - приватный канал
    if (errorMessage.includes('CHANNEL_PRIVATE')) {
      return {
        success: false,
        error: 'Channel is private or does not exist',
        errorCode: 'CHANNEL_PRIVATE',
      }
    }

    // USERNAME_NOT_OCCUPIED - канал не найден
    if (errorMessage.includes('USERNAME_NOT_OCCUPIED')) {
      return {
        success: false,
        error: 'Channel username not found',
        errorCode: 'USERNAME_NOT_OCCUPIED',
      }
    }

    // Общая ошибка
    return {
      success: false,
      error: errorMessage,
      errorCode: 'UNKNOWN_ERROR',
    }
  }

  /**
   * Проверить доступность канала
   */
  async checkChannelAccess(channelUsername: string): Promise<boolean> {
    try {
      console.log(`🔍 Проверка доступа к @${channelUsername}`)

      const client = await telegramClient.getClient()
      const username = channelUsername.replace('@', '')

      // Пытаемся получить entity канала
      const entity = await client.getEntity(username)

      // Проверяем, что это канал или группа
      if (entity.className === 'Channel' || entity.className === 'Chat') {
        console.log(`✅ Канал @${username} доступен`)
        return true
      }

      return false
    } catch (error: any) {
      console.error(`❌ Ошибка проверки канала @${channelUsername}:`, error.message)
      return false
    }
  }

  /**
   * Получить информацию о канале
   */
  async getChannelInfo(channelUsername: string): Promise<any> {
    try {
      const client = await telegramClient.getClient()
      const username = channelUsername.replace('@', '')

      const entity = await client.getEntity(username)

      return {
        id: entity.id?.toString(),
        title: entity.title,
        username: entity.username,
        participantsCount: entity.participantsCount,
        about: entity.about,
      }
    } catch (error) {
      console.error(`❌ Ошибка получения информации о канале:`, error)
      return null
    }
  }
}

// Синглтон экземпляр
export const telegramService = new TelegramService()
