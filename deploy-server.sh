#!/bin/bash

# ==============================================
# ПОЛНЫЙ СКРИПТ ДЕПЛОЯ НА vedbot.ru/pred
# ==============================================

set -e  # Остановиться при любой ошибке

echo "======================================"
echo "🚀 НАЧИНАЕМ ДЕПЛОЙ PREDLAGATOR"
echo "======================================"

# Переход в директорию проекта
cd /var/www/predlagator

echo ""
echo "📥 ШАГ 1: Обновление кода из GitHub..."
git reset --hard HEAD
git pull origin 004-manual-channel-management

echo ""
echo "🔧 ШАГ 2: Исправление прав доступа..."
# Исправляем права на node_modules
chmod -R +x frontend/node_modules/.bin/ || true
chmod -R +x backend/node_modules/.bin/ || true

# Исправляем владельца файлов
chown -R $USER:$USER /var/www/predlagator

echo ""
echo "📦 ШАГ 3: Установка зависимостей..."
cd backend
npm install --production
cd ../frontend
npm install

echo ""
echo "🏗️  ШАГ 4: Сборка backend..."
cd /var/www/predlagator/backend
npm run build

echo ""
echo "🎨 ШАГ 5: Сборка frontend..."
cd /var/www/predlagator/frontend

# Временно изменяем build script если нужно
if ! command -v tsc &> /dev/null; then
    echo "⚠️  tsc не найден, используем только vite build"
    npx vite build
else
    npm run build
fi

echo ""
echo "🔐 ШАГ 6: Проверка .env файлов..."

# Проверка backend .env
if ! grep -q "CORS_ORIGIN" /var/www/predlagator/backend/.env; then
    echo "⚠️  Добавляем CORS_ORIGIN в backend/.env"
    echo "" >> /var/www/predlagator/backend/.env
    echo "CORS_ORIGIN=https://vedbot.ru" >> /var/www/predlagator/backend/.env
fi

# Проверка frontend .env.production
if [ ! -f /var/www/predlagator/frontend/.env.production ]; then
    echo "⚠️  Создаем frontend/.env.production"
    cat > /var/www/predlagator/frontend/.env.production << 'EOF'
VITE_API_URL=https://vedbot.ru/pred/api
VITE_SUPABASE_URL=https://qjnxcjbzwelokluaiqmk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbnhjamJ6d2Vsb2tsdWFpcW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg3MjQwOTEsImV4cCI6MjA0NDMwMDA5MX0.x8XNgjFRmLYJuGnWivQmjr4Fb9YRxj8WjpBKqtMl_a0
EOF
fi

echo ""
echo "🌐 ШАГ 7: Проверка Nginx конфигурации..."
nginx -t

echo ""
echo "♻️  ШАГ 8: Перезапуск PM2..."
cd /var/www/predlagator
pm2 restart all

echo ""
echo "⏳ Ждем 3 секунды пока сервисы запустятся..."
sleep 3

echo ""
echo "✅ ШАГ 9: Проверка статуса..."
pm2 status

echo ""
echo "📊 ШАГ 10: Проверка логов..."
echo "--- BACKEND LOGS (последние 5 строк) ---"
pm2 logs predlagator-api --lines 5 --nostream

echo ""
echo "🧪 ШАГ 11: Тестирование endpoints..."
echo "Testing health endpoint..."
curl -s http://localhost:5000/health | jq . || echo "❌ Health check failed"

echo ""
echo "Testing API root..."
curl -s http://localhost:5000/api | jq . || echo "❌ API root failed"

echo ""
echo "======================================"
echo "✨ ДЕПЛОЙ ЗАВЕРШЕН!"
echo "======================================"
echo ""
echo "🌍 Откройте в браузере:"
echo "   Frontend: https://vedbot.ru/pred"
echo "   API:      https://vedbot.ru/pred/api"
echo ""
echo "📝 Полезные команды:"
echo "   pm2 logs predlagator-api     - логи API"
echo "   pm2 logs predlagator-worker  - логи Worker"
echo "   pm2 restart all              - перезапуск всех процессов"
echo "   nginx -t && systemctl reload nginx  - перезагрузка Nginx"
echo ""
