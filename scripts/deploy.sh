#!/usr/bin/env bash
# Выкладка «Вместе» на сервер одной командой:  npm run deploy
#
# Сборка идёт здесь, а не на сервере: у него 1 ГБ памяти на три сайта, и
# `next build` задушил бы соседей. На сервер уходит готовая сборка, там
# ставятся зависимости под Linux, применяются миграции и pm2 перезапускает
# сайт. Прошлый выпуск остаётся в releases/ — откат: перенаправить
# ссылку current и `pm2 restart vmeste`.
#
# NEXT_PUBLIC_* вшиваются в сборку, поэтому берутся из .env на сервере:
# поменяли там DSN Sentry или Rybbit — просто выложите заново.
#
# Переменные: DEPLOY_HOST (root@186.246.27.151), DEPLOY_KEY (~/.ssh/servtj_deploy).
set -euo pipefail

HOST="${DEPLOY_HOST:-root@186.246.27.151}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/servtj_deploy}"
SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes "$HOST")
cd "$(dirname "$0")/.."

echo "→ публичные переменные с сервера"
"${SSH[@]}" "grep -E '^NEXT_PUBLIC_' /var/www/vmeste/shared/.env" > .env.production.local
trap 'rm -f .env.production.local' EXIT

echo "→ сборка"
NODE_OPTIONS=--max-old-space-size=6144 npx next build
rm -f .env.production.local

echo "→ упаковка"
# Turbopack ссылается на внешние пакеты через .next/node_modules/<имя>-<хеш>.
# На Windows это ссылки с путями диска — на сервере их пересоздаёт remote-скрипт.
find .next/node_modules -maxdepth 2 -type l | while read -r link; do
  target=$(readlink "$link"); echo "$link node_modules/${target##*/node_modules/}"
done > .next/links.txt
ARCHIVE="$(mktemp -d)/vmeste.tgz"
tar --force-local --exclude=.next/cache --exclude=.next/dev --exclude=.next/node_modules \
  --exclude='.next/trace*' --exclude=.next/types --exclude=.next/diagnostics \
  --exclude=public/media/landing-story/source --exclude=public/media/mascot-designs --exclude=public/media/mascot-concepts \
  -czf "$ARCHIVE" .next public prisma prisma.config.ts package.json package-lock.json \
  next.config.ts workers scripts src tsconfig.json data

echo "→ загрузка ($(du -h "$ARCHIVE" | cut -f1))"
scp -q -i "$KEY" -o IdentitiesOnly=yes "$ARCHIVE" "$HOST:/root/vmeste-app.tgz"
rm -f "$ARCHIVE"

echo "→ установка на сервере"
"${SSH[@]}" 'bash -s' < scripts/deploy-remote.sh
