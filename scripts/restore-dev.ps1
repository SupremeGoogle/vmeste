# Восстановление локальной среды разработки одной командой:
#
#     powershell -ExecutionPolicy Bypass -File scripts\restore-dev.ps1
#
# Зачем: .gitignore обещает, что .localtools и node_modules «пересоздаются
# скриптом восстановления». Скрипта не было, и после того как папку проекта
# удалили и вернули из копии, поднимать всё пришлось руками. Теперь — здесь.
#
# Скрипт идемпотентен: повторный запуск на живой среде ничего не ломает.
# Он НИЧЕГО не удаляет из базы и не трогает .env.

$ErrorActionPreference = "Stop"

$Root    = Split-Path -Parent $PSScriptRoot
$Tools   = Join-Path $Root ".localtools"
$PgBin   = Join-Path $Tools "pgsql\bin"
$PgData  = Join-Path $Tools "pgdata"
$PgLog   = Join-Path $Tools "pg.log"
$PgPort  = 5433

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Ok($text)   { Write-Host "   ok: $text" -ForegroundColor Green }
function Warn($text) { Write-Host "   ! $text" -ForegroundColor Yellow }

Set-Location $Root

# ── 1. .env ─────────────────────────────────────────────────────────
Step ".env"
if (Test-Path (Join-Path $Root ".env")) {
    Ok ".env на месте"
} else {
    Copy-Item (Join-Path $Root ".env.example") (Join-Path $Root ".env")
    Warn "создан .env из .env.example — впишите ключи, если нужен вход через Google"
}

# ── 2. Зависимости ──────────────────────────────────────────────────
Step "npm-зависимости"
if (Test-Path (Join-Path $Root "node_modules\next")) {
    Ok "node_modules на месте"
} else {
    Write-Host "   ставим (это несколько минут)..."
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install не прошёл" }
    Ok "поставлены"
}

# ── 3. PostgreSQL ───────────────────────────────────────────────────
# Встроенный кластер на 5433, чтобы не спорить с системным на 5432.
Step "PostgreSQL на :$PgPort"
if (-not (Test-Path $PgData)) {
    throw "нет $PgData — встроенный кластер утрачен, поднимите базу вручную и поправьте DATABASE_URL"
}

$pidFile = Join-Path $PgData "postmaster.pid"
if (Test-Path $pidFile) {
    # Лишний lock остаётся после жёсткого выключения и после переноса папки
    # с другой машины. Снимаем его, только если процесса и правда нет:
    # удалить живой lock — это две базы на одном каталоге и порча данных.
    $stalePid = (Get-Content $pidFile -TotalCount 1).Trim()
    $alive = Get-Process -Id $stalePid -ErrorAction SilentlyContinue
    if ($null -eq $alive) {
        Remove-Item $pidFile -Force
        Warn "снят зависший lock (PID $stalePid уже не живёт)"
    }
}

& (Join-Path $PgBin "pg_ctl.exe") -D $PgData status *> $null
if ($LASTEXITCODE -eq 0) {
    Ok "уже запущен"
} else {
    & (Join-Path $PgBin "pg_ctl.exe") -D $PgData -l $PgLog -o "-p $PgPort" start | Out-Null
    Start-Sleep -Seconds 3
    & (Join-Path $PgBin "pg_ctl.exe") -D $PgData status *> $null
    if ($LASTEXITCODE -ne 0) { throw "кластер не поднялся, смотрите $PgLog" }
    Ok "запущен"
}

# ── 4. Prisma ───────────────────────────────────────────────────────
# Клиент генерируется в src/generated/ — она в .gitignore, поэтому после
# восстановления из копии её нет и сборка падает на первом импорте.
Step "Prisma"
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate не прошёл" }
Ok "клиент собран"

npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "migrate deploy не прошёл" }
Ok "миграции накачены"

# ── 5. Хранилище фотографий ─────────────────────────────────────────
Step "Хранилище на :9000"
$storage = Test-NetConnection -ComputerName 127.0.0.1 -Port 9000 -WarningAction SilentlyContinue
if ($storage.TcpTestSucceeded) {
    Ok "отвечает"
} else {
    Warn "не отвечает — загрузка фотографий и тесты assets/photos работать не будут"
    Warn "поднимите MinIO (docker compose up -d storage) или положите minio.exe в .localtools"
}

Write-Host "`nГотово. Дальше: npm run dev  →  http://localhost:3000" -ForegroundColor Green
