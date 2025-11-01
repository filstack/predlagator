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
  sessionString: string // Добавляем сохранение session string
}

// Хранилище QR-код сессий
interface QrAuthSession {
  client: TelegramClient
  apiId: number
  apiHash: string
  qrCode: {
    token: Buffer
    loginUrl: string
  }
  sessionString?: string
  user?: any
  isAuthenticated: boolean
}

const authSessions = new Map<string, AuthSession>()
const qrAuthSessions = new Map<string, QrAuthSession>()

// Кэш базовых сессий по телефону (для переиспользования auth_key)
// Это решает проблему создания множества auth_key при частых запросах
const phoneSessionCache = new Map<string, string>()

/**
 * Шаг 1: Начать процесс аутентификации
 * Отправляет SMS код на указанный номер телефона
 */
router.post('/start', async (req, res) => {
  const { apiId, apiHash, phone } = req.body

  if (!apiId || !apiHash || !phone) {
    return res.status(400).json({
      error: 'apiId, apiHash и phone обязательны',
    })
  }

  try {
    console.log('🔐 Начало аутентификации Telegram для:', phone)
    console.log('📋 Получены credentials - API_ID:', apiId, 'API_HASH length:', apiHash?.length)

    // Проверяем, есть ли кэшированная сессия для этого номера
    // Это позволяет переиспользовать auth_key и избежать блокировки Telegram
    const cachedSessionString = phoneSessionCache.get(phone) || ''
    console.log(
      `📦 Используем ${cachedSessionString ? 'кэшированную' : 'новую'} сессию для`,
      phone
    )

    const session = new StringSession(cachedSessionString)

    // SOCKS5 Proxy для обхода блокировки кодов на серверных IP
    // IP: 185.162.130.86 (res.geonix.com)
    console.log('🌐 Подключение через SOCKS5 прокси: 185.162.130.86:10000')

    const client = new TelegramClient(session, parseInt(apiId), apiHash, {
      connectionRetries: 5,
      useWSS: false, // Отключаем WebSocket, используем TCP
      proxy: {
        socksType: 5,
        ip: '185.162.130.86', // ВАЖНО: GramJS требует IP, а не hostname
        port: 10000,
        username: '20a770993aaa6560',
        password: '7GLsUS60',
        timeout: 10,
      }
    })

    // Подключаемся
    await client.connect()

    // Сохраняем session string после первого подключения (для переиспользования auth_key)
    const currentSessionString = client.session.save() as unknown as string
    phoneSessionCache.set(phone, currentSessionString)

    // Отправляем код на телефон с таймаутом
    console.log('📞 Отправка запроса SMS кода на Telegram API...')
    const result = await Promise.race([
      client.sendCode(
        {
          apiId: parseInt(apiId),
          apiHash: apiHash,
        },
        phone
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: Telegram не отвечает')), 30000)
      ),
    ]) as any

    if (!result || !result.phoneCodeHash) {
      throw new Error('Telegram API не вернул phoneCodeHash')
    }

    console.log('✓ Telegram API успешно обработал запрос кода')
    console.log('📄 Детали ответа от Telegram:', JSON.stringify({
      phoneCodeHash: result.phoneCodeHash,
      isCodeViaApp: result.isCodeViaApp,
      timeout: result.timeout,
      type: result.type?.__constructor || result.type?.className
    }))

    // Создаём уникальный ID сессии
    const sessionId = `${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Сохраняем сессию
    authSessions.set(sessionId, {
      client,
      phoneCodeHash: result.phoneCodeHash,
      apiId: parseInt(apiId),
      apiHash,
      phone,
      sessionString: currentSessionString,
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

    // Очищаем кэш сессии при ошибке
    phoneSessionCache.delete(phone)
    console.log('🗑️  Кэш сессии очищен для', phone)

    return res.status(500).json({
      error: 'Не удалось начать аутентификацию',
      details: error.message,
    })
  }
})

/**
 * Шаг 1 (альтернатива): Начать QR-код аутентификацию
 * Генерирует QR код для сканирования в Telegram приложении
 */
router.post('/qr-start', async (req, res) => {
  const { apiId, apiHash } = req.body

  if (!apiId || !apiHash) {
    return res.status(400).json({
      error: 'apiId и apiHash обязательны',
    })
  }

  try {
    console.log('🔐 Начало QR-код аутентификации Telegram')
    console.log('📋 Получены credentials - API_ID:', apiId, 'API_HASH length:', apiHash?.length)

    const session = new StringSession('')
    const client = new TelegramClient(session, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    })

    await client.connect()

    // Создаём уникальный ID сессии
    const sessionId = `qr_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Генерируем QR код
    console.log('📱 Генерация QR кода...')

    let qrCodeToken: Buffer | null = null
    let qrCodeLoginUrl: string | null = null

    // Запускаем процесс QR аутентификации в фоне
    client.signInUserWithQrCode(
      { apiId: parseInt(apiId), apiHash },
      {
        onError: (err: Error) => {
          console.error('✗ Ошибка QR кода:', err)
          const session = qrAuthSessions.get(sessionId)
          if (session) {
            session.isAuthenticated = false
          }
        },
        qrCode: async (qrCode) => {
          console.log('✓ QR код сгенерирован:', qrCode.token.toString('base64').substring(0, 20) + '...')
          qrCodeToken = qrCode.token
          qrCodeLoginUrl = `tg://login?token=${Buffer.from(qrCode.token).toString('base64url')}`
        },
      }
    ).then(async () => {
      // QR код был отсканирован и пользователь авторизован
      console.log('✓ QR код отсканирован успешно')
      const session = qrAuthSessions.get(sessionId)
      if (session) {
        const sessionString = client.session.save() as unknown as string
        const me = await client.getMe()

        session.sessionString = sessionString
        session.user = {
          id: me.id.toString(),
          username: me.username,
          phone: me.phone,
          firstName: me.firstName,
        }
        session.isAuthenticated = true
      }
    }).catch((err) => {
      console.error('✗ Ошибка QR аутентификации:', err)
    })

    // Ждём пока QR код будет сгенерирован
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (qrCodeToken) {
          clearInterval(checkInterval)
          resolve(true)
        }
      }, 100)

      // Таймаут 10 секунд
      setTimeout(() => {
        clearInterval(checkInterval)
        resolve(false)
      }, 10000)
    })

    if (!qrCodeToken || !qrCodeLoginUrl) {
      throw new Error('Не удалось сгенерировать QR код')
    }

    // Сохраняем сессию
    qrAuthSessions.set(sessionId, {
      client,
      apiId: parseInt(apiId),
      apiHash,
      qrCode: {
        token: qrCodeToken,
        loginUrl: qrCodeLoginUrl,
      },
      isAuthenticated: false,
    })

    console.log('✓ QR код готов к сканированию')

    return res.json({
      success: true,
      sessionId,
      qrCode: {
        token: qrCodeToken.toString('base64'),
        loginUrl: qrCodeLoginUrl,
      },
      message: 'Отсканируйте QR код в приложении Telegram: Settings → Devices → Scan QR Code',
    })
  } catch (error: any) {
    console.error('✗ Ошибка генерации QR кода:', error)

    return res.status(500).json({
      error: 'Не удалось сгенерировать QR код',
      details: error.message,
    })
  }
})

/**
 * Шаг 2 (для QR): Проверить статус QR-код аутентификации
 * Клиент должен периодически опрашивать этот endpoint
 */
router.post('/qr-check', async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId обязателен',
      })
    }

    const qrSession = qrAuthSessions.get(sessionId)
    if (!qrSession) {
      return res.status(404).json({
        error: 'Сессия не найдена или истекла',
      })
    }

    // Если уже аутентифицирован, возвращаем результат
    if (qrSession.isAuthenticated && qrSession.sessionString) {
      const result = {
        success: true,
        sessionString: qrSession.sessionString,
        user: qrSession.user,
      }

      // Отключаемся и удаляем сессию
      await qrSession.client.disconnect()
      qrAuthSessions.delete(sessionId)

      console.log('✓ QR-код аутентификация успешна')
      return res.json(result)
    }

    // Проверяем, подключён ли клиент
    if (!qrSession.client.connected) {
      return res.json({
        success: false,
        status: 'waiting',
        message: 'Ожидание сканирования QR кода...',
      })
    }

    // Проверяем авторизацию
    try {
      const me = await qrSession.client.getMe()

      // Если getMe() успешен - пользователь авторизован
      const sessionString = qrSession.client.session.save() as unknown as string

      qrSession.sessionString = sessionString
      qrSession.user = {
        id: me.id.toString(),
        username: me.username,
        phone: me.phone,
        firstName: me.firstName,
      }
      qrSession.isAuthenticated = true

      console.log('✓ QR код отсканирован пользователем:', me.username || me.phone)

      return res.json({
        success: true,
        sessionString,
        user: qrSession.user,
      })
    } catch (error: any) {
      // Если ошибка "AUTH_KEY_UNREGISTERED" - всё ещё ждём
      if (error.message.includes('AUTH_KEY_UNREGISTERED') || error.message.includes('Unauthorized')) {
        return res.json({
          success: false,
          status: 'waiting',
          message: 'Ожидание сканирования QR кода...',
        })
      }

      throw error
    }
  } catch (error: any) {
    console.error('✗ Ошибка проверки QR статуса:', error)

    return res.status(500).json({
      error: 'Не удалось проверить статус',
      details: error.message,
    })
  }
})

/**
 * Шаг 1.5: Повторно отправить код (обычно приходит как SMS)
 * Используется, если первый код не пришёл
 */
router.post('/resend-code', async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId обязателен',
      })
    }

    const authSession = authSessions.get(sessionId)
    if (!authSession) {
      return res.status(404).json({
        error: 'Сессия не найдена или истекла',
      })
    }

    console.log('📱 Повторная отправка кода для:', authSession.phone)

    // Используем resendCode - Telegram обычно отправляет SMS при повторном запросе
    const result = await authSession.client.invoke(
      new (require('telegram/tl').Api.auth.ResendCode)({
        phoneNumber: authSession.phone,
        phoneCodeHash: authSession.phoneCodeHash,
      })
    )

    console.log('✓ Код повторно отправлен')
    console.log('📄 Детали повторного ответа:', JSON.stringify({
      phoneCodeHash: result.phoneCodeHash,
      type: result.type?.__constructor || result.type?.className,
    }))

    // Обновляем phoneCodeHash если Telegram вернул новый
    if (result.phoneCodeHash) {
      authSession.phoneCodeHash = result.phoneCodeHash
    }

    return res.json({
      success: true,
      message: 'Код отправлен повторно. Проверьте SMS.',
      phoneCodeHash: result.phoneCodeHash || authSession.phoneCodeHash,
    })
  } catch (error: any) {
    console.error('✗ Ошибка повторной отправки кода:', error)

    return res.status(500).json({
      error: 'Не удалось повторно отправить код',
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

      // Очищаем кэш сессии для этого номера после успешной аутентификации
      phoneSessionCache.delete(authSession.phone)

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

    // Очищаем кэш сессии для этого номера после успешной аутентификации
    phoneSessionCache.delete(authSession.phone)

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
 * Очистить кэш сессий для номера телефона
 */
router.post('/clear-cache', async (req, res) => {
  try {
    const { phone } = req.body

    if (phone) {
      phoneSessionCache.delete(phone)
      console.log('🗑️  Кэш сессии очищен для:', phone)
      return res.json({
        success: true,
        message: `Кэш очищен для ${phone}`,
      })
    } else {
      // Очистить весь кэш
      phoneSessionCache.clear()
      console.log('🗑️  Весь кэш сессий очищен')
      return res.json({
        success: true,
        message: 'Весь кэш очищен',
      })
    }
  } catch (error: any) {
    console.error('✗ Ошибка очистки кэша:', error)

    return res.status(500).json({
      error: 'Ошибка очистки кэша',
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
      // Очищаем кэш сессии при отмене
      phoneSessionCache.delete(authSession.phone)
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

  // Очистка phone-based сессий
  Array.from(authSessions.entries()).forEach(([sessionId, authSession]) => {
    const sessionAge = now - parseInt(sessionId.split('_')[0])
    // Удаляем сессии старше 10 минут
    if (sessionAge > 10 * 60 * 1000) {
      authSession.client.disconnect().catch(() => {})
      authSessions.delete(sessionId)
      // Очищаем кэш сессии при автоматической очистке
      phoneSessionCache.delete(authSession.phone)
      console.log('🗑️  Удалена устаревшая phone сессия для:', authSession.phone)
    }
  })

  // Очистка QR-код сессий
  Array.from(qrAuthSessions.entries()).forEach(([sessionId, qrSession]) => {
    const timestampPart = sessionId.split('_')[1]
    const sessionAge = now - parseInt(timestampPart)
    // Удаляем QR сессии старше 10 минут (QR код истекает через 60 секунд по умолчанию в Telegram)
    if (sessionAge > 10 * 60 * 1000) {
      qrSession.client.disconnect().catch(() => {})
      qrAuthSessions.delete(sessionId)
      console.log('🗑️  Удалена устаревшая QR сессия:', sessionId)
    }
  })
}, 10 * 60 * 1000)

export default router
