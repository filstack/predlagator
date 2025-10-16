// backend/src/api/test.ts
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { telegramClient } from '../lib/telegram-client'

const router = Router()

/**
 * Тестовый endpoint для прямой отправки сообщения в Telegram канал
 * Минует очереди BullMQ/Redis для простого тестирования
 */
router.post('/send-message', async (req, res) => {
  try {
    const { channelId, message, mediaType, mediaUrl } = req.body

    // Валидация
    if (!channelId || !message) {
      return res.status(400).json({
        error: 'channelId и message обязательны',
      })
    }

    // Получаем канал из БД
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    })

    if (!channel) {
      return res.status(404).json({
        error: 'Канал не найден',
      })
    }

    console.log(`📤 Тестовая отправка в канал: ${channel.username}`)

    // Получаем Telegram клиент
    const client = await telegramClient.getClient()

    // Отправляем сообщение напрямую
    let result
    if (mediaType && mediaUrl) {
      // Отправка с медиа
      const mediaMap = {
        PHOTO: 'sendPhoto',
        VIDEO: 'sendVideo',
        DOCUMENT: 'sendDocument',
      } as const

      const method = mediaMap[mediaType as keyof typeof mediaMap]
      if (method) {
        result = await (client as any)[method](channel.username, mediaUrl, {
          caption: message,
        })
      } else {
        throw new Error(`Неподдерживаемый тип медиа: ${mediaType}`)
      }
    } else {
      // Отправка текстового сообщения
      result = await client.sendMessage(channel.username, {
        message,
      })
    }

    console.log(`✓ Сообщение отправлено успешно в ${channel.username}`)

    return res.json({
      success: true,
      message: 'Сообщение отправлено успешно',
      channelUsername: channel.username,
      timestamp: new Date().toISOString(),
      result: {
        id: result.id,
        date: result.date,
      },
    })
  } catch (error: any) {
    console.error('✗ Ошибка при отправке тестового сообщения:', error)

    return res.status(500).json({
      error: 'Не удалось отправить сообщение',
      details: error.message,
      type: error.constructor.name,
    })
  }
})

/**
 * Тестовый endpoint для проверки подключения к Telegram
 */
router.get('/telegram-status', async (req, res) => {
  try {
    const client = await telegramClient.getClient()
    const me = await client.getMe()

    return res.json({
      connected: true,
      user: {
        id: me.id,
        username: me.username,
        phone: me.phone,
        firstName: me.firstName,
      },
    })
  } catch (error: any) {
    console.error('✗ Ошибка проверки Telegram статуса:', error)

    return res.status(500).json({
      connected: false,
      error: error.message,
    })
  }
})

/**
 * Получить список каналов для тестирования
 */
router.get('/channels', async (req, res) => {
  try {
    const channels = await prisma.channel.findMany({
      select: {
        id: true,
        username: true,
        title: true,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return res.json({
      channels,
      count: channels.length,
    })
  } catch (error: any) {
    console.error('✗ Ошибка получения каналов:', error)

    return res.status(500).json({
      error: 'Не удалось получить список каналов',
      details: error.message,
    })
  }
})

export default router
