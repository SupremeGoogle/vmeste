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
    # Через Start-Process, а не конвейером.
    #
    # `pg_ctl start | Out-Null` на Windows не возвращает управление:
    # запущенный им postgres наследует дескриптор вывода из конвейера
    # PowerShell, а живёт вечно — и pg_ctl ждёт закрытия этого
    # дескриптора до скончания века. Сервер при этом поднимается,
    # поэтому со стороны похоже на «скрипт завис на ровном месте».
    # Отдельный процесс со своим файлом вывода эту связь разрывает.
    $ctlLog = Join-Path $Tools "pg_ctl.out"
    Start-Process -FilePath (Join-Path $PgBin "pg_ctl.exe") -NoNewWindow -Wait `
        -ArgumentList "-D", "`"$PgData`"", "-l", "`"$PgLog`"", "-o", "`"-p $PgPort`"", "start" `
        -RedirectStandardOutput $ctlLog -RedirectStandardError "$ctlLog.err"

    $up = $false
    foreach ($i in 1..15) {
        Start-Sleep -Seconds 1
        & (Join-Path $PgBin "pg_ctl.exe") -D $PgData status *> $null
        if ($LASTEXITCODE -eq 0) { $up = $true; break }
    }
    if (-not $up) { throw "кластер не поднялся, смотрите $PgLog" }
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
# S3-совместимое хранилище на :9000. Без него не работает загрузка
# фотографий и падают тесты assets/photos.
Step "Хранилище на :9000"
$storage = Test-NetConnection -ComputerName 127.0.0.1 -Port 9000 -WarningAction SilentlyContinue
if ($storage.TcpTestSucceeded) {
    Ok "уже отвечает"
} else {
    $minio = Join-Path $Tools "minio.exe"
    if (Test-Path $minio) {
        # Ключи берём из .env, а не придумываем: разойдись они —
        # хранилище поднимется, но приложение получит 403 и это будет
        # выглядеть как поломка загрузки, а не как разные пароли.
        $envText = Get-Content (Join-Path $Root ".env") -Raw
        $userKey = [regex]::Match($envText, 'S3_ACCESS_KEY="?([^"\r\n]+)"?').Groups[1].Value
        $passKey = [regex]::Match($envText, 'S3_SECRET_KEY="?([^"\r\n]+)"?').Groups[1].Value
        $bucket  = [regex]::Match($envText, 'S3_BUCKET="?([^"\r\n]+)"?').Groups[1].Value

        # У файлового хранилища бакет — это каталог верхнего уровня.
        $dataDir = Join-Path $Tools "miniodata"
        New-Item -ItemType Directory -Force (Join-Path $dataDir $bucket) | Out-Null

        $env:MINIO_ROOT_USER = $userKey
        $env:MINIO_ROOT_PASSWORD = $passKey
        Start-Process -FilePath $minio -WindowStyle Hidden `
            -ArgumentList "server", $dataDir, "--address", ":9000", "--console-address", ":9001" `
            -RedirectStandardError (Join-Path $Tools "minio.log")

        $up = $false
        foreach ($i in 1..15) {
            Start-Sleep -Seconds 1
            if ((Test-NetConnection -ComputerName 127.0.0.1 -Port 9000 -WarningAction SilentlyContinue).TcpTestSucceeded) {
                $up = $true; break
            }
        }
        if ($up) { Ok "запущено, бакет $bucket" }
        else { Warn "minio.exe не поднялся, смотрите $Tools\minio.log" }
    } else {
        Warn "не отвечает — загрузка фотографий и тесты assets/photos работать не будут"
        Warn "положите minio.exe в .localtools (dl.min.io) или поднимите docker compose up -d storage"
    }
}

Write-Host "`nГотово. Дальше: npm run dev  →  http://localhost:3000" -ForegroundColor Green
