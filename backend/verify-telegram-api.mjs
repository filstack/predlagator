import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import dotenv from 'dotenv';

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID || '');
const apiHash = process.env.TELEGRAM_API_HASH || '';

console.log('🔍 Проверка Telegram API credentials\n');
console.log('API ID:', apiId);
console.log('API Hash:', apiHash ? `${apiHash.substring(0, 10)}...` : 'НЕ ЗАДАН');
console.log('');

// Проверка 1: API ID и API Hash должны быть корректными
if (!apiId || apiId === 0) {
  console.error('❌ API ID неверный!');
  console.log('Получите новый API ID на: https://my.telegram.org/apps');
  process.exit(1);
}

if (!apiHash || apiHash.length < 32) {
  console.error('❌ API Hash слишком короткий или неверный!');
  console.log('API Hash должен быть длиной 32 символа');
  console.log('Получите новый API Hash на: https://my.telegram.org/apps');
  process.exit(1);
}

console.log('✅ Базовая проверка пройдена\n');

// Проверка 2: Попробуем подключиться и отправить код
const session = new StringSession('');
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 3,
  timeout: 10000,
});

try {
  console.log('📡 Подключение к Telegram...');
  await client.connect();
  console.log('✅ Подключение успешно!\n');

  // Попробуем отправить код на тестовый номер
  const phone = '+79219124745';
  console.log(`📤 Отправка кода на ${phone}...\n`);

  const result = await client.sendCode(
    {
      apiId: apiId,
      apiHash: apiHash,
    },
    phone
  );

  console.log('📊 РЕЗУЛЬТАТ от Telegram:');
  console.log('  phoneCodeHash:', result.phoneCodeHash);
  console.log('  isCodeViaApp:', result.isCodeViaApp || false);
  console.log('  type:', result.type?.className || 'не указан');
  console.log('  timeout:', result.timeout || 'не указан');
  console.log('');

  if (result.phoneCodeHash && result.phoneCodeHash.length > 0) {
    console.log('✅ Telegram API принял запрос!');
    console.log('');

    if (result.isCodeViaApp) {
      console.log('📱 Код должен прийти в ПРИЛОЖЕНИЕ Telegram');
      console.log('');
      console.log('ВНИМАНИЕ! Возможные причины, почему код не приходит:');
      console.log('');
      console.log('1. 🚫 FLOOD_WAIT - слишком много запросов');
      console.log('   Telegram блокирует отправку на 10-15 минут');
      console.log('   Подождите и попробуйте снова');
      console.log('');
      console.log('2. ⚠️  Неправильный API Application на my.telegram.org');
      console.log('   Проверьте, что приложение НЕ удалено');
      console.log('   Откройте: https://my.telegram.org/apps');
      console.log('');
      console.log('3. 📵 Telegram не запущен или нет интернета');
      console.log('   Убедитесь, что Telegram работает на телефоне');
      console.log('');
      console.log('4. 🔔 Уведомления отключены');
      console.log('   Включите уведомления в настройках Telegram');
    } else {
      console.log('📨 Код должен прийти как SMS');
    }
  } else {
    console.error('❌ Telegram API вернул пустой phoneCodeHash!');
    console.log('Это означает, что API credentials неверные');
  }

} catch (error) {
  console.error('\n❌ ОШИБКА:', error.message);
  console.log('');

  if (error.message.includes('API_ID_INVALID')) {
    console.log('💡 API ID неверный!');
    console.log('Решение:');
    console.log('1. Откройте https://my.telegram.org/apps');
    console.log('2. Войдите с номером +79219124745');
    console.log('3. Создайте новое приложение или используйте существующее');
    console.log('4. Скопируйте ПРАВИЛЬНЫЕ API ID и API Hash');
    console.log('5. Обновите backend/.env');
  } else if (error.message.includes('API_ID_PUBLISHED_FLOOD')) {
    console.log('💡 API ID использовался слишком часто!');
    console.log('Решение:');
    console.log('1. Создайте НОВОЕ приложение на https://my.telegram.org/apps');
    console.log('2. Используйте новые API credentials');
  } else if (error.message.includes('PHONE_NUMBER_FLOOD')) {
    console.log('💡 Слишком много попыток для этого номера!');
    console.log('Решение: Подождите 24 часа или используйте другой номер');
  } else if (error.message.includes('FLOOD_WAIT')) {
    const waitTime = error.message.match(/FLOOD_WAIT_(\d+)/);
    const seconds = waitTime ? waitTime[1] : '900';
    console.log(`💡 Telegram заблокировал запросы на ${seconds} секунд`);
    console.log(`Подождите ${Math.ceil(seconds / 60)} минут`);
  }
} finally {
  await client.disconnect();
  console.log('\n👋 Отключено');
  process.exit(0);
}
