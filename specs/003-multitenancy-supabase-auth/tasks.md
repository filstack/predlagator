# Tasks: Мультитенантность с Supabase Auth

**Input**: Design documents from `/specs/003-multitenancy-supabase-auth/`
**Prerequisites**: spec.md ✅

**Tests**: Tests are NOT requested for this feature - focus on implementation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Web app structure: `backend/src/`, `frontend/src/`
- Migrations: `shared/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Подготовка проекта к мультитенантности

- [ ] T001 Generate encryption key (32 bytes hex) and add to backend/.env as ENCRYPTION_KEY
- [ ] T002 [P] Install dependencies: npm install в backend/ (если нужны новые пакеты)
- [ ] T003 [P] Verify Supabase Auth is enabled in Supabase dashboard

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: База данных, RLS и шифрование - ДОЛЖНО быть готово перед любой User Story

**⚠️ CRITICAL**: Ни одна User Story не может начаться, пока эта фаза не завершена

- [ ] T004 Create database migration 003_multitenancy.sql in shared/migrations/
- [ ] T005 [P] Add Telegram credentials fields to users table (telegram_api_id, telegram_api_hash, telegram_session, telegram_phone, telegram_connected, telegram_user_id, telegram_username, telegram_first_name)
- [ ] T006 [P] Migrate users.id from TEXT to UUID and link to auth.users(id)
- [ ] T007 [P] Enable RLS on users table with policies (SELECT/UPDATE own profile)
- [ ] T008 Add user_id UUID column to channels, batches, templates, campaigns, jobs tables
- [ ] T009 [P] Enable RLS on channels table with policies (SELECT/INSERT/UPDATE/DELETE own channels)
- [ ] T010 [P] Enable RLS on batches table with policies (SELECT/INSERT/UPDATE/DELETE own batches)
- [ ] T011 [P] Enable RLS on templates table with policies (SELECT/INSERT/UPDATE/DELETE own templates)
- [ ] T012 [P] Enable RLS on campaigns table with policies (SELECT/INSERT/UPDATE/DELETE own campaigns)
- [ ] T013 [P] Enable RLS on jobs table with policies (SELECT/INSERT/UPDATE/DELETE own jobs)
- [ ] T014 [P] Enable RLS on audit_logs table with policy (SELECT own logs)
- [ ] T015 Run migration 003_multitenancy.sql in Supabase SQL Editor
- [ ] T016 [P] Create encryption utility backend/src/utils/encryption.ts with encrypt/decrypt functions (AES-256-CBC)
- [ ] T017 [P] Create Supabase auth helper backend/src/lib/supabase-auth.ts with createUserClient function

**Checkpoint**: База данных готова с RLS, шифрование работает - можно начинать User Stories

---

## Phase 3: User Story 1 - Backend Authentication (Priority: P1) 🎯 MVP

**Goal**: Пользователи могут регистрироваться и входить через Supabase Auth, получать JWT

**Independent Test**:
- POST /api/auth/register с email/password → получить session + JWT
- POST /api/auth/login с email/password → получить session + JWT
- GET /api/auth/me с JWT в header → получить user данные

### Implementation for User Story 1

- [ ] T018 [P] [US1] Create backend/src/api/auth.ts with router setup
- [ ] T019 [US1] Implement POST /api/auth/register endpoint (signUp через Supabase Auth + insert в users table)
- [ ] T020 [P] [US1] Implement POST /api/auth/login endpoint (signInWithPassword через Supabase Auth)
- [ ] T021 [P] [US1] Implement POST /api/auth/logout endpoint (signOut через Supabase Auth)
- [ ] T022 [P] [US1] Implement GET /api/auth/me endpoint (get user profile from users table)
- [ ] T023 [US1] Update backend/src/middleware/auth.ts to verify JWT via Supabase Auth getUser
- [ ] T024 [US1] Update AuthRequest interface to include req.supabase (user-specific client with RLS)
- [ ] T025 [US1] Register auth router in backend/src/server.ts as /api/auth
- [ ] T026 [US1] Test all auth endpoints manually (register → login → me → logout)

**Checkpoint**: Backend auth работает, JWT проверяется, пользователи могут регистрироваться и входить

---

## Phase 4: User Story 2 - Frontend Authentication (Priority: P1)

**Goal**: Frontend имеет Login/Register страницы, AuthContext, защищенные routes

**Independent Test**:
- Открыть /login → ввести email/password → войти → перенаправление на dashboard
- Открыть /register → создать аккаунт → перенаправление на /onboarding
- Обновить страницу → session восстановлена из localStorage
- Попытаться открыть /campaigns без auth → перенаправление на /login

### Implementation for User Story 2

- [ ] T027 [P] [US2] Install @supabase/supabase-js в frontend/ (если не установлен)
- [ ] T028 [P] [US2] Create frontend/src/contexts/AuthContext.tsx with AuthProvider, useAuth hook
- [ ] T029 [P] [US2] Implement signIn, signUp, signOut methods in AuthContext using Supabase client
- [ ] T030 [P] [US2] Add auth state listener (onAuthStateChange) to maintain session in AuthContext
- [ ] T031 [P] [US2] Create frontend/src/components/PrivateRoute.tsx для защиты routes
- [ ] T032 [P] [US2] Create frontend/src/pages/Login.tsx with email/password form
- [ ] T033 [P] [US2] Create frontend/src/pages/Register.tsx with email/password form
- [ ] T034 [US2] Update frontend/src/App.tsx: wrap app in AuthProvider
- [ ] T035 [US2] Update frontend/src/App.tsx: add /login and /register routes (public)
- [ ] T036 [US2] Protect existing routes (/campaigns, /batches, /templates, etc.) with PrivateRoute
- [ ] T037 [US2] Update frontend/src/lib/api.ts to add JWT to all API requests (Authorization header)
- [ ] T038 [US2] Test login flow: register → login → session persists → logout

**Checkpoint**: Frontend auth работает, routes защищены, session сохраняется

---

## Phase 5: User Story 3 - Telegram Credentials Management (Priority: P1)

**Goal**: Пользователи могут сохранять свои Telegram credentials в БД (зашифрованно)

**Independent Test**:
- PUT /api/auth/telegram-credentials с {apiId, apiHash, phone} → credentials сохранены зашифрованно
- POST /api/auth/telegram-session с {sessionString} → session сохранена зашифрованно
- GET /api/auth/me → telegram_connected = true

### Implementation for User Story 3

- [ ] T039 [P] [US3] Implement PUT /api/auth/telegram-credentials endpoint в backend/src/api/auth.ts (encrypt apiHash before save)
- [ ] T040 [P] [US3] Implement POST /api/auth/telegram-session endpoint в backend/src/api/auth.ts (encrypt sessionString before save)
- [ ] T041 [P] [US3] Update GET /api/auth/me to include telegram_connected status
- [ ] T042 [US3] Test encryption: save credentials → read from DB → verify encrypted → decrypt → verify matches original

**Checkpoint**: Telegram credentials сохраняются зашифрованно в БД

---

## Phase 6: User Story 4 - Onboarding Flow (Priority: P2)

**Goal**: После регистрации пользователь проходит 3-шаговый onboarding для настройки Telegram

**Independent Test**:
- Зарегистрироваться → перенаправление на /onboarding
- Шаг 1: Ввести API ID, API Hash, Phone → сохранено
- Шаг 2: Получить SMS код → ввести код (+2FA если нужно) → сохранено
- Шаг 3: Подтверждение → session сохранена → перенаправление на dashboard

### Implementation for User Story 4

- [ ] T043 [P] [US4] Create frontend/src/pages/Onboarding.tsx с 3 steps (stepper UI)
- [ ] T044 [P] [US4] Implement Step 1: Form для ввода Telegram API ID, Hash, Phone
- [ ] T045 [US4] Step 1: Call PUT /api/auth/telegram-credentials при submit → next step
- [ ] T046 [P] [US4] Implement Step 2: Use existing auth-telegram flow (POST /api/auth-telegram/start → verify-code → verify-password)
- [ ] T047 [US4] Step 2: После получения sessionString → next step
- [ ] T048 [P] [US4] Implement Step 3: Confirmation screen, call POST /api/auth/telegram-session
- [ ] T049 [US4] Step 3: После успеха → redirect to /campaigns
- [ ] T050 [US4] Update Register page: после успешной регистрации → redirect to /onboarding (не dashboard)
- [ ] T051 [US4] Add skip logic: если telegram_connected=true → skip onboarding, go to dashboard
- [ ] T052 [US4] Test full onboarding flow: register → step 1 → step 2 → step 3 → campaigns

**Checkpoint**: Onboarding работает, новые пользователи могут настроить Telegram

---

## Phase 7: User Story 5 - Multitenancy Telegram Clients (Priority: P1)

**Goal**: Каждый пользователь использует свой Telegram client, workers обрабатывают jobs с user-specific clients

**Independent Test**:
- Создать 2 пользователя с разными Telegram accounts
- Каждый создает campaign
- Оба campaigns отправляют сообщения параллельно через свои Telegram accounts
- Проверить audit logs: каждый user видит только свои actions

### Implementation for User Story 5

- [ ] T053 [P] [US5] Refactor backend/src/lib/telegram-client.ts: Replace singleton with TelegramClientManager class
- [ ] T054 [US5] Implement TelegramClientManager.getClient(userId) method: fetch credentials from DB → decrypt → create/cache TelegramClient
- [ ] T055 [P] [US5] Implement TelegramClientManager.disconnectUser(userId) method
- [ ] T056 [P] [US5] Update backend/src/services/telegram.ts: Add userId parameter to sendMessage method
- [ ] T057 [US5] Update TelegramService.sendMessage to call telegramClientManager.getClient(userId)
- [ ] T058 [P] [US5] Update backend/src/types/queue-jobs.ts: Add userId to SendMessageJobData interface
- [ ] T059 [US5] Update backend/src/workers/message-worker.ts: Pass userId to telegramService.sendMessage
- [ ] T060 [US5] Update backend/src/workers/campaign-worker.ts: Include userId in SendMessageJobData when creating jobs
- [ ] T061 [US5] Update backend/src/api/campaigns.ts: Get userId from req.user and pass to campaign creation
- [ ] T062 [US5] Test multitenancy: Create 2 users → each creates campaign → both send messages → verify isolation

**Checkpoint**: Мультитенантность работает, каждый user использует свой Telegram account

---

## Phase 8: User Story 6 - Data Migration (Priority: P1)

**Goal**: Перенести существующие данные в новую схему с user_id

**Independent Test**:
- Создать Supabase Auth пользователя для admin
- Все существующие channels/batches/campaigns привязаны к admin user
- Admin может видеть и управлять всеми старыми данными
- Новые пользователи не видят старые данные admin'а

### Implementation for User Story 6

- [ ] T063 [US6] Create migration script backend/scripts/migrate-data-to-multitenancy.ts
- [ ] T064 [US6] Script Step 1: Create Supabase Auth user for admin (email: admin@example.com, generate password)
- [ ] T065 [US6] Script Step 2: Insert admin user into users table with Supabase Auth UUID
- [ ] T066 [US6] Script Step 3: Update all channels → set user_id = admin UUID
- [ ] T067 [US6] Script Step 4: Update all batches → set user_id = admin UUID (or created_by_id if exists)
- [ ] T068 [US6] Script Step 5: Update all templates → set user_id = admin UUID
- [ ] T069 [US6] Script Step 6: Update all campaigns → set user_id = admin UUID (or created_by_id if exists)
- [ ] T070 [US6] Script Step 7: Update all jobs → set user_id to campaign owner's UUID
- [ ] T071 [US6] Script Step 8: Encrypt and save Telegram credentials from .env to admin user row (TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION)
- [ ] T072 [US6] Run migration script: npx tsx backend/scripts/migrate-data-to-multitenancy.ts
- [ ] T073 [US6] Verify migration: Login as admin → see all old data → create new campaign → works
- [ ] T074 [US6] Save admin credentials to secure location (email + generated password)

**Checkpoint**: Существующие данные перенесены, admin может работать как раньше

---

## Phase 9: User Story 7 - Profile Management (Priority: P3)

**Goal**: Пользователи могут обновлять свои Telegram credentials в профиле

**Independent Test**:
- Открыть /profile
- Увидеть текущий Telegram status (connected/disconnected)
- Обновить Telegram credentials → re-authenticate → новые credentials сохранены
- Создать campaign → использует новые credentials

### Implementation for User Story 7

- [ ] T075 [P] [US7] Create frontend/src/pages/Profile.tsx с отображением user info
- [ ] T076 [P] [US7] Show Telegram connection status (telegram_connected, telegram_phone, telegram_username)
- [ ] T077 [P] [US7] Add "Update Telegram Credentials" button → opens modal/form
- [ ] T078 [US7] Modal: Reuse onboarding flow components (Step 1: credentials, Step 2: auth, Step 3: confirm)
- [ ] T079 [US7] After update: Disconnect old TelegramClient and connect new one (call telegramClientManager.disconnectUser)
- [ ] T080 [US7] Test: Update credentials → create campaign → verify uses new Telegram account

**Checkpoint**: Пользователи могут обновлять Telegram credentials

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Улучшения, затрагивающие несколько User Stories

- [ ] T081 [P] Add loading states to all auth forms (Login, Register, Onboarding)
- [ ] T082 [P] Add error handling and user-friendly error messages for auth failures
- [ ] T083 [P] Add validation to Telegram credentials inputs (API ID = number, phone = +format)
- [ ] T084 Update frontend/src/lib/api.ts to handle 401 errors → redirect to /login
- [ ] T085 [P] Add audit logging for auth events: SESSION_STRING_ADDED, SESSION_STRING_ROTATED
- [ ] T086 [P] Remove old global Telegram setup from Settings page (if exists)
- [ ] T087 [P] Update CLAUDE.md documentation with new multitenancy architecture
- [ ] T088 [P] Add rate limiting per user_id in backend (если еще не реализовано)
- [ ] T089 Code cleanup: Remove unused imports and old auth code
- [ ] T090 Final integration test: 2 users in parallel → each creates campaign → both send messages successfully

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 (Backend Auth) → US2 (Frontend Auth) → US3 (Telegram Credentials) → US4 (Onboarding)
  - US5 (Multitenancy Telegram) can start after US3
  - US6 (Data Migration) should be done after US5 is working
  - US7 (Profile) can start after US3
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Backend Auth)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US2 (Frontend Auth)**: Depends on US1 (needs backend endpoints)
- **US3 (Telegram Credentials)**: Depends on US1 (needs auth endpoints)
- **US4 (Onboarding)**: Depends on US2, US3 (needs frontend auth + telegram endpoints)
- **US5 (Multitenancy Telegram)**: Depends on US3 (needs encrypted credentials in DB)
- **US6 (Data Migration)**: Depends on US5 (needs multitenancy working)
- **US7 (Profile)**: Depends on US2, US3 (needs frontend auth + telegram endpoints)

### Within Each User Story

- Backend before frontend
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: All tasks marked [P] can run in parallel
- **Phase 2 (Foundational)**: Tasks T005-T014 (RLS policies for each table) can run in parallel
- **Phase 2**: Tasks T016, T017 (encryption, supabase-auth helpers) can run in parallel with RLS tasks
- **US1**: Tasks T018, T020, T021, T022 (auth endpoints) can be created in parallel, then T023-T026 sequentially
- **US2**: Tasks T027-T033 (frontend components) can run in parallel
- **US3**: Tasks T039-T041 (backend endpoints) can run in parallel
- **US4**: Tasks T043-T046, T048 (onboarding steps UI) can start in parallel, integration sequentially
- **US5**: Tasks T053, T055, T056, T058 (refactor different files) can run in parallel
- **Phase 10 (Polish)**: Tasks T081-T089 can run in parallel

---

## Parallel Example: User Story 1 (Backend Auth)

```bash
# Launch backend auth endpoints in parallel:
Task: "Create backend/src/api/auth.ts with router setup"
Task: "Implement POST /api/auth/login endpoint"
Task: "Implement POST /api/auth/logout endpoint"
Task: "Implement GET /api/auth/me endpoint"

# Then sequentially:
Task: "Update middleware to verify JWT via Supabase Auth"
Task: "Register auth router in server.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3, 5)

1. Complete Phase 1: Setup (1-2 tasks)
2. Complete Phase 2: Foundational (Database + RLS + Encryption) - CRITICAL
3. Complete Phase 3: US1 (Backend Auth)
4. Complete Phase 4: US2 (Frontend Auth)
5. Complete Phase 5: US3 (Telegram Credentials)
6. Complete Phase 7: US5 (Multitenancy Telegram)
7. Complete Phase 8: US6 (Data Migration)
8. **STOP and VALIDATE**: Test multitenancy with 2 users
9. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Test auth independently → Can login/register
3. Add US3 → Test credentials storage → Encrypted in DB
4. Add US4 → Test onboarding → New users can setup Telegram
5. Add US5 → Test multitenancy → Multiple users send messages
6. Add US6 → Migrate old data → Admin user works
7. Add US7 → Profile management → Users can update credentials
8. Polish → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- RLS is critical - test with multiple users to verify data isolation
- Encryption key MUST be 32 bytes hex (generate with: `openssl rand -hex 32`)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Data migration (US6) should be done carefully - backup database first
