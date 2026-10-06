#!/usr/bin/env bash
# Вторая половина scripts/deploy.sh — выполняется на сервере от root.
# Раскладка: /var/www/vmeste/{releases/<время>, current → выпуск, shared/.env}.
# Хранятся два выпуска: текущий и прошлый (для отката).
set -euo pipefail

APP=/var/www/vmeste
REL=$APP/releases/$(date +%Y%m%d%H%M%S)
PREV=$(readlink -f "$APP/current" || true)

# Диск 14 ГБ на три сайта: заполнится — падают база и все сайты разом
# (6 октября три выпуска по 1,7 ГБ оставили 1,3 ГБ). Поэтому: до распаковки
# остаётся только текущий выпуск, и без 2 ГБ свободного места не начинаем.
for old in $(ls -1dt "$APP"/releases/* 2>/dev/null); do
  if [ "$old" != "$PREV" ]; then rm -rf "$old"; fi
done
FREE_MB=$(df -m --output=avail / | tail -1)
if [ "$FREE_MB" -lt 2048 ]; then
  echo "✗ на диске ${FREE_MB} МБ — нужно хотя бы 2 ГБ, выкладка отменена" >&2
  rm -f /root/vmeste-app.tgz; exit 1
fi
mkdir -p "$REL"
tar -xzf /root/vmeste-app.tgz -C "$REL"
rm -f /root/vmeste-app.tgz

# Ссылки Turbopack на внешние пакеты — относительные, под Linux.
while read -r link target; do
  mkdir -p "$(dirname "$REL/$link")"
  depth=$(echo "$link" | tr -cd '/' | wc -c)
  ln -sfn "$(printf '../%.0s' $(seq 1 "$depth"))$target" "$REL/$link"
done < "$REL/.next/links.txt"

ln -sfn "$APP/shared/.env" "$REL/.env"

# Скрипты и стили сжимаются один раз здесь, nginx отдаёт готовые .gz
# (gzip_static): без сжатия JS весит в 3–5 раз больше, а сжимать на лету —
# тратить единственное ядро сервера на каждый запрос.
find "$REL/.next/static" "$REL/public/media" -type f \( -name "*.js" -o -name "*.css" -o -name "*.svg" -o -name "*.json" -o -name "*.txt" \) \
  ! -name "*.gz" -size +1k -exec gzip -k -9 -f {} +
chown -R vmeste:vmeste "$REL"

cd "$REL"
# Зависимости не менялись — берём прошлые жёсткими ссылками: 1,3 ГБ
# node_modules не занимают диск второй раз. Менялись — ставим заново.
if [ -n "$PREV" ] && [ -d "$PREV/node_modules" ] && cmp -s "$PREV/package-lock.json" package-lock.json; then
  cp -al "$PREV/node_modules" node_modules
  echo "зависимости те же — переиспользованы"
else
  sudo -u vmeste HOME=/home/vmeste npm ci --omit=dev --no-audit --no-fund --loglevel=error
  sudo -u vmeste HOME=/home/vmeste npm cache clean --force >/dev/null 2>&1 || true
fi
sudo -u vmeste HOME=/home/vmeste npx prisma migrate deploy

ln -sfn "$REL" "$APP/current"
chown -h vmeste:vmeste "$APP/current"
# Микрокеш nginx (главная, приглашения, образцы) ссылается на скрипты
# прежней сборки — после переключения он устарел.
rm -rf /var/cache/nginx/vmeste/*
sudo -u vmeste HOME=/home/vmeste pm2 restart vmeste --update-env >/dev/null

# Не поднялся за 40 секунд — возвращаем прежний выпуск.
for _ in $(seq 1 20); do
  sleep 2
  if curl -fsS -m 5 http://127.0.0.1:3010/api/health >/dev/null; then
    echo "✓ выложено: $REL"
    ls -1dt "$APP"/releases/* | tail -n +3 | xargs -r rm -rf
    echo "диск: свободно $(df -h --output=avail / | tail -1 | tr -d " ")"
    exit 0
  fi
done
echo "✗ сайт не ответил — откат на $PREV" >&2
[ -n "$PREV" ] && ln -sfn "$PREV" "$APP/current" && sudo -u vmeste HOME=/home/vmeste pm2 restart vmeste >/dev/null
exit 1
