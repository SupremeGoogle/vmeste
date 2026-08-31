/**
 * Кнопка «Продолжить с Google».
 *
 * Обычная ссылка, а не форма с обработчиком: вход через Google — это
 * переход браузера, и он обязан работать до того, как доедет JavaScript.
 * Значок нарисован путями, а не картинкой: это 400 байт вместо запроса
 * к чужому домену со страницы входа.
 */
import Link from "next/link";

export function GoogleButton({ label }: { label: string }) {
  return (
    <Link
      href="/api/auth/google/start"
      prefetch={false}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-stone-800 transition-colors hover:border-stone-400"
    >
      <GoogleGlyph />
      {label}
    </Link>
  );
}

/** Фирменные цвета Google — их менять нельзя, это условие использования кнопки. */
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.3 6.6v5.5h7c4.1-3.8 6.6-9.4 6.6-16.3z" />
      <path fill="#34A853" d="M24 46c5.8 0 10.7-1.9 14.3-5.2l-7-5.5c-1.9 1.3-4.4 2.1-7.3 2.1-5.6 0-10.4-3.8-12.1-8.9H4.7v5.6C8.3 41.3 15.6 46 24 46z" />
      <path fill="#FBBC05" d="M11.9 28.5c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.6H4.7A22 22 0 0 0 2.4 24.4c0 3.5.8 6.9 2.3 9.7l7.2-5.6z" />
      <path fill="#EA4335" d="M24 11.4c3.2 0 6 1.1 8.2 3.2l6.2-6.2C34.7 4.9 29.8 2.8 24 2.8 15.6 2.8 8.3 7.5 4.7 14.7l7.2 5.6c1.7-5.1 6.5-8.9 12.1-8.9z" />
    </svg>
  );
}

/** Разделитель «или» между Google и формой с паролем. */
export function OrRule() {
  return (
    <div className="my-6 flex items-center gap-4">
      <span className="h-px flex-1 bg-stone-200" />
      <span className="text-xs text-stone-500">или</span>
      <span className="h-px flex-1 bg-stone-200" />
    </div>
  );
}
