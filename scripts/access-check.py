"""
Проверка правил доступа на живом сервере.

Тесты в `src/tests` проверяют слои по отдельности; здесь проверяются те же
правила снаружи, целиком собранным приложением — так, как их видит чужой
человек с адресной строкой. Мультиарендность и приватность фотографий —
главные инварианты сервиса, и они должны держаться не только на уровне
репозиториев, но и на уровне маршрутов, заголовков и кешей.

Запуск (нужен собранный сервер и `npm run db:seed`):

    npm run build && PORT=3010 npm start &
    npm run access-check
"""
import html as htmlmod, json, os, re, sys, urllib.error, urllib.parse, urllib.request, uuid

BASE = os.environ.get("BASE", "http://localhost:3010")

checks = []


def check(name, ok, detail=""):
    checks.append((name, ok, detail))
    print(("  ✓ " if ok else "  ✗ ") + name + (f" — {detail}" if detail else ""))


class Session:
    """Отдельная «личность»: свои cookie, свой опенер."""

    def __init__(self):
        self.cookies = {}
        keeper = self

        class Keep(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                keeper._remember(headers)
                new = super().redirect_request(req, fp, code, msg, headers, newurl)
                if new is not None:
                    new.add_header("cookie", keeper._header())
                return new

        self.opener = urllib.request.build_opener(Keep)

    def _remember(self, headers):
        for raw in headers.get_all("Set-Cookie") or []:
            name, _, rest = raw.partition("=")
            self.cookies[name.strip()] = rest.split(";")[0]

    def _header(self):
        return "; ".join(f"{k}={v}" for k, v in self.cookies.items())

    def request(self, path, data=None, headers=None, method=None):
        head = {"cookie": self._header(), **(headers or {})}
        req = urllib.request.Request(BASE + path, data=data, headers=head, method=method)
        try:
            with self.opener.open(req) as response:
                self._remember(response.headers)
                return response.status, response.read().decode(errors="replace"), response.headers
        except urllib.error.HTTPError as error:
            return error.code, error.read().decode(errors="replace"), error.headers

    def json_post(self, path, payload):
        status, body, headers = self.request(
            path, data=json.dumps(payload).encode(),
            headers={"content-type": "application/json"})
        try:
            return status, json.loads(body or "{}")
        except json.JSONDecodeError:
            return status, {}

    def submit(self, path, marker, extra=(), occurrence=0):
        """Отправка формы так, как это делает браузер без JavaScript."""
        _, page, _ = self.request(path)
        idx = -1
        for _ in range(occurrence + 1):
            idx = page.index(marker, idx + 1)
        start = page.rindex("<form", 0, idx)
        chunk = page[start:page.index("</form>", start)]
        fields = [(m.group(1), htmlmod.unescape(m.group(2) or ""))
                  for m in re.finditer(
                      r'<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/>', chunk)]
        fields += list(extra)
        boundary = uuid.uuid4().hex
        body = b"".join(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
            for k, v in fields)
        body += f"--{boundary}--\r\n".encode()
        return self.request(path, data=body,
                            headers={"content-type": f"multipart/form-data; boundary={boundary}"})

    def login(self, email, password):
        self.submit("/login", 'name="email"', [("email", email), ("password", password)])


def text_of(html_body):
    body = html_body.split("<body")[1] if "<body" in html_body else html_body
    return htmlmod.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)))


anon = Session()
planner = Session()      # организатор «Аня и Миша»
neighbour = Session()    # организатор соседнего агентства

print("\n1. Вход и разделение организаций")
planner.login("planner@example.com", "password123")
neighbour.login("other@example.com", "password123")

status, panel, _ = planner.request("/app")
check("организатор входит в свою панель", "Мероприятия" in text_of(panel))

# Берём опубликованное мероприятие, а не первое попавшееся: после
# репетиции в списке первым стоит архивное, и половина проверок ниже
# честно, но бессмысленно упиралась бы в его 404.
def published_event(session, page):
    for event_id in dict.fromkeys(re.findall(r"/app/e/([a-z0-9]+)", page)):
        _, settings, _ = session.request(f"/app/e/{event_id}/settings")
        if "Снять с публикации" in settings:
            return event_id
    raise SystemExit("в панели нет опубликованного мероприятия — запустите npm run db:seed")


mine = published_event(planner, panel)
_, other_panel, _ = neighbour.request("/app")
foreign = published_event(neighbour, other_panel)
check("у соседей своё мероприятие", mine != foreign, f"{mine[:8]}… vs {foreign[:8]}…")

for page in ["", "/guests", "/seating", "/rsvp", "/photos", "/screen", "/settings", "/raffle"]:
    status, _, _ = neighbour.request(f"/app/e/{mine}{page}")
    if status != 404:
        check(f"чужая страница {page or '/обзор'} закрыта", False, f"HTTP {status}")
        break
else:
    check("все восемь страниц чужого мероприятия отдают 404", True)

status, _ = neighbour.json_post(f"/api/app/events/{mine}/seating/ops",
                                {"version": 0, "op": {"kind": "createTable",
                                                      "label": "Чужой", "capacity": 4}})
check("чужая рассадка через API не правится", status == 404, f"HTTP {status}")

status, _, _ = neighbour.request(f"/api/app/events/{mine}/guests/export")
check("чужой список гостей не выгружается", status == 404, f"HTTP {status}")

status, _, _ = anon.request(f"/app/e/{mine}/guests")
check("без входа панель не открывается", status in (200, 307) and "Вход" in
      anon.request(f"/app/e/{mine}/guests")[1], "перенаправление на /login")

print("\n2. Гостевые ссылки")
_, export, _ = planner.request(f"/api/app/events/{mine}/guests/export")
rows = [line.split(";") for line in export.strip().split("\r\n")[1:]]
links = [row[-1] for row in rows if row[-1].startswith("http")]
token = links[0].rsplit("/", 1)[1]
slug = links[0].split("/i/")[1].split("/")[0]

status, invite, headers = anon.request(f"/i/{slug}/{token}")
check("именная ссылка открывается", status == 200 and "<!doctype html>" in invite,
      f"HTTP {status}")
check("именная страница не кешируется и не индексируется",
      headers.get("cache-control") == "private, no-store"
      and "noindex" in invite, headers.get("cache-control", "—"))

status, _, headers = anon.request(f"/i/{slug}")
check("публичное приглашение кешируется",
      "stale-while-revalidate" in (headers.get("cache-control") or ""),
      headers.get("cache-control", "—"))

status, _, _ = anon.request(f"/i/{slug}/{token}xx")
check("испорченный токен даёт 404", status == 404, f"HTTP {status}")

status, _, _ = anon.request(f"/i/lida-petr/{token}")
check("токен с чужим слагом даёт 404", status == 404, f"HTTP {status}")

print("\n3. Фотографии: кто какие видит")
_, photos_page, _ = planner.request(f"/app/e/{mine}/photos")
pending_id = re.search(rf"/api/media/{mine}/([a-z0-9]+)\?size=full", photos_page)
pending_id = pending_id.group(1) if pending_id else None

if pending_id:
    status, _, _ = anon.request(f"/api/media/{mine}/{pending_id}")
    check("неодобренное фото не видно постороннему", status == 404, f"HTTP {status}")

    status, _, _ = planner.request(f"/api/media/{mine}/{pending_id}")
    check("организатору неодобренное видно", status == 200, f"HTTP {status}")

    status, _, _ = neighbour.request(f"/api/media/{mine}/{pending_id}")
    check("соседнему организатору — нет", status == 404, f"HTTP {status}")

    # Одобряем и проверяем, что теперь фото публично.
    status, _ = planner.json_post(f"/api/app/events/{mine}/photos/moderate",
                                  {"photoId": pending_id, "status": "APPROVED"})
    status, _, headers = anon.request(f"/api/media/{mine}/{pending_id}")
    check("одобренное фото открывается по ссылке", status == 200, f"HTTP {status}")
    check("фото не индексируется и не уходит в общий кеш",
          "noindex" in (headers.get("x-robots-tag") or "")
          and (headers.get("cache-control") or "").startswith("private"),
          headers.get("cache-control", "—"))

    status, _, _ = anon.request(f"/api/media/{foreign}/{pending_id}")
    check("фото по чужому мероприятию в адресе не отдаётся", status == 404, f"HTTP {status}")

print("\n4. Загрузка фотографий гостем")
status, body = anon.json_post("/api/guest/photos/presign",
                              {"token": token, "contentType": "image/jpeg", "bytes": 1000})
check("гость с именной ссылкой получает ссылку на загрузку", status == 200,
      f"HTTP {status}")

status, body = anon.json_post("/api/guest/photos/presign",
                              {"token": token, "contentType": "application/pdf", "bytes": 1000})
check("не фотография отвергается по-человечески",
      status == 409 and "фотограф" in body.get("error", "").lower(), body.get("error"))

status, body = anon.json_post("/api/guest/photos/presign",
                              {"token": token, "contentType": "image/jpeg",
                               "bytes": 20 * 1024 * 1024})
check("файл больше 12 МБ отвергается с понятным текстом",
      status == 409 and "МБ" in body.get("error", ""), body.get("error"))

status, body = anon.json_post("/api/guest/photos/presign",
                              {"token": "нет-такого-токена-вообще",
                               "contentType": "image/jpeg", "bytes": 1000})
check("чужой токен ссылки не даёт", status == 404, f"HTTP {status}")

# Свежая «личность»: у `anon` гостевая cookie уже появилась — её ставит
# первый же успешный запрос по именной ссылке.
stranger = Session()
status, body = stranger.json_post("/api/guest/photos/presign",
                                  {"eventId": mine, "contentType": "image/jpeg", "bytes": 1000})
check("без гостевой cookie загрузка закрыта", status == 404, f"HTTP {status}")

status, _, _ = stranger.request(f"/i/{slug}/photos")
check("страница фото по cookie без cookie не открывается", status == 404, f"HTTP {status}")

print("\n5. Экран в зале")
_, screen_page, _ = planner.request(f"/app/e/{mine}/screen")
screen_token = re.search(r"/screen/([A-Za-z0-9_-]{20,})", screen_page)
if not screen_token:
    planner.submit(f"/app/e/{mine}/screen", 'placeholder="Название', [("label", "Проверка")])
    _, screen_page, _ = planner.request(f"/app/e/{mine}/screen")
    screen_token = re.search(r"/screen/([A-Za-z0-9_-]{20,})", screen_page)
screen_token = screen_token.group(1)

status, _, _ = anon.request(f"/screen/{screen_token}")
check("экран открывается по своей ссылке", status == 200, f"HTTP {status}")

status, _, headers = anon.request(f"/api/screen/{screen_token}/state")
check("снимок состояния не кешируется", headers.get("cache-control") == "no-store",
      headers.get("cache-control", "—"))

status, _, _ = anon.request(f"/screen/{screen_token[:-2]}xx")
check("подделанный токен экрана даёт 404", status == 404, f"HTTP {status}")

print("\n6. Вход по QR")
_, guests_page, _ = planner.request(f"/app/e/{mine}/guests")
code = re.search(r"tracking-widest[^>]*>([A-Z0-9]{6})<", guests_page).group(1)

status, body = anon.json_post(f"/api/e/{code}/lookup", {"query": "Петрова"})
check("поиск находит гостя", body.get("status") == "ok" and body.get("matches"),
      f"{len(body.get('matches', []))} совпадений")
check("в ответе только имя и стол",
      all(set(m) <= {"guestId", "displayName", "tableLabel", "seatIndex"}
          for m in body.get("matches", [])),
      "ни телефонов, ни ответов")

status, body = anon.json_post(f"/api/e/{code}/lookup", {"query": "а"})
check("однобуквенный запрос не выдаёт список", body.get("status") != "ok", body.get("status"))

status, body = anon.json_post("/api/e/ZZZZZZ/lookup", {"query": "Петрова"})
check("несуществующий код не отличить от ненайденного имени",
      body.get("status") in ("not_found", "no_match"), body.get("status"))

print("\n7. Архив и отзыв доступа")
# Отдельное мероприятие, чтобы не ломать основное: заводим, публикуем, архивируем.
planner.submit("/app/events/new", 'Аня и Миша', [
    ("title", "Проверка доступа"),
    ("eventDate", "2026-12-31"),
    ("eventTime", "16:00"),
    ("slug", f"access-check-{uuid.uuid4().hex[:6]}"),
])
_, panel_after, _ = planner.request("/app")
temp_id = next(e for e in dict.fromkeys(re.findall(r"/app/e/([a-z0-9]+)", panel_after))
               if e not in (mine, foreign))
planner.submit(f"/app/e/{temp_id}/settings", 'value="PUBLISHED"')
planner.submit(f"/app/e/{temp_id}/guests", 'placeholder="Имя и фамилия"',
               [("displayName", "Тест Тестов"), ("phone", "")])

_, temp_export, _ = planner.request(f"/api/app/events/{temp_id}/guests/export")
temp_link = [line.split(";")[-1] for line in temp_export.strip().split("\r\n")[1:]][0]
temp_path = temp_link.split(BASE)[-1]
_, temp_settings, _ = planner.request(f"/app/e/{temp_id}/settings")
temp_code = re.search(r"tracking-widest[^>]*>([A-Z0-9]{6})<", temp_settings)
temp_code = temp_code.group(1) if temp_code else None

status, _, _ = anon.request(temp_path)
check("ссылка работает до архива", status == 200, f"HTTP {status}")

planner.submit(f"/app/e/{temp_id}/settings", 'value="ARCHIVED"')

status, _, _ = anon.request(temp_path)
check("после архива именная ссылка закрыта", status == 404, f"HTTP {status}")

if temp_code:
    # Страница входа по QR намеренно одинакова для любого кода: она не ходит
    # в базу вовсе (это самая горячая страница вечера) и потому ничего не
    # подтверждает. Проверяем не код ответа, а отсутствие разницы между
    # настоящим кодом и выдуманным — иначе по ней перебирали бы мероприятия.
    _, archived_page, _ = anon.request(f"/e/{temp_code}")
    _, nonsense_page, _ = anon.request("/e/ZZZZZZ")
    check("страница входа не отличает архивный код от выдуманного",
          archived_page.replace(temp_code, "ZZZZZZ") == nonsense_page,
          "по ней не перебрать мероприятия")

    status, body = anon.json_post(f"/api/e/{temp_code}/lookup", {"query": "Тестов"})
    check("после архива поиск по имени молчит", body.get("status") == "not_found",
          body.get("status"))
    status, _, _ = anon.request(f"/e/{temp_code}/plan")
    check("после архива план зала закрыт", status == 404, f"HTTP {status}")

# Перевыпуск ссылки гасит старую.
planner.submit(f"/app/e/{temp_id}/settings", 'value="DRAFT"')
_, guests_html, _ = planner.request(f"/app/e/{temp_id}/guests")
guest_card = re.search(rf"/app/e/{temp_id}/guests/([a-z0-9]+)", guests_html).group(1)
planner.submit(f"/app/e/{temp_id}/guests/{guest_card}", "перевыпустить")

status, _, _ = anon.request(temp_path)
check("перевыпуск гасит старую ссылку", status == 404, f"HTTP {status}")

print("\n8. Страницы «не найдено»")
# Кириллицу в адресе кодируем сами: http.client отправляет заголовок
# запроса в ASCII и на «/такого-нет» падает.
for who, path in [
    (anon, "/" + urllib.parse.quote("такого-нет")),
    (anon, "/screen/bad-token-xxxxxxxxxxxx"),
    # Панель проверяем от имени вошедшего: у постороннего это не 404,
    # а перенаправление на вход, и это тоже правильно.
    (planner, "/app/e/cmt0000000000000000000/guests"),
]:
    status, body, _ = who.request(path)
    branded = "Страница не найдена" in body
    check(f"{path[:44]}: 404 и своя страница", status == 404 and branded,
          "своя" if branded else "стандартная английская")

print("\n9. Заголовки гостевых страниц")
routes = [
    (f"/e/{code}", "public, max-age=60, stale-while-revalidate=86400"),
    (f"/e/{code}/plan", "public, max-age=60, stale-while-revalidate=86400"),
    (f"/i/{slug}", "public, max-age=60, stale-while-revalidate=86400"),
    (f"/i/{slug}/{token}", "private, no-store"),
    (f"/i/{slug}/{token}/rsvp", "private, no-store"),
    (f"/i/{slug}/{token}/wish", "private, no-store"),
]
for path, expected in routes:
    _, _, headers = anon.request(path)
    actual = headers.get("cache-control", "—")
    check(f"кеш {path.split('/')[-1] or 'вход'}: {actual}", actual == expected, path)

print("\n10. Вес гостевых страниц")
for path in [f"/e/{code}", f"/e/{code}/plan", f"/i/{slug}", f"/i/{slug}/{token}",
             f"/i/{slug}/{token}/rsvp", f"/i/{slug}/{token}/photos"]:
    _, body, _ = anon.request(path)
    size = len(body.encode())
    assets = len(re.findall(r"/_next/static/", body))
    check(f"{path.split('/i/')[-1] if '/i/' in path else path}: {size // 1024} КБ, ассетов {assets}",
          size < 200_000 and assets == 0, "без внешних запросов")

print("\n— Итог —")
passed = sum(1 for _, ok, _ in checks if ok)
print(f"{passed} из {len(checks)} проверок пройдено")
for name, ok, detail in checks:
    if not ok:
        print(f"  не прошло: {name} — {detail}")
sys.exit(0 if passed == len(checks) else 1)
