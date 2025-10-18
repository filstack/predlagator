# Tasks: Управление каналами вручную

**Input**: Design documents from `/specs/004-manual-channel-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT included - тесты будут добавлены позже при необходимости.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/`
- Paths based on plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and shared types

- [X] T001 Create database migration file `shared/migrations/004_add_channels_table.sql` based on data-model.md
- [X] T002 Run migration against Supabase to create `channels` table with RLS policies
- [X] T003 [P] Copy shared validation schema from `specs/004-manual-channel-management/contracts/validation.ts` to `backend/src/types/channel-validation.ts`
- [X] T004 [P] Copy shared channel types from `specs/004-manual-channel-management/contracts/channel-types.ts` to `backend/src/types/channel.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement validation middleware in `backend/src/middleware/validation.ts` using Zod for request validation
- [X] T006 [P] Create base channel service in `backend/src/services/channel-service.ts` with Supabase client initialization
- [X] T007 [P] Create API router file `backend/src/api/channels.ts` with Express Router setup
- [X] T008 Register `/api/channels` routes in `backend/src/server.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Добавление нового канала (Priority: P1) 🎯 MVP

**Goal**: Пользователь может добавить новый канал, заполнив форму с валидацией (название, username, telegram links, title, TGStat URL)

**Independent Test**: Открыть форму добавления канала, заполнить все поля валидными данными, нажать "Сохранить" → канал должен появиться в базе данных и в списке каналов

### Backend Implementation for User Story 1

- [X] T009 [US1] Implement `createChannel()` method in `backend/src/services/channel-service.ts` для создания канала с валидацией
- [X] T010 [US1] Implement POST `/api/channels` endpoint in `backend/src/api/channels.ts` для создания канала
- [X] T011 [US1] Implement GET `/api/channels/check-username/:username` endpoint in `backend/src/api/channels.ts` для проверки уникальности username

### Frontend Implementation for User Story 1

- [X] T012 [P] [US1] Update Zustand channel-store с правильными типами и методами (вместо отдельного API client - проект использует Zustand)
- [X] T013 [P] [US1] Update channel-store с методом checkUsernameAvailability() (вместо React Query hooks - проект использует Zustand)
- [X] T014 [P] [US1] Create debounce hook в `frontend/src/hooks/useDebounce.ts` для inline validation
- [X] T015 [US1] Create ChannelForm component в `frontend/src/components/channels/ChannelForm.tsx` с React Hook Form + Zod validation
- [X] T016 [US1] Implement inline username validation в ChannelForm с debounced API call и визуальной индикацией
- [X] T017 [US1] Implement multiple telegram links management в ChannelForm используя `useFieldArray`
- [X] T018 [US1] Implement network error handling в ChannelForm с retry dialog
- [X] T019 [US1] Update ChannelsPage в `frontend/src/pages/Channels.tsx` с кнопкой "Добавить канал" и формой (обновлена для Feature 004)
- [X] T020 [US1] Route `/` уже использует ChannelsPage как index route (уже настроен)
- [X] T021 [US1] "Каналы" tab уже есть в navigation menu (обновлен на русский)

**Checkpoint**: User Story 1 должна быть полностью функциональной - можно добавлять каналы через UI

---

## Phase 4: User Story 2 - Просмотр списка каналов (Priority: P2)

**Goal**: Пользователь может видеть список всех добавленных каналов с возможностью поиска и сортировки

**Independent Test**: Открыть вкладку "Channels" → должен отобразиться список всех каналов с корректными данными

### Backend Implementation for User Story 2

- [ ] T022 [US2] Implement `listChannels()` method в `backend/src/services/channel-service.ts` с поддержкой pagination, sorting, filtering
- [ ] T023 [US2] Implement GET `/api/channels` endpoint в `backend/src/api/channels.ts` для получения списка каналов с query parameters

### Frontend Implementation for User Story 2

- [ ] T024 [P] [US2] Add `listChannels()` method в `frontend/src/services/channel-api.ts`
- [ ] T025 [P] [US2] Add `useChannels()` hook в `frontend/src/hooks/useChannels.ts` для получения списка
- [ ] T026 [US2] Create ChannelCard component в `frontend/src/components/channels/ChannelCard.tsx` для отображения одного канала
- [ ] T027 [US2] Create ChannelList component в `frontend/src/components/channels/ChannelList.tsx` для отображения списка каналов
- [ ] T028 [US2] Integrate ChannelList в ChannelsPage для отображения списка
- [ ] T029 [US2] Implement client-side search/filter в ChannelList по названию и username
- [ ] T030 [US2] Implement sorting controls в ChannelList (по дате создания, названию, username)
- [ ] T031 [US2] Implement empty state в ChannelList с кнопкой "Добавить первый канал"

**Checkpoint**: User Story 2 завершена - можно просматривать список каналов с поиском и сортировкой

---

## Phase 5: User Story 3 - Редактирование существующего канала (Priority: P1)

**Goal**: Пользователь может редактировать любой существующий канал с сохранением изменений и обработкой конфликтов (optimistic locking)

**Independent Test**: Выбрать канал из списка, нажать "Редактировать", изменить данные, сохранить → изменения должны отобразиться в списке

### Backend Implementation for User Story 3

- [ ] T032 [US3] Implement `getChannelById()` method в `backend/src/services/channel-service.ts` для получения канала по ID
- [ ] T033 [US3] Implement `updateChannel()` method в `backend/src/services/channel-service.ts` с optimistic locking check (сравнение `updated_at`)
- [ ] T034 [US3] Implement GET `/api/channels/:id` endpoint в `backend/src/api/channels.ts`
- [ ] T035 [US3] Implement PUT `/api/channels/:id` endpoint в `backend/src/api/channels.ts` с обработкой optimistic locking conflict (409 Conflict)

### Frontend Implementation for User Story 3

- [ ] T036 [P] [US3] Add `getChannelById()` и `updateChannel()` methods в `frontend/src/services/channel-api.ts`
- [ ] T037 [P] [US3] Add `useChannel()` и `useUpdateChannel()` hooks в `frontend/src/hooks/useChannels.ts`
- [ ] T038 [US3] Extend ChannelForm для поддержки edit mode с предзаполнением данных
- [ ] T039 [US3] Add "Редактировать" button в ChannelCard с открытием формы в edit mode
- [ ] T040 [US3] Implement optimistic locking conflict handling в ChannelForm
- [ ] T041 [US3] Create ConflictDialog component в `frontend/src/components/channels/ConflictDialog.tsx` для отображения конфликта версий с вариантами "Показать изменения / Перезаписать / Отменить"
- [ ] T042 [US3] Integrate ConflictDialog в ChannelForm для обработки 409 Conflict response

**Checkpoint**: User Story 3 завершена - можно редактировать каналы с обработкой конфликтов

---

## Phase 6: User Story 4 - Удаление канала (Priority: P3)

**Goal**: Пользователь может удалять каналы с подтверждением и проверкой использования в рассылках

**Independent Test**: Выбрать канал из списка, нажать "Удалить", подтвердить → канал должен исчезнуть из списка

### Backend Implementation for User Story 4

- [ ] T043 [US4] Implement `deleteChannel()` method в `backend/src/services/channel-service.ts` с проверкой использования в активных campaigns
- [ ] T044 [US4] Implement DELETE `/api/channels/:id` endpoint в `backend/src/api/channels.ts` с обработкой 409 Conflict если канал используется

### Frontend Implementation for User Story 4

- [ ] T045 [P] [US4] Add `deleteChannel()` method в `frontend/src/services/channel-api.ts`
- [ ] T046 [P] [US4] Add `useDeleteChannel()` hook в `frontend/src/hooks/useChannels.ts`
- [ ] T047 [US4] Create DeleteDialog component в `frontend/src/components/channels/DeleteDialog.tsx` с подтверждением удаления
- [ ] T048 [US4] Add "Удалить" button в ChannelCard с открытием DeleteDialog
- [ ] T049 [US4] Implement handling 409 Conflict response в DeleteDialog (канал используется в рассылках)

**Checkpoint**: User Story 4 завершена - можно удалять каналы с подтверждением

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T050 [P] Add loading states во всех компонентах (ChannelForm, ChannelList, Dialogs)
- [ ] T051 [P] Add error boundaries в React компонентах для graceful error handling
- [ ] T052 Implement responsive design для мобильных устройств (320px - 2560px) во всех компонентах
- [ ] T053 [P] Add Russian error messages во всех формах и dialogs
- [ ] T054 [P] Add success notifications при успешном создании/редактировании/удалении канала
- [ ] T055 Validate against quickstart.md - пройти все примеры из quickstart.md для проверки работоспособности
- [ ] T056 [P] Code cleanup and refactoring (удалить console.log, улучшить naming)
- [ ] T057 [P] Performance optimization - проверить загрузку списка 100 каналов < 2 сек

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (независимо от US1)
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Depends on US2 for ChannelCard component (T026)
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Depends on US2 for ChannelCard component (T026)

**Note**: US3 и US4 зависят от US2 для компонента ChannelCard, но можно реализовать в параллель если создать ChannelCard отдельно.

### Within Each User Story

- Backend methods before endpoints
- API client before hooks
- Hooks before components
- Base components before integration
- Core implementation before error handling

### Parallel Opportunities

**Phase 1 (Setup):**
- T003 и T004 можно выполнить параллельно (разные файлы)

**Phase 2 (Foundational):**
- T006 и T007 можно выполнить параллельно (разные файлы)

**User Story 1 (Phase 3):**
- T012, T013, T014 можно выполнить параллельно (разные файлы)
- После T015 выполнять последовательно (зависимости внутри ChannelForm)

**User Story 2 (Phase 4):**
- T024 и T025 можно выполнить параллельно
- T026 и T027 последовательно (ChannelList использует ChannelCard)

**User Story 3 (Phase 5):**
- T036 и T037 можно выполнить параллельно

**User Story 4 (Phase 6):**
- T045 и T046 можно выполнить параллельно

**Phase 7 (Polish):**
- T050, T051, T053, T054, T056, T057 можно выполнить параллельно

---

## Parallel Example: User Story 1

```bash
# Parallel execution of independent tasks:
# Terminal 1:
Task T012: "Create API client в frontend/src/services/channel-api.ts"

# Terminal 2:
Task T013: "Create React Query hooks в frontend/src/hooks/useChannels.ts"

# Terminal 3:
Task T014: "Create debounce hook в frontend/src/hooks/useDebounce.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 3 Only)

1. Complete Phase 1: Setup → Database ready
2. Complete Phase 2: Foundational (CRITICAL) → Backend infrastructure ready
3. Complete Phase 3: User Story 1 → Can add channels
4. Complete Phase 5: User Story 3 → Can edit channels
5. **STOP and VALIDATE**: Test adding and editing channels independently
6. Deploy/demo if ready

**Rationale**: US1 (добавление) и US3 (редактирование) оба имеют приоритет P1 и являются критичными для работы с каналами. Просмотр списка (US2) и удаление (US4) можно добавить позже.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - можно добавлять каналы!)
3. Add User Story 3 → Test independently → Deploy/Demo (можно редактировать!)
4. Add User Story 2 → Test independently → Deploy/Demo (можно просматривать список!)
5. Add User Story 4 → Test independently → Deploy/Demo (можно удалять!)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Add channels)
   - Developer B: User Story 2 (List channels)
   - Developer C: User Story 3 (Edit channels - wait for US2 ChannelCard or create own)
3. Stories complete and integrate independently

**Note**: US3 и US4 требуют компонент ChannelCard из US2, поэтому лучше сначала завершить US2 или создать ChannelCard отдельно.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **MVP = User Stories 1 + 3** (добавление и редактирование каналов)
- Tests не включены - будут добавлены позже при необходимости
- Все текстовые сообщения на русском языке
- Все компоненты должны быть адаптивными (320px - 2560px)
