# Обещание

Самостоятельный шаблон приглашения, добавленный Codex. Существующий шаблон «История» сохраняется.

- Превью: `/templates/promise` — без обращения к базе и изменения мероприятий.
- Данные шаблона: `src/lib/invite-templates/promise.ts`.
- Разметка, стили, анимации: `src/server/guest-html/promise/`.
- Миниатюра в админке: `src/components/invite/promise-thumbnail.tsx`.
- Подключение: реестр `invite-templates.ts`, `invite-html.ts`, `invite-theme-css.ts`, `template-picker.tsx`.
- Все блоки используют существующие схемы и формы редактора. В обложке дата автоматически берётся из мероприятия, если поле «Дата словами» пусто. Загруженное фото заменяет центральную иллюстрацию. Пустые фотографии галереи используют фоновую иллюстрацию до загрузки своих снимков.
- Анимации: появление обложки, последовательное появление текста, лепестки, покачивание веточки, появление разделов, каскад тайминга и палитры, увеличение фото при наведении, отклик кнопок, линия прогресса чтения. `prefers-reduced-motion` отключает движение. Без JavaScript содержимое сразу видно.

## Фоновая иллюстрация

`garden.webp` (1024 × 1536, около 155 KiB) создана встроенным ImageGen и оптимизирована в WebP. Применяется только в этом шаблоне. Оригинальные файлы других шаблонов не заменялись.

Итоговый промпт:

> Create a high-end fine-art botanical wedding invitation background asset, portrait 2:3 composition. Realistic delicate pale blush garden roses, ivory peonies, tiny white flowers and soft sage olive branches form an airy asymmetrical floral arch along the TOP and LEFT and RIGHT EDGES. Through the middle of the arch a luminous, misty Amalfi coast sea landscape, an elegant distant Italian villa and hazy cliffs, warm ivory light. The central lower half should fade softly into blank warm cream handmade paper (#faf6f0), with very faint blush watercolor wash at the bottom. Refined editorial photography blended with watercolor paper, muted low contrast natural palette, very romantic but sophisticated, detailed flower petals. Keep flowers mostly along edges and in the top third, plenty of quiet cream negative space in lower half for HTML typography to be added later. No people, no lettering, no text, no logo, no phone, no mockup, no borders. This is the actual website background asset, not a screenshot.
