## Финальная инструкция по миграции на Supabase

### 🎯 Стратегия: Используем Supabase JS SDK (как в electra_dashboard)

Вместо Prisma используем прямое подключение через Supabase JS SDK - это проще и надежнее для Supabase.

---

### Шаг 1: Получить Service Role Key из Supabase Dashboard

1. Откройте: https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk/settings/api
2. Найдите **service_role** key (secret)
3. Скопируйте его

---

### Шаг 2: Обновить backend/.env

Замените `[GET_FROM_DASHBOARD]` на скопированный service_role key:

```env
SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbnhjamJ6d2Vsb2tsdWFpcW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTE1NjcsImV4cCI6MjA3NjEyNzU2N30.eF91eQwDO8TfPdJRHYZ1jMgdUnxsytwYazmWClu4h84
SUPABASE_SERVICE_ROLE_KEY=ВАШ_SERVICE_ROLE_KEY_СЮДА
```

---

### Шаг 3: Выполнить SQL миграцию в Supabase

1. Откройте SQL Editor: https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk/sql/new
2. Скопируйте содержимое файла: `shared/migrations/001_init_schema.sql`
3. Вставьте в SQL Editor
4. Нажмите **RUN**

---

### Шаг 4: Протестировать подключение

```bash
cd backend
npx tsx src/lib/test-supabase.ts
```

Должно вывести:
```
✅ Подключение к Supabase успешно!
```

---

### Шаг 5: Обновить код для использования Supabase

**Старый код (Prisma):**
```typescript
import { prisma } from './prisma';
const users = await prisma.user.findMany();
```

**Новый код (Supabase):**
```typescript
import { supabase } from './supabase';
const { data: users } = await supabase
  .from('users')
  .select('*');
```

---

### Примеры работы с Supabase

#### Вставка данных
```typescript
const { data, error } = await supabase
  .from('users')
  .insert({ username: 'test', password_hash: 'hash', role: 'OPERATOR' })
  .select();
```

#### Обновление
```typescript
const { data, error } = await supabase
  .from('users')
  .update({ last_login_at: new Date().toISOString() })
  .eq('id', userId);
```

#### Выборка с фильтрами
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .select('*, batch:batches(*), template:templates(*)')
  .eq('status', 'RUNNING')
  .order('created_at', { ascending: false })
  .limit(10);
```

#### Upsert (insert or update)
```typescript
const { data, error } = await supabase
  .from('channels')
  .upsert({
    id: 'channel-1',
    username: '@test',
    category: 'news'
  }, {
    onConflict: 'id',
    ignoreDuplicates: false
  });
```

---

### Преимущества Supabase JS SDK:

✅ Работает из коробки (не нужен pooler)
✅ Поддержка RLS (Row Level Security)
✅ Realtime subscriptions
✅ Автоматическая типизация через codegen
✅ Batch операции и upsert
✅ Не нужны миграции Prisma

---

### Следующие шаги:

1. ✅ Установлен @supabase/supabase-js
2. ✅ Создан Supabase client (backend/src/lib/supabase.ts)
3. ⏳ Получить service_role key из dashboard
4. ⏳ Выполнить SQL миграцию
5. ⏳ Протестировать подключение
6. ⏳ Обновить код API для использования Supabase вместо Prisma

---

**Готово!** 🎉
