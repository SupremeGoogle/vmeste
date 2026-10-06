# Сервер «Вместе» (Timeweb, 186.246.27.151)

Копии настроек с сервера — чтобы поднять всё заново. Секретов здесь нет:
ключи лежат только в `/var/www/vmeste/shared/.env` на сервере.

| Файл | Куда на сервере |
|---|---|
| `nginx-vmeste.conf` | `/etc/nginx/sites-available/vmeste` (сертификаты — certbot) |
| `nginx-vmeste-cache.conf` | `/etc/nginx/conf.d/vmeste-cache.conf` |
| `garage.service` | `/etc/systemd/system/garage.service`, конфиг `/etc/garage.toml` |
| `ecosystem.config.cjs` | `/var/www/vmeste/ecosystem.config.cjs` (pm2, пользователь vmeste) |
| `vmeste-watchdog`, `vmeste-backup` | `/usr/local/bin/` |
| `cron.d-vmeste` | `/etc/cron.d/vmeste` |
| `nginx-vmeste-limits.conf` | `/etc/nginx/conf.d/vmeste-limits.conf` — лимиты запросов |
| `errors/*.html` | `/var/www/vmeste-errors/` — «много гостей» (429/503), «перезапуск» (502/504) |
| `systemd-pm2-vmeste-limits.conf` | `/etc/systemd/system/pm2-vmeste.service.d/limits.conf` — память ≤ 800 МБ, процессор и OOM в последнюю очередь |
| `systemd-postgresql-oom.conf` | `/etc/systemd/system/postgresql@.service.d/oom.conf`, так же nginx (-800) |

Выкладка — `npm run deploy` (scripts/deploy.sh). Хранятся текущий и прошлый
выпуск; без 2 ГБ свободного диска выкладка не начинается.

## Защита от перегрузки

- nginx: 30 запросов/с с адреса (запас 150 — свадьба за одним Wi-Fi), POST 5/с, общий поток в Node 45/с с очередью до 500; worker_connections 4096.
- Публичное приглашение — микрокеш nginx на минуту, при падении сайта отдаётся из кеша сутки.
- Приложение: PDF строго по одному (server/heavy.ts), лимиты на публичные POST.
- База: statement_timeout 30 с для роли vmeste.
- Сторож раз в 2 минуты: health, перезапуск, Telegram; диск < 1,5 ГБ — предупреждение.
