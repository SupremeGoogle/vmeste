/**
 * Клиент DeepSeek для разбора списка гостей.
 *
 * Только сервер: ключ читается из окружения и не уходит ни в браузер,
 * ни в логи. Любая неудача — нет ключа, таймаут, 429, ответ не по
 * схеме — превращается в AiUnavailable, и импорт спокойно продолжает
 * правилами. Умный разбор — удобство, а не условие работы.
 *
 * Рассуждения модели выключены (`thinking: disabled`): для разбора
 * таблицы они не нужны, а стоят в разы больше токенов и секунд.
 */
import type { ZodType } from "zod";
import { IMPORT_LIMITS as L } from "./limits";

export class AiUnavailable extends Error {}

export type AiBudget = { requests: number; tokens: number };

export const newBudget = (): AiBudget => ({ requests: 0, tokens: 0 });

export function aiConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

type ChatResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { total_tokens?: number };
};

export async function deepseekJson<T>({
  system, user, schema, maxTokens, budget,
}: {
  system: string;
  user: string;
  schema: ZodType<T>;
  maxTokens: number;
  budget: AiBudget;
}): Promise<T> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new AiUnavailable("нет ключа");

  let lastError = "нет ответа";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (budget.requests >= L.aiRequests || budget.tokens + maxTokens > L.aiTokens) {
      throw new AiUnavailable("исчерпан лимит запросов на один импорт");
    }
    budget.requests++;

    let response: Response;
    try {
      response = await fetch(`${process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL ?? "deepseek-flash",
          temperature: 0,
          max_tokens: maxTokens,
          thinking: { type: "disabled" },
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: AbortSignal.timeout(L.aiTimeoutMs),
      });
    } catch (error) {
      lastError = error instanceof Error && error.name === "TimeoutError" ? "не ответил вовремя" : "нет связи";
      continue;
    }

    if (response.status === 401 || response.status === 402 || response.status === 403) {
      // Ключ недействителен или кончились деньги — повторять бессмысленно.
      throw new AiUnavailable(response.status === 402 ? "закончился баланс" : "ключ не подошёл");
    }
    if (!response.ok) {
      lastError = `ошибка ${response.status}`;
      continue;
    }

    const body = (await response.json().catch(() => null)) as ChatResponse | null;
    budget.tokens += body?.usage?.total_tokens ?? maxTokens;
    const content = body?.choices?.[0]?.message?.content ?? "";
    try {
      const parsed = schema.safeParse(JSON.parse(content));
      if (parsed.success) return parsed.data;
      lastError = "ответ не по схеме";
    } catch {
      lastError = "ответ не JSON";
    }
  }
  throw new AiUnavailable(lastError);
}

/**
 * Телефоны и почты в ИИ не отправляем: чтобы понять, что столбец —
 * телефон, достаточно метки. Уходят только имена и подписи.
 */
export function maskContacts(value: string): string {
  return value
    .replace(/[^\s@,;]+@[^\s@,;]+\.[a-zа-я]{2,}/gi, "<EMAIL>")
    .replace(/\+?\d[\d\s\-()]{8,}\d/g, "<ТЕЛЕФОН>");
}
