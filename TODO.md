# TODO: Текущие задачи и проблемы

## ✅ Выполнено (2025-11-02)

### 1. QR-код аутентификация с 2FA
- ✅ Реализованы эндпоинты `/qr-start`, `/qr-check`, `/qr-verify-password`
- ✅ Frontend показывает QR код и поддерживает ввод 2FA пароля
- ✅ Polling каждые 2 секунды для проверки статуса сканирования
- ✅ Сессия автоматически сохраняется в `.env` после успешной авторизации

### 2. Исправление pg-boss worker
- ✅ Исправлена ошибка "Campaign not found" - worker использовал старый скомпилированный код
- ✅ Удалён `dist/` и настроен запуск через `npm run worker` (tsx)
- ✅ Worker теперь правильно подключается к Supabase и находит кампании

### 3. Создание джобов в pg-boss
- ✅ Добавлено создание `start-campaign` джоба при `action='start'` или `action='resume'`
- ✅ Worker подхватывает джобы и создаёт `send-message` джобы с rate limiting
- ✅ Отправка сообщений работает

## 🚧 Текущие ограничения

### Один глобальный Telegram аккаунт
**Проблема:** Сейчас используется один Telegram аккаунт из `.env` файла для всех пользователей.

**Как работает сейчас:**
1. Пользователь заходит в Settings
2. Авторизуется через QR + 2FA
3. Сессия сохраняется в `TELEGRAM_SESSION` в `.env`
4. Worker использует эту сессию для отправки всех сообщений
5. Если нужен другой аккаунт - нужно заново авторизоваться

**Файлы:**
- `backend/src/api/auth-telegram.ts` - сохраняет сессию в `.env` (строки 334-352, 428-446)
- `backend/src/lib/telegram-client.ts` - загружает сессию из `process.env.TELEGRAM_SESSION` (строка 43)

## 📋 Следующие задачи (приоритет)

### 1. Мультиаккаунтность Telegram (HIGH)
**Цель:** Поддержка нескольких Telegram аккаунтов для одного пользователя

**Что нужно сделать:**

#### Backend
1. **Создать API для управления telegram_accounts**
   - `GET /api/telegram-accounts` - список аккаунтов пользователя
   - `POST /api/telegram-accounts` - добавить новый аккаунт (сохранить после QR-авторизации)
   - `DELETE /api/telegram-accounts/:id` - удалить аккаунт
   - `PUT /api/telegram-accounts/:id/set-default` - сделать аккаунт по умолчанию

2. **Модифицировать auth-telegram.ts**
   - Вместо сохранения в `.env` сохранять в таблицу `telegram_accounts`
   - Привязывать к `user_id` (получать из JWT токена)
   - Шифровать `telegram_session` перед сохранением (AES-256)

3. **Добавить `telegram_account_id` в campaigns**
   ```sql
   ALTER TABLE campaigns ADD COLUMN telegram_account_id UUID REFERENCES telegram_accounts(id);
   ```

4. **Модифицировать telegram-client.ts**
   - Добавить метод `connectWithAccount(telegramAccountId: string)`
   - Загружать сессию из `telegram_accounts` вместо `.env`
   - Поддержка множества клиентов (pool)

5. **Модифицировать campaign-worker.ts**
   - Получать `telegram_account_id` из campaign
   - Загружать соответствующую сессию
   - Использовать правильный клиент для отправки

#### Frontend
1. **Создать страницу Telegram Accounts**
   - Список подключенных аккаунтов (username, phone, дата подключения)
   - Кнопка "Добавить аккаунт" → QR-авторизация
   - Кнопка "Удалить" для каждого аккаунта
   - Индикатор "По умолчанию"

2. **Модифицировать страницу Create Campaign**
   - Dropdown для выбора Telegram аккаунта
   - Показывать username выбранного аккаунта
   - По умолчанию выбран основной аккаунт

#### Миграция
```sql
-- backend/migrations/005_add_telegram_account_to_campaigns.sql
BEGIN;

-- Добавить столбец telegram_account_id в campaigns
ALTER TABLE campaigns ADD COLUMN telegram_account_id UUID REFERENCES telegram_accounts(id);

-- Создать индекс
CREATE INDEX idx_campaigns_telegram_account ON campaigns(telegram_account_id);

COMMIT;
```

### 2. Шифрование credentials (MEDIUM)
**Проблема:** `telegram_session`, `telegram_api_hash` хранятся в открытом виде

**Решение:**
- Использовать `crypto` модуль Node.js для AES-256-GCM шифрования
- Ключ шифрования хранить в `ENCRYPTION_KEY` переменной окружения
- Шифровать перед записью в БД, расшифровывать при чтении

### 3. Session refresh (LOW)
**Проблема:** Telegram сессии могут устаревать

**Решение:**
- Добавить `last_used_at` в `telegram_accounts`
- При ошибке `AUTH_KEY_UNREGISTERED` автоматически помечать аккаунт как `telegram_connected: false`
- Уведомлять пользователя о необходимости переавторизации

## 📂 Структура проекта

### Текущие эндпоинты
```
POST /api/auth-telegram/qr-start          - Начать QR-авторизацию
POST /api/auth-telegram/qr-check          - Проверить статус QR-сканирования
POST /api/auth-telegram/qr-verify-password - Ввести 2FA пароль

POST /api/campaigns                       - Создать кампанию
POST /api/campaigns/:id/action            - Управление кампанией (start/pause/resume/cancel)
```

### Ключевые файлы
```
backend/src/
├── api/
│   ├── auth-telegram.ts          # QR-авторизация, сохранение в .env
│   └── campaigns.ts              # CRUD кампаний, создание pg-boss джобов
├── lib/
│   ├── telegram-client.ts        # Singleton клиент, загружает из .env
│   └── supabase.ts               # Service client (bypass RLS)
├── workers/
│   ├── campaign-worker.ts        # Обрабатывает start-campaign джобы
│   ├── message-worker.ts         # Отправляет сообщения
│   └── polling-worker.ts         # Старый worker (не используется)
└── queues/
    └── pg-boss-queue.ts          # Инициализация pg-boss

frontend/src/
└── pages/
    └── Settings.tsx              # QR-код UI, polling, 2FA
```

### База данных (Supabase PostgreSQL)

**Основные таблицы:**
- `users` - Пользователи системы
- `telegram_accounts` - Telegram аккаунты пользователей (пока не используется)
- `campaigns` - Кампании рассылки
- `jobs` - Задачи отправки сообщений
- `channels` - Telegram каналы для рассылки
- `batches` - Группы каналов
- `templates` - Шаблоны сообщений

**pg-boss (очереди):**
- `start-campaign` - Джобы запуска кампаний
- `send-message` - Джобы отправки конкретных сообщений

## 🔧 Известные проблемы

### 1. Worker не перезагружает .env автоматически
**Проблема:** После QR-авторизации нужно вручную перезапускать worker: `pm2 restart predlagator-worker`

**Временное решение:** Перезапускать вручную

**Правильное решение:**
- Использовать `telegram_accounts` вместо `.env`
- Worker будет загружать актуальную сессию из БД при каждой отправке

### 2. TypeScript ошибки компиляции
**Проблема:** `npm run build` падает с ошибками типов (pg-boss v9 vs v10 API)

**Текущее решение:** Использовать `tsx` напрямую (не компилировать)

**Правильное решение:** Обновить pg-boss до v10 или исправить типы

## 📝 Команды для деплоя

```bash
# Обновить код
cd /var/www/predlagator/backend
git pull origin 004-manual-channel-management

# Перезапустить процессы
pm2 restart predlagator-api
pm2 restart predlagator-worker

# Проверить логи
pm2 logs predlagator-api --lines 30
pm2 logs predlagator-worker --lines 30

# После QR-авторизации (пока нужно вручную)
pm2 restart predlagator-worker
```

## 🎯 Roadmap

### Phase 1: Стабилизация (DONE ✅)
- ✅ QR-авторизация работает
- ✅ Worker отправляет сообщения
- ✅ pg-boss джобы создаются правильно

### Phase 2: Мультиаккаунтность (NEXT)
- 🔲 API для telegram_accounts
- 🔲 UI для управления аккаунтами
- 🔲 Выбор аккаунта в кампании
- 🔲 Загрузка правильной сессии в worker

### Phase 3: Безопасность
- 🔲 Шифрование credentials
- 🔲 Session refresh
- 🔲 Audit logs для Telegram операций

### Phase 4: Масштабирование
- 🔲 Connection pool для множества клиентов
- 🔲 Rate limiting per account
- 🔲 Retry strategies
- 🔲 Мониторинг и алерты

## 📞 Контакты и ресурсы

**Документация:**
- GramJS: https://gram.js.org/
- pg-boss: https://github.com/timgit/pg-boss
- Supabase: https://supabase.com/docs

**Текущая ветка:** `004-manual-channel-management`

**Последние коммиты:**
- `0ed4bca4` - feat: автоматическое сохранение Telegram сессии в .env
- `a9202704` - feat: добавить создание pg-boss джобов при запуске кампаний
- `6f08b8b4` - fix: отключить автоматическое подключение Telegram

---

**Дата:** 2025-11-02
**Статус:** Базовая функциональность работает, готово к добавлению мультиаккаунтности
