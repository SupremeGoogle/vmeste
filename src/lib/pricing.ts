/**
 * Цена. Одна на весь сайт: лендинг, оферта, страница оплаты и счёт в
 * Robokassa берут её отсюда. Уже выставленный счёт хранит свою сумму
 * (Payment.amount) — смена цены его не трогает.
 */
export const WEDDING_PRICE_RUB = 1490;
export const WEDDING_PRICE_KOPECKS = WEDDING_PRICE_RUB * 100;

/** «1 490 ₽» — с неразрывным пробелом, как пишут цены. */
export function formatRub(rub: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(rub)} ₽`;
}

export const WEDDING_PRICE_LABEL = formatRub(WEDDING_PRICE_RUB);
