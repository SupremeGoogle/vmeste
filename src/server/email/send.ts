/**
 * Отправка писем через Resend (https://resend.com) — HTTP API, без SMTP:
 * исходящие порты почты на сервере закрыты, а api.resend.com из России
 * отвечает. Отправитель — адрес на нашем домене (EMAIL_FROM), домен
 * подтверждается в Resend записями DNS (DKIM/SPF), иначе письма уйдут в спам.
 *
 * Без RESEND_API_KEY письмо не отправляется, а печатается в лог сервера:
 * так регистрацию можно проверить локально, не заводя ключ.
 */

export type Email = { to: string; subject: string; html: string; text: string };

export function emailConfigured(): boolean {
  // Локально письма печатаются в лог — форма регистрации нужна и без ключа.
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) || process.env.NODE_ENV !== "production";
}

export async function sendEmail(email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[письмо не отправлено — нет RESEND_API_KEY] ${email.to}: ${email.subject}\n${email.text}`);
    }
    return false;
  }
  const base = (process.env.RESEND_API_BASE || "https://api.resend.com").replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/emails`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      console.error(`Resend ответил ${response.status}: ${detail}`);
      const { notifyOnce } = await import("@/server/notify/events");
      notifyOnce(`email:${response.status}`, `Письма не отправляются: Resend ответил ${response.status}\n${detail}`, "alert");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Resend недоступен:", error);
    const { notifyOnce } = await import("@/server/notify/events");
    notifyOnce("email:network", `Письма не отправляются: Resend недоступен — ${String((error as Error)?.message ?? error)}`, "alert");
    return false;
  }
}
