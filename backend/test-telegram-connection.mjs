// test-telegram-connection.mjs
// Тестовый скрипт для проверки подключения к Telegram API

import dotenv from 'dotenv'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'

// Загружаем переменные окружения
dotenv.config()

async function testTelegramConnection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 ПРОВЕРКА ПОДКЛЮЧЕНИЯ К TELEGRAM API')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Проверяем наличие credentials
  const apiId = parseInt(process.env.TELEGRAM_API_ID || '')
  const apiHash = process.env.TELEGRAM_API_HASH || ''
  const sessionString = process.env.TELEGRAM_SESSION || ''

  console.log('📋 Проверка конфигурации:')
  console.log(`   TELEGRAM_API_ID: ${apiId ? '✓ Установлен' : '✗ Отсутствует'}`)
  console.log(`   TELEGRAM_API_HASH: ${apiHash ? '✓ Установлен' : '✗ Отсутствует'}`)
  console.log(`   TELEGRAM_SESSION: ${sessionString ? '✓ Установлен (' + sessionString.substring(0, 20) + '...)' : '✗ Отсутствует или пуст'}\n`)

  if (!apiId || !apiHash) {
    console.error('❌ ОШИБКА: TELEGRAM_API_ID и TELEGRAM_API_HASH обязательны!')
    console.error('   Получите их на https://my.telegram.org/apps\n')
    process.exit(1)
  }

  if (!sessionString) {
    console.warn('⚠️  ВНИМАНИЕ: TELEGRAM_SESSION пуст!')
    console.warn('   Клиент подключится, но НЕ будет авторизован.')
    console.warn('   Для авторизации используйте:')
    console.warn('   1. Фронтенд: Settings -> Telegram Auth')
    console.warn('   2. API: POST /api/auth-telegram/start\n')
  }

  try {
    console.log('🔌 Попытка подключения к Telegram...\n')

    // Создаем клиента
    const session = new StringSession(sessionString)
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      retryDelay: 1000,
      autoReconnect: true,
      useWSS: false,
    })

    // Подключаемся
    await client.connect()
    console.log('✓ Успешно подключено к серверам Telegram\n')

    // Проверяем авторизацию
    if (!sessionString) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('⚠️  РЕЗУЛЬТАТ: Подключение OK, но НЕ авторизован')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      console.log('Для авторизации выполните:')
      console.log('1. Запустите сервер: npm run dev')
      console.log('2. Откройте фронтенд и перейдите в Settings')
      console.log('3. Используйте форму Telegram Auth для авторизации\n')
      await client.disconnect()
      process.exit(0)
    }

    // Пытаемся получить информацию о пользователе
    console.log('🔐 Проверка авторизации...\n')
    try {
      const me = await client.getMe()

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✅ РЕЗУЛЬТАТ: Полностью авторизован и готов к работе!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      console.log('📱 Информация об аккаунте:')
      console.log(`   ID: ${me.id}`)
      console.log(`   Имя: ${me.firstName || 'Не указано'}`)
      console.log(`   Фамилия: ${me.lastName || 'Не указано'}`)
      console.log(`   Username: @${me.username || 'Не установлен'}`)
      console.log(`   Телефон: ${me.phone || 'Скрыт'}`)
      console.log(`   Бот: ${me.bot ? 'Да' : 'Нет'}\n`)

      // Проверяем, обновилась ли сессия
      const newSession = client.session.save()
      if (newSession !== sessionString) {
        console.log('🔄 Сессия обновлена!')
        console.log('   Новая сессия (первые 50 символов):')
        console.log(`   ${newSession.substring(0, 50)}...\n`)
        console.log('   Обновите .env файл если необходимо\n')
      }

      console.log('✅ Все проверки пройдены! Telegram API готов к использованию.\n')
    } catch (authError) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('❌ РЕЗУЛЬТАТ: Подключено, но НЕ авторизован')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      console.error('❌ Ошибка авторизации:', authError.message)
      console.error('\n📝 Возможные причины:')
      console.error('   1. Сессия устарела или была отозвана')
      console.error('   2. Сессия была создана на другом устройстве')
      console.error('   3. Аккаунт был удален или заблокирован\n')

      console.log('🔧 Решение:')
      console.log('   1. Запустите сервер: npm run dev')
      console.log('   2. Используйте /api/auth-telegram/start для новой авторизации')
      console.log('   3. Или используйте фронтенд: Settings -> Telegram Auth\n')
    }

    await client.disconnect()
    console.log('🔌 Отключено от Telegram\n')

  } catch (error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('❌ РЕЗУЛЬТАТ: Ошибка подключения')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.error('❌ Ошибка:', error.message)
    console.error('\n📝 Возможные причины:')
    console.error('   1. Неверные API_ID или API_HASH')
    console.error('   2. Проблемы с интернет-соединением')
    console.error('   3. Telegram серверы недоступны\n')

    console.error('📚 Полная ошибка:', error, '\n')
    process.exit(1)
  }
}

// Запускаем тест
testTelegramConnection()
