"""Черновой монтаж промо «Вместе»: режет готовые клипы по EDL и склеивает в один файл.

Запуск: python3 rough_cut.py  (из папки promo). Пропускает отсутствующие клипы.
"""
import os
import subprocess
import sys

V = os.path.join(os.path.dirname(os.path.abspath(__file__)), "video")
FONT = "/home/user/vmeste/public/fonts/CormorantGaramond-Regular.ttf"

# (файл, начало, конец) — секунды внутри клипа
EDL = [
    # Акт 1. Утро
    ("F1_opening.mp4", 0.0, 9.0),
    ("F2_morning.mp4", 0.3, 5.9),      # будильник, зевок
    ("F2_morning.mp4", 7.71, 15.0),    # календарь, шок
    # Акт 2. Сборы
    ("F3_1.mp4", 0.0, 4.5),
    ("F3_2.mp4", 0.0, 5.0),
    ("TODO.mp4", 0.0, 3.0),
    ("INVITES.mp4", 0.0, 10.0),
    ("F3_4.mp4", 0.0, 5.0),
    ("F3_6_bags.mp4", 0.5, 7.5),
    # День, фаза 1 — спокойно
    ("F4_dayA.mp4", 0.0, 2.96),        # выбегает
    ("F4_dayA.mp4", 4.5, 8.5),         # велик
    ("F4_dayA.mp4", 8.5, 11.7),        # светофор
    ("F4_1_grandma.mp4", 0.5, 9.8),
    ("F4_2_florist.mp4", 0.0, 5.0),
    # Фаза 2 — быстрее
    ("F5_dayB.mp4", 0.05, 2.42),       # кондитерская
    ("F5_1_teen.mp4", 1.0, 9.0),
    ("F5_dayB.mp4", 4.92, 7.42),       # салон
    ("MULTITASK.mp4", 0.0, 5.0),
    ("F5_dayB.mp4", 9.04, 14.5),       # тётя с корги
    ("F6_4_puddle_walk.mp4", 0.0, 9.5),
    ("DOORS_10x1s.mp4", 0.0, 10.0),
    ("F6_dayC.mp4", 2.5, 5.04),        # ювелир
    ("F6_2_grandpa.mp4", 0.5, 9.5),
    # Фаза 3 — ещё быстрее
    ("F6_dayC.mp4", 7.54, 10.5),       # светофор на закате
    ("F6_3_friend.mp4", 0.3, 9.8),
    ("F7_dayD.mp4", 0.0, 12.4),        # туфли, декор, торты, салфетка
    ("SEATING.mp4", 0.0, 10.0),
    ("F7_dayD.mp4", 12.4, 15.0),       # засыпает за столом
    # Акт 3. Пробуждение
    ("F8_wake_v2.mp4", 0.0, 15.0),
    ("CARD_PRODUCT", 0.0, 3.0),
    # Акт 5. Финал
    ("F9_ceremony.mp4", 0.0, 6.2),
    ("F9_1_wink.mp4", 0.0, 5.0),
    ("F10_drone.mp4", 0.0, 10.0),
    ("CARD_END", 0.0, 4.0),
]

NORM = ("scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,"
        "setsar=1,fps=24,format=yuv420p")


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def card(path, text, sub, dur):
    vf = (f"drawtext=fontfile={FONT}:text='{text}':fontcolor=0x5a1a2a:fontsize=96:"
          f"x=(w-text_w)/2:y=(h-text_h)/2-40,"
          f"drawtext=fontfile={FONT}:text='{sub}':fontcolor=0x5a1a2a:fontsize=44:"
          f"x=(w-text_w)/2:y=(h/2)+60")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c=0xf7f1e8:s=1920x1080:r=24:d={dur}",
         "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:d={dur}",
         "-vf", vf, "-shortest", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", path])


def main():
    tmp = os.path.join(V, "_cut")
    os.makedirs(tmp, exist_ok=True)
    parts = []
    for i, (src, a, b) in enumerate(EDL):
        out = os.path.join(tmp, f"{i:03d}.mp4")
        dur = round(b - a, 3)
        if src == "CARD_PRODUCT":
            card(out, "Блок продукта", "моушн-графика 34 с — в работе", dur)
        elif src == "CARD_END":
            card(out, "Вместе", "vvvmeste.com", dur)
        else:
            path = os.path.join(V, src)
            if not os.path.exists(path):
                print("skip (нет файла):", src)
                continue
            af = (f"aresample=48000,aformat=channel_layouts=stereo,"
                  f"afade=t=in:d=0.06,afade=t=out:st={max(dur - 0.06, 0)}:d=0.06")
            run(["ffmpeg", "-y", "-ss", str(a), "-t", str(dur), "-i", path,
                 "-vf", NORM, "-af", af, "-c:v", "libx264", "-crf", "18", "-preset", "fast",
                 "-c:a", "aac", "-b:a", "192k", "-ar", "48000", out])
        parts.append(out)
    lst = os.path.join(tmp, "list.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{p}'\n" for p in parts)
    joined = os.path.join(tmp, "joined.mp4")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    final = os.path.join(V, "ROUGH_CUT_v1.mp4")
    run(["ffmpeg", "-y", "-i", joined, "-c:v", "copy", "-af", "loudnorm=I=-18:TP=-1.5",
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final])
    print("OK", final)


if __name__ == "__main__":
    sys.exit(main())
