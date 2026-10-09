# English translation — shared brief for agents

The app (Next.js 16 — read AGENTS.md; check node_modules/next/dist/docs for unfamiliar APIs) is being made bilingual (Russian default, English). Infrastructure already exists:

- `src/lib/i18n.ts` — `Lang = "ru" | "en"`, `makeT(lang)`, type `T`, `countWord(lang, n, [ru1, ru2, ru5], [en1, enMany])`, `localeOf(lang)`, cookie `vm_lang`.
- `src/server/i18n.ts` — `getUiLang()` / `getT()` for server components and server actions (organizer UI language from cookie).
- `src/components/i18n-provider.tsx` — `useT()` / `useLang()` for client components inside `/app` (provider is in `src/app/(app)/app/layout.tsx`).
- `src/server/guest-html/guest-lang.ts` — `withGuestLang(event.language, () => render())`, `gl("рус", "eng")`, `guestLang()` for the synchronous guest HTML renderers.
- `src/lib/format-datetime.ts` — `formatEventDate/formatEventDateTime/formatDeadline(date, tz, lang?)`.
- DB: `Event.language` (`"ru" | "en"`, default "ru") — the language of everything GUESTS see for that wedding (invitation, RSVP form, guest page, venue screen, printed cards, emails to guests). The ORGANIZER UI language is the organizer's cookie (`getUiLang()` / `useT()`), independent of the event.

## Pattern
Replace a visible Russian string with an inline pair, keeping the Russian text byte-for-byte:
- server component / action: `const t = await getT();` … `{t("Гости", "Guests")}`
- client component: `const t = useT();` … `t("Сохранить", "Save")`
- guest HTML: `gl("Подтвердить присутствие", "RSVP")`
- plurals: `countWord(lang, n, ["гость", "гостя", "гостей"], ["guest", "guests"])`
- dates/numbers: pass `lang` / use `localeOf(lang)` in Intl.
- error/status messages returned from server code: prefer returning a code and translating in the UI, or add an optional `lang` param. Server actions can call `getT()`.
No central dictionaries. Do not translate code comments, log messages, test fixtures, AI prompts sent to models, or DB enum values. Do not change Russian text, markup structure, CSS, or behavior.

## English style
Natural US English, warm and concise (like Zola / Joy / Paperless Post). Sentence case for headings and buttons. Consistent terms: "guest list", "guest", "RSVP" (noun and verb), "seating chart", "table", "invitation", "photo album", "check-in", "gift list", "day plan" (тайминг), "dashboard", "wedding" for «свадьба», "event" for «мероприятие». Keep button labels short (layouts are tight). Never claim anything is free; never invent features or numbers.

## Working rules (IMPORTANT — several agents and the Codex agent edit this checkout at the same time)
- Edit ONLY files in your ownership list. Use small exact-string edits (the Edit tool); never rewrite whole files with scripts. Re-read a file right before editing it.
- The working tree already contains UNCOMMITTED work: Codex's new template family "celebration" (celebration, chrome, coral, disco, gravure — src/lib/invite-templates/celebration*.ts, src/server/guest-html/celebration/, themed-intro.ts, registry entries) and partial translations by earlier agents that were cut off mid-way. Start by running `git diff -- <your files>` to see what is already done in your area, finish it, and fix anything half-applied. Never revert other people's changes.
- Do not commit, push, or run `next build`. A dev server runs at http://localhost:3000 (DB is up). Use curl to check pages you can reach.
- `npx tsc --noEmit -p .` may show errors in files other agents are mid-edit on — fix only errors in your files. Run `npx eslint <your changed files>` and any related vitest specs (`npx vitest run src/tests/<name>.spec.ts`); Russian stays the default, so existing tests must keep passing.
- Finish with a concise report: files changed, what remains untranslated and why.
