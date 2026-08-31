/**
 * Хеширование паролей организатора.
 *
 * scrypt из node:crypto, а не argon2/bcrypt: обе нативные библиотеки требуют
 * компиляции при установке и ломают сборку образа на ровном месте. scrypt
 * встроен в Node, устойчив к перебору на GPU и для десятка пользователей
 * MVP более чем достаточен.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

/**
 * Пароля может не быть вовсе — у пришедшего через Google его никогда не
 * было. Такой проверке нечего сравнивать, и ответ один: не подходит.
 */
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const [scheme, saltHex, keyHex] = (stored ?? "").split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;

  const key = await scryptAsync(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), KEYLEN);
  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== key.length) return false;

  return timingSafeEqual(key, expected);
}
