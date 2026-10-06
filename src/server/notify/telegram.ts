/**
 * Уведомления владельцу в Telegram: вход в панель суперадмина, неверные
 * коды 2FA, новые регистрации, падение сайта.
 *
 * Сервер стоит в России, где api.telegram.org недоступен, поэтому адрес
 * API задаётся переменной TELEGRAM_API_BASE — туда ставится прокси
 * (Cloudflare Worker / туннель), который пересылает запросы в Telegram.
 *
 * Пока TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID не заданы, отправка молча
 * пропускается: уведомление — не повод ронять вход или регистрацию.
 */
export type NotifyLevel = "info" | "warning" | "alert";

const ICON: Record<NotifyLevel, string> = { info: "ℹ️", warning: "⚠️", alert: "🚨" };

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function notifyOwner(text: string, level: NotifyLevel = "info"): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  const base = (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: `${ICON[level]} ${text}`.slice(0, 4000), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
