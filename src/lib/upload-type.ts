/**
 * Тип файла для загрузки в хранилище.
 *
 * Chrome на Windows и часть Android отдают HEIC с пустым `file.type`.
 * Пустой заголовок подписанная ссылка не примет, поэтому такой файл едет
 * как `application/octet-stream` — настоящий формат сервер всё равно
 * определит по содержимому при перекодировании.
 */
export function uploadType(file: File): string {
  return file.type || "application/octet-stream";
}
