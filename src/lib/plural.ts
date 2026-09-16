/**
 * Русское склонение после числа: 1 гостя, 2 гостя, 5 гостей, 21 гостя.
 * Общий для сервера и клиента — поэтому не в файле компонента.
 */
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
