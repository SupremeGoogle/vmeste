"""
Генеральная репетиция: прогон мероприятия целиком через интерфейс.

Проверка этапа 8 из PLAN.md: «пройдено без вмешательства в БД руками».
Поэтому здесь нет ни одного обращения к базе — только те же HTTP-запросы,
которые делает браузер: вход по форме, серверные действия, загрузка файлов,
API гостя. Всё, что здесь не получается, — дырка в продукте, а не в скрипте;
так нашлись отсутствовавшие страницы настроек и разрешение «+1».

Запуск (нужен собранный сервер и наполненная база):

    npm run build && PORT=3010 npm start &
    npm run db:seed          # организатор planner@example.com
    npm run rehearsal        # или: BASE=http://localhost:3000 npm run rehearsal

Скрипт создаёт своё мероприятие со ста гостями и в конце убирает его
в архив, поэтому его можно гонять хоть каждый день.
"""
import html as htmlmod, io, json, os, re, sys, time, urllib.error, urllib.request, uuid, zipfile
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

BASE = os.environ.get("BASE", "http://localhost:3010")
FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rehearsal-fixtures")
# Cookie ведём руками: в проде они помечены Secure, и штатный CookieJar
# не отдаёт их по http. Браузеру проще — он считает localhost защищённым.
COOKIES = {}

def remember(response):
    for raw in response.headers.get_all("Set-Cookie") or []:
        name, _, rest = raw.partition("=")
        COOKIES[name.strip()] = rest.split(";")[0]

def cookie_header():
    return "; ".join(f"{k}={v}" for k, v in COOKIES.items())

class KeepCookies(urllib.request.HTTPRedirectHandler):
    """Set-Cookie приходит на 303-перенаправлении: если ловить заголовки
    только у финального ответа, сессия теряется по дороге."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        for raw in headers.get_all("Set-Cookie") or []:
            name, _, rest = raw.partition("=")
            COOKIES[name.strip()] = rest.split(";")[0]
        new = super().redirect_request(req, fp, code, msg, headers, newurl)
        if new is not None:
            new.add_header("cookie", cookie_header())
        return new

opener = urllib.request.build_opener(KeepCookies)

def get(path, headers=None, binary=False):
    head = {"cookie": cookie_header(), **(headers or {})}
    req = urllib.request.Request(BASE + path, headers=head)
    try:
        with opener.open(req) as response:
            remember(response)
            body = response.read()
            return response.status, body if binary else body.decode(), response.geturl()
    except urllib.error.HTTPError as error:
        # 404 — это тоже ответ: архив закрывает гостевые ссылки именно им.
        body = error.read()
        return error.code, body if binary else body.decode(errors="replace"), BASE + path

def multipart(fields, files=()):
    boundary = uuid.uuid4().hex
    body = io.BytesIO()
    for name, value in fields:
        body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    for name, filename, content, ctype in files:
        body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
                   f'Content-Type: {ctype}\r\n\r\n'.encode())
        body.write(content)
        body.write(b"\r\n")
    body.write(f"--{boundary}--\r\n".encode())
    return body.getvalue(), f"multipart/form-data; boundary={boundary}"

def submit(path, marker, extra=(), files=(), occurrence=0):
    """Отправка формы так, как это делает браузер с выключенным JS."""
    _, page, _ = get(path)
    markup = re.sub(r"<script\b[^>]*>.*?</script>", "", page, flags=re.S | re.I)
    forms = [match.group(0) for match in re.finditer(r"<form\b[^>]*>.*?</form>", markup, re.S)]
    matches = [form for form in forms if marker in form]
    if len(matches) <= occurrence:
        raise RuntimeError(f"На странице {path} нет формы с маркером {marker!r}")
    chunk = matches[occurrence]
    action = re.search(r'<form\b[^>]*\baction="([^"]*)"', chunk)
    target = htmlmod.unescape(action.group(1)) if action and action.group(1) else path
    fields = [(m.group(1), htmlmod.unescape(m.group(2) or ""))
              for m in re.finditer(r'<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/>', chunk)]
    fields += list(extra)
    data, ctype = multipart(fields, files)
    req = urllib.request.Request(
        BASE + target, data=data, headers={"content-type": ctype, "cookie": cookie_header()})
    with opener.open(req) as response:
        remember(response)
        return response.status, response.read().decode(), response.geturl()

def api(path, payload, headers=None):
    req = urllib.request.Request(
        BASE + path, data=json.dumps(payload).encode(),
        headers={"content-type": "application/json", "cookie": cookie_header(), **(headers or {})})
    try:
        with opener.open(req) as response:
            remember(response)
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read().decode() or "{}")

def text_of(html_body):
    body = html_body.split("<body")[1] if "<body" in html_body else html_body
    return htmlmod.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)))

def xlsx_rows(book_bytes):
    with zipfile.ZipFile(io.BytesIO(book_bytes)) as book:
        ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        shared = ET.fromstring(book.read("xl/sharedStrings.xml"))
        strings = ["".join(node.itertext()) for node in shared.findall("x:si", ns)]
        sheet = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in sheet.findall("x:sheetData/x:row", ns):
            cells = {}
            for cell in row.findall("x:c", ns):
                node = cell.find("x:v", ns)
                if node is None:
                    continue
                column = re.match(r"[A-Z]+", cell.attrib["r"]).group(0)
                cells[column] = strings[int(node.text)] if cell.attrib.get("t") == "s" else node.text
            rows.append(cells)
        header = rows[0]
        return [{title: row.get(column, "") for column, title in header.items()} for row in rows[1:]]

def invitation_links(book_bytes):
    return [row["Именная ссылка"] for row in xlsx_rows(book_bytes) if row.get("Именная ссылка", "").startswith("http")]

steps = []
def step(name, ok, detail=""):
    steps.append((name, ok, detail))
    print(("  ✓ " if ok else "  ✗ ") + name + (f" — {detail}" if detail else ""))

print("\n1. Вход организатора")
submit("/login", 'name="email"',
       [("email", "planner@example.com"), ("password", "password123")])
# Ответ серверного действия — RSC-поток, а не HTML: проверяем не тело,
# а то, что панель теперь открывается.
_, panel, panel_url = get("/app")
step("вход по форме", "Мероприятия" in text_of(panel), panel_url)

print("\n2. Создание мероприятия")
stamp = time.strftime("%m%d-%H%M%S")
status, page, url = submit("/app/events/new", 'Аня и Миша', [
    ("title", f"Репетиция {stamp}: Катя и Слава"),
    ("eventDate", "2026-10-03"),
    ("eventTime", "16:00"),
    ("venueName", "Загородный клуб «Репетиция»"),
    ("slug", f"repetitsiya-{stamp}"),
])
event_id = url.split("/app/e/")[1].split("/")[0] if "/app/e/" in url else None
step("мероприятие создано", bool(event_id), url)
if not event_id:
    sys.exit(1)

print("\n3. Настройки: пояс, меню, публикация")
status, page, _ = submit(f"/app/e/{event_id}/settings", 'datetime-local', [
    ("title", "Катя и Слава"),
    ("eventDate", "2026-10-03T16:00"),
    ("timezone", "Asia/Yekaterinburg"),
    ("venueName", "Загородный клуб «Репетиция»"),
    ("venueAddr", "Свердловская область, село Косулино, ул. Луговая, 3"),
    ("allowPlusOne", "on"),
    ("photosEnabled", "on"),
    ("wishesEnabled", "on"),
    ("raffleEnabled", "on"),
    ("photoLimit", "5"),
])
body = text_of(get(f"/app/e/{event_id}/settings")[1])
# Введено «16:00 на площадке» в поясе Екатеринбурга — столько и должно
# показываться, независимо от пояса сервера.
step("время площадки не поехало", "3 октября 2026, 16:00" in body,
     "Asia/Yekaterinburg" if "Asia/Yekaterinburg" in get(f"/app/e/{event_id}/settings")[1] else "пояс не сохранён")

for meal in ["Мясо", "Рыба", "Вегетарианское"]:
    submit(f"/app/e/{event_id}/settings", 'Например, «Рыба»', [("title", meal)])
body = text_of(get(f"/app/e/{event_id}/settings")[1])
step("меню заведено", all(meal in body for meal in ["Мясо", "Рыба", "Вегетарианское"]))

submit(f"/app/e/{event_id}/settings", 'value="PUBLISHED"')
body = text_of(get(f"/app/e/{event_id}/settings")[1])
step("мероприятие опубликовано", "Снять с публикации" in body)

print("\n4. Импорт ста гостей из CSV")
csv_bytes = open(os.path.join(FIXTURES, "guests100.csv"), "rb").read()
# Шаг первый: предпросмотр. Импорт в один клик из продукта убран
# намеренно (PLAN.md §5.9) — молча залитый кривой файл не отменить.
status, preview, preview_url = submit(
    f"/app/e/{event_id}/guests", 'accept=".xlsx,.csv', (),
    files=[("file", "guests.csv", csv_bytes, "text/csv")])
preview_text = text_of(preview)
step("предпросмотр показан до записи",
     "Проверьте перед добавлением" in preview_text and "windows-1251" not in preview_text,
     "черновик открыт" if "Проверьте перед добавлением" in preview_text else "")

draft_id = re.search(r"draft=([0-9a-f-]+)", preview_url).group(1)
submit(f"/app/e/{event_id}/guests?draft={draft_id}", 'Выбрано',
       [("draftId", draft_id)])
body = text_of(get(f"/app/e/{event_id}/guests")[1])
export_status, book, export_url = get(f"/api/app/events/{event_id}/guests/export", binary=True)
links = invitation_links(book)
step("100 строк сведены в 40 уникальных гостей", len(links) == 40, f"в выгрузке {len(links)}")

# Карточка гостя: варианты имени добавляются только здесь.
status, guests_page, _ = get(f"/app/e/{event_id}/guests")
card = re.search(rf"/app/e/{event_id}/guests/([a-z0-9]+)", guests_page)
if card:
    guest_card = f"/app/e/{event_id}/guests/{card.group(1)}"
    submit(guest_card, 'placeholder="Например, «мама Лена»"', [("alias", "мама Лена")])
    body = text_of(get(guest_card)[1])
    step("вариант имени добавлен в карточке", "мама лена" in body.lower())

print("\n5. Приглашение")
submit(f"/app/e/{event_id}/invite", 'name="template" value="tili"')
body = text_of(get(f"/app/e/{event_id}/invite")[1])
step("шаблон применён", "Тили-тесто" in body or "Тили" in body)

status, page, _ = get(f"/app/e/{event_id}/invite")
slug = f"repetitsiya-{stamp}"
status, invite_page, _ = get(f"/i/{slug}")
step("публичное приглашение открывается", status == 200 and "__next_error__" not in invite_page, f"/i/{slug}")

print("\n6. Ответы гостей по именным ссылкам")
tokens = [link.rsplit("/", 1)[1] for link in links]
step("именные ссылки выгружены", len(tokens) == 40, f"{len(tokens)} ссылок")

# Меню берём со страницы ответа первого гостя — так же, как это делает гость.
status, form_page, _ = get(f"/i/{slug}/{tokens[0]}/rsvp")
meal_ids = re.findall(r'name="mealOptionId" value="([^"]+)"', form_page)
step("в форме ответа есть меню", len(meal_ids) == 3, f"{len(meal_ids)} блюда")

answered = 0
with_partner = 0
for index, token in enumerate(tokens[:60]):
    if index % 6 == 5:
        submit(f"/i/{slug}/{token}/rsvp", 'value="DECLINED"', [("status", "DECLINED")])
    else:
        # Поле спутника показывается только тем, кому организатор разрешил:
        # берём его наличие со страницы, как это видит гость.
        _, form_html, _ = get(f"/i/{slug}/{token}/rsvp")
        extra = [("status", "ACCEPTED"), ("mealOptionId", meal_ids[index % 3]),
                 ("comment", "")]
        if 'name="plusOneName"' in form_html:
            extra.append(("plusOneName", f"Спутник {index}"))
            extra.append(("plusOneMealOptionId", meal_ids[(index + 1) % 3]))
            with_partner += 1
        submit(f"/i/{slug}/{token}/rsvp", 'value="ACCEPTED"', extra)
    answered += 1
step("гости ответили", answered == len(tokens), f"{answered} ответов, из них с парой: {with_partner}")

body = text_of(get(f"/app/e/{event_id}/rsvp")[1])
numbers = re.findall(r"(\d+) (Придут|Не придут|Ждём ответа)", body)
counts = {word: int(n) for n, word in numbers}
step("сводка сходится",
     counts.get("Придут", 0) + counts.get("Не придут", 0) == answered + with_partner,
     " · ".join(f"{n} {w}" for n, w in numbers))
declined = sum(index % 6 == 5 for index in range(answered))
step("спутники стали гостями", counts.get("Придут", 0) == answered - declined + with_partner,
     f"придут {counts.get('Придут', 0)} = {answered - declined} ответивших + {with_partner} спутников")

kitchen_visible = "Кто что ест" in body and all(meal in body for meal in ["Мясо", "Рыба", "Вегетарианское"])
step("кухня видит разбивку по блюдам", kitchen_visible)
_, rsvp_book, _ = get(f"/api/app/events/{event_id}/guests/export", binary=True)
meal_missing = sum(row.get("Ответ") == "придёт" and not row.get("Блюдо") for row in xlsx_rows(rsvp_book))
step("у пришедших и спутников выбрано блюдо", meal_missing == 0,
     f"без блюда: {meal_missing}")

print("\n7. Рассадка")
# Через обычные формы — тот самый запасной путь без JavaScript,
# ради которого на странице рассадки два слоя.
for index in range(8):
    submit(f"/app/e/{event_id}/seating", 'placeholder="Стол 6"',
           [("label", f"Стол {index + 1}"), ("capacity", "8")])
status, page, _ = get(f"/app/e/{event_id}/seating")
# Считаем уникальные идентификаторы: у каждого стола две формы (удалить и
# сменить форму), а сама разметка ещё раз повторяется в RSC-потоке страницы.
tables = len(set(re.findall(r'name="tableId" value="([^"]+)"', page)))
step("восемь столов созданы", tables == 8, f"столов: {tables}")

# Стол другой формы: круглый по умолчанию, президиум и прямоугольный —
# выбором в форме.
submit(f"/app/e/{event_id}/seating", 'placeholder="Стол 6"',
       [("label", "Президиум"), ("capacity", "4"), ("shape", "HEAD")])
body = text_of(get(f"/app/e/{event_id}/seating")[1])
step("стол-президиум создан выбором формы", "Президиум" in body)

# Два организатора меняют один план одновременно: один ответ успешный,
# второй получает конфликт версии и свежий снимок, затем повторяет действие.
ops_path = f"/api/app/events/{event_id}/seating/ops"
conflict_status, conflict = api(ops_path, {"version": 0, "op": {"kind": "assign", "seatId": "missing", "guestId": "missing"}})
plan = conflict.get("plan") or {}
free_seats = [seat["id"] for table in plan.get("tables", []) for seat in table["seats"] if seat["guest"] is None]
accepted_guests = [guest for guest in plan.get("unseated", []) if guest["rsvpStatus"] == "ACCEPTED"]
assignments = list(zip(free_seats, [guest["id"] for guest in accepted_guests]))
version = plan.get("version", 0)
concurrent_ok = False
completed = set()
if len(assignments) >= 2:
    def assign_pair(item):
        seat_id, guest_id = item
        return api(ops_path, {"version": version, "op": {"kind": "assign", "seatId": seat_id, "guestId": guest_id}})
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(assign_pair, assignments[:2]))
    concurrent_ok = sorted(status for status, _ in outcomes) == [200, 409]
    for index, (status, result) in enumerate(outcomes):
        if status == 200:
            completed.add(index)
        version = max(version, result.get("version", version))
step("одновременная правка не затирает чужую", concurrent_ok,
     f"ответы: {[(status, result.get('reason'), result.get('message')) for status, result in outcomes]}" if len(assignments) >= 2 else "недостаточно гостей или мест")

for index, (seat_id, guest_id) in enumerate(assignments):
    if index in completed:
        continue
    for _ in range(3):
        status, result = api(ops_path, {"version": version, "op": {"kind": "assign", "seatId": seat_id, "guestId": guest_id}})
        version = result.get("version", version)
        if status != 409:
            break
    if status == 200:
        completed.add(index)
api_seated = len(completed)

# Разбираем страницу один раз: поля серверного действия у всех форм
# рассадки одинаковые, различаются только seatId и выбранный гость.
status, page, _ = get(f"/app/e/{event_id}/seating")
forms = re.findall(r"<form[^>]*>(.*?)</form>", page, re.S)
seat_forms = [f for f in forms if 'name="seatId"' in f and 'name="guestId"' in f]
action_fields = [(m.group(1), htmlmod.unescape(m.group(2) or ""))
                 for m in re.finditer(r'<input type="hidden" name="(\$ACTION[^"]+)"(?: value="([^"]*)")?/>',
                                      seat_forms[0])] if seat_forms else []
seat_ids = [re.search(r'name="seatId" value="([^"]+)"', f).group(1) for f in seat_forms]
guest_ids = re.findall(r'<option value="(c[a-z0-9]+)"', page)

started = time.time()
seated = api_seated
for seat_id, guest_id in zip(seat_ids, dict.fromkeys(guest_ids)):
    fields = action_fields + [("seatId", seat_id), ("guestId", guest_id)]
    data, ctype = multipart(fields)
    req = urllib.request.Request(
        BASE + f"/app/e/{event_id}/seating", data=data,
        headers={"content-type": ctype, "cookie": cookie_header()})
    with opener.open(req) as response:
        remember(response)
        response.read()
    seated += 1
elapsed = time.time() - started
body = text_of(get(f"/app/e/{event_id}/seating")[1])
step("гости рассажены", seated == len(accepted_guests),
     f"посажено {seated} за {elapsed:.0f} с")

body = text_of(get(f"/app/e/{event_id}/guests")[1])
seated_count = re.search(r"Рассажено:?\s*(\d+)", body)
step("счётчик рассадки виден", bool(seated_count),
     seated_count.group(0) if seated_count else "")

# Молодожёны: роль ставится в карточке гостя и видна на плане зала.
_, seating_page, _ = get(f"/app/e/{event_id}/seating")
# Разметка страницы повторяется в RSC-потоке, поэтому имена дедуплицируем:
# иначе невеста и жених достанутся одному и тому же человеку.
seated_names = [guest["displayName"] for guest in accepted_guests[:2]]
roles_set = 0
for guest, role in zip(accepted_guests[:2], ["BRIDE", "GROOM"]):
    card = f"/app/e/{event_id}/guests/{guest['id']}"
    submit(card, 'name="role"', [("role", role)])
    roles_set += 1
step("невеста и жених отмечены", roles_set == 2, ", ".join(seated_names[:2]))

print("\n8. Печать и PDF")
status, page, _ = get(f"/app/e/{event_id}/print")
step("печатная страница открывается", status == 200 and "__next_error__" not in page)

req = urllib.request.Request(BASE + f"/api/app/events/{event_id}/seating/pdf", headers={"cookie": cookie_header()})
with opener.open(req) as response:
    pdf = response.read()
step("PDF плана рассадки", pdf[:4] == b"%PDF", f"{len(pdf) // 1024} КБ")

print("\n9. Вход по QR: гость ищет свой стол")
# Код берём со страницы своего мероприятия, а не из общего списка:
# в списке первым может стоять чужое, и репетиция уйдёт проверять его.
_, event_page, _ = get(f"/app/e/{event_id}/guests")
code = re.search(r"tracking-widest[^>]*>([A-Z0-9]{6})<", event_page).group(1)
status, entry, _ = get(f"/e/{code}")
step("страница входа открывается", status == 200 and "__next_error__" not in entry, f"/e/{code}")

# Ищем гостя по уменьшительному имени: словарь должен сработать.
status, result = api(f"/api/e/{code}/lookup", {"query": "Настя"})
step("поиск по уменьшительному имени", status == 200 and len(result.get("matches", [])) > 0,
     f"{len(result.get('matches', []))} совпадений")

# Ищем того, кто действительно посажен: гостю на входе нужен номер стола,
# а не сообщение «подойдите к координатору».
seated_name = None
_, seating_page, _ = get(f"/app/e/{event_id}/seating")
match = re.search(r'<span class="flex-1">([^<]+)</span>', seating_page)
if match:
    seated_name = match.group(1)
    _, found = api(f"/api/e/{code}/lookup", {"query": seated_name.split()[0]})
    if found.get("matches"):
        guest_id = found["matches"][0]["guestId"]
        _, me, _ = get(f"/e/{code}/me?g={guest_id}")
        # Название стола может быть любым («Стол 3», «Президиум»), поэтому
        # ищем сам блок с номером места, а не конкретное слово.
        table = re.search(r'class="table-label">([^<]+)<', me)
        step("гость видит свой стол", bool(table),
             f"{seated_name} → {table.group(1) if table else 'места нет'}")

        plan_link = re.search(r'href="(/e/[A-Z0-9]+/plan\?t=[a-z0-9]+)"', me)
        if plan_link:
            _, plan_page, _ = get(plan_link.group(1))
            step("на плане зала подсвечен его стол",
                 "<svg" in plan_page and "Ваш стол" in plan_page,
                 plan_link.group(1))
            # Проверяем сам план, а не легенду: в легенде значки стоят
            # всегда, и по ней проверка проходила бы даже без молодожёнов.
            plan_svg = plan_page[plan_page.index("<svg") : plan_page.index("</svg>")]
            step("на плане видно, где сидят молодожёны",
                 'aria-label="невеста"' in plan_svg and 'aria-label="жених"' in plan_svg
                 and "невеста</span>" in plan_page,
                 "значки на местах и легенда под планом")

print("\n10. Фотографии и модерация")
photo_bytes = open(os.path.join(FIXTURES, "photo.jpg"), "rb").read()
uploaded = 0
for token in tokens[:6]:
    status, ticket = api("/api/guest/photos/presign",
                         {"token": token, "contentType": "image/jpeg", "bytes": len(photo_bytes)})
    if status != 200:
        continue
    req = urllib.request.Request(ticket["uploadUrl"], data=photo_bytes, method="PUT",
                                 headers={"content-type": "image/jpeg"})
    urllib.request.urlopen(req).read()
    status, done = api("/api/guest/photos/complete", {
        "token": token, "storageKey": ticket["storageKey"],
    })
    if status == 200:
        uploaded += 1
step("гости загрузили фото", uploaded == 6, f"{uploaded} фото")

# Очередь модерации показывает по одному кадру — разбираем её так же,
# как это делает организатор клавишей «пробел».
approved = 0
for _ in range(20):
    status, page, _ = get(f"/app/e/{event_id}/photos")
    current = re.search(rf"/api/media/{event_id}/([a-z0-9]+)\?size=full", page)
    if not current:
        break
    status, result = api(f"/api/app/events/{event_id}/photos/moderate",
                         {"photoId": current.group(1), "status": "APPROVED"})
    if status != 200:
        break
    approved += 1
step("очередь модерации разобрана", approved == uploaded, f"одобрено {approved} из {uploaded}")

print("\n11. Пожелания")
wishes_sent = 0
for index, token in enumerate(tokens[:8]):
    submit(f"/i/{slug}/{token}/wish", 'name="authorName"', [
        ("authorName", f"Гость {index + 1}"),
        ("text", f"Пожелание номер {index + 1}: совет да любовь и попутного ветра."),
    ])
    wishes_sent += 1
_, rejected_wish, rejected_url = submit(f"/i/{slug}/{tokens[8]}/wish", 'name="authorName"', [
    ("authorName", "Гость"),
    ("text", "Желаю вам развода"),
])
step("злое пожелание отклонено до модерации",
     "error=" in rejected_url and "оскорбление" in text_of(rejected_wish))
body = text_of(get(f"/app/e/{event_id}/wishes")[1])
pending = re.search(r"(\d+) Ждут проверки", body)
step("пожелания дошли до модерации", pending and int(pending.group(1)) == wishes_sent,
     f"{pending.group(1) if pending else '?'} в очереди")

status, page, _ = get(f"/app/e/{event_id}/wishes")
wish_ids = re.findall(r'name="wishId" value="([^"]+)"', page)
for wish_id in dict.fromkeys(wish_ids)[:5] if False else list(dict.fromkeys(wish_ids))[:5]:
    submit(f"/app/e/{event_id}/wishes", f'value="{wish_id}"', [("wishId", wish_id), ("status", "APPROVED")])
body = text_of(get(f"/app/e/{event_id}/wishes")[1])
approved_wishes = re.search(r"(\d+) На экране", body)
step("пять пожеланий на экране", approved_wishes and int(approved_wishes.group(1)) == 5,
     f"{approved_wishes.group(1) if approved_wishes else '?'} одобрено")

print("\n12. Экран в зале")
submit(f"/app/e/{event_id}/screen", 'placeholder="Название', [("label", "Проектор в зале")])
status, page, _ = get(f"/app/e/{event_id}/screen")
screen_token = re.search(r"/screen/([A-Za-z0-9_-]{20,})", page).group(1)
step("ссылка для проектора создана", bool(screen_token), f"/screen/{screen_token[:8]}…")

status, screen_page, _ = get(f"/screen/{screen_token}")
step("экран открывается", status == 200 and "__next_error__" not in screen_page)

status, snapshot = api(f"/api/screen/{screen_token}/state", {}) if False else (0, None)
req = urllib.request.Request(BASE + f"/api/screen/{screen_token}/state")
with opener.open(req) as response:
    snapshot = json.loads(response.read().decode())
step("на экране есть фото и пожелания",
     len(snapshot["photos"]) > 0 and len(snapshot["wishes"]) == 5,
     f"фото: {len(snapshot['photos'])}, пожеланий: {len(snapshot['wishes'])}, режим: {snapshot['mode']}")

print("\n13. Розыгрыш")
submit(f"/app/e/{event_id}/raffle", 'placeholder="Название розыгрыша"', [("title", "Букет невесты")])
submit(f"/app/e/{event_id}/raffle", "Зафиксировать участников")
body = text_of(get(f"/app/e/{event_id}/raffle")[1])
fixed = re.search(r"участников зафиксировано: (\d+)", body)
step("участники зафиксированы", fixed and int(fixed.group(1)) == uploaded - roles_set,
     f"{fixed.group(1) if fixed else '?'} участников — гости с фото без молодожёнов")

submit(f"/app/e/{event_id}/raffle", 'name="seed"', [("seed", "repetitsiya-2026")])
body = text_of(get(f"/app/e/{event_id}/raffle")[1])
winner = re.search(r"Победитель ([^s]+?) seed: repetitsiya-2026", body)
step("победитель определён", bool(winner), winner.group(1).strip() if winner else body[:80])

submit(f"/app/e/{event_id}/raffle", "Отменить результат")
submit(f"/app/e/{event_id}/raffle", 'name="seed"', [("seed", "repetitsiya-2026")])
body2 = text_of(get(f"/app/e/{event_id}/raffle")[1])
winner2 = re.search(r"Победитель ([^s]+?) seed: repetitsiya-2026", body2)
step("повтор с тем же seed даёт того же победителя",
     bool(winner and winner2) and winner.group(1) == winner2.group(1),
     winner2.group(1).strip() if winner2 else "")

print("\n14. Уборка после репетиции")
submit(f"/app/e/{event_id}/settings", 'value="ARCHIVED"')
body = text_of(get(f"/app/e/{event_id}/settings")[1])
step("мероприятие убрано в архив", "Вернуть из архива" in body)
status_after, invite_after, _ = get(f"/i/{slug}/{tokens[0]}")
step("именная ссылка после архива не работает", status_after == 404,
     f"HTTP {status_after}")

print("\n— Итог —")
ok = sum(1 for _, good, _ in steps if good)
print(f"{ok} из {len(steps)} шагов пройдено")
for name, good, detail in steps:
    if not good:
        print(f"  не прошло: {name} — {detail}")
sys.exit(0 if ok == len(steps) else 1)
