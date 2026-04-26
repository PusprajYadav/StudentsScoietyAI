import type { ReactNode } from "react";
import { useState } from "react";
import { MoonStar, Rocket } from "lucide-react";
import type { AiTeacherStructuredBlock, AiTeacherTheme, AiTeacherToolType } from "../types";
import {
  THEME_META,
  type AiTeacherQuizQuestion,
  getFlashcardColor,
  getSpaceNoteVariant,
  handwritingStyle,
  notebookStyle,
  normalizeQuizOptionText,
  resolveQuizAnswerIndex,
  toBulletItems,
  toStepItems,
} from "../ui";

function MindmapTree({
  nodes,
  parentId = null,
  depth = 0,
}: {
  nodes: NonNullable<AiTeacherStructuredBlock["nodes"]>;
  parentId?: string | null;
  depth?: number;
}) {
  const children = nodes.filter((node) => (node.parent_id ?? null) === parentId);
  if (!children.length) {
    return null;
  }

  return (
    <div className={depth === 0 ? "space-y-4" : "ml-5 space-y-4 border-l-2 border-dashed border-sky-200/60 pl-5"}>
      {children.map((node) => (
        <div key={node.id} className="space-y-3">
          <MindmapNodeCard label={node.label} seed={`${node.id}-${node.label}-${depth}`} depth={depth} />
          <MindmapTree nodes={nodes} parentId={node.id} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

function SpaceCardArtwork({
  variant,
  compact = false,
}: {
  variant: "rocket" | "planet" | "moon";
  compact?: boolean;
}) {
  const iconClassName = compact ? "h-4 w-4" : "h-6 w-6";
  const iconWrapClassName = compact ? "right-4 top-4" : "right-5 top-5";

  return (
    <>
      <div className={`pointer-events-none absolute ${compact ? "-left-5 -top-5 h-14 w-14" : "-left-8 -top-8 h-24 w-24"} rounded-full bg-sky-100/90 blur-2xl`} />
      <div className={`pointer-events-none absolute ${compact ? "-right-4 top-3 h-12 w-12" : "-right-5 top-4 h-20 w-20"} rounded-full bg-amber-100/80 blur-2xl`} />
      <div className={`pointer-events-none absolute ${compact ? "bottom-3 left-5 h-10 w-10" : "bottom-4 left-8 h-16 w-16"} rounded-full bg-rose-100/75 blur-2xl`} />
      <div className={`pointer-events-none absolute ${compact ? "bottom-3 right-12 h-9 w-9" : "bottom-5 right-20 h-14 w-14"} rounded-full bg-emerald-100/70 blur-2xl`} />
      <span className={`pointer-events-none absolute ${compact ? "left-4 top-4" : "left-6 top-6"} h-1.5 w-1.5 rounded-full bg-sky-300/80`} />
      <span className={`pointer-events-none absolute ${compact ? "left-8 top-8" : "left-12 top-11"} h-1.5 w-1.5 rounded-full bg-amber-300/80`} />
      <span className={`pointer-events-none absolute ${compact ? "right-10 bottom-5" : "right-16 bottom-8"} h-1.5 w-1.5 rounded-full bg-rose-300/80`} />

      {variant === "planet" ? (
        <div className={`pointer-events-none absolute ${iconWrapClassName} text-amber-400/85`}>
          <div className={`relative ${compact ? "h-6 w-6" : "h-9 w-9"} rounded-full bg-[linear-gradient(135deg,#fcd34d,#fb923c)]`}>
            <span className={`absolute ${compact ? "-left-1 top-2 h-2 w-8" : "-left-2 top-3 h-3 w-12"} rounded-full border border-amber-200/80`} />
          </div>
        </div>
      ) : variant === "rocket" ? (
        <Rocket className={`pointer-events-none absolute ${compact ? "right-4 bottom-3" : "right-6 bottom-5"} ${iconClassName} rotate-[14deg] text-rose-300/85`} />
      ) : (
        <MoonStar className={`pointer-events-none absolute ${compact ? "right-4 top-4" : "right-6 top-5"} ${iconClassName} text-indigo-300/85`} />
      )}
    </>
  );
}

function MindmapNodeCard({
  label,
  seed,
  depth,
}: {
  label: string;
  seed: string;
  depth: number;
}) {
  const variant = getSpaceNoteVariant(seed);

  return (
    <div className="relative max-w-full overflow-hidden rounded-[20px] border border-white/80 bg-white shadow-[0_18px_34px_-28px_rgba(15,23,42,0.42)]">
      <SpaceCardArtwork variant={variant} compact />
      <div className="relative px-4 pb-5 pt-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {depth === 0 ? "Main Topic" : "Branch"}
        </p>
        <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-900">{label}</p>
      </div>
    </div>
  );
}

function NotebookSheet({
  theme,
  title,
  kicker,
  seed,
  children,
}: {
  theme: AiTeacherTheme;
  title?: string;
  kicker?: string;
  seed?: string;
  children: ReactNode;
}) {
  const themeMeta = THEME_META[theme];
  const variant = getSpaceNoteVariant(`${seed || title || kicker || theme}`);

  return (
    <section
      className={`relative overflow-hidden rounded-[20px] sm:rounded-[24px] border ${themeMeta.border} px-2.5 sm:px-4 py-2.5 sm:py-4 shadow-[0_22px_46px_-34px_rgba(15,23,42,0.34)]`}
      style={notebookStyle(theme)}
    >
      <SpaceCardArtwork variant={variant} />
      <div className="absolute left-4 top-6 hidden flex-col gap-6 sm:flex">
        {[0, 1, 2].map((index) => (
          <span key={index} className="h-3 w-3 rounded-full border border-slate-300/70 bg-white/90 shadow-sm" />
        ))}
      </div>
      <div className="absolute bottom-0 left-12 top-0 hidden w-px bg-rose-200/50 sm:block" />
      <div className="relative sm:pl-10">
        <div className="rounded-[18px] sm:rounded-[22px] border border-white/80 bg-white/94 px-3.5 sm:px-6 py-4 sm:py-6 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.28)] backdrop-blur-sm break-words">
          {kicker ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{kicker}</p> : null}
          {title ? (
            <h4 className={`mt-1 text-[1.05rem] sm:text-lg font-semibold tracking-tight ${themeMeta.text} sm:text-[1.2rem] break-words`}>{title}</h4>
          ) : null}
          <div className={title || kicker ? "mt-2.5 sm:mt-3" : ""}>{children}</div>
        </div>
      </div>
    </section>
  );
}

function InteractiveQuizBlock({
  title,
  questions,
  theme,
}: {
  title?: string;
  questions: AiTeacherQuizQuestion[];
  theme: AiTeacherTheme;
}) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const answeredCount = Object.keys(selectedAnswers).length;
  const score = questions.reduce((total, question, index) => {
    const answerIndex = resolveQuizAnswerIndex(question);
    return selectedAnswers[index] === answerIndex && answerIndex >= 0 ? total + 1 : total;
  }, 0);
  const allAnswered = answeredCount === questions.length && questions.length > 0;

  return (
    <section className="overflow-hidden rounded-[20px] sm:rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] shadow-[0_24px_60px_-42px_rgba(15,23,42,0.34)] break-words">
      <div className={`relative overflow-hidden border-b border-slate-200 bg-gradient-to-br ${THEME_META[theme].surface} px-3.5 sm:px-5 py-3.5 sm:py-4`}>
        <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-white/70 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Instant Practice</p>
            <h4 className="mt-1 text-base sm:text-lg font-semibold tracking-tight text-slate-900 sm:text-[1.22rem] break-words">
              {title || "Quick Check"}
            </h4>
            <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm leading-6 text-slate-600 break-words">
              Tap an option to see right or wrong immediately.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${THEME_META[theme].chip}`}>
              {answeredCount}/{questions.length} Answered
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Score {score}/{questions.length}
            </span>
            {answeredCount ? (
              <button
                type="button"
                onClick={() => setSelectedAnswers({})}
                className="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Reset quiz
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-slate-100">
        {questions.map((question, index) => {
          const correctIndex = resolveQuizAnswerIndex(question);
          const selectedIndex = selectedAnswers[index];
          const isAnswered = typeof selectedIndex === "number";
          const isCorrect = isAnswered && selectedIndex === correctIndex;

          return (
            <div
              key={`${question.question}-${index}`}
              className="p-4 sm:p-5 break-words bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${THEME_META[theme].accent}`}>
                  Question {index + 1}
                </span>
                {isAnswered ? (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      isCorrect
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {isCorrect ? "Correct" : "Wrong"}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Tap to answer
                  </span>
                )}
              </div>

              <p className="mt-3 text-[1.1rem] sm:text-[1.16rem] leading-7 text-slate-900 break-words" style={handwritingStyle}>
                {question.question}
              </p>

              {question.options?.length ? (
                <div className="mt-4 grid gap-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedIndex === optionIndex;
                    const isRightAnswer = correctIndex === optionIndex;
                    const resolvedOption = normalizeQuizOptionText(option);

                    return (
                      <button
                        key={`${resolvedOption}-${optionIndex}`}
                        type="button"
                        onClick={() =>
                          setSelectedAnswers((current) => ({
                            ...current,
                            [index]: optionIndex,
                          }))
                        }
                        className={`w-full rounded-[18px] border px-3.5 py-3 text-left text-sm transition ${
                          !isAnswered
                            ? "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white"
                            : isRightAnswer
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : isSelected
                                ? "border-rose-200 bg-rose-50 text-rose-800"
                                : "border-slate-200 bg-slate-50/60 text-slate-500"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-semibold ${
                              !isAnswered
                                ? "bg-white text-slate-500"
                                : isRightAnswer
                                  ? "bg-emerald-600 text-white"
                                  : isSelected
                                    ? "bg-rose-600 text-white"
                                    : "bg-white text-slate-400"
                            }`}
                          >
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span className="leading-6 break-words">{resolvedOption}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {isAnswered ? (
                <div
                  className={`mt-4 rounded-[18px] border px-4 py-3 ${
                    isCorrect ? "border-emerald-200 bg-emerald-50/90" : "border-rose-200 bg-rose-50/90"
                  }`}
                >
                  <p className={`text-sm font-semibold ${isCorrect ? "text-emerald-800" : "text-rose-800"}`}>
                    {isCorrect
                      ? "Nice work. You picked the correct answer."
                      : `Correct answer: ${
                          correctIndex >= 0 ? normalizeQuizOptionText(question.options?.[correctIndex]) : question.answer || "Not provided"
                        }`}
                  </p>
                  {question.explanation ? (
                    <p className="mt-1.5 text-sm leading-6 text-slate-700">{question.explanation}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {allAnswered ? (
          <div className="bg-slate-50 px-4 py-4 text-sm text-slate-700 text-center font-medium">
            You finished the quiz with <strong>{score}</strong> out of <strong>{questions.length}</strong>.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StructuredBlockRenderer({
  block,
  theme,
  toolType,
}: {
  block: AiTeacherStructuredBlock;
  theme: AiTeacherTheme;
  toolType: AiTeacherToolType;
}) {
  const themeMeta = THEME_META[theme];
  const bulletItems = toBulletItems(block.items);
  const stepItems = toStepItems(block.items);
  const notebookKicker =
    toolType === "notes" || toolType === "summary" ? "Note:" : toolType === "ask_question" ? "Answer Note:" : "Study Note";

  if (block.type === "mindmap" && block.nodes?.length) {
    return (
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.16),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-4 shadow-[0_24px_52px_-34px_rgba(15,23,42,0.22)]">
        <div className="absolute left-6 top-6 h-1.5 w-1.5 rounded-full bg-sky-300/80" />
        <div className="absolute left-16 top-10 h-1.5 w-1.5 rounded-full bg-amber-300/75" />
        <div className="absolute right-10 top-8 h-1.5 w-1.5 rounded-full bg-indigo-300/75" />
        <div className="absolute right-16 bottom-10 h-1.5 w-1.5 rounded-full bg-rose-300/75" />
        {block.title ? (
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{block.title}</p>
        ) : null}
        <MindmapTree nodes={block.nodes} />
      </div>
    );
  }

  if (block.type === "flashcards" && block.cards?.length) {
    return (
      <div className="space-y-3">
        {block.title ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{block.title}</p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {block.cards.map((card, index) => (
            <article
              key={`${card.front}-${index}`}
              className="relative overflow-hidden rounded-[22px] border border-slate-200 p-4 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.26)]"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72)), ${getFlashcardColor(
                  `${card.front}-${card.back}-${card.accent || theme}`
                )}`,
              }}
            >
              <div className="absolute right-0 top-0 h-14 w-14 rounded-full bg-white/50 blur-2xl" />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Concept</p>
                <p className="mt-2 text-[1.24rem] leading-7 text-slate-900" style={handwritingStyle}>
                  {card.front}
                </p>
                <div className="my-4 h-px bg-slate-200/70" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Memory Hook</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{card.back}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "quiz" && block.questions?.length) {
    return <InteractiveQuizBlock title={block.title} questions={block.questions} theme={theme} />;
  }

  if (block.type === "steps" && stepItems.length) {
    return (
      <NotebookSheet theme={theme} title={block.title} kicker={notebookKicker} seed={`${block.title || "steps"}-${toolType}`}>
        <div className="space-y-4">
          {stepItems.map((step, index) => (
            <div
              key={`${step.title || "step"}-${index}`}
              className="flex items-start gap-3"
            >
              <div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${themeMeta.accent}`}>
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 break-words">{step.title || `Step ${index + 1}`}</p>
                <p className="mt-0.5 sm:mt-1 text-[1.05rem] sm:text-[1.08rem] leading-7 text-slate-700 break-words" style={handwritingStyle}>
                  {step.text || ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </NotebookSheet>
    );
  }

  if (block.type === "graph" && block.url) {
    return (
      <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.28)]">
        {block.title ? (
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{block.title}</p>
        ) : null}
        <img
          src={block.url}
          alt={block.caption || block.title || "Generated graph"}
          className="w-full rounded-[18px] border border-app-border object-cover"
        />
        {block.caption ? <p className="mt-3 text-sm leading-6 text-slate-600">{block.caption}</p> : null}
      </div>
    );
  }

  if (block.type === "bullet_list" && bulletItems.length) {
    return (
      <NotebookSheet theme={theme} title={block.title} kicker={notebookKicker} seed={`${block.title || "bullet"}-${toolType}`}>
        <div className="space-y-3">
          {bulletItems.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-start gap-3">
              <div className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${themeMeta.accent}`} />
              <p className="text-[1.05rem] sm:text-[1.08rem] leading-7 text-slate-700 break-words min-w-0" style={handwritingStyle}>
                {item}
              </p>
            </div>
          ))}
        </div>
      </NotebookSheet>
    );
  }

  return (
    <NotebookSheet theme={theme} title={block.title} kicker={notebookKicker} seed={`${block.title || "paragraph"}-${toolType}`}>
      <p className="text-[1.12rem] leading-7 text-slate-700" style={handwritingStyle}>
        {block.text || bulletItems[0] || "Structured answer ready."}
      </p>
    </NotebookSheet>
  );
}
