# Research: Управление каналами вручную

**Feature**: 004-manual-channel-management
**Date**: 2025-10-18
**Status**: Complete

## Overview

Документ содержит технические решения и обоснования выбора технологий/паттернов для реализации функции управления каналами.

## Key Decisions

### 1. Frontend State Management для CRUD операций

**Decision**: React Query (TanStack Query)

**Rationale**:
- Автоматическое управление cache и synchronization с сервером
- Встроенная поддержка optimistic updates (критично для optimistic locking)
- Автоматический retry при сетевых ошибках
- Встроенная debounce/throttle возможность
- Минимальный boilerplate по сравнению с Redux

**Alternatives Considered**:
- **Redux Toolkit + RTK Query**: Избыточен для CRUD, больше boilerplate
- **Zustand + SWR**: Хороший вариант, но меньше встроенных features для optimistic updates
- **MobX**: Требует decorator syntax, менее популярен в TypeScript ecosystem

**Best Practices**:
- Использовать `useQuery` для GET requests (list, get by id)
- Использовать `useMutation` для POST/PUT/DELETE с `onSuccess` callbacks для cache invalidation
- Настроить `staleTime` и `cacheTime` для оптимизации (staleTime: 30s, cacheTime: 5min)

### 2. Form Management & Validation

**Decision**: React Hook Form + Zod

**Rationale**:
- React Hook Form - минимальные re-renders, отличная производительность
- Zod - type-safe schema validation, автоматическая TypeScript type inference
- Интеграция через `@hookform/resolvers/zod` - seamless
- Поддержка async validation (критично для inline username uniqueness check)

**Alternatives Considered**:
- **Formik**: Больше re-renders, медленнее на больших формах
- **Yup validation**: Менее type-safe чем Zod
- **Manual validation**: Слишком много boilerplate

**Best Practices**:
- Определить Zod schemas в `/contracts/validation.ts` для переиспользования
- Использовать `mode: "onBlur"` для обычных полей, `mode: "onChange"` для username (real-time validation)
- Async validator для username: debounce 500ms, проверка через API `/api/channels/check-username/:username`

### 3. Optimistic Locking Implementation

**Decision**: Version-based optimistic locking с `updated_at` timestamp

**Rationale**:
- Простая реализация: сравнение `updated_at` при UPDATE
- Не требует дополнительной колонки `version`
- Timestamp precision достаточен для 10 concurrent users
- Естественная интеграция с Supabase SDK

**Implementation Strategy**:
```typescript
// Backend: Check version before update
const { data: current } = await supabase
  .from('channels')
  .select('updated_at')
  .eq('id', channelId)
  .single();

if (new Date(current.updated_at) > new Date(clientUpdatedAt)) {
  throw new ConflictError('Channel was modified by another user');
}

// UPDATE with WHERE clause
await supabase
  .from('channels')
  .update({ ...data, updated_at: new Date() })
  .eq('id', channelId)
  .eq('updated_at', clientUpdatedAt); // Atomic check
```

**Alternatives Considered**:
- **Separate version column**: Добавляет complexity без значительных преимуществ
- **Pessimistic locking**: Over-engineering для 10 users, блокирует UX
- **Last-write-wins**: Потеря данных, неприемлемо

### 4. Inline Username Validation Pattern

**Decision**: Debounced API call + local cache

**Rationale**:
- Debounce 500ms предотвращает spam запросов
- Local cache (React Query) минимизирует API calls для повторных проверок
- Отдельный endpoint `/api/channels/check-username/:username` легче cache и test

**Implementation**:
```typescript
// Custom hook
function useUsernameValidation(username: string, currentChannelId?: string) {
  return useQuery({
    queryKey: ['username-check', username],
    queryFn: () => api.checkUsername(username, currentChannelId),
    enabled: username.length >= 5, // Min telegram username length
    staleTime: 60000, // Cache for 1 min
  });
}

// In component with react-hook-form
const debouncedUsername = useDebounce(watchUsername, 500);
const { data: isUnique } = useUsernameValidation(debouncedUsername, channel?.id);
```

**Alternatives Considered**:
- **Client-side only validation**: Недостаточно, race conditions возможны
- **Validation на submit**: Плохой UX, пользователь узнает об ошибке поздно
- **WebSocket real-time sync**: Over-engineering для данного use case

### 5. Multi-Link Management UI Pattern

**Decision**: Dynamic form fields с Add/Remove buttons

**Rationale**:
- React Hook Form `useFieldArray` для управления массивом links
- Shadcn/ui Button components для Add/Remove
- Inline validation каждого URL в массиве

**Implementation**:
```typescript
const { fields, append, remove } = useFieldArray({
  control,
  name: 'telegram_links',
});

// Render
fields.map((field, index) => (
  <div key={field.id}>
    <Input {...register(`telegram_links.${index}`)} />
    <Button onClick={() => remove(index)}>Remove</Button>
  </div>
))
```

**Alternatives Considered**:
- **Textarea со списком через запятую**: Плохой UX, сложная validation
- **Separate modal for each link**: Слишком много кликов
- **Drag-and-drop reordering**: YAGNI, не требуется spec'ом

### 6. Network Error Handling Strategy

**Decision**: React Query retry logic + Custom error dialog

**Rationale**:
- React Query автоматически retry 3 раза с exponential backoff
- Custom dialog только для финальных failures
- `onError` callback для показа Retry/Cancel dialog

**Implementation**:
```typescript
const mutation = useMutation({
  mutationFn: api.createChannel,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  onError: (error) => {
    if (error.message.includes('network')) {
      showNetworkErrorDialog(); // Custom dialog с Retry/Cancel
    }
  },
});
```

**Alternatives Considered**:
- **No automatic retry**: Плохой UX, требует user action сразу
- **Offline queue (localForage)**: Over-engineering для данного scope
- **Service Worker caching**: Не подходит для POST/PUT requests

### 7. Search & Filter Implementation

**Decision**: Client-side filtering с server-side pagination

**Rationale**:
- До 10,000 каналов - client-side filtering достаточен
- Server-side pagination (100 items/page) для initial load performance
- React Query cache обеспечивает instant filtering после загрузки

**Implementation**:
```typescript
// Server: Paginated endpoint
GET /api/channels?page=1&limit=100

// Client: Filter in memory
const filtered = channels.filter(ch =>
  ch.name.includes(searchQuery) ||
  ch.username.includes(searchQuery)
);
```

**Alternatives Considered**:
- **Full server-side search**: Избыточно для 10k records, добавляет latency
- **Elasticsearch**: Over-engineering, требует дополнительную инфраструктуру
- **No pagination**: Плохо для initial load при большом количестве каналов

### 8. Responsive Design Strategy

**Decision**: Tailwind CSS mobile-first + shadcn/ui adaptive components

**Rationale**:
- Tailwind breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- Shadcn/ui components уже responsive-ready
- Table → Card layout на мобильных устройствах

**Breakpoint Strategy**:
- **320px - 640px (mobile)**: Card layout, stacked form fields
- **640px - 1024px (tablet)**: 2-column grid, side-by-side form
- **1024px+ (desktop)**: Table layout, full-width form

**Alternatives Considered**:
- **Separate mobile/desktop apps**: Over-engineering
- **Bootstrap**: Менее customizable, heavier bundle
- **Material-UI**: Не соответствует существующему design system

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend** |
| Runtime | Node.js | 20+ | Server execution |
| Language | TypeScript | 5.3 | Type safety |
| Framework | Express | 4.18 | API routing |
| Database | Supabase (PostgreSQL) | Latest | Data persistence |
| ORM | Supabase SDK | 2.75.0 | Database access |
| Validation | Zod | 3.x | Schema validation |
| Testing | Jest | 29.x | Unit/integration tests |
| **Frontend** |
| Framework | React | 18.x | UI components |
| Build Tool | Vite | Latest | Fast dev/build |
| Language | TypeScript | 5.3 | Type safety |
| State | React Query | 5.x | Server state management |
| Forms | React Hook Form | 7.x | Form management |
| Validation | Zod | 3.x | Schema validation |
| UI Library | shadcn/ui | Latest | Component library |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| Testing | Vitest | Latest | Unit/component tests |

## Performance Optimizations

### Backend

1. **Database Indexing**:
   - Index на `username` (unique constraint + fast lookup)
   - Index на `created_at`, `updated_at` для сортировки
   - Composite index на (`user_id`, `username`) для RLS queries

2. **Query Optimization**:
   - Использовать `.select()` только необходимые поля
   - Pagination через `range(start, end)`
   - Avoid N+1 queries с `.select('*, author:users(*)')`

3. **Caching Strategy**:
   - HTTP ETag headers для GET requests
   - Cache-Control: max-age=30 для списков каналов

### Frontend

1. **Code Splitting**:
   - Lazy load ChannelsPage: `React.lazy(() => import('./ChannelsPage'))`
   - Separate chunks для dialog components

2. **Memoization**:
   - `useMemo` для filtered/sorted lists
   - `React.memo` для ChannelCard components в списке

3. **Debouncing**:
   - Search input: 300ms debounce
   - Username validation: 500ms debounce

## Security Considerations

1. **Input Validation**:
   - Backend: Zod schemas для всех incoming requests
   - Frontend: Zod schemas + react-hook-form validation
   - Sanitize user input перед отправкой в БД

2. **SQL Injection Prevention**:
   - Supabase SDK использует prepared statements автоматически
   - Никогда не конкатенировать user input в queries

3. **XSS Prevention**:
   - React автоматически escapes rendered content
   - Использовать `DOMPurify` если нужно рендерить HTML (не требуется в данном случае)

4. **CSRF Protection**:
   - SameSite cookies для сессий
   - CORS настроен только для trusted origins

5. **Rate Limiting**:
   - Express rate-limit middleware: 100 requests/15min per IP
   - Stricter для username validation: 20 requests/min per IP

## Deployment Considerations

1. **Environment Variables**:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - уже настроены
   - `VITE_API_URL` для frontend

2. **Database Migration**:
   - SQL migration в `shared/migrations/004_add_channels_table.sql`
   - Применяется через Supabase Dashboard или Supabase CLI

3. **Build & Deploy**:
   - Backend: `npm run build` → dist/
   - Frontend: `npm run build` → dist/
   - Deploy через существующий процесс

## Open Questions / Future Considerations

1. **Bulk Operations**: Требуется ли bulk delete/edit в будущем?
   - *Решение*: Не в scope текущей feature, но архитектура позволяет добавить

2. **Channel Import**: Импорт каналов из CSV/Excel?
   - *Решение*: Не в текущем scope (P4 priority)

3. **Audit Log**: Детальный аудит всех изменений каналов?
   - *Решение*: Частично покрыто через `author_created`, `author_updated`, можно расширить позже

4. **Real-time Collaboration**: WebSocket для live updates при редактировании разными users?
   - *Решение*: Оптимистический locking достаточен для 10 users, WebSocket - over-engineering

## Conclusion

Все технические решения основаны на существующем tech stack проекта (TypeScript, React, Express, Supabase) с добавлением best-practice библиотек (React Query, React Hook Form, Zod). Архитектура масштабируема до 10,000 каналов и поддерживает все 19 функциональных требований из спецификации.

**Next Phase**: Data Model & Contracts design

