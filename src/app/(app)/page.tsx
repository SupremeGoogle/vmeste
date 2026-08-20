import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-3xl font-semibold">Вместе</h1>
      <p className="mt-3 text-stone-600">
        Сервис для свадебных организаторов: приглашения, рассадка, вход по QR.
      </p>
      <Link
        href="/app"
        className="mt-8 inline-block rounded-lg bg-stone-900 px-5 py-2.5 text-white"
      >
        Войти в панель
      </Link>
    </main>
  );
}
