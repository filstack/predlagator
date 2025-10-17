# migrate-supabase.ps1
# Run Prisma migration with Supabase connection

$env:DATABASE_URL = "postgresql://postgres:iLspQmhpyJ0KGJBp@db.wjwojephnnrnucexlteh.supabase.co:5432/postgres?sslmode=require"

Write-Host "=== Prisma Migration to Supabase ===" -ForegroundColor Cyan
Write-Host "DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Yellow
Write-Host ""

npx prisma migrate dev --name init

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Migration successful! ===" -ForegroundColor Green
    Write-Host "Now generating Prisma Client..." -ForegroundColor Cyan
    npx prisma generate

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=== Success! ===" -ForegroundColor Green
        Write-Host "Tables created in Supabase PostgreSQL" -ForegroundColor Green
        Write-Host "Prisma Client generated" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "=== Migration failed! ===" -ForegroundColor Red
    Write-Host "Check the error above" -ForegroundColor Red
}
