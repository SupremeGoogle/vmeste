/**
 * Шина событий для экрана в зале.
 *
 * Транспорт спрятан за интерфейсом намеренно (PLAN.md §4.1, §4.2). Сегодня
 * инстанс один, и хватает шины в памяти; когда инстансов станет два, её
 * заменит `LISTEN/NOTIFY` в PostgreSQL, который уже стоит, — и меняется
 * ровно один модуль.
 *
 * В сообщении едет только `{type, id}`, без данных. Причин две: у `NOTIFY`
 * потолок 8 КБ на сообщение, и — важнее — экран всё равно должен уметь
 * дочитать состояние сам, потому что связь в зале рвётся, и часть событий
 * он неизбежно пропустит.
 *
 * Кольцевой буфер последних событий — это и есть ответ на «моргнул вайфай».
 * Браузер при реконнекте присылает `Last-Event-ID`; если он ещё в буфере,
 * отдаём пропущенное, если нет — просим забрать полный снимок. Буфер живёт
 * в памяти и теряется при рестарте: это тоже «просим снимок», то есть
 * худший случай уже обработан.
 */

export type ScreenEventType = "photo" | "wish" | "mode" | "raffle";

export type ScreenEvent = {
  /** Монотонный номер внутри мероприятия. Уходит в SSE как `id:`. */
  seq: number;
  type: ScreenEventType;
  /** Идентификатор сущности, если она есть: фото, пожелание, розыгрыш. */
  entityId?: string;
};

export type Subscriber = (event: ScreenEvent) => void;

export interface EventBus {
  publish(eventId: string, type: ScreenEventType, entityId?: string): Promise<ScreenEvent>;
  subscribe(eventId: string, subscriber: Subscriber): () => void;
  /** События после `afterSeq`, если они ещё в буфере. `null` — история потеряна. */
  replay(eventId: string, afterSeq: number): ScreenEvent[] | null;
  /** Номер последнего события: с него экран продолжает поток после снимка. */
  lastSeq(eventId: string): number;
}

/** Сколько событий помним на мероприятие. Свадьба — это сотни фото за вечер,
 *  а пропущенным считается только то, что случилось за время разрыва. */
const BUFFER_SIZE = 200;

type Channel = {
  seq: number;
  buffer: ScreenEvent[];
  subscribers: Set<Subscriber>;
};

export class MemoryEventBus implements EventBus {
  private channels = new Map<string, Channel>();

  private channel(eventId: string): Channel {
    let channel = this.channels.get(eventId);
    if (!channel) {
      channel = { seq: 0, buffer: [], subscribers: new Set() };
      this.channels.set(eventId, channel);
    }
    return channel;
  }

  async publish(eventId: string, type: ScreenEventType, entityId?: string): Promise<ScreenEvent> {
    const channel = this.channel(eventId);
    const event: ScreenEvent = { seq: ++channel.seq, type, entityId };

    channel.buffer.push(event);
    if (channel.buffer.length > BUFFER_SIZE) channel.buffer.shift();

    for (const subscriber of channel.subscribers) {
      // Один упавший подписчик не должен уронить рассылку остальным:
      // на свадьбе экранов может быть два, и второй не виноват.
      try {
        subscriber(event);
      } catch {
        // молча: экран переподключится сам
      }
    }
    return event;
  }

  subscribe(eventId: string, subscriber: Subscriber): () => void {
    const channel = this.channel(eventId);
    channel.subscribers.add(subscriber);
    return () => {
      channel.subscribers.delete(subscriber);
    };
  }

  replay(eventId: string, afterSeq: number): ScreenEvent[] | null {
    const channel = this.channels.get(eventId);
    if (!channel) return null;

    // Номер из будущего — это экран, переживший перезапуск сервера:
    // нумерация начинается заново, и его `Last-Event-ID` больше нашего.
    // Отдать «ничего нового» здесь нельзя: на стене останется вчерашний
    // набор до следующего события, а его может не быть полчаса.
    if (afterSeq > channel.seq) return null;
    if (afterSeq === channel.seq) return [];

    const oldest = channel.buffer[0];
    // Разрыв был дольше, чем длина буфера: пропущенное уже не восстановить.
    if (!oldest || oldest.seq > afterSeq + 1) return null;

    return channel.buffer.filter((event) => event.seq > afterSeq);
  }

  lastSeq(eventId: string): number {
    return this.channels.get(eventId)?.seq ?? 0;
  }

  /** Только для тестов: сколько сейчас живых подписчиков. */
  subscriberCount(eventId: string): number {
    return this.channels.get(eventId)?.subscribers.size ?? 0;
  }
}

/**
 * Шина одна на процесс — и в проде тоже.
 *
 * Это не «удобство для dev», а условие работоспособности. Next собирает
 * маршруты отдельными бандлами, и один и тот же модуль оказывается
 * загружен по нескольку раз: серверное действие панели публикует событие
 * в свой экземпляр шины, а SSE-маршрут слушает свой. Соединение при этом
 * живое, события идут — просто мимо. Ловится это только на собранном
 * приложении: в dev глобальный кеш всё склеивал, и ошибки не было видно.
 *
 * Когда инстансов приложения станет больше одного, здесь появится
 * реализация на LISTEN/NOTIFY, и разговор про «одна на процесс» закончится.
 */
const globalForBus = globalThis as unknown as { screenBus?: MemoryEventBus };

export const bus: MemoryEventBus = (globalForBus.screenBus ??= new MemoryEventBus());
