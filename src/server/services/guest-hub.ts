/**
 * Данные «страницы гостя» — куда гость попадает, найдя себя по QR.
 *
 * Всё, что здесь отдаётся, отдаётся только опознанному гостю (гостевая
 * cookie после «это я»). Список всех гостей по столам — именно поэтому
 * за cookie, а не по одному короткому коду: код напечатан на табличке у
 * входа, и по нему одному список гостей получил бы кто угодно.
 */
import { db } from "@/server/db";
import { identifyByEventSession } from "@/server/guest-access/identify";
import { guestQuota, listApprovedPhotos, listGuestPhotos } from "@/server/services/photos";
import { listGuestWishes } from "@/server/services/wishes";
import { albumIsOpen, albumOpeningLabel } from "@/lib/wedding-day";

export type HubSeat = { tableId: string; tableLabel: string; seatNumber: number; tablemates: string[] } | null;

export type GuestHub = {
  guestId: string;
  displayName: string;
  giftsEnabled: boolean;
  album: { enabled: boolean; open: boolean; opensOn: string };
  seat: HubSeat;
  photos: { enabled: boolean; left: number; limit: number; mine: { id: string; status: string }[]; gallery: string[] };
  wishes: { enabled: boolean; mine: { id: string; text: string; status: string }[] };
};

export async function loadGuestHub(eventId: string): Promise<GuestHub | null> {
  const guest = await identifyByEventSession(eventId);
  if (!guest) return null;
  const ref = { orgId: guest.orgId, eventId, guestId: guest.guestId };

  const [seat, quota, mine, gallery, wishes, event] = await Promise.all([
    db.seat.findFirst({
      where: { eventId, guestId: guest.guestId },
      select: {
        index: true,
        table: {
          select: {
            id: true,
            label: true,
            seats: { orderBy: { index: "asc" }, select: { guest: { select: { id: true, displayName: true, archivedAt: true } } } },
          },
        },
      },
    }),
    guestQuota(ref),
    listGuestPhotos(ref),
    listApprovedPhotos(eventId, 60),
    listGuestWishes(ref),
    db.event.findFirst({ where: { id: eventId, orgId: guest.orgId }, select: { giftsEnabled: true, albumEnabled: true, eventDate: true, timezone: true, status: true } }),
  ]);

  return {
    guestId: guest.guestId,
    displayName: guest.displayName,
    giftsEnabled: event?.giftsEnabled ?? false,
    album: { enabled: event?.albumEnabled ?? false, open: event ? albumIsOpen(event) : false, opensOn: event ? albumOpeningLabel(event) : "" },
    seat: seat
      ? {
          tableId: seat.table.id,
          tableLabel: seat.table.label,
          seatNumber: seat.index + 1,
          tablemates: seat.table.seats.flatMap((s) =>
            s.guest && !s.guest.archivedAt && s.guest.id !== guest.guestId ? [s.guest.displayName] : [],
          ),
        }
      : null,
    photos: {
      enabled: quota.enabled,
      left: quota.left,
      limit: quota.limit,
      mine: mine.map((photo) => ({ id: photo.id, status: photo.status })),
      // Только идентификаторы: кто прислал снимок, другим гостям не видно.
      gallery: gallery.map((photo) => photo.id),
    },
    wishes: {
      enabled: guest.wishesEnabled,
      mine: wishes.map((wish) => ({ id: wish.id, text: wish.text, status: wish.status })),
    },
  };
}

export type SeatingList = { id: string; label: string; guests: { id: string; name: string }[] };

/**
 * Все столы со списками гостей — для «Рассадки всех гостей».
 *
 * Как на печатном плакате: стола молодожёнов нет (пару гости и так знают
 * в лицо), жених и невеста из списков убраны. Столы по порядку номеров:
 * «Стол 2» раньше «Стола 10».
 */
export async function loadSeatingLists(eventId: string): Promise<SeatingList[]> {
  const tables = await db.seatTable.findMany({
    where: { eventId, isCouple: false },
    select: {
      id: true,
      label: true,
      seats: {
        orderBy: { index: "asc" },
        select: { guest: { select: { id: true, displayName: true, role: true, archivedAt: true } } },
      },
    },
  });
  const collator = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });
  return tables
    .map((table) => ({
      id: table.id,
      label: table.label,
      guests: table.seats.flatMap((seat) =>
        seat.guest && !seat.guest.archivedAt && seat.guest.role === "GUEST" ? [{ id: seat.guest.id, name: seat.guest.displayName }] : [],
      ),
    }))
    .filter((table) => table.guests.length > 0)
    .sort((a, b) => collator.compare(a.label, b.label));
}
