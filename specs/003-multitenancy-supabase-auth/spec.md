# Feature 003: Мультитенантность с Supabase Auth и персональными Telegram credentials

## Описание

Реализовать полноценную систему мультитенантности, где каждый пользователь:
- Регистрируется через **Supabase Auth** (email + password)
- Хранит свои **персональные Telegram API credentials** (API ID, API Hash, Session String)
- Видит и управляет **только своими данными** (channels, batches, campaigns)
- Использует свой Telegram аккаунт для отправки сообщений

## Мотивация

**Текущая проблема:**
- Все пользователи используют один глобальный Telegram аккаунт (из .env)
- Session string хранится в .env и требует ручного обновления
- Невозможно масштабировать систему на нескольких пользователей
- Риск блокировки единственного Telegram аккаунта

**Цель:**
- Изолировать данные пользователей через Row Level Security
- Каждый пользователь работает со своим Telegram аккаунтом
- Безопасное хранение credentials в БД
- Масштабируемость и мультитенантность

## Clarifications

### Session 2025-10-16

- Q: Управление жизненным циклом Telegram clients: планируется кешировать TelegramClient объекты для каждого пользователя. Необходимо определить стратегию управления кешем. → A: Ограниченный кеш: max 50 подключений, TTL 30 минут, LRU eviction
- Q: Email verification при регистрации: требовать подтверждение email при регистрации? → A: Не требовать на MVP этапе, добавить позже
- Q: Ограничение количества Telegram аккаунтов на пользователя: сколько Telegram аккаунтов может настроить один пользователь? → A: Неограниченное количество аккаунтов (отдельная таблица telegram_accounts)
- Q: Стратегия восстановления пароля: нужна ли функция password reset? → A: Не реализовывать на MVP, добавить позже
- Q: Multi-device поддержка: может ли один пользователь быть залогинен на нескольких устройствах одновременно? → A: Поддерживать несколько активных сессий (стандартное поведение Supabase Auth)

## Технический дизайн

### 1. База данных (Supabase)

#### 1.1 Интеграция с Supabase Auth

**Текущая таблица `users`:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'OPERATOR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

**Новая схема `users` с Supabase Auth:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User metadata
  role TEXT NOT NULL DEFAULT 'OPERATOR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,

  CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'OPERATOR', 'AUDITOR'))
);
```

**Изменения:**
- `id` теперь `UUID` и ссылается на `auth.users(id)`
- Удалено: `username`, `password_hash` (управляется Supabase Auth)
- Telegram credentials вынесены в отдельную таблицу `telegram_accounts`

**Новая таблица `telegram_accounts`:**
```sql
CREATE TABLE telegram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Telegram credentials (encrypted)
  telegram_api_id TEXT NOT NULL,
  telegram_api_hash TEXT NOT NULL, -- encrypted AES-256
  telegram_session TEXT, -- encrypted AES-256
  telegram_phone TEXT NOT NULL,

  -- Telegram user info (после авторизации)
  telegram_connected BOOLEAN DEFAULT FALSE,
  telegram_user_id TEXT,
  telegram_username TEXT,
  telegram_first_name TEXT,

  -- Account metadata
  name TEXT, -- Дружественное имя для аккаунта (например, "Основной", "Резервный")
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT telegram_accounts_phone_unique UNIQUE (telegram_phone)
);

CREATE INDEX idx_telegram_accounts_user_id ON telegram_accounts(user_id);
```

**Связь с campaigns:**
```sql
ALTER TABLE campaigns ADD COLUMN telegram_account_id UUID REFERENCES telegram_accounts(id);
```

#### 1.2 Row Level Security (RLS)

Включить RLS для всех таблиц и создать политики:

**Таблица `users`:**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

**Таблица `telegram_accounts`:**
```sql
ALTER TABLE telegram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own telegram accounts"
  ON telegram_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own telegram accounts"
  ON telegram_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own telegram accounts"
  ON telegram_accounts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own telegram accounts"
  ON telegram_accounts FOR DELETE
  USING (user_id = auth.uid());
```

**Таблицы `channels`, `batches`, `templates`, `campaigns`, `jobs`:**

Добавить колонку `user_id UUID REFERENCES users(id)` во все таблицы (или использовать существующий `created_by_id`).

```sql
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own channels"
  ON channels FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own channels"
  ON channels FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own channels"
  ON channels FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own channels"
  ON channels FOR DELETE
  USING (user_id = auth.uid());
```

Повторить для всех таблиц: `batches`, `templates`, `campaigns`, `jobs`, `audit_logs`.

#### 1.3 Миграция данных

**Стратегия:**
1. Создать Supabase Auth пользователей для существующих users
2. Связать `users.id` с `auth.users.id`
3. Перенести данные (channels, batches, campaigns) к первому пользователю
4. Добавить `user_id` ко всем записям

### 2. Backend API

#### 2.1 Аутентификация через Supabase Auth

**Новый модуль `src/lib/supabase-auth.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';

// Создать клиент с JWT пользователя
export function createUserClient(accessToken: string) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
}
```

**Обновить middleware `src/middleware/auth.ts`:**
```typescript
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.substring(7);

  // Проверить JWT через Supabase
  const supabase = createAnonClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Создать клиент с RLS для этого пользователя
  req.user = user;
  req.supabase = createUserClient(token);

  next();
}
```

**Новые API endpoints `src/api/auth.ts`:**
```typescript
// POST /api/auth/register - Регистрация
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const supabase = createAnonClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) return res.status(400).json({ error: error.message });

  // Создать запись в таблице users
  await supabase.from('users').insert({
    id: data.user!.id,
    role: 'OPERATOR'
  });

  res.json({ user: data.user, session: data.session });
});

// POST /api/auth/login - Вход
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const supabase = createAnonClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) return res.status(401).json({ error: error.message });

  res.json({ user: data.user, session: data.session });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  await req.supabase.auth.signOut();
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { data: user } = await req.supabase
    .from('users')
    .select('*')
    .eq('id', req.user!.id)
    .single();

  res.json(user);
});

// PUT /api/auth/telegram-credentials
router.put('/telegram-credentials', authenticate, async (req, res) => {
  const { apiId, apiHash, phone } = req.body;

  // Сохранить в БД (зашифровать apiHash)
  const { error } = await req.supabase
    .from('users')
    .update({
      telegram_api_id: apiId,
      telegram_api_hash: encrypt(apiHash), // AES-256
      telegram_phone: phone
    })
    .eq('id', req.user!.id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// POST /api/auth/telegram-session
router.post('/telegram-session', authenticate, async (req, res) => {
  const { sessionString } = req.body;

  // Сохранить зашифрованную session
  const { error } = await req.supabase
    .from('users')
    .update({
      telegram_session: encrypt(sessionString),
      telegram_connected: true
    })
    .eq('id', req.user!.id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});
```

#### 2.2 Мультитенантные Telegram clients

**Обновить `src/lib/telegram-client.ts`:**
```typescript
interface CachedClient {
  client: TelegramClient;
  lastAccessedAt: number;
}

class TelegramClientManager {
  private clients: Map<string, CachedClient> = new Map(); // key = telegram_account_id
  private readonly MAX_CLIENTS = 50;
  private readonly TTL_MS = 30 * 60 * 1000; // 30 минут

  async getClient(telegramAccountId: string): Promise<TelegramClient> {
    // Проверить cache
    const cached = this.clients.get(telegramAccountId);
    if (cached) {
      const age = Date.now() - cached.lastAccessedAt;
      if (age < this.TTL_MS && cached.client.connected) {
        cached.lastAccessedAt = Date.now(); // Обновить timestamp
        return cached.client;
      } else {
        // TTL истек или клиент отключен
        await cached.client.disconnect().catch(() => {});
        this.clients.delete(telegramAccountId);
      }
    }

    // Проверить лимит кеша (LRU eviction)
    if (this.clients.size >= this.MAX_CLIENTS) {
      await this.evictLRU();
    }

    // Получить credentials из БД
    const supabase = getSupabase();
    const { data: account } = await supabase
      .from('telegram_accounts')
      .select('telegram_api_id, telegram_api_hash, telegram_session, is_active')
      .eq('id', telegramAccountId)
      .single();

    if (!account?.telegram_session) {
      throw new Error('Telegram account not configured or connected');
    }

    if (!account.is_active) {
      throw new Error('Telegram account is disabled');
    }

    // Создать новый client
    const apiId = parseInt(account.telegram_api_id!);
    const apiHash = decrypt(account.telegram_api_hash!);
    const sessionString = decrypt(account.telegram_session);

    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      autoReconnect: true
    });

    await client.connect();

    // Сохранить в cache
    this.clients.set(telegramAccountId, {
      client,
      lastAccessedAt: Date.now()
    });

    return client;
  }

  private async evictLRU() {
    // Найти самый старый неиспользуемый клиент
    let oldestAccountId: string | null = null;
    let oldestTime = Infinity;

    for (const [accountId, cached] of this.clients.entries()) {
      if (cached.lastAccessedAt < oldestTime) {
        oldestTime = cached.lastAccessedAt;
        oldestAccountId = accountId;
      }
    }

    if (oldestAccountId) {
      const cached = this.clients.get(oldestAccountId)!;
      await cached.client.disconnect().catch(() => {});
      this.clients.delete(oldestAccountId);
    }
  }

  async disconnectAccount(telegramAccountId: string) {
    const cached = this.clients.get(telegramAccountId);
    if (cached) {
      await cached.client.disconnect();
      this.clients.delete(telegramAccountId);
    }
  }

  // Периодическая очистка истекших клиентов
  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [accountId, cached] of this.clients.entries()) {
        if (now - cached.lastAccessedAt >= this.TTL_MS) {
          cached.client.disconnect().catch(() => {});
          this.clients.delete(accountId);
        }
      }
    }, 5 * 60 * 1000); // Каждые 5 минут
  }
}

export const telegramClientManager = new TelegramClientManager();
telegramClientManager.startCleanupInterval();
```

**Обновить `src/services/telegram.ts`:**
```typescript
class TelegramService {
  async sendMessage(
    telegramAccountId: string,
    channelUsername: string,
    content: string,
    options?: { mediaType?, mediaUrl? }
  ): Promise<SendMessageResult> {
    // Получить client для этого Telegram аккаунта
    const client = await telegramClientManager.getClient(telegramAccountId);

    // Отправить сообщение
    const entity = await client.getEntity(channelUsername);
    const result = await client.sendMessage(entity, { message: content });

    return { success: true, messageId: result.id };
  }
}
```

#### 2.3 Workers с мультитенантностью

**Обновить `src/workers/message-worker.ts`:**
```typescript
export async function createMessageWorker(boss: PgBoss) {
  await boss.work<SendMessageJobData>(
    QUEUE_NAMES.SEND_MESSAGE,
    async (jobs) => {
      await Promise.allSettled(jobs.map(job => processMessageJob(job)));
    }
  );
}

async function processMessageJob(job: PgBoss.Job<SendMessageJobData>) {
  const { jobId, campaignId, userId, telegramAccountId, channelUsername, templateContent } = job.data;

  // Получить Telegram client для указанного аккаунта
  const result = await telegramService.sendMessage(
    telegramAccountId,  // <-- Передаем telegramAccountId
    channelUsername,
    templateContent,
    { mediaType, mediaUrl }
  );

  // ... остальная логика
}
```

**Обновить job data types:**
```typescript
export interface SendMessageJobData {
  jobId: string;
  campaignId: string;
  userId: string;  // <-- user_id из campaigns (для audit logs)
  telegramAccountId: string;  // <-- ID Telegram аккаунта для отправки
  channelId: string;
  channelUsername: string;
  templateContent: string;
  mediaType?: string;
  mediaUrl?: string;
  attempt: number;
}
```

### 3. Frontend

#### 3.1 Структура страниц

**Новые страницы:**
- `/login` - Вход (email + password)
- `/register` - Регистрация
- `/onboarding` - Настройка Telegram после регистрации (3 шага)
- `/profile` - Управление Telegram credentials

**Изменения:**
- Добавить защиту всех routes через `PrivateRoute`
- Убрать глобальную настройку Telegram из `/settings`

#### 3.2 Аутентификация (React Context)

**Создать `src/contexts/AuthContext.tsx`:**
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  supabase: SupabaseClient;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  useEffect(() => {
    // Проверить сохраненную сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Слушать изменения auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Создать `src/components/PrivateRoute.tsx`:**
```typescript
export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

#### 3.3 Onboarding flow

**Страница `/onboarding` - 3 шага:**

**Шаг 1: Ввести Telegram API credentials**
```tsx
<form onSubmit={handleSaveCredentials}>
  <input name="apiId" placeholder="API ID" />
  <input name="apiHash" placeholder="API Hash" />
  <input name="phone" placeholder="Phone (+79219124745)" />
  <button>Далее</button>
</form>
```

**Шаг 2: Получить SMS код**
- Отправить код на телефон через `POST /api/auth-telegram/start`
- Ввести код + возможно 2FA password

**Шаг 3: Подтверждение**
- Сохранить session string через `POST /api/auth/telegram-session`
- Перенаправить на dashboard

#### 3.4 API клиент с JWT

**Обновить `src/lib/api.ts`:**
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// Добавить JWT в каждый запрос
api.interceptors.request.use((config) => {
  const session = supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
```

### 4. Безопасность

#### 4.1 Шифрование Telegram credentials

**Создать `src/utils/encryption.ts`:**
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**Добавить в `.env`:**
```
ENCRYPTION_KEY=<generate 32 byte hex string>
```

#### 4.2 Валидация

- Проверять, что Telegram credentials принадлежат текущему пользователю
- Rate limiting по `user_id`
- Audit logs всех операций с Telegram credentials

## Acceptance Criteria

### Функциональные требования

✅ **Регистрация и вход:**
- [ ] Пользователь может зарегистрироваться через email + password
- [ ] Пользователь может войти и получить JWT
- [ ] JWT автоматически добавляется ко всем API запросам
- [ ] Session сохраняется в localStorage и восстанавливается при перезагрузке

✅ **Onboarding:**
- [ ] После регистрации пользователь проходит onboarding (3 шага)
- [ ] Можно ввести Telegram API ID, Hash, Phone
- [ ] Можно авторизоваться в Telegram (SMS + 2FA)
- [ ] Session string сохраняется зашифрованной в БД

✅ **Изоляция данных:**
- [ ] Пользователь видит только свои channels, batches, campaigns
- [ ] Невозможно получить данные другого пользователя через API
- [ ] RLS работает корректно для всех таблиц

✅ **Telegram отправка:**
- [ ] Сообщения отправляются через Telegram аккаунт пользователя
- [ ] Worker использует правильный TelegramClient для каждого job
- [ ] Несколько пользователей могут отправлять параллельно

✅ **Безопасность:**
- [ ] Telegram credentials зашифрованы в БД (AES-256)
- [ ] JWT проверяется через Supabase Auth
- [ ] Rate limiting работает per-user

### Нефункциональные требования

✅ **Производительность:**
- [ ] Telegram clients кэшируются (не пересоздаются на каждый запрос)
- [ ] RLS не замедляет запросы значительно

✅ **UX:**
- [ ] Onboarding понятен и занимает <5 минут
- [ ] Ошибки авторизации понятны пользователю
- [ ] Можно обновить Telegram credentials в профиле

## Миграция существующих данных

### Стратегия

1. **Создать Supabase Auth пользователя для admin:**
   - Email: `admin@example.com`
   - Password: генерировать автоматически

2. **Связать существующие данные:**
   - Все channels → `user_id = admin_id`
   - Все batches → `user_id = admin_id`
   - Все campaigns → `user_id = admin_id`

3. **Перенести Telegram credentials из .env в БД (зашифрованно)**

4. **Удалить старую таблицу `users` (после миграции)**

## Open Questions

1. **Billing:** Добавить subscription/billing (Stripe) в будущем? (Отложено до post-MVP)

## Dependencies

- Supabase Auth настроен и работает
- Encryption key сгенерирован и сохранен в .env
- Frontend библиотеки: `@supabase/supabase-js`, `react-router-dom`

## Risks

⚠️ **Сложность миграции данных** - нужно тщательно протестировать миграцию существующих users и их данных
⚠️ **RLS overhead** - RLS может замедлить запросы, нужно мониторить производительность
⚠️ **Telegram client management** - нужно корректно управлять жизненным циклом TelegramClient (reconnect, disconnect)
