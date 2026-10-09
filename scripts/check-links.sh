#!/usr/bin/env bash
# Битые ссылки на живом сайте (open-source linkinator — тот же смысл, что
# Lychee, но без отдельного бинарника): обходит все внутренние страницы и
# падает с ненулевым кодом, если что-то отвечает не 2xx/3xx.
#   npm run check:links            — vvvmeste.com
#   bash scripts/check-links.sh URL — другой адрес (например, локальный)
set -euo pipefail
SITE="${1:-https://vvvmeste.com}"
HOST_RE=$(printf '%s' "$SITE" | sed -e 's#[.]#\.#g')
npx -y linkinator@6 "$SITE" --recurse --concurrency 4 --timeout 15000 --skip "^(?!${HOST_RE})"
