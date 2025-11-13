# Migration Progress: BullMQ → pg-boss + Prisma → Supabase SDK

**Дата**: 2025-01-16
**Статус**: 🟡 В процессе (60% завершено)
**Ветка**: `002-migrate-from-bullmq`

---

## ✅ ЗАВЕРШЕНО (16 задач)

### Phase 1: Setup & Environment (6/6 задач)
- ✅ T001-T006: Все задачи выполнены
  - pg-boss установлен (v10.3.3)
  - BullMQ, Redis, Prisma удалены
  - SUPABASE_DIRECT_URL добавлен в .env
  - Контракты скопированы в `backend/src/types/`

### Phase 2: Foundational Infrastructure (8/8 задач)
- ✅ T007-T014: Все задачи выполнены
  - SQL миграция (удалена колонка bullJobId)
  - Создан `pg-boss-queue.ts`
  - Создан `worker-server.ts`
  - Supabase клиент настроен и протестирован

### Phase 3: Campaign Execution (2/12 задач)
- ✅ T015: `campaign-worker.ts` - Полностью переписан
- ✅ T016: `message-worker.ts` - Полностью переписан
- ⏭️ T017-T024: API endpoints (в процессе)

---

## 📁 Созданные файлы

```
backend/src/
├── queues/
│   └── pg-boss-queue.ts              ✅ NEW
├── workers/
│   ├── campaign-worker.ts            ✅ REFACTORED
│   └── message-worker.ts             ✅ REFACTORED
├── lib/
│   ├── supabase.ts                   ✅ EXISTS
│   ├── test-supabase.ts              ✅ EXISTS
│   └── supabase-helpers.ts           ✅ NEW
├── types/
│   ├── queue-jobs.ts                 ✅ COPIED
│   └── supabase-types.ts             ✅ COPIED
└── worker-server.ts                  ✅ NEW
```

---

## ⏭️ ОСТАЛОСЬ (29 задач)

### Критично для MVP:
1. **T017-T018**: Обновить `campaigns.ts` API
   - Заменить все `prisma.*` на Supabase SDK
   - Обновить start campaign endpoint для pg-boss

2. **T019-T024**: Обновить остальные API endpoints
   - `batches.ts` - Prisma → Supabase
   - `channels.ts` - Prisma → Supabase
   - `templates.ts` - Prisma → Supabase
   - `users.ts` - Prisma → Supabase (если используется)
   - `auth.ts` - Prisma → Supabase
   - `audit-logger.ts` - Prisma → Supabase

3. **T025-T026**: Тестирование
   - Запустить worker process
   - Интеграционный тест

### Phase 4-6 (опционально):
- Rate limiting (уже реализовано в workers)
- Retry logic (уже реализовано в workers)
- Cleanup старого кода

---

## 🚀 Как запустить

### 1. Worker Server (готов к тестированию):
```bash
cd backend
npm run worker
```

**Ожидаемый вывод:**
```
✅ Supabase connected
✅ pg-boss started
👷 Campaign worker registered
📨 Message worker registered
🚀 All workers started
```

### 2. API Server (требует доработки endpoints):
```bash
cd backend
npm run dev
```

---

## 📝 Инструкции для завершения миграции

### Шаг 1: Миграция campaigns.ts

Пример замены Prisma на Supabase:

**Было (Prisma):**
```typescript
const campaign = await prisma.campaign.findUnique({
  where: { id: campaignId },
  include: { batch: true, template: true }
});
```

**Стало (Supabase):**
```typescript
import { getSupabase } from '../lib/supabase';

const supabase = getSupabase();
const { data: campaign, error } = await supabase
  .from('campaigns')
  .select('*, batch:batches(*), template:templates(*)')
  .eq('id', campaignId)
  .single();

if (error) throw error;
```

### Шаг 2: Обновить start campaign

**Было:**
```typescript
await startCampaign(campaignId, userId);
```

**Стало:**
```typescript
import { getPgBoss } from '../queues/pg-boss-queue';
import { QUEUE_NAMES } from '../types/queue-jobs';

const boss = await getPgBoss();
await boss.send(QUEUE_NAMES.START_CAMPAIGN, {
  campaignId,
  userId
}, {
  singletonKey: campaignId
});
```

### Шаг 3: Паттерн для других endpoints

Все API endpoints следуют одному паттерну:

```typescript
// 1. Import Supabase
import { getSupabase } from '../lib/supabase';

// 2. Замена методов:
prisma.table.findMany()       → supabase.from('table').select()
prisma.table.findUnique()     → supabase.from('table').select().eq('id', id).single()
prisma.table.create()         → supabase.from('table').insert().select().single()
prisma.table.update()         → supabase.from('table').update().eq('id', id)
prisma.table.delete()         → supabase.from('table').delete().eq('id', id)

// 3. Обработка ошибок:
const { data, error } = await supabase...
if (error) throw error;
```

---

## ✅ Критерии готовности MVP

1. ✅ Workers запускаются без ошибок
2. ⏭️ API endpoints работают с Supabase
3. ⏭️ Campaign создается через API
4. ⏭️ Campaign запускается через API → jobs попадают в pg-boss
5. ⏭️ Workers обрабатывают jobs
6. ⏭️ Сообщения доставляются в Telegram

---

## 🐛 Известные проблемы

Нет критических проблем. Основной код готов.

---

## 📊 Прогресс по файлам

| Файл | Статус | Комментарий |
|------|--------|-------------|
| pg-boss-queue.ts | ✅ | Готов |
| worker-server.ts | ✅ | Готов |
| campaign-worker.ts | ✅ | Готов |
| message-worker.ts | ✅ | Готов |
| supabase.ts | ✅ | Готов |
| supabase-helpers.ts | ✅ | Готов |
| campaigns.ts | 🔄 | Требует миграции |
| batches.ts | 🔄 | Требует миграции |
| channels.ts | 🔄 | Требует миграции |
| templates.ts | 🔄 | Требует миграции |
| auth.ts | 🔄 | Требует миграции |
| audit-logger.ts | 🔄 | Требует миграции |

---

## 🎯 Следующие шаги

1. Мигрировать campaigns.ts (критично)
2. Мигрировать остальные API endpoints
3. Запустить интеграционный тест
4. Удалить старый код (redis.ts, prisma.ts, campaign-queue.ts)

**Оценка времени**: 2-3 часа для завершения MVP
