/**
 * Свадебные сцены — «фотографии», нарисованные геометрией.
 *
 * Настоящих снимков у сервиса нет и взяться им пока неоткуда, а страница
 * без единой картинки выглядит как техническая документация. Поэтому
 * иллюстрации нарисованы здесь: градиенты, круги и пути в той же палитре,
 * что панель и приглашение.
 *
 * Почему это оказалось не худшим решением, чем стоковые фотографии:
 *   — весит килобайты, а не мегабайты, и на телефоне в дороге приходит
 *     вместе с разметкой, без второго запроса;
 *   — тянется в любой размер без мыла: одна и та же сцена стоит в мозаике
 *     на 300 пикселей и во весь первый экран;
 *   — не устаревает при смене палитры: цвета берутся из тех же токенов;
 *   — не врёт. Стоковая пара с чужой свадьбы на странице сервиса, у
 *     которого ещё нет клиентов, — это обещание, которое мы не давали.
 *
 * Каждая сцена — чистый SVG без состояния, поэтому одинаково годится и в
 * галерею, и в ролик, и как фон первого экрана.
 */

export type SceneId =
  | "hall"
  | "table"
  | "rings"
  | "bouquet"
  | "arch"
  | "cake"
  | "invitation"
  | "toast"
  | "dance"
  | "candles"
  | "photo"
  | "confetti";

export const SCENE_TITLE: Record<SceneId, string> = {
  hall: "Зал перед гостями",
  table: "Сервировка стола",
  rings: "Кольца",
  bouquet: "Букет невесты",
  arch: "Арка для церемонии",
  cake: "Торт",
  invitation: "Приглашение",
  toast: "Тост",
  dance: "Первый танец",
  candles: "Свечи к вечеру",
  photo: "Снимок на память",
  confetti: "Лепестки и конфетти",
};

type Props = { className?: string };

/** Общая подложка: тёплый градиент и мягкое пятно света сверху. */
function Backdrop({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="14%" r="62%">
          <stop offset="0%" stopColor="#fff6e6" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff6e6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id}-bg)`} />
      <rect width="400" height="300" fill={`url(#${id}-glow)`} />
    </>
  );
}

/** Общая рамка сцены: одно соотношение сторон на все двенадцать. */
function Frame({ children, className, title }: Props & { children: React.ReactNode; title: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label={title} preserveAspectRatio="xMidYMid slice">
      {children}
    </svg>
  );
}

/* ── Зал: ряды столов, окна, свет ───────────────────────────── */
function Hall({ className }: Props) {
  return (
    <Frame className={className} title={SCENE_TITLE.hall}>
      <Backdrop id="hall" from="#f7ece0" to="#e4d3c1" />
      {/* Окна: три светлых арки в глубине. */}
      {[70, 200, 330].map((x) => (
        <g key={x}>
          <path
            d={`M${x - 34} 150 v-58 a34 34 0 0 1 68 0 v58 z`}
            fill="#fff8ec"
            stroke="#d8c4ad"
            strokeWidth="2"
          />
          <path d={`M${x} 34 v116`} stroke="#d8c4ad" strokeWidth="1.4" />
        </g>
      ))}
      <rect y="150" width="400" height="150" fill="#e8d8c6" />
      {/* Столы уходят вглубь: чем дальше, тем меньше и бледнее. */}
      {[
        { x: 96, y: 268, r: 44, o: 1 },
        { x: 300, y: 262, r: 40, o: 0.95 },
        { x: 196, y: 206, r: 30, o: 0.8 },
        { x: 62, y: 190, r: 22, o: 0.65 },
        { x: 336, y: 188, r: 22, o: 0.65 },
      ].map((table) => (
        <g key={`${table.x}-${table.y}`} opacity={table.o}>
          <ellipse cx={table.x} cy={table.y + 6} rx={table.r} ry={table.r * 0.32} fill="#c9b298" opacity="0.4" />
          <ellipse cx={table.x} cy={table.y} rx={table.r} ry={table.r * 0.34} fill="#fffdf9" stroke="#dcc9b2" strokeWidth="1.5" />
          <ellipse cx={table.x} cy={table.y - 4} rx={table.r * 0.22} ry={table.r * 0.09} fill="#e6d6c2" />
          {/* Стулья вокруг. */}
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const angle = (index / 6) * Math.PI * 2;
            return (
              <ellipse
                key={index}
                cx={table.x + Math.cos(angle) * table.r * 1.36}
                cy={table.y + Math.sin(angle) * table.r * 0.5}
                rx={table.r * 0.19}
                ry={table.r * 0.13}
                fill="#c8ab86"
              />
            );
          })}
        </g>
      ))}
    </Frame>
  );
}

/* ── Сервировка: тарелка, приборы, бокал, карточка ──────────── */
function Table({ className }: Props) {
  return (
    <Frame className={className} title={SCENE_TITLE.table}>
      <Backdrop id="table" from="#fdf6ec" to="#eadfd0" />
      <ellipse cx="200" cy="176" rx="150" ry="96" fill="#fffdf9" stroke="#e0d0bb" strokeWidth="2" />
      <circle cx="196" cy="172" r="58" fill="#fbf5ec" stroke="#dcc9b2" strokeWidth="2" />
      <circle cx="196" cy="172" r="42" fill="#fffdf9" stroke="#e6d7c3" strokeWidth="1.2" />
      {/* Приборы. */}
      <rect x="118" y="140" width="5" height="64" rx="2.5" fill="#c2a878" />
      <rect x="128" y="140" width="5" height="64" rx="2.5" fill="#c2a878" />
      <rect x="266" y="140" width="6" height="64" rx="3" fill="#c2a878" />
      {/* Бокал. */}
      <path d="M292 96 h30 l-6 34 a9 9 0 0 1 -18 0 z" fill="#f3ece0" stroke="#d3c0a8" strokeWidth="1.4" />
      <rect x="305" y="130" width="4" height="26" fill="#d3c0a8" />
      <ellipse cx="307" cy="158" rx="15" ry="4" fill="#d3c0a8" />
      {/* Карточка с именем. */}
      <g transform="rotate(-5 196 172)">
        <rect x="166" y="152" width="62" height="34" rx="3" fill="#fffdf9" stroke="#dfcdb6" strokeWidth="1.2" />
        <rect x="176" y="164" width="42" height="3" rx="1.5" fill="#c2a878" />
        <rect x="182" y="172" width="30" height="2.4" rx="1.2" fill="#ddcdb8" />
      </g>
      {/* Веточка. */}
      <path d="M74 232 q40 -26 84 -14" stroke="#a8b48c" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3].map((index) => (
        <ellipse key={index} cx={92 + index * 22} cy={224 - index * 3} rx="9" ry="5" fill="#b6c199" transform={`rotate(${-24 + index * 9} ${92 + index * 22} ${224 - index * 3})`} />
      ))}
    </Frame>
  );
}

/* ── Кольца ─────────────────────────────────────────────────── */
function Rings({ className }: Props) {
  return (
    <Frame className={className} title={SCENE_TITLE.rings}>
      <Backdrop id="rings" from="#f6ebdc" to="#dfc9ae" />
      <ellipse cx="200" cy="232" rx="128" ry="24" fill="#c9ad86" opacity="0.35" />
      <circle cx="166" cy="164" r="56" fill="none" stroke="#b48b4e" strokeWidth="11" />
      <circle cx="166" cy="164" r="56" fill="none" stroke="#e2c188" strokeWidth="4" />
      <circle cx="238" cy="164" r="56" fill="none" stroke="#c8a465" strokeWidth="11" />
      <circle cx="238" cy="164" r="56" fill="none" stroke="#f0d7a6" strokeWidth="4" />
      {/* Камень. */}
      <path d="M238 100 l13 12 -13 15 -13 -15 z" fill="#fffdf9" stroke="#e0cba8" strokeWidth="1.5" />
      {/* Блики. */}
      {[[112, 96], [300, 118], [206, 74]].map(([x, y], index) => (
        <path
          key={index}
          d={`M${x} ${y - 11} l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z`}
          fill="#fff8e8"
          opacity={0.9 - index * 0.2}
        />
      ))}
    </Frame>
  );
}

/* ── Букет ──────────────────────────────────────────────────── */
function Bouquet({ className }: Props) {
  const petals = [
    { x: 200, y: 118, r: 44, fill: "#f2dfd6" },
    { x: 150, y: 148, r: 34, fill: "#e9d0c4" },
    { x: 250, y: 146, r: 36, fill: "#efd8cb" },
    { x: 176, y: 96, r: 26, fill: "#f6e7dd" },
    { x: 228, y: 100, r: 24, fill: "#eed9cc" },
  ];

  return (
    <Frame className={className} title={SCENE_TITLE.bouquet}>
      <Backdrop id="bouquet" from="#f9f0e6" to="#e6dccd" />
      {/* Зелень. */}
      {[-64, -34, 0, 34, 64].map((offset) => (
        <path
          key={offset}
          d={`M200 176 q${offset * 1.5} -34 ${offset * 1.9} -74`}
          stroke="#9fae84"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      ))}
      {petals.map((petal) => (
        <g key={`${petal.x}-${petal.y}`}>
          <circle cx={petal.x} cy={petal.y} r={petal.r} fill={petal.fill} />
          {[0, 1, 2, 3, 4].map((index) => {
            const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
            return (
              <circle
                key={index}
                cx={petal.x + Math.cos(angle) * petal.r * 0.52}
                cy={petal.y + Math.sin(angle) * petal.r * 0.52}
                r={petal.r * 0.36}
                fill="#fffdf9"
                opacity="0.55"
              />
            );
          })}
          <circle cx={petal.x} cy={petal.y} r={petal.r * 0.22} fill="#d9b98f" />
        </g>
      ))}
      {/* Лента. */}
      <path d="M200 176 v76" stroke="#c9b193" strokeWidth="14" strokeLinecap="round" />
      <path d="M200 206 q-30 18 -14 44 M200 206 q30 18 14 44" stroke="#e8d5c4" strokeWidth="7" fill="none" strokeLinecap="round" />
    </Frame>
  );
}

/* ── Арка ───────────────────────────────────────────────────── */
function Arch({ className }: Props) {
  return (
    <Frame className={className} title={SCENE_TITLE.arch}>
      <Backdrop id="arch" from="#eef2e6" to="#dfe0cc" />
      <rect y="238" width="400" height="62" fill="#d6d2ba" />
      <path d="M118 260 v-84 a82 82 0 0 1 164 0 v84" fill="none" stroke="#c2a878" strokeWidth="9" />
      {/* Цветы по дуге. */}
      {Array.from({ length: 14 }, (_, index) => {
        const t = index / 13;
        const angle = Math.PI * (1 - t);
        const x = 200 + Math.cos(angle) * 82;
        const y = 176 - Math.sin(angle) * 82;
        return (
          <g key={index}>
            <circle cx={x} cy={y} r={13 - (index % 3) * 3} fill={index % 2 ? "#f0dcd2" : "#e6d0c4"} />
            <circle cx={x + 9} cy={y + 7} r="7" fill="#a8b48c" />
          </g>
        );
      })}
      {/* Стулья двумя рядами. */}
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <g key={index}>
          <rect x={26 + index * 22} y={250} width="14" height="18" rx="3" fill="#c8ab86" />
          <rect x={294 + (index % 4) * 22} y={250} width="14" height="18" rx="3" fill="#c8ab86" />
        </g>
      ))}
      {/* Дорожка. */}
      <path d="M164 300 L186 246 h28 l22 54 z" fill="#fffdf9" opacity="0.75" />
    </Frame>
  );
}

/* ── Торт ───────────────────────────────────────────────────── */
function Cake({ className }: Props) {
  return (
    <Frame className={className} title={SCENE_TITLE.cake}>
      <Backdrop id="cake" from="#f8efe4" to="#e7d8c6" />
      <ellipse cx="200" cy="264" rx="112" ry="20" fill="#cdb495" opacity="0.4" />
      {[
        { w: 168, y: 208, h: 54 },
        { w: 128, y: 158, h: 50 },
        { w: 88, y: 112, h: 46 },
      ].map((tier) => (
        <g key={tier.y}>
          <rect x={200 - tier.w / 2} y={tier.y} width={tier.w} height={tier.h} rx="6" fill="#fffdf9" stroke="#e4d3bd" strokeWidth="1.6" />
          <ellipse cx="200" cy={tier.y} rx={tier.w / 2} ry="9" fill="#fffdf9" stroke="#e4d3bd" strokeWidth="1.6" />
          {/* Подтёки крема. */}
          {Array.from({ length: Math.round(tier.w / 26) }, (_, index) => (
            <path
              key={index}
              d={`M${200 - tier.w / 2 + 13 + index * 26} ${tier.y + 2} q6 16 0 22 q-6 -6 0 -22`}
              fill="#f4e7d4"
            />
          ))}
        </g>
      ))}
      {/* Ягоды и цветы. */}
      {[[168, 152], [232, 150], [200, 106], [148, 202], [252, 200]].map(([x, y], index) => (
        <g key={index}>
          <circle cx={x} cy={y} r="9" fill={index % 2 ? "#c58a86" : "#e0b6a6"} />
          <ellipse cx={x + 11} cy={y + 4} rx="9" ry="5" fill="#a8b48c" transform={`rotate(24 ${x + 11} ${y + 4})`} />
        </g>
      ))}
      <path d="M200 88 v-20 M191 76 l9 -12 9 12" stroke="#c2a878" strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </Frame>
  );
}

/* ── Приглашение ────────────────────────────────────────────── */
function Invitation({ className }: Props) {
  return (
    <Frame className={className} title={SCENE_TITLE.invitation}>
      <Backdrop id="invitation" from="#f6eee2" to="#e3d5c3" />
      <g transform="rotate(-4 200 150)">
        <rect x="104" y="46" width="192" height="212" rx="6" fill="#fffdf9" stroke="#e0cfb8" strokeWidth="2" />
        <rect x="118" y="60" width="164" height="184" rx="3" fill="none" stroke="#e8dac5" strokeWidth="1.2" />
        <rect x="150" y="86" width="100" height="5" rx="2.5" fill="#c2a878" />
        <rect x="132" y="112" width="136" height="12" rx="4" fill="#8b6f47" />
        <rect x="164" y="140" width="72" height="4" rx="2" fill="#d8c8b2" />
        {[0, 1, 2].map((index) => (
          <g key={index}>
            <rect x="136" y={170 + index * 22} width="34" height="4" rx="2" fill="#cbb99f" />
            <rect x="180" y={170 + index * 22} width="84" height="4" rx="2" fill="#e2d4c0" />
          </g>
        ))}
        <rect x="152" y="234" width="96" height="1.6" fill="#e8dac5" />
      </g>
      {/* Веточка поверх и конверт под приглашением. */}
      <path d="M76 214 q34 -30 70 -30" stroke="#a8b48c" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[0, 1, 2].map((index) => (
        <ellipse key={index} cx={92 + index * 24} cy={204 - index * 8} rx="11" ry="6" fill="#b6c199" transform={`rotate(${-30 + index * 12} ${92 + index * 24} ${204 - index * 8})`} />
      ))}
      <circle cx="286" cy="228" r="18" fill="#c58a86" opacity="0.85" />
      <circle cx="286" cy="228" r="11" fill="none" stroke="#fff2e6" strokeWidth="1.4" />
    </Frame>
  );
}

/* ── Тост ───────────────────────────────────────────────────── */
function Toast({ className }: Props) {
  return (
    <Frame className={className} title={SCENE_TITLE.toast}>
      <Backdrop id="toast" from="#f4e6d6" to="#d9bfa0" />
      {[
        { x: 142, rotate: -14 },
        { x: 258, rotate: 14 },
      ].map((glass) => (
        <g key={glass.x} transform={`rotate(${glass.rotate} ${glass.x} 150)`}>
          <path d={`M${glass.x - 30} 76 h60 l-9 62 a21 21 0 0 1 -42 0 z`} fill="#fdf3e2" stroke="#cbb190" strokeWidth="2" />
          <path d={`M${glass.x - 26} 104 h52 l-6 34 a17 17 0 0 1 -40 0 z`} fill="#f0d9a8" opacity="0.85" />
          <rect x={glass.x - 3} y="158" width="6" height="52" fill="#cbb190" />
          <ellipse cx={glass.x} cy="212" rx="26" ry="7" fill="#cbb190" />
          {/* Пузырьки. */}
          {[0, 1, 2, 3].map((index) => (
            <circle key={index} cx={glass.x - 12 + index * 9} cy={130 - index * 9} r={2.6 - index * 0.3} fill="#fffdf9" opacity="0.9" />
          ))}
        </g>
      ))}
      {/* Искры между бокалами. */}
      {[[200, 88], [176, 62], [224, 66]].map(([x, y], index) => (
        <path key={index} d={`M${x} ${y - 13} l3.4 9.6 9.6 3.4 -9.6 3.4 -3.4 9.6 -3.4 -9.6 -9.6 -3.4 9.6 -3.4 z`} fill="#fff6e0" opacity={0.95 - index * 0.25} />
      ))}
    </Frame>
  );
}

/* ── Первый танец ───────────────────────────────────────────── */
function Dance({ className }: Props) {
  return (
    <Frame className={className} title={SCENE_TITLE.dance}>
      <defs>
        <radialGradient id="dance-spot" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#fff3dc" />
          <stop offset="100%" stopColor="#d9c3a4" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#dance-spot)" />
      <ellipse cx="200" cy="262" rx="120" ry="26" fill="#c2a071" opacity="0.35" />
      {/* Невеста: платье и фата. */}
      <path d="M186 262 q-34 0 -30 -34 l16 -74 h24 l14 74 q4 34 -24 34 z" fill="#fffdf9" stroke="#e2d2bb" strokeWidth="1.6" />
      <circle cx="184" cy="128" r="16" fill="#f0d9c2" />
      <path d="M170 120 q14 -22 30 -4 q-6 -12 -16 -12 q-12 0 -14 16 z" fill="#8a6a4a" />
      <path d="M168 130 q-16 44 4 96" stroke="#fffdf9" strokeWidth="8" fill="none" opacity="0.75" strokeLinecap="round" />
      {/* Жених. */}
      <path d="M232 262 v-84 h30 v84 z" fill="#4b4038" />
      <path d="M228 178 q18 -34 38 0 l-6 12 h-26 z" fill="#3d342d" />
      <circle cx="247" cy="132" r="15" fill="#eccfae" />
      <path d="M233 126 q14 -16 28 -2 q-2 -14 -14 -14 q-12 0 -14 16 z" fill="#4a3a2c" />
      {/* Соединённые руки. */}
      <path d="M198 178 q22 -14 42 4" stroke="#f0d9c2" strokeWidth="7" fill="none" strokeLinecap="round" />
      {/* Огоньки гирлянды. */}
      {Array.from({ length: 9 }, (_, index) => (
        <circle key={index} cx={32 + index * 42} cy={30 + (index % 3) * 12} r="4.5" fill="#fff2d4" opacity="0.9" />
      ))}
      <path d="M20 34 q90 34 180 4 q90 -30 180 6" stroke="#e0cba8" strokeWidth="1.4" fill="none" opacity="0.7" />
    </Frame>
  );
}

/* ── Свечи ──────────────────────────────────────────────────── */
function Candles({ className }: Props) {
  return (
    <Frame className={className} title={SCENE_TITLE.candles}>
      <defs>
        <radialGradient id="candle-glow" cx="50%" cy="46%" r="56%">
          <stop offset="0%" stopColor="#5e4a35" />
          <stop offset="100%" stopColor="#332920" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#candle-glow)" />
      {[
        { x: 118, h: 118 },
        { x: 200, h: 152 },
        { x: 282, h: 100 },
      ].map((candle) => (
        <g key={candle.x}>
          <ellipse cx={candle.x} cy={262} rx="34" ry="10" fill="#7a6349" opacity="0.5" />
          <rect x={candle.x - 16} y={262 - candle.h} width="32" height={candle.h} rx="6" fill="#f6ead6" />
          <ellipse cx={candle.x} cy={262 - candle.h} rx="16" ry="5" fill="#fffdf9" />
          {/* Пламя и ореол. */}
          <circle cx={candle.x} cy={262 - candle.h - 20} r="26" fill="#ffce7a" opacity="0.22" />
          <path
            d={`M${candle.x} ${262 - candle.h - 34} q11 14 0 24 q-11 -10 0 -24 z`}
            fill="#ffd98a"
          />
          <path
            d={`M${candle.x} ${262 - candle.h - 26} q5 8 0 14 q-5 -6 0 -14 z`}
            fill="#fff6e0"
          />
        </g>
      ))}
      {/* Лепестки на столе. */}
      {[[70, 274], [150, 282], [252, 278], [330, 270], [200, 288]].map(([x, y], index) => (
        <ellipse key={index} cx={x} cy={y} rx="12" ry="6" fill="#a37b62" opacity="0.6" transform={`rotate(${index * 34} ${x} ${y})`} />
      ))}
    </Frame>
  );
}

/* ── Снимок на память ───────────────────────────────────────── */
function Photo({ className }: Props) {
  return (
    <Frame className={className} title={SCENE_TITLE.photo}>
      <Backdrop id="photo" from="#f7eee3" to="#e2d2be" />
      {/* Три карточки веером. */}
      {[
        { rotate: -12, x: 74, fill: "#e8d6c4" },
        { rotate: 7, x: 148, fill: "#dfcab4" },
        { rotate: -3, x: 112, fill: "#f2e4d3" },
      ].map((card, index) => (
        <g key={index} transform={`rotate(${card.rotate} ${card.x + 68} 150)`}>
          <rect x={card.x} y="62" width="136" height="164" rx="4" fill="#fffdf9" stroke="#ddcab3" strokeWidth="1.6" />
          <rect x={card.x + 10} y="72" width="116" height="118" fill={card.fill} />
          <circle cx={card.x + 68} cy="118" r="24" fill="#fffdf9" opacity="0.55" />
          <path d={`M${card.x + 10} 190 l38 -42 30 26 24 -20 24 36 z`} fill="#c9ab8b" opacity="0.6" />
          <rect x={card.x + 34} y="202" width="68" height="4" rx="2" fill="#ddcab3" />
        </g>
      ))}
      {/* Телефон, с которого гость отправляет снимок. */}
      <g transform="rotate(9 316 200)">
        <rect x="284" y="132" width="64" height="122" rx="10" fill="#453b33" />
        <rect x="290" y="142" width="52" height="98" rx="4" fill="#f7ece0" />
        <circle cx="316" cy="248" r="3.4" fill="#6d6058" />
        <path d="M296 226 l14 -18 12 12 10 -10 12 16 z" fill="#c9ab8b" />
      </g>
    </Frame>
  );
}

/* ── Конфетти ───────────────────────────────────────────────── */
function Confetti({ className }: Props) {
  const bits = Array.from({ length: 34 }, (_, index) => ({
    x: (index * 61) % 400,
    y: (index * 97) % 300,
    r: 5 + (index % 4) * 2.6,
    angle: (index * 47) % 180,
    fill: ["#e8d5c4", "#f0dcd2", "#dfc9ae", "#c9ad86", "#f6e7dd"][index % 5],
  }));

  return (
    <Frame className={className} title={SCENE_TITLE.confetti}>
      <Backdrop id="confetti" from="#faf3ea" to="#e9dccb" />
      {bits.map((bit, index) => (
        <ellipse
          key={index}
          cx={bit.x}
          cy={bit.y}
          rx={bit.r}
          ry={bit.r * 0.52}
          fill={bit.fill}
          opacity={0.55 + (index % 4) * 0.12}
          transform={`rotate(${bit.angle} ${bit.x} ${bit.y})`}
        />
      ))}
      {/* Две руки, подбрасывающие лепестки, — намёком. */}
      <path d="M104 300 q18 -60 62 -84" stroke="#e0c9ae" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M296 300 q-18 -60 -62 -84" stroke="#e0c9ae" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.7" />
    </Frame>
  );
}

const SCENES: Record<SceneId, (props: Props) => React.ReactElement> = {
  hall: Hall,
  table: Table,
  rings: Rings,
  bouquet: Bouquet,
  arch: Arch,
  cake: Cake,
  invitation: Invitation,
  toast: Toast,
  dance: Dance,
  candles: Candles,
  photo: Photo,
  confetti: Confetti,
};

export const SCENE_IDS = Object.keys(SCENES) as SceneId[];

/** Одна сцена по имени. */
export function Scene({ id, className }: { id: SceneId; className?: string }) {
  const Component = SCENES[id];
  return <Component className={className} />;
}
