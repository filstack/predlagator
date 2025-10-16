# Тестовые Endpoints для прямой отправки сообщений

Эти endpoints позволяют тестировать функционал отправки сообщений в Telegram **без использования Redis/BullMQ**. Это полезно для быстрой проверки работоспособности Telegram API и настроек.

## Доступные Endpoints

### 1. Проверка статуса Telegram подключения

**GET** `/api/test/telegram-status`

Проверяет, подключен ли Telegram клиент и возвращает информацию о текущем пользователе.

**Пример запроса:**
```bash
curl http://localhost:3000/api/test/telegram-status
```

**Успешный ответ:**
```json
{
  "connected": true,
  "user": {
    "id": "123456789",
    "username": "your_username",
    "phone": "+1234567890",
    "firstName": "Your Name"
  }
}
```

**Ошибка:**
```json
{
  "connected": false,
  "error": "Telegram client not initialized"
}
```

---

### 2. Получить список каналов

**GET** `/api/test/channels`

Возвращает список всех каналов из базы данных для тестирования.

**Пример запроса:**
```bash
curl http://localhost:3000/api/test/channels
```

**Ответ:**
```json
{
  "channels": [
    {
      "id": "cm2vqowcb0000jbhp98txgwhj",
      "username": "test_channel",
      "title": "Test Channel",
      "status": "ACTIVE"
    }
  ],
  "count": 1
}
```

---

### 3. Отправить тестовое сообщение

**POST** `/api/test/send-message`

Отправляет сообщение напрямую в указанный Telegram канал, минуя систему очередей.

**Body (JSON):**
```json
{
  "channelId": "cm2vqowcb0000jbhp98txgwhj",
  "message": "Тестовое сообщение",
  "mediaType": "PHOTO",
  "mediaUrl": "https://example.com/image.jpg"
}
```

**Параметры:**
- `channelId` (обязательный) - ID канала из базы данных
- `message` (обязательный) - Текст сообщения
- `mediaType` (опциональный) - Тип медиа: `PHOTO`, `VIDEO`, `DOCUMENT`
- `mediaUrl` (опциональный) - URL медиафайла

**Пример запроса (текстовое сообщение):**
```bash
curl -X POST http://localhost:3000/api/test/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "cm2vqowcb0000jbhp98txgwhj",
    "message": "Привет! Это тестовое сообщение из API."
  }'
```

**Пример запроса (с изображением):**
```bash
curl -X POST http://localhost:3000/api/test/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "cm2vqowcb0000jbhp98txgwhj",
    "message": "Проверка отправки с изображением",
    "mediaType": "PHOTO",
    "mediaUrl": "https://picsum.photos/800/600"
  }'
```

**Успешный ответ:**
```json
{
  "success": true,
  "message": "Сообщение отправлено успешно",
  "channelUsername": "test_channel",
  "timestamp": "2025-10-15T14:30:00.000Z",
  "result": {
    "id": 12345,
    "date": 1697374200
  }
}
```

**Ошибки:**

Канал не найден (404):
```json
{
  "error": "Канал не найден"
}
```

Невалидные параметры (400):
```json
{
  "error": "channelId и message обязательны"
}
```

Ошибка Telegram API (500):
```json
{
  "error": "Не удалось отправить сообщение",
  "details": "CHANNEL_PRIVATE: You can't write in this channel",
  "type": "FloodWaitError"
}
```

---

## Как использовать для тестирования

### Шаг 1: Проверить Telegram подключение
```bash
curl http://localhost:3000/api/test/telegram-status
```

Если `connected: false`, убедитесь что:
- Telegram API credentials настроены в `.env`
- Вы прошли аутентификацию через Telegram

### Шаг 2: Получить ID канала
```bash
curl http://localhost:3000/api/test/channels
```

Скопируйте `id` канала, в который хотите отправить тестовое сообщение.

### Шаг 3: Отправить тестовое сообщение
```bash
curl -X POST http://localhost:3000/api/test/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "ВСТАВЬТЕ_ID_СЮДА",
    "message": "Тест рассылки 🚀"
  }'
```

### Шаг 4: Проверить результат

Если успешно:
- Сообщение появится в Telegram канале
- API вернет `"success": true` с деталями

Если ошибка:
- Смотрите поле `details` для информации об ошибке
- Проверьте логи backend сервера

---

## Отличия от обычной рассылки

| Параметр | Тестовый Endpoint | Обычная Рассылка |
|----------|------------------|------------------|
| Использует очереди | ❌ Нет | ✅ Да |
| Требует Redis | ❌ Нет | ✅ Да |
| Rate limiting | ❌ Нет | ✅ Да |
| Повторные попытки | ❌ Нет | ✅ Да (3 раза) |
| Логирование в БД | ❌ Нет | ✅ Да |
| Отправка в несколько каналов | ❌ Нет | ✅ Да |

---

## Когда использовать

✅ **Используйте тестовые endpoints для:**
- Проверки работоспособности Telegram API
- Быстрого тестирования формата сообщений
- Отладки проблем с конкретным каналом
- Проверки медиафайлов

❌ **НЕ используйте для:**
- Массовой рассылки (используйте `/api/campaigns`)
- Production окружения
- Автоматизированных задач

---

## Примеры использования в PowerShell

```powershell
# Проверка статуса
Invoke-RestMethod -Uri "http://localhost:3000/api/test/telegram-status"

# Получить каналы
$channels = Invoke-RestMethod -Uri "http://localhost:3000/api/test/channels"
$channels.channels

# Отправить сообщение
$body = @{
    channelId = "cm2vqowcb0000jbhp98txgwhj"
    message = "Привет из PowerShell! 👋"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:3000/api/test/send-message" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

---

## Troubleshooting

### Ошибка: "Telegram client not initialized"
**Решение:** Настройте Telegram API credentials в `.env` и перезапустите backend

### Ошибка: "CHANNEL_PRIVATE"
**Решение:** Убедитесь что бот/пользователь является администратором канала

### Ошибка: "FloodWaitError"
**Решение:** Подождите указанное количество секунд перед следующей попыткой

### Ошибка: "Connection refused"
**Решение:** Убедитесь что backend запущен на порту 3000

---

## Следующие шаги

После успешного тестирования через эти endpoints, вы можете:
1. Настроить Redis для работы с очередями
2. Использовать полноценную систему рассылки через `/api/campaigns`
3. Настроить rate limiting для безопасной работы с Telegram API
