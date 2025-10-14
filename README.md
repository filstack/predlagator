# Telegram Sender Bot

REST API сервис для автоматической отправки сообщений через Telegram с использованием библиотеки GramJS.

## Описание

Telegram Sender Bot — это HTTP-сервер, предоставляющий REST API для отправки сообщений в Telegram. Сервис поддерживает отправку текстовых сообщений, медиафайлов (изображения, видео), а также комбинированных сообщений. Идеально подходит для автоматизации рассылок, уведомлений и интеграции Telegram в ваши бизнес-процессы.

## Возможности

- ✉️ Отправка текстовых сообщений в Telegram
- 🖼️ Отправка медиафайлов (изображения, видео)
- 📎 Поддержка медиа через URL или base64
- 👤 Работа с пользователями по username или peer ID
- 🔍 Резолвинг username в peer ID
- 📚 Встроенная Swagger документация
- 🚀 Простой REST API интерфейс
- 🔄 Автоматическое переподключение к Telegram
- 🛡️ Обработка ошибок и валидация

## Технологии

- **Node.js** — runtime окружение
- **Express** — веб-фреймворк для REST API
- **GramJS (telegram)** — библиотека для работы с Telegram API
- **Swagger** — документация API
- **dotenv** — управление конфигурацией

## Требования

- Node.js версии 14.x или выше
- npm или yarn
- Telegram API credentials (API ID и API Hash)
- Активная сессия Telegram (session string)

## Установка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd бот_рассылка
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта (или используйте существующий):

```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION=your_session_string
PORT=3000
```

#### Как получить API ID и API Hash:

1. Перейдите на https://my.telegram.org/auth
2. Войдите с помощью вашего номера телефона
3. Перейдите в раздел "API development tools"
4. Создайте новое приложение
5. Скопируйте `api_id` и `api_hash`

#### Как получить Session String:

Для получения session string необходимо один раз авторизоваться через Telegram. Можно использовать специальные скрипты для генерации session string:

```javascript
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';

const apiId = YOUR_API_ID;
const apiHash = 'YOUR_API_HASH';
const stringSession = new StringSession('');

(async () => {
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('Phone number: '),
    password: async () => await input.text('Password: '),
    phoneCode: async () => await input.text('Code: '),
    onError: (err) => console.log(err),
  });

  console.log('Session String:', client.session.save());
})();
```

Полученный session string необходимо добавить в файл `.env`.

## Запуск

### Режим разработки

```bash
npm start
```

Сервер запустится на порту, указанном в `.env` (по умолчанию 3000).

### Проверка работы

После запуска сервера:
- API доступен по адресу: `http://localhost:3000`
- Swagger UI доступен по адресу: `http://localhost:3000/api-docs`
- Health check: `http://localhost:3000/health`

## API Документация

### Swagger UI

Полная интерактивная документация API доступна по адресу:
```
http://localhost:3000/api-docs
```

### Endpoints

#### 1. Health Check

Проверка работоспособности сервиса.

**Endpoint:** `GET /health`

**Ответ:**
```json
{
  "status": "ok"
}
```

---

#### 2. Resolve Username

Получить peer ID пользователя по его username.

**Endpoint:** `POST /resolve`

**Request Body:**
```json
{
  "username": "durov"
}
```

**Response:**
```json
{
  "peer": "123456789"
}
```

**Примеры ошибок:**
- `400` — Username не указан
- `404` — Пользователь не найден
- `500` — Ошибка сервера

---

#### 3. Send Message (Универсальный)

Отправка сообщения (текст и/или медиа). **Рекомендуемый endpoint для использования.**

**Endpoint:** `POST /send`

**Request Body (только текст):**
```json
{
  "text": "Привет! Это тестовое сообщение",
  "username": "durov"
}
```

**Request Body (текст + медиа URL):**
```json
{
  "text": "Смотри какое фото!",
  "username": "durov",
  "media_url": "https://example.com/image.jpg"
}
```

**Request Body (текст + медиа base64):**
```json
{
  "text": "Картинка из base64",
  "username": "durov",
  "media_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "filename": "image.png"
}
```

**Request Body (отправка себе):**
```json
{
  "text": "Сообщение себе"
}
```

**Параметры:**
- `text` (обязательный) — текст сообщения
- `username` (опционально) — username получателя (без @)
- `peer` (опционально) — peer ID получателя
- `media_url` (опционально) — URL медиафайла
- `media_base64` (опционально) — base64 строка медиафайла
- `filename` (опционально) — имя файла для определения расширения

**Примечания:**
- Если не указаны `username` и `peer`, сообщение отправится в "Избранное" (себе)
- `media_base64` может быть как data URL (`data:image/png;base64,...`), так и чистой base64 строкой
- При указании и `media_url`, и `media_base64`, приоритет у `media_url`

**Response:**
```json
{
  "success": true
}
```

---

#### 4. Send Text Message (Устаревший)

Отправка только текстового сообщения.

**Endpoint:** `POST /sendText`

**Статус:** Deprecated (рекомендуется использовать `/send`)

**Request Body:**
```json
{
  "text": "Привет!",
  "username": "durov"
}
```

**Параметры:**
- `text` (обязательный) — текст сообщения
- `username` (опционально) — username получателя
- `peer` (опционально) — peer ID получателя

---

#### 5. Send Media (Устаревший)

Отправка медиафайла с подписью.

**Endpoint:** `POST /sendMedia`

**Статус:** Deprecated (рекомендуется использовать `/send`)

**Request Body:**
```json
{
  "username": "durov",
  "media_url": "https://example.com/video.mp4",
  "caption": "Смотри это видео!"
}
```

**Параметры:**
- `username` или `peer` (обязательный) — получатель
- `media_url` или `media_base64` (обязательный) — медиафайл
- `caption` (опционально) — подпись к медиа
- `filename` (опционально) — имя файла

## Примеры использования

### cURL

**Отправка текстового сообщения:**
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Привет из cURL!",
    "username": "durov"
  }'
```

**Отправка с медиа:**
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Фото дня",
    "username": "durov",
    "media_url": "https://picsum.photos/800/600"
  }'
```

**Resolve username:**
```bash
curl -X POST http://localhost:3000/resolve \
  -H "Content-Type: application/json" \
  -d '{"username": "durov"}'
```

### JavaScript (fetch)

```javascript
// Отправка сообщения
async function sendMessage() {
  const response = await fetch('http://localhost:3000/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: 'Привет из JavaScript!',
      username: 'durov'
    })
  });

  const result = await response.json();
  console.log(result);
}

// Отправка с медиа
async function sendWithMedia() {
  const response = await fetch('http://localhost:3000/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: 'Смотри фото!',
      username: 'durov',
      media_url: 'https://example.com/image.jpg'
    })
  });

  const result = await response.json();
  console.log(result);
}
```

### Python

```python
import requests

# Отправка сообщения
def send_message():
    url = 'http://localhost:3000/send'
    data = {
        'text': 'Привет из Python!',
        'username': 'durov'
    }
    response = requests.post(url, json=data)
    print(response.json())

# Отправка с base64 изображением
def send_with_base64():
    import base64

    # Читаем файл и конвертируем в base64
    with open('image.png', 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')

    url = 'http://localhost:3000/send'
    data = {
        'text': 'Картинка из Python',
        'username': 'durov',
        'media_base64': f'data:image/png;base64,{image_data}',
        'filename': 'image.png'
    }
    response = requests.post(url, json=data)
    print(response.json())

send_message()
```

### PHP

```php
<?php

// Отправка сообщения
function sendMessage() {
    $url = 'http://localhost:3000/send';
    $data = [
        'text' => 'Привет из PHP!',
        'username' => 'durov'
    ];

    $options = [
        'http' => [
            'header' => "Content-Type: application/json\r\n",
            'method' => 'POST',
            'content' => json_encode($data)
        ]
    ];

    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);

    echo $result;
}

sendMessage();
?>
```

## Структура проекта

```
бот_рассылка/
├── src/
│   └── index.js          # Основной файл приложения
├── node_modules/         # Зависимости
├── .env                  # Конфигурация (не коммитится в git)
├── package.json          # Информация о проекте и зависимости
└── README.md            # Документация
```

## Обработка ошибок

Все endpoints возвращают JSON с описанием ошибки в случае проблем:

```json
{
  "error": "Описание ошибки",
  "details": "Детальная информация",
  "type": "Тип ошибки"
}
```

### Типичные ошибки

| Код | Описание | Решение |
|-----|----------|---------|
| 400 | Неверный запрос | Проверьте обязательные параметры |
| 404 | Пользователь не найден | Убедитесь, что username существует |
| 500 | Ошибка сервера | Проверьте логи сервера и конфигурацию |

### Логирование

Сервер выводит подробные логи в консоль:
- Информация о подключении к Telegram
- Входящие запросы
- Отправленные сообщения
- Ошибки с деталями

## Безопасность

⚠️ **Важные замечания по безопасности:**

1. **Не коммитьте `.env` файл в git** — он содержит чувствительные данные
2. **Не публикуйте Session String** — с его помощью можно получить доступ к вашему аккаунту
3. **Используйте HTTPS** в продакшене
4. **Ограничьте доступ к API** — используйте авторизацию/API ключи
5. **Регулярно обновляйте зависимости** — `npm update`
6. **Используйте rate limiting** — ограничьте количество запросов

### Рекомендации для продакшена

```javascript
// Добавьте middleware для авторизации
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Добавьте rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов
});

app.use(limiter);
```

## Deployment

### PM2 (Process Manager)

```bash
# Установка PM2
npm install -g pm2

# Запуск приложения
pm2 start src/index.js --name telegram-bot

# Просмотр логов
pm2 logs telegram-bot

# Перезапуск
pm2 restart telegram-bot

# Автозапуск при перезагрузке системы
pm2 startup
pm2 save
```

### Docker

Создайте `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Создайте `docker-compose.yml`:

```yaml
version: '3.8'

services:
  telegram-bot:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
```

Запуск:

```bash
docker-compose up -d
```

### Systemd (Linux)

Создайте файл `/etc/systemd/system/telegram-bot.service`:

```ini
[Unit]
Description=Telegram Sender Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/бот_рассылка
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Запуск:

```bash
sudo systemctl enable telegram-bot
sudo systemctl start telegram-bot
sudo systemctl status telegram-bot
```

## Troubleshooting

### Проблема: "Клиент не авторизован"

**Решение:** Пересоздайте session string с помощью скрипта авторизации.

### Проблема: "Cannot connect to Telegram"

**Решение:**
1. Проверьте интернет-соединение
2. Убедитесь, что Telegram не заблокирован в вашей стране
3. Попробуйте использовать прокси/VPN

### Проблема: "Пользователь не найден"

**Решение:**
1. Убедитесь, что username указан без символа @
2. Проверьте, что пользователь существует
3. Попробуйте сначала написать пользователю из Telegram клиента

### Проблема: "Error sending media"

**Решение:**
1. Проверьте формат base64 строки
2. Убедитесь, что URL доступен
3. Проверьте размер файла (Telegram имеет ограничения)
4. Убедитесь, что указан правильный MIME type

## Ограничения Telegram API

- Максимальный размер файла: 50 MB
- Rate limit: ~30 сообщений в секунду
- Максимум 20 сообщений в минуту в один чат
- Нельзя отправлять сообщения пользователям, которые не начали диалог с вами первыми (если не используется бот)

## Лицензия

MIT License

## Поддержка

Если у вас возникли вопросы или проблемы, создайте issue в репозитории проекта.

## Changelog

### Version 1.0.0 (Текущая)
- ✅ Базовая функциональность отправки сообщений
- ✅ Поддержка медиафайлов
- ✅ Swagger документация
- ✅ Health check endpoint
- ✅ Username resolver

### Планируемые функции
- [ ] Отправка нескольких медиафайлов (альбомы)
- [ ] Планировщик сообщений
- [ ] Webhook уведомления
- [ ] Шаблоны сообщений
- [ ] Bulk рассылка
- [ ] Статистика отправок
- [ ] Web UI для управления

## Contributing

Мы приветствуем ваш вклад в развитие проекта! Пожалуйста:

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## Авторы

Разработано для автоматизации Telegram рассылок.

---

**Полезные ссылки:**
- [Telegram API Documentation](https://core.telegram.org/api)
- [GramJS Documentation](https://gram.js.org/)
- [Express Documentation](https://expressjs.com/)
- [Swagger Documentation](https://swagger.io/docs/)
# predlagator
