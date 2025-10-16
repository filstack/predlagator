# ============================================================================
# PowerShell Script для миграции базы данных на Supabase
# ============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Миграция базы данных на Supabase" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия .env файла
if (-not (Test-Path ".\\.env")) {
    Write-Host "ОШИБКА: Файл .env не найден в папке shared!" -ForegroundColor Red
    Write-Host "Пожалуйста, создайте файл .env и заполните переменные окружения." -ForegroundColor Yellow
    exit 1
}

# Проверка наличия пароля в .env
$envContent = Get-Content ".\\.env" -Raw
if ($envContent -match "\[YOUR-PASSWORD\]") {
    Write-Host "ВНИМАНИЕ: В файле .env найден плейсхолдер [YOUR-PASSWORD]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Перед продолжением выполните следующие шаги:" -ForegroundColor Yellow
    Write-Host "1. Откройте Supabase Dashboard: https://supabase.com/dashboard/project/qjnxcjbzwelokluaiqmk" -ForegroundColor White
    Write-Host "2. Выполните SQL скрипт из файла setup-supabase.sql в SQL Editor" -ForegroundColor White
    Write-Host "3. Скопируйте пароль пользователя 'prisma'" -ForegroundColor White
    Write-Host "4. Замените [YOUR-PASSWORD] в файлах shared/.env и backend/.env" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Вы уже выполнили эти шаги? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Прерывание миграции." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Шаг 1: Проверка Prisma CLI..." -ForegroundColor Green
npx prisma --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Prisma CLI не найден!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Шаг 2: Генерация Prisma Client..." -ForegroundColor Green
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Не удалось сгенерировать Prisma Client!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Шаг 3: Проверка состояния миграций..." -ForegroundColor Green
npx prisma migrate status
$migrateStatus = $LASTEXITCODE

Write-Host ""
Write-Host "Выберите способ миграции:" -ForegroundColor Cyan
Write-Host "1. migrate dev - Для разработки (создаст новую миграцию)" -ForegroundColor White
Write-Host "2. db push - Для быстрого применения схемы (без истории миграций)" -ForegroundColor White
Write-Host "3. migrate deploy - Для продакшн (применит существующие миграции)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Введите номер (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Выполняется: npx prisma migrate dev --name init_supabase" -ForegroundColor Green
        npx prisma migrate dev --name init_supabase
    }
    "2" {
        Write-Host ""
        Write-Host "Выполняется: npx prisma db push" -ForegroundColor Green
        npx prisma db push
    }
    "3" {
        Write-Host ""
        Write-Host "Выполняется: npx prisma migrate deploy" -ForegroundColor Green
        npx prisma migrate deploy
    }
    default {
        Write-Host "Неверный выбор. Прерывание." -ForegroundColor Red
        exit 1
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host "  Миграция успешно завершена!" -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Следующие шаги:" -ForegroundColor Cyan
    Write-Host "1. Запустите seed: npx prisma db seed" -ForegroundColor White
    Write-Host "2. Проверьте базу данных: npx prisma studio" -ForegroundColor White
    Write-Host "3. Обновите frontend/.env с новыми Supabase credentials" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ОШИБКА: Миграция не удалась!" -ForegroundColor Red
    Write-Host "Проверьте логи выше для получения подробной информации." -ForegroundColor Yellow
    exit 1
}
