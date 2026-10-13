#!/usr/bin/env bash
# Скачивает все клипы промо в docs/promo/video/ (папка в .gitignore не нужна — не коммитьте видео).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p video
grep -v '^#' clips.txt | while read -r name url; do
  [ -f "video/$name" ] || curl -sS --retry 4 -o "video/$name" "$url"
  echo "ok $name"
done
