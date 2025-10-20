// backend/src/api/auth-telegram.ts
import { Router } from 'express'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'

const router = Router()

// Временное хранилище активных сессий аутентификации
interface AuthSession {
  client: TelegramClient
  phoneCodeHash: string
  apiId: number
  apiHash: string
  phone: string
}

const authSessions = new Map<string, AuthSession>()

/**
 * Шаг 1: Начать процесс аутентификации
 * Отправляет SMS код на указанный номер телефона
 */
router.post('/start', async (req, res) => {
  try {
    const { apiId, apiHash, phone } = req.body

    if (!apiId || !apiHash || !phone) {
      return res.status(400).json({
        error: 'apiId, apiHash и phone обязательны',
      })
    }

    console.log('🔐 Начало аутентификации Telegram для:', phone)

    // Создаём новую пустую сессию
    const session = new StringSession('')
    const client = new TelegramClient(session, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    })

    // Подключаемся
    await client.connect()

    // Отправляем код на телефон
    const result = await client.sendCode(
      {
        apiId: parseInt(apiId),
        apiHash: apiHash,
      },
      phone
    )

    // Создаём уникальный ID сессии
    const sessionId = `${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Сохраняем сессию
    authSessions.set(sessionId, {
      client,
      phoneCodeHash: result.phoneCodeHash,
      apiId: parseInt(apiId),
      apiHash,
      phone,
    })

    // Проверяем, как был отправлен код
    const isViaApp = (result as any).isCodeViaApp
    const codeType = isViaApp ? 'через приложение Telegram' : 'как SMS'

    console.log(`✓ Код отправлен ${codeType} на`, phone)

    return res.json({
      success: true,
      sessionId,
      message: isViaApp
        ? 'Код отправлен в приложение Telegram. Проверьте чат "Telegram" или уведомления.'
        : 'SMS код отправлен на ваш телефон',
      phoneCodeHash: result.phoneCodeHash,
      isCodeViaApp: isViaApp,
    })
  } catch (error: any) {
    console.error('✗ Ошибка начала аутентификации:', error)

    return res.status(500).json({
      error: 'Не удалось начать аутентификацию',
      details: error.message,
    })
  }
})

/**
 * Шаг 2: Подтвердить SMS код
 * Может вернуть:
 * - success: true - аутентификация успешна
 * - needPassword: true - требуется 2FA пароль
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { sessionId, code } = req.body

    if (!sessionId || !code) {
      return res.status(400).json({
        error: 'sessionId и code обязательны',
      })
    }

    const authSession = authSessions.get(sessionId)
    if (!authSession) {
      return res.status(404).json({
        error: 'Сессия не найдена или истекла',
      })
    }

    console.log('🔐 Проверка SMS кода для:', authSession.phone)

    try {
      // Пытаемся войти с кодом
      await authSession.client.invoke(
        new (require('telegram/tl').Api.auth.SignIn)({
          phoneNumber: authSession.phone,
          phoneCodeHash: authSession.phoneCodeHash,
          phoneCode: code,
        })
      )

      // Успешная аутентификация
      const sessionString = authSession.client.session.save() as unknown as string

      // Получаем информацию о пользователе
      const me = await authSession.client.getMe()

      // Отключаемся и удаляем временную сессию
      await authSession.client.disconnect()
      authSessions.delete(sessionId)

      console.log('✓ Аутентификация успешна для:', authSession.phone)

      return res.json({
        success: true,
        sessionString,
        user: {
          id: me.id.toString(),
          username: me.username,
          phone: me.phone,
          firstName: me.firstName,
        },
      })
    } catch (error: any) {
      // Проверяем, требуется ли 2FA пароль
      if (error.message.includes('SESSION_PASSWORD_NEEDED')) {
        console.log('🔐 Требуется 2FA пароль для:', authSession.phone)

        return res.json({
          success: false,
          needPassword: true,
          message: 'Требуется пароль двухфакторной аутентификации',
        })
      }

      throw error
    }
  } catch (error: any) {
    console.error('✗ Ошибка проверки кода:', error)

    return res.status(500).json({
      error: 'Не удалось проверить код',
      details: error.message,
    })
  }
})

/**
 * Шаг 3: Ввести 2FA пароль (если требуется)
 */
router.post('/verify-password', async (req, res) => {
  try {
    const { sessionId, password } = req.body

    if (!sessionId || !password) {
      return res.status(400).json({
        error: 'sessionId и password обязательны',
      })
    }

    const authSession = authSessions.get(sessionId)
    if (!authSession) {
      return res.status(404).json({
        error: 'Сессия не найдена или истекла',
      })
    }

    console.log('🔐 Проверка 2FA пароля для:', authSession.phone)

    // Получаем настройки пароля
    const passwordSrpResult = await authSession.client.invoke(
      new (require('telegram/tl').Api.account.GetPassword)()
    )

    // Импортируем функцию для вычисления SRP чека
    const { computeCheck } = require('telegram/Password')

    // Вычисляем SRP чек
    const passwordSrpCheck = await computeCheck(passwordSrpResult, password)

    // Входим с паролем
    await authSession.client.invoke(
      new (require('telegram/tl').Api.auth.CheckPassword)({
        password: passwordSrpCheck,
      })
    )

    // Успешная аутентификация
    const sessionString = authSession.client.session.save() as unknown as string

    // Получаем информацию о пользователе
    const me = await authSession.client.getMe()

    // Отключаемся и удаляем временную сессию
    await authSession.client.disconnect()
    authSessions.delete(sessionId)

    console.log('✓ 2FA аутентификация успешна для:', authSession.phone)

    return res.json({
      success: true,
      sessionString,
      user: {
        id: me.id.toString(),
        username: me.username,
        phone: me.phone,
        firstName: me.firstName,
      },
    })
  } catch (error: any) {
    console.error('✗ Ошибка проверки пароля:', error)

    return res.status(500).json({
      error: 'Неверный пароль или ошибка аутентификации',
      details: error.message,
    })
  }
})

/**
 * Отменить процесс аутентификации
 */
router.post('/cancel', async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId обязателен',
      })
    }

    const authSession = authSessions.get(sessionId)
    if (authSession) {
      await authSession.client.disconnect()
      authSessions.delete(sessionId)
      console.log('✗ Аутентификация отменена для:', authSession.phone)
    }

    return res.json({
      success: true,
      message: 'Аутентификация отменена',
    })
  } catch (error: any) {
    console.error('✗ Ошибка отмены:', error)

    return res.status(500).json({
      error: 'Ошибка отмены',
      details: error.message,
    })
  }
})

/**
 * Получить текущую session string
 */
router.get('/get-session', async (req, res) => {
  try {
    const { telegramClient } = require('../lib/telegram-client')

    const client = await telegramClient.getClient()
    const sessionString = client.session.save() as unknown as string

    return res.json({
      success: true,
      sessionString,
    })
  } catch (error: any) {
    console.error('✗ Ошибка получения session:', error)

    return res.status(500).json({
      error: 'Не удалось получить session',
      details: error.message,
    })
  }
})

/**
 * Обновить session string на бэкенде
 */
router.post('/update-session', async (req, res) => {
  try {
    const { sessionString } = req.body

    if (!sessionString) {
      return res.status(400).json({
        error: 'sessionString обязателен',
      })
    }

    console.log('🔄 Обновление session string на бэкенде...')

    // Импортируем telegramClient
    const { telegramClient } = require('../lib/telegram-client')

    // Обновляем session в памяти
    await telegramClient.updateSession(sessionString)

    // Сохраняем в .env файл
    await updateEnvFile('TELEGRAM_SESSION', sessionString)

    console.log('✓ Session string успешно обновлён и сохранён в .env')

    return res.json({
      success: true,
      message: 'Session string обновлён успешно',
    })
  } catch (error: any) {
    console.error('✗ Ошибка обновления session:', error)

    return res.status(500).json({
      error: 'Не удалось обновить session',
      details: error.message,
    })
  }
})

/**
 * Сохранить Telegram credentials в .env файл
 */
router.post('/save-credentials', async (req, res) => {
  try {
    const { apiId, apiHash, sessionString } = req.body

    if (!apiId || !apiHash) {
      return res.status(400).json({
        error: 'apiId и apiHash обязательны',
      })
    }

    console.log('💾 Сохранение Telegram credentials в .env...')

    // Обновляем .env файл
    await updateEnvFile('TELEGRAM_API_ID', apiId.toString())
    await updateEnvFile('TELEGRAM_API_HASH', apiHash)

    if (sessionString) {
      await updateEnvFile('TELEGRAM_SESSION', sessionString)
    }

    // Обновляем process.env
    process.env.TELEGRAM_API_ID = apiId.toString()
    process.env.TELEGRAM_API_HASH = apiHash
    if (sessionString) {
      process.env.TELEGRAM_SESSION = sessionString
    }

    console.log('✓ Telegram credentials сохранены в .env')

    return res.json({
      success: true,
      message: 'Credentials успешно сохранены',
    })
  } catch (error: any) {
    console.error('✗ Ошибка сохранения credentials:', error)

    return res.status(500).json({
      error: 'Не удалось сохранить credentials',
      details: error.message,
    })
  }
})

/**
 * Вспомогательная функция для обновления .env файла
 */
async function updateEnvFile(key: string, value: string): Promise<void> {
  const fs = require('fs').promises
  const path = require('path')

  const envPath = path.join(__dirname, '..', '..', '.env')

  try {
    // Читаем текущий .env файл
    const envContent = await fs.readFile(envPath, 'utf8')
    const lines = envContent.split('\n')

    // Ищем и обновляем нужную строку
    let found = false
    const updatedLines = lines.map((line: string) => {
      if (line.startsWith(`${key}=`)) {
        found = true
        return `${key}=${value}`
      }
      return line
    })

    // Если ключ не найден, добавляем его
    if (!found) {
      updatedLines.push(`${key}=${value}`)
    }

    // Записываем обновленный файл
    await fs.writeFile(envPath, updatedLines.join('\n'))
  } catch (error) {
    console.error('Ошибка обновления .env файла:', error)
    throw error
  }
}

// Очистка старых сессий (каждые 10 минут)
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, authSession] of authSessions.entries()) {
    const sessionAge = now - parseInt(sessionId.split('_')[0])
    // Удаляем сессии старше 10 минут
    if (sessionAge > 10 * 60 * 1000) {
      authSession.client.disconnect().catch(() => {})
      authSessions.delete(sessionId)
      console.log('🗑️  Удалена устаревшая сессия аутентификации')
    }
  }
}, 10 * 60 * 1000)

export default router
