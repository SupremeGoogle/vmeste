/**
 * Сообщение об ошибке анкеты, которое переживает редирект.
 *
 * После отправки анкеты гость возвращается на приглашение с `?error=…`,
 * а точный текст («Ответьте на вопрос «Трансфер»») едет в адресе. Текст из
 * адреса нельзя показывать как есть: кто угодно пришлёт гостям ссылку на
 * настоящее приглашение пары с «ошибкой» «Переведите 5000 ₽ на карту …».
 *
 * Поэтому текст подписывается секретом мероприятия. Без верной подписи
 * показывается только стандартная формулировка по коду ошибки.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { RSVP_ERRORS } from "@/server/guest-html/rsvp-page";

function signature(secret: string, code: string, text: string): string {
  return createHmac("sha256", secret).update(`rsvp-flash\n${code}\n${text}`).digest("base64url").slice(0, 24);
}

/** `error`, `msg` и `sig` для адреса после неудачной отправки анкеты. */
export function flashQuery(secret: string, code: string, text = ""): URLSearchParams {
  const query = new URLSearchParams({ error: code });
  if (text) {
    query.set("msg", text);
    query.set("sig", signature(secret, code, text));
  }
  return query;
}

export type Flash = {
  /** Код ошибки; неизвестный код — «invalid». */
  error: string | null;
  /** Точный текст — только с верной подписью. */
  message: string | null;
};

export function readFlash(params: URLSearchParams, secret: string | null): Flash {
  const raw = params.get("error");
  if (!raw) return { error: null, message: null };
  const error = raw in RSVP_ERRORS ? raw : "invalid";
  const text = params.get("msg");
  const given = params.get("sig");
  if (!text || !given || !secret) return { error, message: null };
  const expected = signature(secret, raw, text);
  const ok = given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  return { error, message: ok ? text : null };
}

/** Что сказать гостю: точный текст, если он подписан, иначе — по коду. */
export function flashText(flash: Flash): string | null {
  if (!flash.error) return null;
  return flash.message ?? RSVP_ERRORS[flash.error] ?? RSVP_ERRORS.invalid;
}

/** Подпись для произвольной заметки в адресе (результат брони подарка). */
export function signNote(secret: string, scope: string, text: string): string {
  return signature(secret, scope, text);
}

/** Заметка из адреса — только с верной подписью, иначе `null`. */
export function verifiedNote(secret: string, scope: string, text: string | null, given: string | null): string | null {
  if (!text || !given) return null;
  const expected = signature(secret, scope, text);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected)) ? text : null;
}
