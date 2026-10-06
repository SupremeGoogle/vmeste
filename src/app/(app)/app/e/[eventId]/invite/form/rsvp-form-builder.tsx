"use client";

/**
 * Конструктор анкеты RSVP «как в Google Формах».
 *
 * Карточка поля раскрывается по нажатию: название, пояснение, тип,
 * варианты, «обязательный». Порядок меняется перетаскиванием за ручку
 * (Reorder из Motion) — только за ручку, иначе поле нельзя было бы
 * выделить мышью. Каждое изменение сразу уходит на сервер, а сервер
 * возвращает анкету целиком: состояние всегда совпадает с тем, что увидит гость.
 */
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { useState, useTransition, type KeyboardEvent } from "react";
import { EASE_OUT, SPRING } from "@/components/motion/motion";
import { RSVP_TYPE_LABEL, SINGLETON, WITH_OPTIONS, type RsvpQuestion, type RsvpQuestionType } from "@/lib/rsvp-form";
import type { QuestionPatch } from "@/server/repositories/rsvp-questions";
import {
  addChoiceAction, addQuestionAction, deleteQuestionAction, reorderQuestionsAction, toggleChoiceAction, updateQuestionAction,
  type BuilderOption, type BuilderState,
} from "./actions";

const ADDABLE: RsvpQuestionType[] = ["SHORT_TEXT", "LONG_TEXT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN", "RATING", "DATE", "MEAL", "DRINKS", "MUSIC"];

const ICON: Record<RsvpQuestionType, string> = {
  SHORT_TEXT: "Aa", LONG_TEXT: "¶", SINGLE_CHOICE: "◉", MULTIPLE_CHOICE: "☑", DROPDOWN: "▾", RATING: "★", DATE: "📅", MEAL: "🍽", DRINKS: "🥂", MUSIC: "♪",
};

export function RsvpFormBuilder({ eventId, initial, allowPlusOne }: { eventId: string; initial: BuilderState; allowPlusOne: boolean }) {
  const [state, setState] = useState(initial);
  const [order, setOrder] = useState(initial.questions.map((question) => question.id));
  const [active, setActive] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);

  const byId = new Map(state.questions.map((question) => [question.id, question]));
  const questions = order.map((id) => byId.get(id)).filter((question): question is RsvpQuestion => Boolean(question));

  function apply(next: BuilderState) {
    setState(next);
    setOrder(next.questions.map((question) => question.id));
  }

  const run = (action: () => Promise<BuilderState>, after?: (next: BuilderState) => void) =>
    start(async () => {
      const next = await action();
      apply(next);
      after?.(next);
    });

  const update = (id: string, patch: QuestionPatch) => {
    // Сразу на экране, потом на сервере — поле не «дёргается» при вводе.
    setState((prev) => ({ ...prev, questions: prev.questions.map((question) => (question.id === id ? { ...question, ...patch } as RsvpQuestion : question)) }));
    run(() => updateQuestionAction(eventId, id, patch));
  };

  const add = (type: RsvpQuestionType) => {
    setAdding(false);
    run(() => addQuestionAction(eventId, type), (next) => setActive(next.questions.at(-1)?.id ?? null));
  };

  const has = (type: RsvpQuestionType) => state.questions.some((question) => question.type === type);

  return (
    <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section>
        <header>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="text-xl text-stone-900">Анкета гостя</h1>
            <p className="text-xs text-stone-500" aria-live="polite">{pending ? "Сохраняем…" : "Сохранено"}</p>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Вопросы, которые гость видит, отвечая на приглашение, — в оформлении шаблона. Ответы — во вкладке «Ответы».
            Порядок меняется перетаскиванием за <span aria-hidden>⠿</span>.
          </p>
        </header>

        {state.error ? <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{state.error}</p> : null}

        <LockedCard title="Придёте?" note="Да / Нет — есть в любой анкете" />
        {allowPlusOne ? <LockedCard title="Имя спутника" note="Для гостей, которым разрешён +1" /> : null}

        <Reorder.Group
          axis="y"
          values={order}
          onReorder={setOrder}
          className="mt-3 space-y-3"
        >
          <AnimatePresence initial={false}>
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                active={active === question.id}
                onActivate={() => setActive(question.id)}
                onUpdate={(patch) => update(question.id, patch)}
                onDelete={() => run(() => deleteQuestionAction(eventId, question.id))}
                onDrop={() => run(() => reorderQuestionsAction(eventId, order))}
                choices={question.type === "MEAL" ? state.meals : question.type === "DRINKS" ? state.drinks : null}
                onAddChoice={(title) => run(() => addChoiceAction(eventId, question.type === "MEAL" ? "meal" : "drink", title))}
                onToggleChoice={(id) => run(() => toggleChoiceAction(eventId, question.type === "MEAL" ? "meal" : "drink", id))}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        <LockedCard title="Что-то ещё для организатора" note="Свободный комментарий — на странице ответа" />

        <div className="relative mt-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setAdding((value) => !value)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-card/60 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:bg-card"
            aria-expanded={adding}
          >
            <span className="text-lg leading-none">+</span> Добавить поле
          </motion.button>
          <AnimatePresence>
            {adding ? (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15 } }}
                transition={SPRING}
                className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-stone-200 bg-card p-2 shadow-lg sm:grid-cols-3"
              >
                {ADDABLE.map((type) => {
                  const taken = SINGLETON.has(type) && has(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={taken}
                      onClick={() => add(type)}
                      className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-40"
                      title={taken ? "Уже есть в анкете" : undefined}
                    >
                      <span className="w-5 shrink-0 text-center" aria-hidden>{ICON[type]}</span>
                      {RSVP_TYPE_LABEL[type]}
                    </button>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </section>

      <aside className="h-fit lg:sticky lg:top-40">
        <Preview questions={questions} meals={state.meals} drinks={state.drinks} allowPlusOne={allowPlusOne} />
      </aside>
    </div>
  );
}

function LockedCard({ title, note }: { title: string; note: string }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 px-5 py-4">
      <div>
        <p className="text-[15px] text-stone-800">{title}</p>
        <p className="text-xs text-stone-500">{note}</p>
      </div>
      <span className="text-xs text-stone-400" title="Это поле есть всегда">🔒</span>
    </div>
  );
}

function QuestionCard({
  question, active, onActivate, onUpdate, onDelete, onDrop, choices, onAddChoice, onToggleChoice,
}: {
  question: RsvpQuestion;
  active: boolean;
  onActivate: () => void;
  onUpdate: (patch: QuestionPatch) => void;
  onDelete: () => void;
  onDrop: () => void;
  choices: BuilderOption[] | null;
  onAddChoice: (title: string) => void;
  onToggleChoice: (id: string) => void;
}) {
  const controls = useDragControls();
  const special = SINGLETON.has(question.type);

  return (
    <Reorder.Item
      value={question.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } }}
      exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } }}
      onFocusCapture={onActivate}
      onPointerDown={onActivate}
      className={`relative rounded-2xl border bg-card transition-[border-color,box-shadow] duration-200 ${
        active ? "border-stone-300 shadow-lg shadow-stone-900/5" : "border-stone-200"
      }`}
    >
      {active ? <motion.span layoutId="rsvp-active-bar" className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-stone-900" transition={SPRING} /> : null}
      <div className="flex items-start gap-2 p-4 sm:p-5">
        <button
          type="button"
          onPointerDown={(event) => controls.start(event)}
          className="mt-1 -ml-1 flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 active:cursor-grabbing"
          aria-label="Перетащить поле"
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TextInput
              value={question.title}
              onSave={(title) => onUpdate({ title })}
              // На телефоне вопрос занимает всю строку, тип уходит под него:
              // иначе «Что подать на…» обрезалось рядом с выбором типа.
              className="min-w-0 flex-1 basis-full border-b border-transparent bg-transparent py-1 text-[16px] text-stone-900 outline-none focus:border-stone-400 sm:basis-auto"
              ariaLabel="Вопрос"
              wrap
            />
            {special ? (
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">{ICON[question.type]} {RSVP_TYPE_LABEL[question.type]}</span>
            ) : (
              <select
                value={question.type}
                onChange={(event) => onUpdate({ type: event.target.value as RsvpQuestionType })}
                className="rounded-lg border border-stone-300 bg-card px-2 py-1.5 text-sm"
                aria-label="Тип поля"
              >
                {(Object.keys(RSVP_TYPE_LABEL) as RsvpQuestionType[]).filter((type) => !SINGLETON.has(type)).map((type) => (
                  <option key={type} value={type}>{RSVP_TYPE_LABEL[type]}</option>
                ))}
              </select>
            )}
          </div>

          <AnimatePresence initial={false}>
            {active ? (
              <motion.div
                key="body"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="overflow-hidden"
              >
                <TextInput
                  value={question.description}
                  onSave={(description) => onUpdate({ description })}
                  placeholder="Пояснение (необязательно)"
                  className="mt-2 w-full border-b border-transparent bg-transparent py-1 text-sm text-stone-600 outline-none placeholder:text-stone-400 focus:border-stone-300"
                  ariaLabel="Пояснение"
                />

                {WITH_OPTIONS.has(question.type) ? (
                  <OptionsEditor type={question.type} options={question.options} onSave={(options) => onUpdate({ options })} />
                ) : null}
                {choices ? <ChoicesEditor kind={question.type === "MEAL" ? "meal" : "drink"} choices={choices} onAdd={onAddChoice} onToggle={onToggleChoice} /> : null}
                {question.type === "RATING" ? <p className="mt-3 text-sm text-stone-500">Гость ставит оценку от 1 до 5.</p> : null}
                {question.type === "DATE" ? <p className="mt-3 text-sm text-stone-500">Гость выбирает дату в календаре.</p> : null}
                {question.type === "SHORT_TEXT" || question.type === "LONG_TEXT" ? (
                  <p className="mt-3 border-b border-dotted border-stone-300 pb-1 text-sm text-stone-400">{question.type === "SHORT_TEXT" ? "Короткий ответ" : "Развёрнутый ответ"}</p>
                ) : null}

                <div className="mt-4 flex items-center justify-end gap-4 border-t border-stone-100 pt-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600">
                    Обязательный
                    <Switch checked={question.required} onChange={(required) => onUpdate({ required })} />
                  </label>
                  <button type="button" onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-red-50 hover:text-red-700" aria-label="Удалить поле" title="Удалить поле">
                    🗑
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {!active && question.description ? <p className="mt-1 text-sm text-stone-500">{question.description}</p> : null}
        </div>
      </div>
    </Reorder.Item>
  );
}

/** Поле, которое сохраняет значение, когда из него уходят (или по Enter). */
function TextInput({ value, onSave, className, placeholder, ariaLabel, wrap = false }: { value: string; onSave: (value: string) => void; className: string; placeholder?: string; ariaLabel: string; wrap?: boolean }) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  // Сервер вернул другое значение (например, обрезал пробелы) — показываем его.
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }
  const props = {
    value: draft,
    placeholder,
    "aria-label": ariaLabel,
    maxLength: 200,
    onBlur: () => draft !== value && onSave(draft),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.currentTarget.blur();
    },
  };
  // Длинный вопрос на телефоне не помещается в строку: поле растёт в высоту
  // по тексту, а перевод строки в вопрос не попадает — Enter завершает ввод.
  if (wrap) {
    return (
      <textarea
        {...props}
        rows={1}
        onChange={(event) => setDraft(event.target.value.replace(/\s*\n\s*/g, " "))}
        className={`resize-none [field-sizing:content] ${className}`}
      />
    );
  }
  return <input {...props} onChange={(event) => setDraft(event.target.value)} className={className} />;
}

function OptionsEditor({ type, options, onSave }: { type: RsvpQuestionType; options: string[]; onSave: (options: string[]) => void }) {
  const marker = type === "MULTIPLE_CHOICE" ? "☐" : type === "DROPDOWN" ? "" : "○";
  const [fresh, setFresh] = useState("");
  return (
    <ul className="mt-3 space-y-1.5">
      <AnimatePresence initial={false}>
        {options.map((option, index) => (
          <motion.li key={`${option}-${index}`} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="group flex items-center gap-2">
            <span className="w-5 text-center text-stone-400">{marker || `${index + 1}.`}</span>
            <TextInput
              value={option}
              onSave={(text) => onSave(options.map((item, i) => (i === index ? text : item)).filter((item) => item.trim()))}
              className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-sm outline-none focus:border-stone-300"
              ariaLabel={`Вариант ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => onSave(options.filter((_, i) => i !== index))}
              className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 opacity-60 hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100"
              aria-label={`Убрать вариант ${option}`}
            >
              ×
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
      <li className="flex items-center gap-2">
        <span className="w-5 text-center text-stone-300">{marker || "+"}</span>
        <input
          value={fresh}
          onChange={(event) => setFresh(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !fresh.trim()) return;
            event.preventDefault();
            onSave([...options, fresh.trim()]);
            setFresh("");
          }}
          onBlur={() => {
            if (!fresh.trim()) return;
            onSave([...options, fresh.trim()]);
            setFresh("");
          }}
          placeholder="Добавить вариант"
          maxLength={200}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-sm text-stone-600 outline-none placeholder:text-stone-400 focus:border-stone-300"
        />
      </li>
    </ul>
  );
}

function ChoicesEditor({ kind, choices, onAdd, onToggle }: { kind: "meal" | "drink"; choices: BuilderOption[]; onAdd: (title: string) => void; onToggle: (id: string) => void }) {
  const [fresh, setFresh] = useState("");
  const submit = () => {
    if (!fresh.trim()) return;
    onAdd(fresh.trim());
    setFresh("");
  };
  return (
    <div className="mt-3">
      <p className="text-xs text-stone-500">
        {kind === "meal" ? "Блюда меню — гость выбирает одно. По ним считает кухня." : "Напитки бара — гость отмечает несколько."} Убранный вариант
        пропадает из анкеты, но уже сделанный выбор сохраняется.
      </p>
      <ul className="mt-2 space-y-1.5">
        {choices.map((choice) => (
          <li key={choice.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 text-center text-stone-400">{kind === "meal" ? "○" : "☐"}</span>
            <span className={`min-w-0 flex-1 ${choice.active ? "text-stone-800" : "text-stone-400 line-through"}`}>{choice.title}</span>
            {choice.chosen > 0 ? <span className="text-xs text-stone-400">выбрали: {choice.chosen}</span> : null}
            <button type="button" onClick={() => onToggle(choice.id)} className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-800">
              {choice.active ? "убрать" : "вернуть"}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-2">
        <span className="w-5 text-center text-stone-300">+</span>
        <input
          value={fresh}
          onChange={(event) => setFresh(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), submit())}
          placeholder={kind === "meal" ? "Добавить блюдо, например «Сибас с овощами»" : "Добавить напиток, например «Белое вино»"}
          maxLength={60}
          className="min-w-0 flex-1 border-b border-stone-200 bg-transparent py-1 text-sm outline-none placeholder:text-stone-400 focus:border-stone-400"
        />
        <button type="button" onClick={submit} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50">
          Добавить
        </button>
      </div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-stone-900" : "bg-stone-300"}`}
    >
      <motion.span layout transition={SPRING} className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow ${checked ? "right-0.5" : "left-0.5"}`} />
    </button>
  );
}

/** Как анкету увидит гость — упрощённо, без оформления шаблона. */
function Preview({ questions, meals, drinks, allowPlusOne }: { questions: RsvpQuestion[]; meals: BuilderOption[]; drinks: BuilderOption[]; allowPlusOne: boolean }) {
  const option = (type: "radio" | "checkbox", label: string, key: string) => (
    <label key={key} className="flex items-center gap-2 py-0.5 text-sm text-stone-700">
      <input type={type} disabled className="accent-stone-900" /> {label}
    </label>
  );
  return (
    <div className="rounded-2xl border border-stone-200 bg-card p-5">
      <p className="text-sm text-stone-500">Так увидит гость</p>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-stone-800">Придёте?</p>
          {option("radio", "Да, будем", "yes")}
          {option("radio", "К сожалению, не сможем", "no")}
        </div>
        {allowPlusOne ? <p className="border-b border-dotted border-stone-300 pb-1 text-sm text-stone-400">Имя спутника, если придёте вдвоём</p> : null}
        <AnimatePresence initial={false}>
          {questions.map((question) => {
            const list =
              question.type === "MEAL" ? meals.filter((meal) => meal.active).map((meal) => meal.title)
              : question.type === "DRINKS" ? drinks.filter((drink) => drink.active).map((drink) => drink.title)
              : question.options;
            return (
              <motion.div key={question.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-sm font-medium text-stone-800">
                  {question.title}
                  {question.required ? <span className="text-red-700"> *</span> : null}
                </p>
                {question.description ? <p className="text-xs text-stone-500">{question.description}</p> : null}
                {question.type === "SINGLE_CHOICE" || question.type === "MEAL"
                  ? list.map((item, i) => option("radio", item, `${i}`))
                  : question.type === "MULTIPLE_CHOICE" || question.type === "DRINKS"
                    ? list.map((item, i) => option("checkbox", item, `${i}`))
                    : question.type === "DROPDOWN"
                      ? <div className="mt-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-400">— выберите —</div>
                      : question.type === "RATING"
                        ? <p className="mt-1 tracking-widest text-stone-300">★★★★★</p>
                        : question.type === "DATE"
                          ? <div className="mt-1 w-40 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-400">дд.мм.гггг</div>
                          : <div className="mt-1 border-b border-dotted border-stone-300 pb-1 text-sm text-stone-400">{question.type === "LONG_TEXT" ? "Развёрнутый ответ" : question.type === "MUSIC" ? "Исполнитель — название" : "Короткий ответ"}</div>}
                {(question.type === "MEAL" || question.type === "DRINKS") && list.length === 0 ? (
                  <p className="text-xs text-amber-800">Добавьте варианты — без них поле гостю не показывается.</p>
                ) : null}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <p className="border-b border-dotted border-stone-300 pb-1 text-sm text-stone-400">Что-то ещё для организатора</p>
        <div className="rounded-lg bg-stone-900 py-2 text-center text-sm text-white">Отправить</div>
      </div>
    </div>
  );
}
