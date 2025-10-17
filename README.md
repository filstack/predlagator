# Predlagator - Система управления Telegram рассылками

🚀 Профессиональная платформа для управления массовыми рассылками по Telegram каналам с полной мультитенантностью, персональными Telegram аккаунтами и продвинутой системой очередей.

## 📋 Описание

**Predlagator** — комплексная система для управления broadcast-рассылками в Telegram. Каждый пользователь работает со своим Telegram аккаунтом, управляет собственными каналами и кампаниями. Платформа обеспечивает полную изоляцию данных, безопасность и масштабируемость.

## ✨ Основные возможности

### 🔐 Аутентификация и мультитенантность

- Регистрация и вход через Supabase Auth (email + password)
- Полная изоляция данных пользователей через Row Level Security (RLS)
- Персональные Telegram credentials для каждого пользователя (API ID, API Hash, Session String)
- Поддержка нескольких Telegram аккаунтов на одного пользователя
- Безопасное хранение credentials с AES-256 шифрованием
- JWT-токены для всех API запросов
- Onboarding процесс для настройки Telegram при первом входе

### 📱 Управление Telegram аккаунтами

- Добавление неограниченного количества Telegram аккаунтов
- Авторизация через SMS код и 2FA
- Автоматическое сохранение session strings
- Управление активными/неактивными аккаунтами
- Отображение информации о подключенных Telegram пользователях
- Кэширование Telegram клиентов (до 50 подключений, TTL 30 минут)
- LRU eviction стратегия для оптимизации памяти

### 🎯 Управление каналами

- Каталог Telegram каналов с фильтрацией и поиском
- Проверка доступности каналов (active/blocked/deleted)
- Категоризация и тегирование каналов
- Импорт каналов из CSV/JSONL файлов
- Обновление метаданных каналов
- Изоляция каналов по пользователям (RLS)

### 📦 Батчи (группы каналов)

- Создание батчей для группировки целевых каналов
- Добавление/удаление каналов из батчей
- Клонирование существующих батчей
- Управление draft/finalized статусами
- Экспорт батчей в CSV/JSON
- Просмотр статистики по батчам

### 📝 Шаблоны сообщений

- Редактор текстовых сообщений с placeholders
- Поддержка медиа контента (изображения, видео, документы)
- Загрузка медиа через URL или прямая загрузка файлов
- Переиспользуемые шаблоны для кампаний
- Предпросмотр перед отправкой
- Версионирование шаблонов

### 🚀 Кампании и рассылки

- Создание кампаний на основе батчей и шаблонов
- Выбор конкретного Telegram аккаунта для отправки
- Настраиваемый throttling (сообщений в секунду)
- Retry политики с exponential backoff
- Test mode (отправка себе для проверки)
- Dry run (симуляция без отправки)
- Отложенный запуск по расписанию
- Pause/Resume кампаний в реальном времени

### ⚙️ Система очередей (pg-boss)

- PostgreSQL-based очереди без зависимости от Redis
- Dual-queue архитектура: campaign orchestration + message delivery
- Автоматическое создание jobs для каждого канала в кампании
- Rate limiting через singleton jobs
- Retry с экспоненциальной задержкой (5s, 10s, 20s)
- Автоматическая обработка FLOOD_WAIT ошибок
- Очистка completed jobs после настраиваемого retention периода
- Мультитенантная обработка (несколько пользователей параллельно)

### 📈 Мониторинг и аналитика

- Real-time отслеживание статуса кампаний (queued → sending → sent/failed)
- Детальная статистика: success rate, delivery speed, error breakdown
- Логи всех job transitions с timestamps
- Метрики по каждому каналу (успешная доставка, ошибки, retry attempts)
- Dashboard с визуализацией прогресса кампаний
- История всех кампаний с фильтрацией
- Экспорт отчетов в CSV/JSON

### 🛡️ Безопасность и контроль

- Row Level Security (RLS) для всех таблиц Supabase
- Шифрование Telegram credentials (AES-256-CBC)
- Audit trail всех действий пользователей
- Role-based access control (Admin/Operator/Auditor)
- Rate limiting по user_id
- Защита от несанкционированного доступа к данным других пользователей
- Автоматическое обнаружение и пауза при FLOOD_WAIT
- Маркировка неактивных каналов при PEER_BLOCKED ошибках

### 🔄 Workers и фоновые задачи

- Отдельный worker процесс для обработки очередей
- Campaign worker для оркестрации кампаний
- Message worker для доставки сообщений
- Автоматический retry при временных ошибках
- Graceful shutdown при остановке workers
- Логирование всех операций в БД

## 🛠️ Технологический стек

### Backend
- **Node.js** 20+ — серверная платформа
- **TypeScript** 5.3 — type-safe разработка
- **Express** 4.18 — REST API server
- **Supabase** (@supabase/supabase-js ^2.75.0) — PostgreSQL БД + Auth
- **pg-boss** ^9.0.3 — PostgreSQL-based job queue
- **GramJS** (telegram ^2.26.22) — Telegram MTProto клиент
- **Jose** — JWT token handling
- **bcryptjs** — password hashing
- **Zod** — schema validation

### Frontend
- **React** 18 + **TypeScript** — UI framework
- **Vite** — build tool и dev server
- **shadcn/ui** — компонентная библиотека на Radix UI
- **Tailwind CSS** — utility-first стилизация
- **React Router** — клиентская маршрутизация
- **Zustand** — state management (опционально)

### Инфраструктура
- **Supabase** — PostgreSQL database + Auth + Storage
- **Vercel/Railway** — deployment платформы
- **Git** — version control

## 📦 Требования

- **Node.js** ≥ 20.x
- **Supabase** проект (PostgreSQL + Auth)
- **Telegram API credentials** (API ID, API Hash, получаются на my.telegram.org)
- **Git** для клонирования репозитория

## 🚀 Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-repo/predlagator.git
cd predlagator
```

### 2. Настройка Backend

```bash
cd backend
npm install
```

Создайте файл `backend/.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_DIRECT_URL=postgres://postgres.project:[password]@aws-region.pooler.supabase.com:5432/postgres

# Encryption
ENCRYPTION_KEY=your_32_byte_hex_key

# Server
PORT=3000
NODE_ENV=development
```

### 3. Настройка базы данных

Выполните миграции в Supabase:

```bash
# Скопируйте SQL из shared/migrations/ в Supabase SQL Editor
# Или используйте Supabase CLI
supabase migration up
```

### 4. Запуск Backend

```bash
# Терминал 1: API server
npm run dev

# Терминал 2: Worker process
npm run worker
```

### 5. Настройка Frontend

```bash
cd ../frontend
npm install
```

Создайте файл `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 6. Запуск Frontend

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:5173`

## 📖 Использование

### Первый запуск

1. **Регистрация**: Откройте приложение и зарегистрируйтесь (email + password)
2. **Onboarding**: Следуйте 3-шаговому процессу настройки Telegram:
   - Введите API ID, API Hash, Phone number
   - Подтвердите авторизацию через SMS код (и 2FA если включена)
   - Session string автоматически сохранится
3. **Готово**: Начните импортировать каналы и создавать кампании

### Создание первой рассылки

1. **Импорт каналов**: Загрузите JSONL/CSV файл с каналами
2. **Создание батча**: Выберите целевые каналы и создайте батч
3. **Шаблон**: Создайте сообщение (текст + опционально медиа)
4. **Кампания**: Создайте кампанию, выберите батч, шаблон и Telegram аккаунт
5. **Запуск**: Запустите кампанию и отслеживайте прогресс в реальном времени

## 📂 Структура проекта

```
backend/
├── src/
│   ├── server.ts              # Express API server
│   ├── worker-server.ts       # Worker process (pg-boss)
│   ├── api/                   # API endpoints
│   │   ├── auth.ts            # Supabase Auth endpoints
│   │   ├── campaigns.ts       # Campaign CRUD
│   │   ├── channels.ts        # Channel management
│   │   └── ...
│   ├── workers/
│   │   ├── campaign-worker.ts # Campaign orchestration
│   │   └── message-worker.ts  # Message delivery
│   ├── services/
│   │   └── telegram.ts        # Telegram client management
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client
│   │   └── telegram-client.ts # Multi-tenant Telegram clients
│   ├── middleware/
│   │   ├── authorize.ts       # Supabase Auth middleware
│   │   └── validate.ts        # Request validation
│   └── utils/
│       ├── encryption.ts      # AES-256 encryption
│       ├── jwt.ts             # JWT helpers
│       └── bcrypt.ts          # Password hashing

frontend/
├── src/
│   ├── pages/                 # React pages
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Onboarding.tsx
│   │   ├── Channels.tsx
│   │   ├── Batches.tsx
│   │   ├── Campaigns.tsx
│   │   └── ...
│   ├── components/            # UI components
│   ├── contexts/
│   │   └── AuthContext.tsx    # Supabase Auth context
│   └── lib/
│       └── api.ts             # API client with JWT

shared/
├── migrations/                # SQL миграции для Supabase
│   ├── 001_initial_schema.sql
│   ├── 002_multitenancy.sql
│   └── ...
└── types/                     # Shared TypeScript types

specs/
├── 001-telegram-channel-broadcast/  # Feature spec 001
├── 002-migrate-from-bullmq/         # Feature spec 002
└── 003-multitenancy-supabase-auth/  # Feature spec 003
```

## 🔌 API Reference

### Аутентификация

- `POST /api/auth/register` - Регистрация нового пользователя
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/logout` - Выход из системы
- `GET /api/auth/me` - Получить текущего пользователя

### Telegram Accounts

- `GET /api/telegram-accounts` - Список Telegram аккаунтов пользователя
- `POST /api/telegram-accounts` - Добавить новый Telegram аккаунт
- `PUT /api/telegram-accounts/:id` - Обновить Telegram аккаунт
- `DELETE /api/telegram-accounts/:id` - Удалить Telegram аккаунт
- `POST /api/telegram-accounts/:id/auth` - Авторизация в Telegram (получить SMS код)
- `POST /api/telegram-accounts/:id/verify` - Подтвердить код и сохранить session

### Channels

- `GET /api/channels` - Список каналов (с фильтрацией и пагинацией)
- `POST /api/channels/import` - Импорт каналов из JSONL/CSV
- `GET /api/channels/:id` - Детали канала
- `PUT /api/channels/:id` - Обновить канал
- `DELETE /api/channels/:id` - Удалить канал
- `POST /api/channels/check-availability` - Проверить доступность каналов

### Batches

- `GET /api/batches` - Список батчей
- `POST /api/batches` - Создать батч
- `GET /api/batches/:id` - Детали батча
- `PUT /api/batches/:id` - Обновить батч
- `DELETE /api/batches/:id` - Удалить батч
- `POST /api/batches/:id/clone` - Клонировать батч
- `POST /api/batches/:id/channels` - Добавить каналы в батч
- `DELETE /api/batches/:id/channels` - Удалить каналы из батча

### Templates

- `GET /api/templates` - Список шаблонов
- `POST /api/templates` - Создать шаблон
- `GET /api/templates/:id` - Детали шаблона
- `PUT /api/templates/:id` - Обновить шаблон
- `DELETE /api/templates/:id` - Удалить шаблон

### Campaigns

- `GET /api/campaigns` - Список кампаний
- `POST /api/campaigns` - Создать кампанию
- `GET /api/campaigns/:id` - Детали кампании
- `POST /api/campaigns/:id/start` - Запустить кампанию
- `POST /api/campaigns/:id/pause` - Поставить на паузу
- `POST /api/campaigns/:id/resume` - Возобновить
- `GET /api/campaigns/:id/metrics` - Метрики кампании
- `GET /api/campaigns/:id/logs` - Логи кампании
- `GET /api/campaigns/:id/export` - Экспорт отчета

## 🔒 Безопасность

### Row Level Security (RLS)

Все таблицы защищены RLS политиками:
- Пользователи видят только свои данные
- Невозможен доступ к данным других пользователей через API
- Service role используется только для системных операций

### Шифрование

- Telegram credentials (API Hash, Session String) шифруются AES-256-CBC
- ENCRYPTION_KEY хранится в переменных окружения
- IV генерируется случайно для каждого шифрования

### Аудит

- Все критические операции логируются в audit_logs
- Сохраняются: user_id, action, entity_type, entity_id, timestamp, IP address

## ⚡ Производительность

### Оптимизации

- Кэширование Telegram клиентов (до 50 подключений)
- LRU eviction для управления памятью
- PostgreSQL индексы на все frequently queried поля
- pg-boss batch processing для эффективной обработки jobs
- Connection pooling для Supabase

### Масштабируемость

- Поддержка нескольких пользователей параллельно
- Неограниченное количество Telegram аккаунтов на пользователя
- До 10,000+ каналов на батч
- Throughput: 2-30 сообщений/сек (настраиваемо)

## 🐛 Troubleshooting

### FLOOD_WAIT ошибки

**Проблема**: Telegram возвращает ошибку о превышении лимита

**Решение**:
- Уменьшите throttling до 1-2 msg/sec
- Система автоматически паузит кампанию
- Используйте несколько Telegram аккаунтов для параллельной отправки

### Session expired

**Проблема**: AUTH_KEY_UNREGISTERED или SESSION_REVOKED

**Решение**:
- Пройдите повторно процесс авторизации в Telegram
- Создайте новый session string через интерфейс приложения

### База данных недоступна

**Проблема**: Ошибки подключения к Supabase

**Решение**:
- Проверьте SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY
- Убедитесь, что миграции применены
- Проверьте статус Supabase проекта в dashboard

## 📝 Changelog

### v1.0.0 - Текущая версия

**Feature 003: Multitenancy + Supabase Auth**
- ✅ Полная мультитенантность с изоляцией данных
- ✅ Supabase Auth для регистрации и входа
- ✅ Персональные Telegram credentials для каждого пользователя
- ✅ Row Level Security (RLS) для всех таблиц
- ✅ Шифрование Telegram credentials (AES-256)
- ✅ Управление несколькими Telegram аккаунтами

**Feature 002: Миграция на pg-boss**
- ✅ Замена BullMQ+Redis на pg-boss
- ✅ PostgreSQL-based очереди
- ✅ Устранение зависимости от Redis
- ✅ Dual-queue архитектура
- ✅ Rate limiting через singleton jobs

**Feature 001: Core functionality**
- ✅ Управление каналами и батчами
- ✅ Создание и управление кампаниями
- ✅ Real-time мониторинг и метрики
- ✅ Telegram message delivery через GramJS

## 🎯 Roadmap

### v1.1.0 (Планируется)

- [ ] WebSocket для real-time обновлений без polling
- [ ] Advanced analytics dashboard с графиками
- [ ] Telegram Bot interface для управления
- [ ] Email уведомления о завершении кампаний
- [ ] Password recovery через email

### v1.2.0 (Планируется)

- [ ] Channel analytics (subscribers, engagement metrics)
- [ ] Smart scheduling (оптимальное время отправки)
- [ ] Template variables с условной логикой
- [ ] Campaign templates и cloning

### v2.0.0 (Будущее)

- [ ] Multi-language support (EN, RU, UA)
- [ ] API webhooks для интеграций
- [ ] Advanced A/B testing с статистическим анализом
- [ ] Mobile app (React Native)
- [ ] Subscription/billing система

## 📄 Лицензия

MIT License

## 🙏 Благодарности

- **Supabase** - PostgreSQL database + Auth
- **GramJS** - Telegram MTProto клиент
- **pg-boss** - PostgreSQL job queue
- **shadcn/ui** - UI компоненты
- **React** - UI framework

## 📞 Поддержка

- 🐛 Bug Reports: GitHub Issues
- 💡 Feature Requests: GitHub Discussions
- 📧 Email: support@predlagator.app

---

⚡ **Predlagator** - Профессиональная платформа для Telegram рассылок с полной мультитенантностью
