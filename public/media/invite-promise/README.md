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

## Демонстрационные фотографии

- `couple.webp`: вымышленные молодожёны, акварельная мультяшная иллюстрация для обложки и галереи.
- `dance.webp`: вымышленная пара танцует в саду; иллюстрация для второго кадра галереи.
- `venue.webp`: демонстрация площадки, копия существующего проектного `public/media/brand-hero.webp` (оригинал сохранён).

Две иллюстрации созданы встроенным ImageGen. Изображения заданы обычными `imageUrl` в данных шаблона и заменяются через существующий редактор. Допустимы только три точных локальных пути из `promise-assets.ts`; произвольные относительные URL не разрешены.

Промпт `couple.webp`:

> Create a portrait 4:5 illustration for a sophisticated wedding invitation website. An entirely fictional young adult bride and groom, charming hand-painted storybook cartoon characters with delicate realistic proportions, expressive kind faces. Bride: brunette hair in loose low bun, ivory flowing wedding gown, bouquet of pale blush roses. Groom: wavy dark brown hair, warm beige linen wedding suit. They gently touch foreheads and hold hands, both happy. Waist-up to three-quarter portrait, heads comfortably away from top and sides to fit an arch-shaped crop. Behind them a sunlit Amalfi coast villa garden and sea, soft cream roses and olive leaves framing edges. Fine watercolor and gouache with subtle paper texture, premium romantic illustrated book aesthetic, not childish or exaggerated. Warm cream, dusty rose, sage olive, muted sepia palette, soft golden afternoon light. No words, lettering, logos, watermark, or border. Finished website illustration, not phone mockup.

Промпт `dance.webp`:

> Create a portrait 4:5 fine watercolor and gouache illustration for a sophisticated romantic wedding invitation gallery. Entirely fictional adult bride with brunette loose low bun, flowing ivory wedding dress, and groom with wavy dark brown hair and beige linen wedding suit. They dance together in a villa garden at dusk, smiling into each other's eyes, three-quarter or full-body view, graceful natural pose, delicate charming storybook cartoon faces with believable proportions. Cream roses and sage olive branches, soft blush flowers, elegant strings of warm lights above, glimpse of hazy sea. Premium hand-painted illustrated book aesthetic and subtle paper grain, not childish, soft painterly brushstrokes. Muted dusty rose, ivory, sage green, warm brown palette matching fine botanical wedding stationery. Clear focus on couple, breathing room around heads, no crowds. No text, lettering, logos, watermark, frame, collage or phone mockup. Actual website illustration asset.
