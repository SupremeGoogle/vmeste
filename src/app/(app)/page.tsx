import Link from "next/link";

/**
 * Титульная страница сервиса.
 *
 * Её видят двое: организатор, зашедший по адресу без `/app`, и случайный
 * человек, которому переслали ссылку. Поэтому здесь не «лендинг», а
 * визитка: что это, для кого и куда идти дальше.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-24 text-center">
      <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">Сервис для свадеб</p>
      <h1 className="mt-4 text-4xl">Вместе</h1>

      <div className="mx-auto my-8 h-px w-16 bg-stone-200" />

      <p className="text-stone-600">
        Приглашения и ответы гостей, рассадка и план зала, вход по QR-коду
        в день свадьбы, фотографии на экране и розыгрыш.
      </p>

      <p className="mt-10">
        <Link
          href="/app"
          className="inline-block rounded-full bg-stone-900 px-8 py-3 text-white"
        >
          Войти в панель
        </Link>
      </p>

      <p className="mt-6 text-sm text-stone-500">
        Гостю сюда не нужно: у него есть именная ссылка или QR-код на входе.
      </p>
    </main>
  );
}
