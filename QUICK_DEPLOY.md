# 🚀 БЫСТРЫЙ ДЕПЛОЙ НА СЕРВЕР

## Проблема которую вы сейчас испытываете
- `sh: 1: vite: Permission denied` - это проблема с правами доступа на файлы

## Решение в 3 шага

### Шаг 1: Исправьте права доступа (выполните на сервере)

```bash
chmod -R +x /var/www/predlagator/frontend/node_modules/.bin/
chmod -R +x /var/www/predlagator/backend/node_modules/.bin/
```

### Шаг 2: Соберите frontend напрямую через npx

```bash
cd /var/www/predlagator/frontend
npx --yes vite build
```

Если не сработает, выполните:

```bash
cd /var/www/predlagator/frontend
node_modules/.bin/vite build
```

### Шаг 3: Перезапустите PM2

```bash
pm2 restart all
pm2 logs predlagator-api --lines 10
```

---

## ИЛИ используйте автоматический скрипт деплоя

### На сервере выполните:

```bash
# Скачайте скрипт деплоя
cd /var/www/predlagator
curl -o deploy.sh https://raw.githubusercontent.com/filstack/predlagator/004-manual-channel-management/deploy-server.sh

# Сделайте скрипт исполняемым
chmod +x deploy.sh

# Запустите деплой
./deploy.sh
```

---

## Проверка после деплоя

1. Откройте браузер: `https://vedbot.ru/pred`
2. Попробуйте залогиниться
3. Если не работает, проверьте логи: `pm2 logs predlagator-api`

---

## Что делает скрипт деплоя?

✅ Обновляет код из GitHub
✅ Исправляет права доступа
✅ Устанавливает зависимости
✅ Собирает backend и frontend
✅ Проверяет .env файлы
✅ Перезапускает PM2
✅ Тестирует endpoints

---

## Если что-то пошло не так

### Backend не отвечает?
```bash
pm2 logs predlagator-api --lines 50
pm2 restart predlagator-api
```

### Frontend не обновился?
```bash
cd /var/www/predlagator/frontend
rm -rf dist
node_modules/.bin/vite build
```

### Nginx выдает ошибку?
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

---

## Контакты для срочной помощи

Если ничего не помогло:
1. Сделайте скриншот ошибки
2. Скопируйте вывод: `pm2 logs --lines 50`
3. Скопируйте вывод: `sudo nginx -t`

