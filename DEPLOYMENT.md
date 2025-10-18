# Инструкция по деплою проекта на vedbot.ru/pred

## Предварительные требования

- Сервер Ubuntu (217.26.24.162)
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
PORT=5000
NODE_ENV=production

# CORS (разрешенные origins)
CORS_ORIGIN=https://vedbot.ru

# Telegram (если используется)
TELEGRAM_API_ID=ваш_api_id
TELEGRAM_API_HASH=ваш_api_hash

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
VITE_API_URL=https://vedbot.ru/pred/api
VITE_SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_key
```

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
      script: './backend/dist/server.js',
      cwd: '/var/www/predlagator',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'predlagator-worker',
      script: './backend/dist/worker-server.js',
      cwd: '/var/www/predlagator',
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

Удачного деплоя! 🚀
