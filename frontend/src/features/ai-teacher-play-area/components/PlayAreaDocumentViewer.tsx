import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Layers3,
  ListChecks,
  NotebookPen,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  PlayAreaDocument,
  PlayAreaMindmapNode,
  PlayAreaQuizQuestion,
  PlayAreaSection,
} from "../types";
import { buildDeskStyle, buildPaperStyle, getFontScaleValue, handwritingStyle } from "../utils";

function SectionIcon({ type }: { type: PlayAreaSection["type"] }) {
  const iconClassName = "h-4 w-4";
  if (type === "flashcards") {
    return <Layers3 className={iconClassName} />;
  }
  if (type === "quiz") {
    return <CheckCircle2 className={iconClassName} />;
  }
  if (type === "mindmap") {
    return <GitBranch className={iconClassName} />;
  }
  if (type === "bullet_list" || type === "steps") {
    return <ListChecks className={iconClassName} />;
  }
  return <NotebookPen className={iconClassName} />;
}

function sectionTypeLabel(type: PlayAreaSection["type"]) {
  if (type === "paragraph") {
    return "Notebook";
  }
  if (type === "bullet_list") {
    return "Notebook list";
  }
  if (type === "steps") {
    return "Step page";
  }
  if (type === "flashcards") {
    return "Flashcards";
  }
  if (type === "quiz") {
    return "Quiz";
  }
  if (type === "mindmap") {
    return "Mind map";
  }
  return "Graph";
}

function sectionCountLabel(section: PlayAreaSection) {
  if (section.type === "flashcards") {
    return `${section.cards.length} card${section.cards.length === 1 ? "" : "s"}`;
  }
  if (section.type === "quiz") {
    return `${section.questions.length} question${section.questions.length === 1 ? "" : "s"}`;
  }
  if (section.type === "mindmap") {
    return `${section.nodes.length} node${section.nodes.length === 1 ? "" : "s"}`;
  }
  if (section.type === "bullet_list" || section.type === "steps") {
    return `${section.items.length} line${section.items.length === 1 ? "" : "s"}`;
  }
  if (section.type === "graph") {
    return section.graphUrl ? "visual" : "caption";
  }
  return section.text.trim() ? "notes" : "blank page";
}

function optionMatchesAnswer(question: PlayAreaQuizQuestion, option: string, optionIndex: number) {
  const answer = question.answer.trim().toLowerCase();
  const label = String.fromCharCode(65 + optionIndex).toLowerCase();

  return (
    Boolean(answer) &&
    (answer === option.trim().toLowerCase() ||
      answer === label ||
      answer === `option ${label}` ||
      answer === `${label}.` ||
      answer === `${label})`)
  );
}

function EmptyStudyCard({ label }: { label: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-slate-300/80 bg-white/70 px-4 py-8 text-center sm:rounded-[24px] sm:px-5 sm:py-10">
      <p className="font-display text-lg font-semibold text-slate-950">{label}</p>
      <p className="mt-2 text-sm text-slate-500">Import this PlayArea to add your own content.</p>
    </div>
  );
}

function NotebookPage({
  documentData,
  pageNumber,
  section,
  totalPages,
}: {
  documentData: PlayAreaDocument;
  pageNumber: number;
  section: PlayAreaSection;
  totalPages: number;
}) {
  const fontScale = getFontScaleValue(documentData.appearance.fontScale);
  const noteTextStyle = {
    ...handwritingStyle,
    color: documentData.appearance.inkColor,
    fontSize: `${1.18 * fontScale}rem`,
  };

  return (
    <article
      className="relative overflow-hidden rounded-[24px] border border-white/80 px-3.5 py-4 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.35)] sm:rounded-[32px] sm:px-7 sm:py-7"
      style={buildPaperStyle(documentData, section.highlightColor)}
    >
      <div className="absolute left-4 top-8 hidden space-y-5 sm:block" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="block h-3 w-3 rounded-full border border-slate-200 bg-white shadow-inner" />
        ))}
      </div>

      <div className="border-b border-slate-200/80 pb-3 sm:pb-4 sm:pl-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:px-3 sm:py-1.5 sm:text-[11px] sm:tracking-[0.18em]">
            Notebook page {pageNumber} of {totalPages}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-[11px] sm:tracking-[0.2em]">
            {section.kicker || sectionTypeLabel(section.type)}
          </p>
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-3xl" style={{ color: documentData.appearance.inkColor }}>
          {section.title || "Notebook Notes"}
        </h2>
      </div>

      <div className="mt-5 sm:pl-9">
        {section.type === "paragraph" ? (
          <div className="min-h-[280px] rounded-[20px] border border-slate-200/70 bg-white/45 px-4 py-4 sm:min-h-[420px] sm:rounded-[26px] sm:px-6 sm:py-5">
            <p className="whitespace-pre-wrap leading-7 sm:leading-9" style={noteTextStyle}>
              {section.text || "No notes yet."}
            </p>
          </div>
        ) : null}

        {section.type === "bullet_list" || section.type === "steps" ? (
          section.items.length > 0 ? (
            <div className="grid gap-3">
              {section.items.map((item, index) => (
                <article key={item.id} className="rounded-[20px] border border-slate-200/80 bg-white/68 p-3.5 sm:rounded-[24px] sm:p-4">
                  <div className="flex gap-3">
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-slate-950 shadow-sm sm:h-10 sm:w-10"
                      style={{ backgroundColor: item.highlightColor || section.highlightColor }}
                    >
                      {section.type === "steps" ? index + 1 : "•"}
                    </span>
                    <div className="min-w-0">
                      {item.title.trim() ? <h3 className="font-display text-base font-semibold text-slate-950 sm:text-lg">{item.title}</h3> : null}
                      <p className="mt-1 whitespace-pre-wrap leading-7 text-slate-700 sm:leading-8" style={noteTextStyle}>
                        {item.text || "Empty line"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyStudyCard label="No notebook lines yet." />
          )
        ) : null}
      </div>
    </article>
  );
}

function InteractiveFlashcard({
  card,
  fontScale,
  index,
}: {
  card: PlayAreaSection["cards"][number];
  fontScale: number;
  index: number;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <article
      className={`relative min-h-[220px] overflow-hidden rounded-[20px] border border-slate-200/70 bg-[#fffdf8] p-3 shadow-sm sm:min-h-[240px] sm:rounded-[26px] sm:p-5 sm:shadow-[0_28px_54px_-42px_rgba(0,0,0,0.8)] ${index % 2 === 0 ? "sm:-rotate-[0.5deg]" : "sm:rotate-[0.5deg]"}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0 20px, rgba(244,63,94,0.18) 20px 21px, transparent 21px 100%), repeating-linear-gradient(180deg, transparent 0 31px, rgba(59,130,246,0.12) 31px 32px)",
      }}
    >
      <div className="absolute left-6 top-3 hidden h-1.5 w-12 rounded-full sm:block sm:left-5 sm:top-5 sm:h-2.5 sm:w-20" style={{ background: `linear-gradient(90deg, ${card.accentColor}, ${card.highlightColor})` }} />
      <div className="pl-6 sm:pl-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="inline-flex self-start rounded-full border border-slate-200 bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
            Card {index + 1}
          </p>
          <button
            type="button"
            onClick={() => setFlipped((current) => !current)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 sm:w-auto sm:justify-start sm:py-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {flipped ? "Show front" : "Show back"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setFlipped((current) => !current)}
          className="mt-4 block w-full rounded-[20px] border border-slate-200 bg-white/82 px-3.5 py-4 text-left transition hover:border-slate-300 sm:mt-5 sm:rounded-[24px] sm:px-4 sm:py-5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-[11px] sm:tracking-[0.18em]">
            {flipped ? "Back of card" : "Front of card"}
          </p>
          <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-950 sm:mt-3 sm:leading-8" style={{ ...handwritingStyle, fontSize: `${1.1 * fontScale}rem` }}>
            {flipped ? card.back || "Untitled back" : card.front || "Untitled front"}
          </p>
        </button>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-slate-200 bg-white/78 p-3.5 sm:rounded-[22px] sm:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-[11px] sm:tracking-[0.18em]">Visible side</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{flipped ? "Back" : "Front"}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Tap the card or press the button to switch sides.
            </p>
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-white/78 p-3.5 sm:rounded-[22px] sm:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-[11px] sm:tracking-[0.18em]">Study tip</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Read the front first, answer in your head, then flip to check the back.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function FlashcardDeck({
  documentData,
  section,
}: {
  documentData: PlayAreaDocument;
  section: PlayAreaSection;
}) {
  const fontScale = getFontScaleValue(documentData.appearance.fontScale);

  if (section.cards.length === 0) {
    return <EmptyStudyCard label="No flashcards yet." />;
  }

  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-900 p-3 sm:rounded-[34px] sm:p-6 text-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.7)] sm:shadow-[0_30px_80px_-54px_rgba(15,23,42,0.7)]">
      <div className="flex flex-col gap-1 sm:gap-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-300 sm:text-[11px] sm:tracking-[0.22em]">Flashcard deck</p>
        <div className="flex items-center justify-between gap-2 sm:mt-2">
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-3xl">{section.title || "Flashcards"}</h2>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white sm:px-3 sm:py-1.5 sm:text-xs">
            {section.cards.length} card{section.cards.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="hidden mt-2 text-sm text-slate-300 sm:block">Read the front, then check the back on each study card.</p>
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-2 lg:gap-5">
        {section.cards.map((card, index) => (
          <InteractiveFlashcard key={card.id} card={card} fontScale={fontScale} index={index} />
        ))}
      </div>
    </div>
  );
}

function InteractiveQuizQuestionCard({
  question,
  index,
  section,
}: {
  question: PlayAreaQuizQuestion;
  index: number;
  section: PlayAreaSection;
}) {
  const options = question.options.length > 0 ? question.options : ["Option A", "Option B", "Option C", "Option D"];
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const selectedOption =
    selectedOptionIndex !== null ? options[selectedOptionIndex] || `Option ${selectedOptionIndex + 1}` : null;
  const selectedIsCorrect =
    selectedOptionIndex !== null ? optionMatchesAnswer(question, options[selectedOptionIndex] || "", selectedOptionIndex) : false;

  return (
    <article className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-3.5 sm:rounded-[28px] sm:p-5">
      <p
        className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950"
        style={{ backgroundColor: question.highlightColor || section.highlightColor }}
      >
        Question {index + 1}
      </p>
      <h3 className="mt-4 font-display text-lg font-semibold leading-7 text-slate-950 sm:text-xl sm:leading-8">
        {question.question || "Untitled question"}
      </h3>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {options.map((option, optionIndex) => {
          const isSelected = selectedOptionIndex === optionIndex;
          const isCorrect = optionMatchesAnswer(question, option, optionIndex);
          const showCorrect = showResult && isCorrect;
          const showWrongChoice = showResult && isSelected && !isCorrect;

          return (
            <button
              key={`${question.id}-${optionIndex}`}
              type="button"
              onClick={() => {
                setSelectedOptionIndex(optionIndex);
                if (showResult) {
                  setShowResult(false);
                }
              }}
              className={`rounded-[18px] border px-4 py-3 text-left text-sm transition ${
                showCorrect
                  ? "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-[0_16px_30px_-28px_rgba(5,150,105,0.55)]"
                  : showWrongChoice
                    ? "border-rose-300 bg-rose-50 text-rose-950"
                    : isSelected
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <span
                className={`mr-2 font-bold ${
                  showCorrect
                    ? "text-emerald-700"
                    : showWrongChoice
                      ? "text-rose-700"
                      : isSelected
                        ? "text-white/75"
                        : "text-slate-400"
                }`}
              >
                {String.fromCharCode(65 + optionIndex)}.
              </span>
              {option || `Option ${optionIndex + 1}`}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => setShowResult(true)}
          disabled={selectedOptionIndex === null}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <CheckCircle2 className="h-4 w-4" />
          Check answer
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedOptionIndex(null);
            setShowResult(false);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 sm:w-auto"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      {showResult ? (
        <div
          className={`mt-4 rounded-[22px] border p-4 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-3 ${
            selectedIsCorrect ? "border-emerald-200 bg-emerald-50/55" : "border-rose-200 bg-rose-50/55"
          }`}
        >
          <div>
            <p className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${selectedIsCorrect ? "text-emerald-700" : "text-rose-700"}`}>
              {selectedIsCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {selectedIsCorrect ? "Correct" : "Not quite"}
            </p>
            <p className="mt-3 text-sm text-slate-500">Your answer</p>
            <p className="font-semibold text-slate-950">{selectedOption || "No answer selected"}</p>
            <p className="mt-3 text-sm text-slate-500">Correct answer</p>
            <p className="font-semibold text-slate-950">{question.answer || "Not set"}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Explanation</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {question.explanation || "No explanation added."}
            </p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function QuizView({ section }: { section: PlayAreaSection }) {
  if (section.questions.length === 0) {
    return <EmptyStudyCard label="No quiz questions yet." />;
  }

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.3)] sm:rounded-[34px] sm:p-6 sm:shadow-[0_30px_80px_-56px_rgba(15,23,42,0.42)]">
      <div className="flex flex-col gap-1 sm:gap-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-700 sm:text-[11px] sm:tracking-[0.22em]">Practice quiz</p>
        <div className="flex items-center justify-between gap-2 sm:mt-2">
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{section.title || "Quiz"}</h2>
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 sm:px-3 sm:py-1.5 sm:text-xs">
            {section.questions.length} question{section.questions.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="hidden mt-2 text-sm text-slate-500 sm:block">Choose an answer first, then reveal the result and explanation.</p>
      </div>

      <div className="mt-6 grid gap-4">
        {section.questions.map((question, index) => (
          <InteractiveQuizQuestionCard key={question.id} question={question} index={index} section={section} />
        ))}
      </div>
    </div>
  );
}

function buildMindmapChildren(nodes: PlayAreaMindmapNode[]) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const childrenByParent = new Map<string | null, PlayAreaMindmapNode[]>();

  nodes.forEach((node) => {
    const parentId = node.parentId && nodeIds.has(node.parentId) ? node.parentId : null;
    const siblings = childrenByParent.get(parentId) || [];
    childrenByParent.set(parentId, [...siblings, node]);
  });

  return {
    childrenByParent,
    roots: childrenByParent.get(null) || [],
  };
}

function MindmapTreeNode({
  childrenByParent,
  node,
  section,
  visited = new Set<string>(),
}: {
  childrenByParent: Map<string | null, PlayAreaMindmapNode[]>;
  node: PlayAreaMindmapNode;
  section: PlayAreaSection;
  visited?: Set<string>;
}) {
  const isCycle = visited.has(node.id);
  const nextVisited = new Set(visited);
  nextVisited.add(node.id);
  const children = isCycle ? [] : childrenByParent.get(node.id) || [];

  return (
    <li className="flex w-full min-w-0 flex-col items-stretch sm:min-w-[150px] sm:items-center">
      <div
        className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-950 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.45)] sm:max-w-[240px] sm:rounded-[22px] sm:text-center"
        style={{ boxShadow: `0 18px 38px -34px ${node.highlightColor || section.highlightColor}` }}
      >
        <span className="mb-2 block h-2.5 w-12 rounded-full sm:mx-auto" style={{ backgroundColor: node.highlightColor || section.highlightColor }} />
        {node.label || "Untitled node"}
      </div>

      {children.length > 0 ? (
        <>
          <span className="ml-4 h-5 w-px bg-slate-300 sm:ml-0 sm:h-6" aria-hidden="true" />
          <ul className="relative flex w-full flex-col gap-3 border-l border-slate-300 pl-4 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4 sm:border-l-0 sm:border-t sm:pl-0 sm:pt-5">
            {children.map((child) => (
              <MindmapTreeNode key={child.id} childrenByParent={childrenByParent} node={child} section={section} visited={nextVisited} />
            ))}
          </ul>
        </>
      ) : null}
    </li>
  );
}

function MindmapView({ section }: { section: PlayAreaSection }) {
  const { childrenByParent, roots } = useMemo(() => buildMindmapChildren(section.nodes), [section.nodes]);

  if (section.nodes.length === 0) {
    return <EmptyStudyCard label="No mind map nodes yet." />;
  }

  return (
    <div className="rounded-[20px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.13),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.3)] sm:rounded-[34px] sm:p-6 sm:shadow-[0_30px_80px_-56px_rgba(15,23,42,0.42)]">
      <div className="flex flex-col gap-1 sm:gap-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-700 sm:text-[11px] sm:tracking-[0.22em]">Mind map</p>
        <div className="flex items-center justify-between gap-2 sm:mt-2">
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{section.title || "Mindmap"}</h2>
          <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800 sm:px-3 sm:py-1.5 sm:text-xs">
            {section.nodes.length} node{section.nodes.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="hidden mt-2 text-sm text-slate-500 sm:block">Concepts are grouped by parent and child relationships.</p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-[22px] border border-slate-200 bg-white/74 p-3.5 sm:mt-6 sm:rounded-[28px] sm:p-5">
        <ul className="flex min-w-0 flex-col gap-4 px-1 py-1 sm:min-w-max sm:flex-row sm:justify-center sm:gap-8 sm:px-2 sm:py-2">
          {roots.map((node) => (
            <MindmapTreeNode key={node.id} childrenByParent={childrenByParent} node={node} section={section} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function GraphView({ section }: { section: PlayAreaSection }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.3)] sm:rounded-[34px] sm:p-6 sm:shadow-[0_30px_80px_-56px_rgba(15,23,42,0.42)]">
      <div className="flex flex-col gap-1 sm:gap-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px] sm:tracking-[0.22em]">Visual graph</p>
        <h2 className="font-display text-xl font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-3xl">{section.title || "Graph"}</h2>
      </div>
      <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-3.5 sm:mt-5 sm:rounded-[28px] sm:p-4">
        {section.graphUrl ? <img src={section.graphUrl} alt={section.title} className="max-h-[620px] w-full rounded-[22px] object-contain" /> : null}
        {section.graphCaption.trim() ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{section.graphCaption}</p> : null}
        {!section.graphUrl && !section.graphCaption.trim() ? <EmptyStudyCard label="No graph added yet." /> : null}
      </div>
    </div>
  );
}

function StudyPageView({
  documentData,
  pageNumber,
  section,
  totalPages,
}: {
  documentData: PlayAreaDocument;
  pageNumber: number;
  section: PlayAreaSection;
  totalPages: number;
}) {
  if (section.type === "paragraph" || section.type === "bullet_list" || section.type === "steps") {
    return <NotebookPage documentData={documentData} pageNumber={pageNumber} section={section} totalPages={totalPages} />;
  }
  if (section.type === "flashcards") {
    return <FlashcardDeck documentData={documentData} section={section} />;
  }
  if (section.type === "quiz") {
    return <QuizView section={section} />;
  }
  if (section.type === "mindmap") {
    return <MindmapView section={section} />;
  }
  return <GraphView section={section} />;
}

export function PlayAreaDocumentViewer({ documentData }: { documentData: PlayAreaDocument }) {
  const [activeSectionId, setActiveSectionId] = useState(documentData.sections[0]?.id || "");

  useEffect(() => {
    if (!documentData.sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(documentData.sections[0]?.id || "");
    }
  }, [activeSectionId, documentData.sections]);

  const activeIndex = Math.max(
    0,
    documentData.sections.findIndex((section) => section.id === activeSectionId)
  );
  const activeSection = documentData.sections[activeIndex] || null;
  const totalPages = documentData.sections.length;

  const goToPage = (index: number) => {
    const target = documentData.sections[index];
    if (target) {
      setActiveSectionId(target.id);
    }
  };

  return (
    <div 
      className="overflow-hidden rounded-none border-y border-x-0 border-slate-200 p-0 shadow-sm sm:shadow-[0_30px_80px_-52px_rgba(15,23,42,0.42)] sm:rounded-[34px] sm:border-x sm:p-5 bg-transparent sm:[background-image:var(--desk-bg)]" 
      style={{ "--desk-bg": buildDeskStyle(documentData).backgroundImage } as React.CSSProperties}
    >
      <div className="rounded-none border-0 sm:border sm:border-white/60 bg-white/86 p-2.5 backdrop-blur sm:rounded-[30px] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px] sm:gap-2 sm:tracking-[0.22em]">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              AI Teacher PlayArea
            </p>
            <h1 className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight text-slate-950 sm:mt-2 sm:text-3xl">{documentData.title}</h1>
            {documentData.subtitle.trim() ? <p className="mt-1 text-xs leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6">{documentData.subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {documentData.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 sm:px-3 sm:py-1.5 sm:text-xs">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        {documentData.summary.trim() ? <p className="hidden mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600 sm:block">{documentData.summary}</p> : null}
      </div>

      {activeSection ? (
        <div className="mt-4 grid min-w-0 gap-3 lg:mt-5 lg:gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-none border-x-0 border-y sm:border border-white/60 bg-white/72 p-2.5 backdrop-blur sm:p-3 sm:rounded-[22px] lg:rounded-[28px]">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Study pages</p>
                <p className="mt-1 text-xs text-slate-500">{totalPages} page{totalPages === 1 ? "" : "s"} in this PlayArea</p>
              </div>
            </div>
            <nav className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
              {documentData.sections.map((section, index) => {
                const isActive = section.id === activeSection.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    className={`flex basis-[65vw] shrink-0 snap-start items-center gap-2.5 rounded-[16px] border px-2.5 py-2 text-left transition max-w-[200px] min-w-[150px] lg:max-w-none lg:min-w-0 lg:basis-auto lg:rounded-[22px] lg:px-3 lg:py-3 lg:items-start lg:gap-3 ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.7)] lg:shadow-[0_18px_34px_-30px_rgba(15,23,42,0.7)]"
                        : "border-slate-200 bg-white/86 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] lg:h-9 lg:w-9 lg:rounded-2xl ${
                        isActive ? "bg-white/12 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <SectionIcon type={section.type} />
                    </span>
                    <span className="min-w-0 pb-0.5">
                      <span className={`hidden text-[9px] font-semibold uppercase tracking-[0.16em] lg:block lg:text-[10px] ${isActive ? "text-white/60" : "text-slate-400"}`}>
                        Page {index + 1} / {sectionTypeLabel(section.type)}
                      </span>
                      <span className="block truncate text-xs font-semibold lg:mt-1 lg:text-sm">{section.title || "Untitled section"}</span>
                      <span className={`block text-[10px] leading-tight lg:mt-1 lg:text-xs ${isActive ? "text-white/58" : "text-slate-500"}`}>{sectionCountLabel(section)}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-none border-x-0 border-y sm:border border-white/60 bg-white/74 px-2.5 py-2 backdrop-blur sm:rounded-[24px] sm:px-3">
              <button
                type="button"
                onClick={() => goToPage(activeIndex - 1)}
                disabled={activeIndex === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <p className="order-3 w-full px-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:order-none sm:w-auto sm:text-[11px] sm:tracking-[0.2em]">
                {sectionTypeLabel(activeSection.type)} view
              </p>
              <button
                type="button"
                onClick={() => goToPage(activeIndex + 1)}
                disabled={activeIndex >= totalPages - 1}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <StudyPageView documentData={documentData} pageNumber={activeIndex + 1} section={activeSection} totalPages={totalPages} />
          </main>
        </div>
      ) : (
        <div className="mt-4 rounded-[24px] border border-white/60 bg-white/82 p-6 text-center sm:mt-5 sm:rounded-[30px] sm:p-10">
          <p className="font-display text-2xl font-semibold text-slate-950">No study pages yet.</p>
          <p className="mt-2 text-sm text-slate-500">Import this PlayArea to start building pages.</p>
        </div>
      )}
    </div>
  );
}
