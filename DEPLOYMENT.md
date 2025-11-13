# 🚀 Deployment Guide - Production Server (UPDATED 2025-11-13)

## 📍 Current Production Environment

### Server Information
- **Server**: Ubuntu VPS
- **Domain**: `vedbot.ru`
- **Project Path**: `/var/www/predlagator`
- **Frontend**: `https://vedbot.ru/pred`
- **Backend API**: `https://vedbot.ru/pred/api`
- **Node.js**: v20.19.5
- **Branch**: `004-manual-channel-management`

### Active Ports
- **3000**: electra-dashboard (Next.js)
- **3001**: predlagator-api (Express + TypeScript)
- **80/443**: nginx (HTTP/HTTPS)

## Предварительные требования

- Сервер Ubuntu (VPS)
- Домен vedbot.ru настроен на этот сервер
- SSH доступ к серверу
- Supabase проект настроен

---

## Часть 1: Подготовка сервера

### 1.1. Подключение к серверу

```bash
ssh root@217.26.24.162
# или
ssh your_user@217.26.24.162
```

### 1.2. Установка необходимого ПО

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка версии
node -v  # должно быть v20.x
npm -v

# Установка PM2 (для управления процессами)
sudo npm install -g pm2

# Установка Git (если еще не установлен)
sudo apt install -y git

# Установка Nginx (если еще не установлен)
sudo apt install -y nginx
```

---

## Часть 2: Настройка проекта на сервере

### 2.1. Создание директории для проекта

```bash
# Создаем директорию для проектов
sudo mkdir -p /var/www/predlagator
sudo chown -R $USER:$USER /var/www/predlagator

# Переходим в директорию
cd /var/www/predlagator
```

### 2.2. Клонирование проекта

```bash
# Клонируем репозиторий
git clone https://github.com/filstack/predlagator.git .

# Переключаемся на нужную ветку
git checkout main
# или
git checkout 004-manual-channel-management
```

### 2.3. Настройка Backend

```bash
cd /var/www/predlagator/backend

# Устанавливаем зависимости
npm install

# Создаем файл окружения
nano .env
```

**Содержимое `.env` файла:**

```env
# Supabase
SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
SUPABASE_DIRECT_URL=postgresql://postgres.qjnxcjbzwelokluaiqmk:ваш_пароль@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

# Server
PORT=3001  # ← ВАЖНО: Порт 3001 (не 3000, занят electra-dashboard!)
NODE_ENV=production

# CORS (разрешенные origins)
CORS_ORIGIN=https://vedbot.ru

# Telegram (user-specific, обновляется после QR авторизации)
TELEGRAM_API_ID=21682307
TELEGRAM_API_HASH=ваш_api_hash
TELEGRAM_SESSION=  # Заполняется автоматически после QR auth

# Sessions
SESSION_SECRET=ваш_длинный_случайный_секрет
```

Сохраните файл: `Ctrl+X`, затем `Y`, затем `Enter`

```bash
# Сборка TypeScript
npm run build
```

### 2.4. Настройка Frontend

```bash
cd /var/www/predlagator/frontend

# Устанавливаем зависимости
npm install

# Создаем файл окружения
nano .env.production
```

**Содержимое `.env.production` файла:**

```env
VITE_API_URL=http://localhost:3001/api  # ← Порт 3001!
VITE_SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_key
```

**Примечание**: На production nginx проксирует `/pred/api` на `localhost:3001`, поэтому frontend обращается к `vedbot.ru/pred/api`, а nginx перенаправляет на внутренний порт 3001.

```bash
# Сборка production версии
npm run build
```

---

## Часть 3: Настройка PM2 (Process Manager)

### 3.1. Создание конфигурации PM2

```bash
cd /var/www/predlagator

# Создаем файл конфигурации PM2
nano ecosystem.config.js
```

**Содержимое `ecosystem.config.js`:**

```javascript
module.exports = {
  apps: [
    {
      name: 'predlagator-api',
      script: 'npm',
      args: 'run dev',  // tsx watch src/server.ts
      cwd: '/var/www/predlagator/backend',
      instances: 1,
      exec_mode: 'fork',  // fork, не cluster (для tsx watch)
      env: {
        NODE_ENV: 'production',
        PORT: 3001  // ← Порт 3001!
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'predlagator-worker',
      script: 'npm',
      args: 'run worker',  // tsx watch src/polling-worker-server.ts
      cwd: '/var/www/predlagator/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
```

**Примечание**: На production используем `tsx watch` для горячей перезагрузки при изменении файлов.

### 3.2. Запуск приложения через PM2

```bash
# Создаем директорию для логов
mkdir -p /var/www/predlagator/logs

# Запускаем приложение
pm2 start ecosystem.config.js

# Проверяем статус
pm2 status

# Настраиваем автозапуск при перезагрузке сервера
pm2 startup
# Выполните команду, которую покажет PM2

pm2 save

# Полезные команды PM2:
# pm2 logs predlagator-api     # Просмотр логов API
# pm2 logs predlagator-worker  # Просмотр логов Worker
# pm2 restart all              # Перезапуск всех процессов
# pm2 stop all                 # Остановка всех процессов
# pm2 delete all               # Удаление всех процессов
```

---

## Часть 4: Настройка Nginx

### 4.1. Создание конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/vedbot.ru
```

**Если файл уже существует**, добавьте в существующий `server` блок секцию для `/pred`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name vedbot.ru www.vedbot.ru;

    # Ваш существующий сайт (оставьте как есть)
    location / {
        # ... существующая конфигурация ...
    }

    # НОВАЯ СЕКЦИЯ: Predlagator Frontend
    location /pred {
        alias /var/www/predlagator/frontend/dist;
        try_files $uri $uri/ /pred/index.html;

        # Кэширование статических файлов
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # НОВАЯ СЕКЦИЯ: Predlagator API
    location /pred/api {
        rewrite ^/pred/api/(.*) /api/$1 break;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Увеличиваем таймауты для длинных запросов
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Если нужно создать ПОЛНОСТЬЮ НОВЫЙ файл конфигурации:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name vedbot.ru www.vedbot.ru;

    # Корневая директория для главного сайта
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    # Главный сайт
    location / {
        try_files $uri $uri/ =404;
    }

    # Predlagator Frontend
    location /pred {
        alias /var/www/predlagator/frontend/dist;
        try_files $uri $uri/ /pred/index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Predlagator API
    location /pred/api {
        rewrite ^/pred/api/(.*) /$1 break;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 4.2. Активация конфигурации

```bash
# Проверка конфигурации на ошибки
sudo nginx -t

# Если конфигурация новая, создаем симлинк
sudo ln -s /etc/nginx/sites-available/vedbot.ru /etc/nginx/sites-enabled/

# Перезагружаем Nginx
sudo systemctl reload nginx

# Проверяем статус
sudo systemctl status nginx
```

---

## Часть 5: Настройка SSL (HTTPS)

### 5.1. Установка Certbot

```bash
# Установка Certbot для Nginx
sudo apt install -y certbot python3-certbot-nginx

# Получение SSL сертификата
sudo certbot --nginx -d vedbot.ru -d www.vedbot.ru

# Следуйте инструкциям на экране
# Выберите опцию редиректа HTTP -> HTTPS

# Автоматическое обновление сертификата
sudo certbot renew --dry-run
```

---

## Часть 6: Настройка Frontend для подпути /pred

### 6.1. Обновление vite.config.ts

На **локальной машине** обновите `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/pred/', // ВАЖНО: добавляем базовый путь
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
```

### 6.2. Обновление роутинга в App.tsx

На **локальной машине** обновите `frontend/src/App.tsx`:

```typescript
import { BrowserRouter } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter basename="/pred">
      {/* ваши роуты */}
    </BrowserRouter>
  )
}
```

### 6.3. Пересборка и обновление на сервере

**На локальной машине:**

```bash
cd frontend
npm run build
```

**Закоммитьте и запушьте изменения:**

```bash
git add .
git commit -m "chore: настроить base path /pred для production"
git push
```

**На сервере:**

```bash
cd /var/www/predlagator

# Получаем последние изменения
git pull origin main

# Пересобираем frontend
cd frontend
npm install
npm run build

# Перезапускаем PM2 процессы
cd ..
pm2 restart all
```

---

## Часть 7: Применение миграций БД

```bash
cd /var/www/predlagator/backend

# Если используете Supabase, миграции можно применить через:
# 1. Supabase Dashboard -> SQL Editor
# 2. Или через npx supabase

# Применение миграций вручную (если нужно)
# Скопируйте содержимое файлов из shared/migrations/ и backend/migrations/
# и выполните их в Supabase SQL Editor
```

---

## Часть 8: Финальная проверка

### 8.1. Проверка процессов

```bash
# Проверяем PM2
pm2 status
pm2 logs predlagator-api --lines 50
pm2 logs predlagator-worker --lines 50

# Проверяем Nginx
sudo systemctl status nginx

# Проверяем порты
sudo netstat -tulpn | grep :5000
```

### 8.2. Тестирование

Откройте в браузере:

- **Frontend:** https://vedbot.ru/pred
- **API Health Check:** https://vedbot.ru/pred/api/health (создайте этот endpoint)

```bash
# Тест API через curl
curl https://vedbot.ru/pred/api/
```

---

## Часть 9: Автоматизация деплоя (опционально)

### 9.1. Создание скрипта деплоя

```bash
nano /var/www/predlagator/deploy.sh
```

**Содержимое `deploy.sh`:**

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Переход в директорию проекта
cd /var/www/predlagator

# Получение последних изменений
echo "📥 Pulling latest changes..."
git pull origin main

# Backend
echo "🔧 Building backend..."
cd backend
npm install --production
npm run build

# Frontend
echo "🎨 Building frontend..."
cd ../frontend
npm install
npm run build

# Перезапуск PM2
echo "♻️ Restarting PM2 processes..."
cd ..
pm2 restart all

# Проверка статуса
echo "✅ Deployment completed!"
pm2 status

echo "📊 Recent logs:"
pm2 logs --lines 20 --nostream
```

```bash
# Делаем скрипт исполняемым
chmod +x /var/www/predlagator/deploy.sh

# Теперь можно деплоить одной командой:
/var/www/predlagator/deploy.sh
```

---

## Часть 10: Мониторинг и логи

### 10.1. Просмотр логов

```bash
# PM2 логи
pm2 logs predlagator-api
pm2 logs predlagator-worker

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Системные логи
journalctl -u nginx -f
```

### 10.2. Мониторинг через PM2

```bash
# PM2 монитор в реальном времени
pm2 monit

# Веб-интерфейс PM2 Plus (опционально)
pm2 plus
```

---

## Troubleshooting (Решение проблем)

### Проблема: 502 Bad Gateway

```bash
# Проверьте, что backend запущен
pm2 status
pm2 logs predlagator-api

# Проверьте, что порт 5000 слушается
sudo netstat -tulpn | grep :5000

# Перезапустите процессы
pm2 restart all
```

### Проблема: Статические файлы не загружаются

```bash
# Проверьте права доступа
ls -la /var/www/predlagator/frontend/dist

# Установите правильные права
sudo chown -R www-data:www-data /var/www/predlagator/frontend/dist
sudo chmod -R 755 /var/www/predlagator/frontend/dist
```

### Проблема: CORS ошибки

Проверьте в `backend/src/app.ts` или `backend/src/server.ts`:

```typescript
app.use(cors({
  origin: ['https://vedbot.ru', 'http://localhost:5173'],
  credentials: true
}))
```

### Проблема: База данных не доступна

```bash
# Проверьте переменные окружения
cat /var/www/predlagator/backend/.env

# Проверьте подключение к Supabase
cd /var/www/predlagator/backend
npx tsx -e "import { createClient } from '@supabase/supabase-js'; const client = createClient('URL', 'KEY'); console.log('Connected');"
```

---

## Полезные команды

```bash
# Обновление проекта
cd /var/www/predlagator && git pull && pm2 restart all

# Просмотр логов
pm2 logs --lines 100

# Очистка логов
pm2 flush

# Restart конкретного процесса
pm2 restart predlagator-api

# Остановка всех процессов
pm2 stop all

# Мониторинг ресурсов
pm2 monit

# Проверка Nginx конфигурации
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx
```

---

## Checklist перед запуском

- [ ] Node.js 20.x установлен
- [ ] PM2 установлен глобально
- [ ] Nginx установлен и настроен
- [ ] Проект склонирован в /var/www/predlagator
- [ ] Backend .env файл настроен с правильными credentials
- [ ] Frontend .env.production настроен
- [ ] Backend собран (npm run build)
- [ ] Frontend собран (npm run build)
- [ ] PM2 процессы запущены и работают
- [ ] Nginx конфигурация обновлена для /pred
- [ ] SSL сертификат установлен (если нужен HTTPS)
- [ ] Миграции БД применены в Supabase
- [ ] Frontend настроен с basename="/pred"
- [ ] vite.config.ts имеет base: '/pred/'
- [ ] CORS настроен для vedbot.ru
- [ ] Тестирование: https://vedbot.ru/pred работает
- [ ] Тестирование: API доступен через /pred/api

---

## Контакты для поддержки

При возникновении проблем проверьте:
1. PM2 логи: `pm2 logs`
2. Nginx логи: `sudo tail -f /var/log/nginx/error.log`
3. Статус процессов: `pm2 status`
4. Конфигурация Nginx: `sudo nginx -t`

---

## 📊 Current Production Setup (2025-11-13)

### PM2 Processes
```bash
pm2 list
# predlagator-api: npm run dev (tsx watch src/server.ts) - Port 3001
# predlagator-worker: npm run worker (tsx watch src/polling-worker-server.ts)
# electra-dashboard: Next.js - Port 3000
```

### Nginx Configuration (vedbot.ru)
```nginx
location /pred {
    alias /var/www/predlagator/frontend/dist;
    try_files $uri $uri/ /pred/index.html;
}

location /pred/api/ {
    rewrite ^/pred/api/(.*)$ /api/$1 break;
    proxy_pass http://127.0.0.1:3001;  # ← PORT 3001!
    ...
}
```

### Environment Variables

**backend/.env**:
```bash
PORT=3001  # ← CRITICAL: Must be 3001 (3000 occupied by electra-dashboard)
TELEGRAM_SESSION=<updated_after_qr_auth>
SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
SUPABASE_DIRECT_URL=postgres://...
```

**frontend/.env**:
```bash
VITE_API_URL=http://localhost:3001/api  # ← Must match backend PORT
```

### Recent Issues Fixed

#### 1. Port Conflict (2025-11-13)
- **Issue**: API tried to use port 3000 (occupied by electra-dashboard)
- **Solution**: Changed to port 3001 in `backend/.env` and nginx config

#### 2. Telegram Session Not Persisting (2025-11-13)
- **Issue**: `AUTH_KEY_UNREGISTERED` after QR auth & page reload
- **Solution**: Updated `auth-telegram.ts` to call `telegramClient.updateSession()` after saving to `.env`
- **Commit**: `878fbf3a`

#### 3. tsx: not found (recurring)
- **Issue**: After `git pull`, PM2 cannot find tsx binary
- **Solution**: Run `npm install` in backend directory, then `pm2 restart --update-env`

### Deployment Workflow

```bash
# 1. On server
cd /var/www/predlagator

# 2. Stash local changes (.env files)
git stash

# 3. Pull latest code
git pull --rebase origin 004-manual-channel-management

# 4. Restore .env changes
git stash pop

# 5. Install dependencies (if package.json changed)
cd backend && npm install

# 6. Restart PM2 with updated env
pm2 restart predlagator-api --update-env
pm2 restart predlagator-worker --update-env

# 7. Check logs
pm2 logs predlagator-api --lines 30
```

### Common Commands

```bash
# Check port usage
lsof -i:3000
lsof -i:3001

# View logs
pm2 logs predlagator-api --lines 100
pm2 logs predlagator-api --err --lines 50

# Restart with env update
pm2 restart predlagator-api --update-env

# Check nginx config
sudo nginx -t
sudo systemctl reload nginx

# Monitor processes
pm2 monit
pm2 status
```

### Architecture Summary

```
Client (Browser)
    ↓
nginx (80/443) → SSL/TLS
    ↓
/pred → static files (React SPA)
/pred/api → proxy to localhost:3001
    ↓
Express API (port 3001)
    ↓
Telegram Client (GramJS)
Supabase (PostgreSQL + Auth)
pg-boss (job queue)
```

### Files to Never Commit
- `backend/.env` (contains secrets)
- `frontend/.env` (local config)
- `*.session` (Telegram session files)
- `node_modules/`

---

Удачного деплоя! 🚀

**Last Updated**: 2025-11-13
**Current Branch**: `004-manual-channel-management`
