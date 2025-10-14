# Predlagator - Telegram Channel Broadcast Management System

🚀 Профессиональная платформа для управления массовыми рассылками по Telegram каналам с веб-интерфейсом, системой батчей, кампаний и продвинутой аналитикой.

## 📋 Описание

**Predlagator** — это комплексная система для управления broadcast-рассылками в Telegram. Платформа предоставляет полный цикл работы: от импорта каталога каналов до запуска, мониторинга и анализа результатов рассылочных кампаний.

Система разработана для операторов рассылок, маркетологов и администраторов, которым необходим профессиональный инструмент для массовой коммуникации через Telegram с соблюдением лимитов API и безопасностью аккаунтов.

## ✨ Основные возможности

### 🎯 Управление каналами
- 📊 Каталог Telegram каналов с фильтрацией и поиском
- 🔍 Проверка доступности каналов (reachable/blocked/deleted)
- 🏷️ Теги, категории и метаданные каналов
- 📥 Импорт каналов из CSV/NDJSON
- 🔗 Интеграция с tg-scrap для автоматического обновления

### 📦 Батчи и кампании
- ✅ Создание батчей (групп каналов) для рассылок
- 📋 Управление списками: добавление, удаление, клонирование
- 📑 Шаблоны аудиторий для переиспользования
- 🎨 Редактор сообщений с плейсхолдерами `{{username}}`, `{{category}}`
- 🖼️ Поддержка медиа (URL, загрузка файлов, base64)
- ⏰ Отложенный запуск кампаний по расписанию

### ⚙️ Контроль доставки
- 🚦 Настройка throttling (msg/sec, задержки)
- 🔄 Retry политики с exponential backoff
- 🌐 Поддержка прокси для обхода ограничений
- 🎲 A/B тестирование вариантов сообщений
- 🧪 Test mode (отправка себе) и Dry Run (симуляция)

### 📈 Мониторинг и аналитика
- ⚡ Real-time лог событий (queued → sent → delivered/failed)
- 📊 Дашборд с метриками: success rate, speed, error breakdown
- ⏸️ Pause/Resume кампаний на лету
- 📥 Экспорт отчетов в CSV/JSON
- 🛡️ Auto-pause при превышении FLOOD_WAIT порога

### 🔐 Безопасность и контроль
- 👥 Role-based access control (Admin/Operator/Auditor)
- 🔒 Шифрование Telegram session strings (AES-256)
- 📝 Audit trail всех действий пользователей
- 🚫 Opt-out список каналов с предотвращением рассылки
- ⚠️ Автоматическая оценка рисков (Low/Medium/High)

## 🛠️ Технологический стек

### Frontend
- ⚛️ **React 18** + **TypeScript** — современный UI
- 🎨 **Vite** — быстрая сборка и hot reload
- 🧩 **shadcn/ui** — красивые компоненты на Radix UI
- 🎯 **Tailwind CSS** — utility-first стилизация
- 📡 **Zustand** — легковесный state management
- 🔗 **React Router** — клиентская маршрутизация
- 📝 **React Hook Form** + **Zod** — валидация форм

### Backend
- 🟢 **Node.js** + **Express** — REST API сервер
- 🗄️ **Prisma** — type-safe ORM для работы с БД
- 📮 **BullMQ** + **Redis** — очереди задач
- 📱 **GramJS** — клиент Telegram API
- 🔑 **Jose** — JWT аутентификация
- 🛡️ **Helmet** — security middleware
- 🔄 **CORS** — кросс-доменные запросы

### Инфраструктура
- 🚀 **Vercel** — deployment frontend (free tier)
- 💾 **Supabase/Neon** — PostgreSQL database
- 🔴 **Redis** — job queue и кэш
- 🖥️ **VPS/Railway** — backend workers

## 📦 Требования

- **Node.js** ≥ 18.x
- **PostgreSQL** ≥ 14.x (Supabase/Neon/Railway)
- **Redis** ≥ 7.x (для BullMQ)
- **Telegram API credentials** (API ID, API Hash, Session String)
- **Git** для клонирования репозитория

## 🚀 Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/filstack/predlagator.git
cd predlagator
```

### 2. Установка зависимостей

Установите зависимости для всех частей проекта:

```bash
# Root dependencies
npm install

# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# Shared schemas
cd ../shared
npm install
```

### 3. Настройка базы данных

Создайте PostgreSQL базу данных (Supabase/Neon/Railway) и настройте переменные окружения:

**Backend** (`backend/.env`):
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/predlagator?schema=public"

# Redis для очередей
REDIS_URL="redis://localhost:6379"

# Telegram API
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_SESSION=your_session_string_here

# JWT
JWT_SECRET=your_secure_random_secret_key

# Server
PORT=4000
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:4000
```

### 4. Применение миграций

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 5. Инициализация данных (опционально)

```bash
cd shared
npx prisma db seed
```

### 6. Запуск проекта

#### Development режим

**Терминал 1 - Backend API:**
```bash
cd backend
npm run dev
```

**Терминал 2 - Worker для очередей:**
```bash
cd backend
npm run worker
```

**Терминал 3 - Frontend:**
```bash
cd frontend
npm run dev
```

Приложение будет доступно:
- 🌐 Frontend: `http://localhost:5173`
- 🔌 Backend API: `http://localhost:4000`

## 📖 Получение Telegram credentials

### API ID и API Hash

1. Перейдите на https://my.telegram.org/auth
2. Войдите с номером телефона
3. Перейдите в "API development tools"
4. Создайте приложение и скопируйте `api_id` и `api_hash`

### Session String

Выполните скрипт авторизации (один раз):

```javascript
// auth-script.js
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const apiId = 12345678; // Ваш API ID
const apiHash = 'your_api_hash'; // Ваш API Hash
const stringSession = new StringSession('');

(async () => {
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await question('Phone number: '),
    password: async () => await question('2FA password (if enabled): '),
    phoneCode: async () => await question('Code from Telegram: '),
    onError: (err) => console.error(err),
  });

  console.log('\n✅ Session String:');
  console.log(client.session.save());
  console.log('\nCopy this string to TELEGRAM_SESSION in .env file');
  
  process.exit(0);
})();
```

Запустите:
```bash
node auth-script.js
```

Скопируйте полученную строку в `TELEGRAM_SESSION` в `.env`

## 📂 Структура проекта

```
predlagator/
├── frontend/                 # React + Vite приложение
│   ├── src/
│   │   ├── components/      # UI компоненты (shadcn/ui)
│   │   ├── pages/           # Страницы приложения
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Утилиты и хелперы
│   │   ├── store/           # Zustand stores
│   │   └── App.tsx          # Главный компонент
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                  # Express API сервер
│   ├── src/
│   │   ├── routes/          # API роуты
│   │   ├── controllers/     # Контроллеры бизнес-логики
│   │   ├── services/        # Сервисы (Telegram, Queue)
│   │   ├── middleware/      # Auth, validation
│   │   ├── workers/         # BullMQ job processors
│   │   ├── server.ts        # HTTP сервер
│   │   └── worker-server.ts # Worker процесс
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # DB миграции
│   └── package.json
│
├── shared/                   # Общие схемы и типы
│   ├── src/schemas/         # Zod схемы валидации
│   ├── prisma/              # Shared Prisma schema
│   └── package.json
│
├── batched_files/            # Импортированные каналы
│   └── [category]/          # Папки по категориям
│       └── *.jsonl          # JSONL файлы с каналами
│
├── specs/                    # Спецификации проекта
│   └── 001-telegram-channel-broadcast/
│       ├── spec.md          # Основная спецификация
│       ├── data-model.md    # Модель данных
│       ├── contracts/       # API контракты
│       └── checklists/      # Чеклисты
│
└── README.md
```

## 🔌 API Reference

### Основные endpoints

#### Аутентификация
```
POST   /api/auth/login       - Вход в систему
POST   /api/auth/register    - Регистрация (только admin)
POST   /api/auth/logout      - Выход
GET    /api/auth/me          - Текущий пользователь
```

#### Каналы
```
GET    /api/channels                  - Список каналов (пагинация, фильтры)
GET    /api/channels/:id              - Детали канала
POST   /api/channels/import           - Импорт из CSV/JSONL
POST   /api/channels/check-available  - Проверка доступности
GET    /api/channels/:id/preview      - Превью канала
```

#### Батчи
```
GET    /api/batches              - Список батчей
POST   /api/batches              - Создать батч
GET    /api/batches/:id          - Детали батча
PUT    /api/batches/:id          - Обновить батч (draft only)
DELETE /api/batches/:id          - Удалить батч (draft only)
POST   /api/batches/:id/clone    - Клонировать батч
POST   /api/batches/:id/channels - Добавить каналы
DELETE /api/batches/:id/channels - Удалить каналы
GET    /api/batches/:id/export   - Экспорт CSV/JSON
```

#### Шаблоны
```
GET    /api/templates        - Список шаблонов
POST   /api/templates        - Создать шаблон
GET    /api/templates/:id    - Детали шаблона
PUT    /api/templates/:id    - Обновить шаблон
DELETE /api/templates/:id    - Удалить шаблон
```

#### Кампании
```
GET    /api/campaigns             - Список кампаний (история)
POST   /api/campaigns             - Создать кампанию
GET    /api/campaigns/:id         - Детали кампании
POST   /api/campaigns/:id/start   - Запустить кампанию
POST   /api/campaigns/:id/pause   - Поставить на паузу
POST   /api/campaigns/:id/resume  - Возобновить
GET    /api/campaigns/:id/logs    - Real-time логи
GET    /api/campaigns/:id/metrics - Метрики кампании
GET    /api/campaigns/:id/export  - Экспорт отчета
```

#### Пользователи (Admin only)
```
GET    /api/users        - Список пользователей
POST   /api/users        - Создать пользователя
PUT    /api/users/:id    - Обновить роль
DELETE /api/users/:id    - Удалить пользователя
```

#### Audit Log (Admin/Auditor)
```
GET    /api/audit        - Журнал действий (фильтры)
```

### Примеры запросов

#### Создание батча
```bash
curl -X POST http://localhost:4000/api/batches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Channels Q4",
    "channelIds": [1, 2, 3, 4, 5]
  }'
```

#### Запуск кампании
```bash
curl -X POST http://localhost:4000/api/campaigns/:id/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "live",
    "throttle": {
      "msgPerSec": 2,
      "delayMs": 500
    },
    "retryPolicy": {
      "maxAttempts": 3,
      "backoff": "exponential"
    }
  }'
```

#### Получение метрик кампании
```bash
curl -X GET http://localhost:4000/api/campaigns/:id/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "campaignId": "123",
  "status": "sending",
  "totalJobs": 1000,
  "completed": 750,
  "failed": 50,
  "queued": 200,
  "successRate": 93.75,
  "speed": 2.1,
  "errors": {
    "FLOOD_WAIT": 30,
    "PEER_BLOCKED": 15,
    "NETWORK_ERROR": 5
  }
}
```

## 💡 Типовые сценарии использования

### 1️⃣ Первая рассылка

```typescript
// 1. Импортируем каналы
POST /api/channels/import
{
  "file": "channels.jsonl",
  "category": "tech"
}

// 2. Создаем батч
POST /api/batches
{
  "name": "Tech Channels Q1",
  "channelIds": [1, 2, 3, 4, 5]
}

// 3. Создаем шаблон сообщения
POST /api/templates
{
  "name": "Product Promo",
  "content": "Привет {{username}}! Новое предложение для {{category}} каналов",
  "mediaUrl": "https://example.com/promo.jpg"
}

// 4. Создаем кампанию
POST /api/campaigns
{
  "batchId": 1,
  "templateId": 1,
  "mode": "test"
}

// 5. Тестируем
POST /api/campaigns/1/start
{
  "mode": "test"
}

// 6. Если ОК, запускаем на всю базу
POST /api/campaigns/1/start
{
  "mode": "live",
  "throttle": { "msgPerSec": 2 }
}
```

### 2️⃣ Мониторинг кампании

```javascript
// Frontend: Подписка на обновления
const pollMetrics = async (campaignId) => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/campaigns/${campaignId}/metrics`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const metrics = await response.json();
    
    updateDashboard(metrics);
    
    if (metrics.status === 'completed') {
      clearInterval(interval);
    }
  }, 2000); // Poll every 2 seconds
};
```

### 3️⃣ Автоматическая пауза при ошибках

```typescript
// Worker автоматически паузит кампанию при FLOOD_WAIT
// Настраивается в config
{
  "autoПауза": {
    "floodThreshold": 3,  // 3 ошибки FLOOD подряд
    "errorRate": 0.1      // или 10% failed jobs
  }
}
```

## 🔒 Безопасность

### 🔐 Шифрование Session Strings

Session strings шифруются AES-256 перед сохранением в БД:

```typescript
// backend/src/services/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = process.env.ENCRYPTION_KEY; // 32 байта

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

### 👥 Role-Based Access Control

Три роли с разными правами:

| Роль | Права |
|------|-------|
| **Admin** | Полный доступ: управление пользователями, view session strings, delete any campaign |
| **Operator** | Создание батчей, кампаний, просмотр собственных кампаний |
| **Auditor** | Read-only: история кампаний, логи, отчеты |

### 📝 Audit Trail

Все действия логируются:

```sql
-- Пример записи в audit_log
INSERT INTO audit_log (
  user_id, action, entity_type, entity_id, 
  previous_value, new_value, ip_address
) VALUES (
  1, 'campaign_launched', 'Campaign', 42,
  '{"status": "draft"}', '{"status": "sending"}', 
  '192.168.1.1'
);
```

### 🚫 Opt-Out Management

```typescript
// Каналы с opt_out=true не могут быть добавлены в батчи
POST /api/batches/1/channels
{
  "channelIds": [10, 20, 30] // 20 has opt_out=true
}

// Response 400:
{
  "error": "Cannot add opt-out channels",
  "blockedChannels": [20]
}
```

## ⚡ Performance

### Оптимизации

- 🚀 **Connection pooling**: 3-5 GramJS sessions параллельно
- 📦 **Job batching**: BullMQ группирует задачи для эффективности
- 💾 **Caching**: Redis кэш для peer_id резолвинга
- ⏱️ **Throttling**: Встроенная защита от FLOOD_WAIT
- 📊 **Indexing**: Оптимизированные индексы в Prisma schema

### Масштабируемость

- До **10,000 каналов** в одном батче
- До **100 concurrent campaigns** (limited by Redis/workers)
- Throughput: **2-30 msg/sec** (configurable, respecting Telegram limits)

## 🚀 Production Deployment

### Vercel (Frontend)

1. **Подключите GitHub репозиторий к Vercel**
2. **Настройте Build settings:**
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables:**
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

4. **Deploy:**
   ```bash
   git push origin main
   # Vercel автоматически задеплоит
   ```

### Railway/Render (Backend + Worker)

**Backend API:**
```bash
# Dockerfile для backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "start"]
```

**Worker process:**
```bash
# Отдельный сервис для worker
CMD ["npm", "run", "worker"]
```

**Environment Variables на Railway:**
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
TELEGRAM_SESSION=...
JWT_SECRET=...
ENCRYPTION_KEY=...
NODE_ENV=production
```

### Docker Compose (Self-hosted)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: predlagator
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/predlagator
      REDIS_URL: redis://redis:6379
      TELEGRAM_API_ID: ${TELEGRAM_API_ID}
      TELEGRAM_API_HASH: ${TELEGRAM_API_HASH}
      TELEGRAM_SESSION: ${TELEGRAM_SESSION}
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: backend/Dockerfile
    command: npm run worker
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/predlagator
      REDIS_URL: redis://redis:6379
      TELEGRAM_API_ID: ${TELEGRAM_API_ID}
      TELEGRAM_API_HASH: ${TELEGRAM_API_HASH}
      TELEGRAM_SESSION: ${TELEGRAM_SESSION}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    environment:
      VITE_API_URL: http://localhost:4000
    ports:
      - "5173:80"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

Запуск:
```bash
docker-compose up -d
```

## 🐛 Troubleshooting

### ❌ FLOOD_WAIT ошибки

**Проблема:** Слишком быстрая отправка сообщений

**Решение:**
- Уменьшите throttle до 1-2 msg/sec
- Увеличьте delay между сообщениями
- Используйте несколько session strings (разные аккаунты)
- Подождите время, указанное в ошибке

### ❌ Кампания не запускается

**Проблема:** Status stuck в "draft"

**Решение:**
1. Проверьте, запущен ли worker процесс: `npm run worker`
2. Убедитесь, что Redis доступен
3. Проверьте логи worker: `docker logs predlagator-worker`

### ❌ Session expired

**Проблема:** "AUTH_KEY_UNREGISTERED" или "SESSION_REVOKED"

**Решение:**
1. Пересоздайте session string через auth-script
2. Обновите `TELEGRAM_SESSION` в .env
3. Перезапустите backend и worker

### ❌ Database connection failed

**Проблема:** "Can't reach database server"

**Решение:**
```bash
# Проверьте подключение к БД
psql $DATABASE_URL

# Проверьте миграции
cd backend
npx prisma migrate status
npx prisma migrate deploy
```

### ❌ Frontend не видит Backend API

**Проблема:** CORS errors, Network failed

**Решение:**
1. Убедитесь, что `VITE_API_URL` указывает на правильный адрес
2. Проверьте CORS настройки в backend:
```typescript
// backend/src/server.ts
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

## ⚠️ Ограничения Telegram API

- 📦 **Размер медиа:** max 50 MB
- ⚡ **Rate limits:** ~30 msg/sec глобально, 20 msg/min per chat
- 🚫 **Спам:** 300+ msg/day может вызвать бан
- 📏 **Длина сообщения:** max 4096 символов
- 👤 **Peer limitations:** Нельзя писать пользователям, которые не начали диалог первыми


- [Vercel Deployment](https://vercel.com/docs)

---

⭐ **Если проект полезен, поставьте звезду на GitHub!**
