/**
 * Список песен для диджея — один на свадьбу: ответы на вопрос «Песня для
 * диджея» из анкеты гостя (`Guest.musicWish`), по времени ответа.
 */
import { db } from "@/server/db";
import { toCsv } from "@/server/services/csv-export";

export type PlaylistRow = {
  /** Кто предложил — имя из списка гостей. */
  who: string;
  song: string;
  link: string;
  note: string;
  source: "Анкета";
  at: Date;
};

export async function djPlaylist(eventId: string, orgId: string): Promise<PlaylistRow[]> {
  const guests = await db.guest.findMany({
    where: { eventId, orgId, archivedAt: null, musicWish: { not: null } },
    select: { displayName: true, musicWish: true, rsvpAt: true, updatedAt: true },
  });
  const rows: PlaylistRow[] = guests.flatMap((guest) => {
    const song = guest.musicWish?.trim();
    return song
      ? [{ who: guest.displayName, song, link: "", note: "", source: "Анкета" as const, at: guest.rsvpAt ?? guest.updatedAt }]
      : [];
  });
  return rows.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function playlistCsv(rows: PlaylistRow[], timezone: string): string {
  const when = new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, dateStyle: "short", timeStyle: "short" });
  return toCsv(
    ["Песня", "Кто предложил", "Ссылка", "Пожелание", "Откуда", "Когда"],
    rows.map((row) => [row.song, row.who, row.link, row.note, row.source, when.format(row.at)]),
  );
}
