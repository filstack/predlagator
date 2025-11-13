# Импорт каналов из TGStat

## Обзор

Система поддерживает импорт каналов из NDJSON файлов с результатами скрейпинга TGStat.

## Миграция базы данных

Перед первым импортом примените миграцию `006_update_channels_for_tgstat.sql`:

1. Откройте [Supabase SQL Editor](https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk/sql/new)
2. Вставьте содержимое файла `shared/migrations/006_update_channels_for_tgstat.sql`
3. Нажмите "Run"

## Формат файла

NDJSON файл должен содержать записи следующего формата:

```json
{
  "jobId": "...",
  "category": "investments",
  "tgstat_url": "https://tgstat.ru/channel/@username",
  "username": "username",
  "collected_at": "2025-11-12T08:49:55.094624Z",
  "status": "success",
  "scraped_content": "{\"title\":\"Название канала\",\"username\":\"@username\",\"description\":\"\",\"subscribers\":\"48 141\",\"telegram_links\":[\"https://t.me/channel\"],\"rkn_registered\":true,\"extracted_at\":\"2025-11-12T10:35:11.702Z\"}",
  "scraped_at": "2025-11-12T10:35:11.727Z"
}
```

### Поля `scraped_content` (JSON строка):

- `title` - название канала
- `username` - username канала (может быть с @ или без)
- `description` - описание канала
- `subscribers` - количество подписчиков (строка с пробелами, например "48 141")
- `telegram_links` - массив ссылок на канал
- `rkn_registered` - зарегистрирован ли в РКН
- `extracted_at` - дата извлечения данных

## Импорт через UI

### Шаг 1: Откройте страницу Channels

Перейдите на страницу "Channels" в веб-интерфейсе.

### Шаг 2: Нажмите кнопку "Импортировать"

Найдите кнопку "Импортировать каналы" и нажмите её.

### Шаг 3: Загрузите файл

1. В открывшемся диалоге нажмите "Выбрать файл"
2. Выберите NDJSON файл с вашего компьютера (файлы `.ndjson` или `.jsonl`)
3. Нажмите "Импортировать"

### Шаг 4: Дождитесь завершения

После завершения импорта вы увидите статистику:
- **Импортировано** - новые каналы
- **Обновлено** - существующие каналы
- **Пропущено** - записи без username или с ошибками
- **Ошибок** - количество ошибок при импорте

## Импорт через CLI (для разработчиков)

Также доступен скрипт для импорта из командной строки:

```bash
node scripts/import-tgstat-channels.mjs "путь/к/файлу.ndjson" --clear
```

Флаг `--clear` очистит таблицу `channels` перед импортом.

## Структура таблицы channels после миграции

```sql
channels:
  - id (UUID)
  - name (VARCHAR) - название канала
  - username (VARCHAR) - @username
  - title (VARCHAR) - заголовок из Telegram
  - description (TEXT) - описание канала
  - tgstat_url (VARCHAR) - ссылка на TGStat
  - telegram_links (TEXT[]) - массив ссылок
  - status (VARCHAR) - 'active' | 'inactive'
  - category (VARCHAR) - категория из TGStat
  - subscribers (INTEGER) - количество подписчиков
  - rkn_registered (BOOLEAN) - зарегистрирован в РКН
  - collected_at (TIMESTAMPTZ) - дата сбора
  - scraped_at (TIMESTAMPTZ) - дата скрейпинга
  - created_at (TIMESTAMPTZ)
  - updated_at (TIMESTAMPTZ)
  - author_created (UUID)
  - author_updated (UUID)
  - user_id (UUID) - владелец канала
```

## API Endpoint

```
POST /api/channels/import
Content-Type: multipart/form-data

Body: FormData с файлом в поле 'file'

Response:
{
  "success": true,
  "stats": {
    "imported": 85,
    "updated": 5,
    "skipped": 0,
    "errors": 0
  },
  "errorMessages": []
}
```

## Примечания

- Импорт автоматически пропускает записи со `status !== 'success'`
- Количество подписчиков парсится автоматически (удаляются пробелы)
- Username автоматически дополняется символом `@` если его нет
- При наличии дублей по username обновляются существующие записи
- Все импортированные каналы привязываются к текущему пользователю (`user_id`)
