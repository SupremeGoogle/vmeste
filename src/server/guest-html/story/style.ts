/**
 * Оформление шаблона «История» — перенос присланного образца.
 *
 * Подключается только для `theme.template === "story"`, после общих
 * настроек темы, поэтому переопределяет их точечно и ничего не ломает
 * в остальных приглашениях.
 *
 * Палитра образца уже лежит в самой теме шаблона (`invite-templates.ts`):
 * `#f8f1ea` — это его `--cream`, `#8b6914` — `--brown`, `#2a1d0d` — `--deep`.
 * Здесь — то, чего темой не выразить: гирлянда флажков, присказка,
 * наклон полароидов, разрядка имён и метки разделов.
 */
export const STORY_CSS = `
:root{--story-taupe:#bfaf9f;--story-rose:#e8c4c0;--story-beige:#e8dbc8}

/* ── Гирлянда флажков ──────────────────────────────────────────────
   Верёвка отдельным слоем, флажки — треугольники на границах, без
   единой картинки: на телефоне это ноль запросов и любой размер. */
.story-bunting{position:relative;height:52px;display:flex;align-items:flex-start;
justify-content:space-around;padding:0 1.25rem;margin-bottom:.5rem}
.story-bunting::before{content:'';position:absolute;top:14px;left:4%;right:4%;height:1.5px;
background:linear-gradient(90deg,transparent,var(--story-taupe) 15%,var(--story-taupe) 85%,transparent)}
.story-bunting i{display:block;width:0;height:0;margin-top:4px;
border-left:13px solid transparent;border-right:13px solid transparent;
border-top:22px solid var(--story-taupe);transform-origin:50% 0;
animation:story-sway 4s ease-in-out infinite alternate}
.story-bunting i:nth-child(3n+1){border-top-color:#c09085}
.story-bunting i:nth-child(3n+2){border-top-color:#c8a87a}
.story-bunting i:nth-child(3n+3){border-top-color:#9ead98}
.story-bunting i:nth-child(2){animation-delay:.4s}
.story-bunting i:nth-child(3){animation-delay:.8s}
.story-bunting i:nth-child(4){animation-delay:1.2s}
.story-bunting i:nth-child(5){animation-delay:1.6s}
.story-bunting i:nth-child(6){animation-delay:2s}
.story-bunting i:nth-child(7){animation-delay:2.4s}
.story-bunting i:nth-child(8){animation-delay:2.8s}
.story-bunting i:nth-child(9){animation-delay:3.2s}
@keyframes story-sway{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}

/* ── Присказка над обложкой ── */
.story-rhyme{font-family:var(--serif);font-style:italic;letter-spacing:.02em;
font-size:clamp(1.5rem,5vw,2.3rem);color:var(--accent);text-align:center;margin:0 0 2rem}

/* ── Имена: широкая разрядка прописными, как в образце ── */
.story .cover .names{font-family:var(--serif);font-weight:300;text-transform:uppercase;
letter-spacing:.22em;font-size:clamp(1.6rem,7vw,3.2rem);line-height:1.45;color:var(--accent);
margin:0 0 .75rem}

/* ── Метки разделов: «— ТАЙМИНГ —» ──────────────────────────────────
   Тире рисуем псевдоэлементами, а не пишем в текст: они оформление,
   и в заголовке, который читает скринридер, им делать нечего. */
.story section>h2{font-size:.9rem;letter-spacing:.32em;text-transform:uppercase;
color:var(--story-taupe);font-weight:400}
.story section>h2::before{content:'— ';color:var(--story-rose)}
.story section>h2::after{content:' —';color:var(--story-rose)}

/* ── Полароиды: наклон и тяжёлая тень, снимок лежит на бумаге ── */
.story .polaroid{background:#fefcf9;padding:1.25rem 1.25rem 3.5rem;border-radius:2px;
box-shadow:0 12px 48px #3d2b2738,0 2px 12px #3d2b271f;
transition:transform .45s cubic-bezier(.22,1,.36,1),box-shadow .3s}
.story .polaroid.p1{transform:rotate(-4.5deg)}
.story .polaroid.p2{transform:rotate(3deg)}
.story .polaroid:hover{transform:rotate(0) scale(1.05) translateY(-6px);z-index:5;
box-shadow:0 20px 60px #3d2b2733}
.story .polaroid figcaption{font-style:italic;font-size:.8rem;line-height:1.6;color:var(--accent)}

/* Палец не наводит — на телефоне наклон уже и есть весь эффект,
   а :hover там залипает после касания. */
@media(hover:none){.story .polaroid:hover{transform:none}
.story .polaroid.p1:hover{transform:rotate(-4.5deg)}
.story .polaroid.p2:hover{transform:rotate(3deg)}}

@media(prefers-reduced-motion:reduce){
.story-bunting i{animation:none}
.story .polaroid{transition:none}}
`.replace(/\n/g, "");
