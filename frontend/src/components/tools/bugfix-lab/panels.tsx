import Editor from "@monaco-editor/react";
import {
  BookOpenText,
  Bug,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Play,
  RefreshCcw,
  SkipForward,
  Target,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import { PdfInlineViewer } from "../../PdfInlineViewer";
import { DIFFICULTY_OPTIONS, LANGUAGE_OPTIONS, resolveMonacoLanguage } from "./helpers";
import type { AttemptResult, BugFixDifficultyFilter, BugFixLanguageFilter, PracticePhase, ReviewState, ValidationMode } from "./types";
import type { BugFixQuestionRow } from "../../../types/database";
import { isJudge0ExecutableLanguage } from "../../../lib/judge0";

const compactInputClassName =
  "input-shell !rounded-[18px] !px-3 !py-2.5 text-[13px] sm:!rounded-[22px] sm:!px-4 sm:!py-3 sm:text-sm";
const compactPrimaryButtonClassName =
  "btn-primary gap-2 !rounded-[18px] !px-3 !py-2.5 text-xs sm:!rounded-2xl sm:!px-4 sm:!py-2.5 sm:text-sm";
const compactSecondaryButtonClassName =
  "btn-secondary gap-2 !rounded-[18px] !px-3 !py-2.5 text-xs sm:!rounded-2xl sm:!px-4 sm:!py-2.5 sm:text-sm";

export function BugFixLabHeader({ showTitleBlock = true, questionCount }: { showTitleBlock?: boolean; questionCount: number }) {
  if (!showTitleBlock) {
    return null;
  }

  return (
    <section className="surface-card rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Tool workspace</p>
          <h1 className="mt-2 font-display text-[1.35rem] font-semibold tracking-tight text-app-text sm:text-[1.8rem]">
            BugFix Lab
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-app-muted sm:text-sm sm:leading-6">
            Timed bugfix rounds with hints, quick validation, and optional PDF references.
          </p>
        </div>

        <div className="w-full rounded-[22px] border border-app-border bg-app-secondary/60 px-3.5 py-3 text-[13px] text-app-muted sm:w-auto sm:rounded-[26px] sm:px-4 sm:text-sm">
          <p className="font-semibold text-app-text">{questionCount} published challenges</p>
          <p className="mt-1 hidden sm:block">Questions are fetched through the FastAPI backend.</p>
        </div>
      </div>
    </section>
  );
}

export function BugFixQuestionDeckPanel({
  difficultyFilter,
  error,
  filteredCount,
  languageFilter,
  loading,
  roundSize,
  onChangeDifficultyFilter,
  onChangeLanguageFilter,
  onChangeRoundSize,
  onRefresh,
  onStartRound,
}: {
  difficultyFilter: BugFixDifficultyFilter;
  error: string | null;
  filteredCount: number;
  languageFilter: BugFixLanguageFilter;
  loading: boolean;
  roundSize: number;
  onChangeDifficultyFilter: (value: BugFixDifficultyFilter) => void;
  onChangeLanguageFilter: (value: BugFixLanguageFilter) => void;
  onChangeRoundSize: (value: number) => void;
  onRefresh: () => void;
  onStartRound: () => void;
}) {
  return (
    <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-[18px] bg-brand/10 p-2.5 text-brand sm:rounded-2xl sm:p-3">
            <Bug className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-app-text">Question deck</p>
            <p className="text-[11px] text-app-muted sm:text-xs">Pick a stack and jump in.</p>
          </div>
        </div>

        <button type="button" onClick={onRefresh} className={compactSecondaryButtonClassName} aria-label="Refresh question deck">
          <RefreshCcw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3 md:grid-cols-3">
        <select
          value={languageFilter}
          onChange={(event) => onChangeLanguageFilter(event.target.value as BugFixLanguageFilter)}
          className={compactInputClassName}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={difficultyFilter}
          onChange={(event) => onChangeDifficultyFilter(event.target.value as BugFixDifficultyFilter)}
          className={compactInputClassName}
        >
          {DIFFICULTY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={roundSize}
          onChange={(event) => onChangeRoundSize(Number(event.target.value))}
          className={`${compactInputClassName} col-span-2 md:col-span-1`}
        >
          {[3, 5, 10].map((value) => (
            <option key={value} value={value}>
              {value} questions
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mt-3 rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-[13px] text-rose-600 sm:mt-4 sm:rounded-[24px] sm:px-4 sm:text-sm">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2.5 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-app-secondary px-3 py-1.5 text-[11px] text-app-muted sm:px-3 sm:py-2 sm:text-sm">
          <Target className="h-4 w-4 text-brand" />
          {filteredCount} matches
        </span>

        <button
          type="button"
          onClick={onStartRound}
          disabled={loading || !filteredCount}
          className={`${compactPrimaryButtonClassName} w-full sm:w-auto`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          <span className="sm:hidden">Start</span>
          <span className="hidden sm:inline">Start round</span>
        </button>
      </div>
    </article>
  );
}

export function BugFixActiveQuestionPanel({
  currentIndex,
  editorCode,
  question,
  sessionLength,
  onChangeEditorCode,
}: {
  currentIndex: number;
  editorCode: string;
  question: BugFixQuestionRow;
  sessionLength: number;
  onChangeEditorCode: (value: string) => void;
}) {
  return (
    <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand sm:px-3 sm:py-1.5 sm:text-xs">
              {question.language}
            </span>
            <span className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted sm:px-3 sm:py-1.5 sm:text-xs">
              {question.difficulty}
            </span>
          </div>

          <h2 className="mt-3 text-lg font-semibold tracking-tight text-app-text sm:text-xl">{question.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-[13px] leading-5 text-app-muted sm:text-sm sm:leading-6">
            {question.prompt}
          </p>

          {question.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {question.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted sm:text-[11px]">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="w-full rounded-[20px] border border-app-border bg-app-secondary/45 px-3.5 py-3 text-[13px] sm:w-auto sm:rounded-[24px] sm:px-4 sm:text-sm">
          <div className="flex items-center justify-between gap-3 sm:block">
            <div>
              <p className="font-semibold text-app-text">Question {currentIndex + 1}</p>
              <p className="mt-1 text-app-muted">of {sessionLength}</p>
            </div>
            <p className="text-[11px] text-app-muted sm:mt-2 sm:text-xs">
              {isJudge0ExecutableLanguage(question.language) ? "Judge0 check" : "Source check"}
            </p>
          </div>
          <p className="mt-2 hidden text-xs text-app-muted sm:block">
            {isJudge0ExecutableLanguage(question.language) ? "Judge0 runtime validation" : "Source-match validation"}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[20px] border border-app-border bg-[#020617] shadow-[0_24px_64px_-44px_rgba(2,6,23,0.9)] sm:rounded-[26px]">
        <Editor
          height="50vh"
          theme="vs-dark"
          language={resolveMonacoLanguage(question.language)}
          value={editorCode}
          onChange={(value) => onChangeEditorCode(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 18, bottom: 18 },
          }}
        />
      </div>

      {question.reference_pdf_url ? (
        <div className="mt-4">
          <PdfInlineViewer
            url={question.reference_pdf_url}
            name={question.reference_pdf_name || `${question.title} reference`}
          />
        </div>
      ) : null}
    </article>
  );
}

export function BugFixEmptyStatePanel() {
  return (
    <article className="surface-card rounded-[24px] p-5 text-center sm:rounded-[30px] sm:p-8">
      <BookOpenText className="mx-auto h-9 w-9 text-brand sm:h-10 sm:w-10" />
      <h2 className="mt-4 text-lg font-semibold text-app-text sm:text-xl">Practice-ready rounds</h2>
      <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-5 text-app-muted sm:text-sm sm:leading-6">
        Start a round to get a timed bugfix challenge, optional hints, and instant review.
      </p>
    </article>
  );
}

export function BugFixSessionPanel({
  activeQuestion,
  checkingAnswer,
  phase,
  remainingSeconds,
  reviewDetails,
  reviewState,
  score,
  showHint,
  validationMode,
  onCheckAnswer,
  onMoveToNextQuestion,
  onToggleHint,
}: {
  activeQuestion: BugFixQuestionRow | null;
  checkingAnswer: boolean;
  phase: PracticePhase;
  remainingSeconds: number;
  reviewDetails: string | null;
  reviewState: ReviewState;
  score: number;
  showHint: boolean;
  validationMode: ValidationMode;
  onCheckAnswer: () => void;
  onMoveToNextQuestion: () => void;
  onToggleHint: () => void;
}) {
  return (
    <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-1">
        <div className="rounded-[20px] border border-app-border bg-app-secondary/45 px-3.5 py-3 sm:rounded-[24px] sm:px-4 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Timer className="h-4 w-4 text-brand sm:h-5 sm:w-5" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted sm:text-xs">Timer</p>
              <p className="mt-1 text-lg font-semibold text-app-text sm:text-xl">{remainingSeconds}s</p>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-app-border bg-app-secondary/45 px-3.5 py-3 sm:rounded-[24px] sm:px-4 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Trophy className="h-4 w-4 text-brand sm:h-5 sm:w-5" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted sm:text-xs">Score</p>
              <p className="mt-1 text-lg font-semibold text-app-text sm:text-xl">{score}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4">
        <button
          type="button"
          onClick={onCheckAnswer}
          disabled={phase !== "running" || !activeQuestion || checkingAnswer}
          className={`${compactPrimaryButtonClassName} w-full`}
          aria-label={checkingAnswer ? "Checking answer" : "Check answer"}
        >
          {checkingAnswer ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          <span className="sm:hidden">{checkingAnswer ? "Wait" : "Check"}</span>
          <span className="hidden sm:inline">{checkingAnswer ? "Checking..." : "Check answer"}</span>
        </button>

        <button
          type="button"
          onClick={onToggleHint}
          disabled={!activeQuestion?.hint}
          className={`${compactSecondaryButtonClassName} w-full`}
          aria-label={showHint ? "Hide hint" : "Show hint"}
        >
          <Lightbulb className="h-4 w-4" />
          <span className="sm:hidden">{showHint ? "Hide" : "Hint"}</span>
          <span className="hidden sm:inline">{showHint ? "Hide hint" : "Show hint"}</span>
        </button>

        <button
          type="button"
          onClick={onMoveToNextQuestion}
          disabled={!activeQuestion || phase === "running"}
          className={`${compactSecondaryButtonClassName} w-full`}
          aria-label="Next question"
        >
          <SkipForward className="h-4 w-4" />
          <span className="sm:hidden">Next</span>
          <span className="hidden sm:inline">Next</span>
        </button>
      </div>

      {showHint && activeQuestion?.hint ? (
        <div className="mt-3 rounded-[20px] border border-amber-500/25 bg-amber-500/10 px-3.5 py-3.5 text-[13px] text-amber-700 sm:mt-4 sm:rounded-[24px] sm:px-4 sm:py-4 sm:text-sm">
          <p className="font-semibold text-amber-800">Hint</p>
          <p className="mt-1 leading-5 sm:leading-6">{activeQuestion.hint}</p>
        </div>
      ) : null}

      {phase === "review" && activeQuestion ? (
        <div
          className={`mt-3 rounded-[20px] border px-3.5 py-3.5 text-[13px] sm:mt-4 sm:rounded-[24px] sm:px-4 sm:py-4 sm:text-sm ${
            reviewState === "correct"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
              : "border-rose-500/20 bg-rose-500/10 text-rose-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {reviewState === "correct" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <p className="font-semibold">
              {reviewState === "correct" ? "Correct fix" : reviewState === "timeout" ? "Time ran out" : "Not quite yet"}
            </p>
          </div>

          <p className="mt-2 leading-5 sm:leading-6">
            {reviewState === "correct"
              ? `You earned ${activeQuestion.points + Math.max(remainingSeconds, 0)} points for this question.`
              : "Review the expected solution, then move to the next challenge."}
          </p>

          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-current/80 sm:text-xs">
            {validationMode === "judge0" ? "Judge0 validation" : "Source validation"}
          </p>

          <div className="mt-3 rounded-[18px] border border-current/15 bg-slate-950/90 p-3 text-[11px] leading-5 text-sky-100 sm:mt-4 sm:rounded-[22px] sm:p-4 sm:text-xs sm:leading-6">
            <pre className="whitespace-pre-wrap">{activeQuestion.solution_code}</pre>
          </div>

          {reviewDetails ? (
            <div className="mt-3 rounded-[18px] border border-current/15 bg-white/40 p-3 text-[11px] leading-5 text-current sm:mt-4 sm:rounded-[22px] sm:p-4 sm:text-xs sm:leading-6">
              <pre className="whitespace-pre-wrap">{reviewDetails}</pre>
            </div>
          ) : null}

          {activeQuestion.explanation ? (
            <p className="mt-3 leading-5 text-current/90 sm:mt-4 sm:leading-6">{activeQuestion.explanation}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function BugFixRoundSummaryPanel({
  accuracy,
  attempts,
  phase,
  roundSize,
  sessionQuestionsLength,
  onPlayAgain,
}: {
  accuracy: number;
  attempts: AttemptResult[];
  phase: PracticePhase;
  roundSize: number;
  sessionQuestionsLength: number;
  onPlayAgain: () => void;
}) {
  return (
    <article className="surface-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
      <p className="text-sm font-semibold text-app-text">Round summary</p>
      <p className="mt-1 text-[11px] text-app-muted sm:text-xs">Accuracy updates after every submission.</p>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3 xl:grid-cols-1">
        <div className="rounded-[20px] border border-app-border bg-app-secondary/45 px-3.5 py-3 sm:rounded-[24px] sm:px-4 sm:py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted sm:text-xs">Accuracy</p>
          <p className="mt-1 text-lg font-semibold text-app-text sm:text-xl">{accuracy}%</p>
        </div>

        <div className="rounded-[20px] border border-app-border bg-app-secondary/45 px-3.5 py-3 sm:rounded-[24px] sm:px-4 sm:py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted sm:text-xs">Done</p>
          <p className="mt-1 text-lg font-semibold text-app-text sm:text-xl">
            {attempts.length} / {sessionQuestionsLength || roundSize}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
        {attempts.length ? (
          attempts.map((attempt) => (
            <div key={attempt.questionId} className="rounded-[18px] border border-app-border bg-app-card px-3.5 py-3 sm:rounded-[22px] sm:px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-app-text sm:text-sm">{attempt.title}</p>
                  <p className="mt-1 text-[11px] text-app-muted sm:text-xs">
                    {attempt.result === "correct" ? "Fixed correctly" : attempt.result === "timeout" ? "Timed out" : "Needs review"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold sm:text-[11px] ${
                    attempt.result === "correct" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"
                  }`}
                >
                  +{attempt.earnedPoints}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-app-border bg-app-secondary/20 px-4 py-6 text-center text-[13px] text-app-muted sm:rounded-[24px] sm:py-8 sm:text-sm">
            Start a round to see your attempts here.
          </div>
        )}
      </div>

      {phase === "finished" ? (
        <button type="button" onClick={onPlayAgain} className={`${compactPrimaryButtonClassName} mt-4 w-full !py-3`}>
          <Play className="h-4 w-4" />
          <span className="sm:hidden">Replay</span>
          <span className="hidden sm:inline">Play again</span>
        </button>
      ) : null}
    </article>
  );
}
