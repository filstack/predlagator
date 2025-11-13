# Implementation Plan: Управление каналами вручную

**Branch**: `004-manual-channel-management` | **Date**: 2025-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-manual-channel-management/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Реализация полнофункциональной системы управления Telegram-каналами с CRUD-операциями, inline-validation, optimistic locking и обработкой сетевых ошибок. Пользователь может добавлять, просматривать, редактировать и удалять каналы через адаптивный веб-интерфейс с поддержкой нескольких ссылок на канал и real-time валидацией уникальности username.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20+
**Primary Dependencies**:
- Backend: Express 4.18, Supabase SDK 2.75.0, pg-boss 10.1.3
- Frontend: React 18, Vite, Tailwind CSS, shadcn/ui
**Storage**: Supabase (PostgreSQL), snake_case naming convention
**Testing**: Jest (backend), Vitest (frontend)
**Target Platform**: Web application (backend: Node.js server, frontend: современные браузеры Chrome/Firefox/Safari/Edge последних версий)
**Project Type**: Web (fullstack TypeScript: backend API + frontend SPA)
**Performance Goals**:
- Загрузка списка 100 каналов < 2 сек
- Поиск среди 1000 каналов < 500ms
- Inline validation debounce ~ 300-500ms
**Constraints**:
- Поддержка 10 одновременных пользователей
- Адаптивность 320px - 2560px
- Текстовые лимиты: название/title 255 символов, URLs 2048 символов
**Scale/Scope**:
- До 10,000 каналов без деградации производительности
- 4 основные user stories (добавление, просмотр, редактирование, удаление)
- 19 функциональных требований

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file не заполнен (используется шаблон). Проверка основана на текущих практиках проекта из CLAUDE.md и существующих features (002, 003).

### Core Principles (inferred from project)

✅ **TypeScript-First**: Проект полностью на TypeScript с строгой типизацией
✅ **Supabase SDK for Data Access**: Использовать Supabase SDK вместо прямых SQL-запросов
✅ **Express API Pattern**: RESTful endpoints с четким разделением responsibilities
✅ **Component-Based Frontend**: React компоненты с shadcn/ui для UI
✅ **Snake_case Database**: Все поля БД в snake_case формате

### Architecture Compliance

✅ **Backend Structure**: Следует существующему паттерну `backend/src/api/` для endpoints
✅ **Frontend Structure**: Следует React паттерну с компонентами в `frontend/src/`
✅ **Shared Types**: Использование shared contracts для типов (как в specs/002)
✅ **Migration Pattern**: SQL миграции в `shared/migrations/`

**Status**: ✅ PASSED - No constitutional violations detected

## Project Structure

### Documentation (this feature)

```
specs/004-manual-channel-management/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api-types.ts     # API request/response types
│   ├── channel-types.ts # Channel entity types
│   └── validation.ts    # Validation schemas
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
backend/
├── src/
│   ├── api/
│   │   ├── channels.ts              # NEW: Channel CRUD endpoints
│   │   └── campaigns.ts             # Existing
│   ├── services/
│   │   ├── channel-service.ts       # NEW: Business logic для каналов
│   │   └── telegram.ts              # Existing
│   ├── middleware/
│   │   ├── validation.ts            # NEW: Request validation middleware
│   │   └── error-handler.ts         # Existing/Enhanced
│   ├── lib/
│   │   └── supabase.ts              # Existing: Supabase client
│   ├── types/
│   │   └── channel.ts               # NEW: Channel types
│   └── server.ts                    # Modified: register new routes
└── tests/
    ├── unit/
    │   └── channel-service.test.ts  # NEW: Unit tests
    └── integration/
        └── channels-api.test.ts     # NEW: API integration tests

frontend/
├── src/
│   ├── pages/
│   │   └── ChannelsPage.tsx         # NEW: Main channels management page
│   ├── components/
│   │   ├── channels/
│   │   │   ├── ChannelList.tsx      # NEW: List view
│   │   │   ├── ChannelForm.tsx      # NEW: Add/Edit form
│   │   │   ├── ChannelCard.tsx      # NEW: Card component
│   │   │   ├── DeleteDialog.tsx     # NEW: Delete confirmation
│   │   │   └── ConflictDialog.tsx   # NEW: Optimistic lock conflict UI
│   │   └── ui/                      # Existing: shadcn/ui components
│   ├── services/
│   │   └── channel-api.ts           # NEW: API client for channels
│   ├── hooks/
│   │   ├── useChannels.ts           # NEW: React Query hook for channels
│   │   └── useDebounce.ts           # NEW: Debounce hook for validation
│   └── types/
│       └── channel.ts               # NEW: Frontend types (imported from contracts)
└── tests/
    └── channels/
        └── ChannelForm.test.tsx     # NEW: Component tests

shared/
└── migrations/
    └── 004_add_channels_table.sql   # NEW: Database migration
```

**Structure Decision**: Web application structure (Option 2) - проект имеет четкое разделение backend (Express API) и frontend (React SPA). Используется существующая структура с добавлением новых модулей для управления каналами.

## Complexity Tracking

*No constitution violations detected - this section is not needed.*

