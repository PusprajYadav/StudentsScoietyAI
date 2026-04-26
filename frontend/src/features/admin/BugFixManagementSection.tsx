import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { FileText, Plus, RefreshCcw, Save, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import type { SaveBugFixQuestionInput } from "../../lib/bugfixApi";
import {
  parseBugFixImportFiles,
  type BugFixImportExecutionResult,
  type ImportableBugFixQuestionInput,
} from "./bugfixImport";
import type {
  BugFixDifficulty,
  BugFixLanguage,
  BugFixQuestionRow,
  BugFixQuestionStatus,
} from "../../types/database";

interface BugFixManagementSectionProps {
  loading: boolean;
  items: BugFixQuestionRow[];
  loadError: string | null;
  onRefresh: () => void | Promise<void>;
  onSaveQuestion: (input: SaveBugFixQuestionInput) => Promise<BugFixQuestionRow>;
  onDeleteQuestion: (question: BugFixQuestionRow) => Promise<void>;
  onImportQuestions: (
    inputs: ImportableBugFixQuestionInput[],
    onProgress?: (completed: number, total: number, currentTitle: string) => void
  ) => Promise<BugFixImportExecutionResult>;
}

interface BugFixDraftState {
  id?: string;
  title: string;
  language: BugFixLanguage;
  difficulty: BugFixDifficulty;
  prompt: string;
  brokenCode: string;
  solutionCode: string;
  hint: string;
  explanation: string;
  tags: string;
  timeLimitSeconds: string;
  points: string;
  status: BugFixQuestionStatus;
  removePdf: boolean;
}

const LANGUAGE_OPTIONS: BugFixLanguage[] = [
  "javascript",
  "python",
  "java",
  "cpp",
  "csharp",
  "c",
  "ruby",
  "php",
  "html",
  "css",
];

const DIFFICULTY_OPTIONS: BugFixDifficulty[] = ["easy", "medium", "hard"];
const STATUS_OPTIONS: BugFixQuestionStatus[] = ["draft", "published", "archived"];

function createEmptyDraft(): BugFixDraftState {
  return {
    title: "",
    language: "javascript",
    difficulty: "easy",
    prompt: "",
    brokenCode: "",
    solutionCode: "",
    hint: "",
    explanation: "",
    tags: "",
    timeLimitSeconds: "90",
    points: "100",
    status: "draft",
    removePdf: false,
  };
}

function createDraftFromQuestion(question: BugFixQuestionRow): BugFixDraftState {
  return {
    id: question.id,
    title: question.title,
    language: question.language,
    difficulty: question.difficulty,
    prompt: question.prompt,
    brokenCode: question.broken_code,
    solutionCode: question.solution_code,
    hint: question.hint || "",
    explanation: question.explanation || "",
    tags: question.tags.join(", "),
    timeLimitSeconds: String(question.time_limit_seconds),
    points: String(question.points),
    status: question.status,
    removePdf: false,
  };
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

export function BugFixManagementSection({
  loading,
  items,
  loadError,
  onRefresh,
  onSaveQuestion,
  onDeleteQuestion,
  onImportQuestions,
}: BugFixManagementSectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BugFixDraftState>(createEmptyDraft);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{
    tone: "success" | "warning";
    message: string;
  } | null>(null);
  const [importProgress, setImportProgress] = useState<{
    completed: number;
    total: number;
    currentTitle: string;
  } | null>(null);
  const fileImportInputRef = useRef<HTMLInputElement | null>(null);
  const folderImportInputRef = useRef<HTMLInputElement | null>(null);

  const selectedQuestion = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  );

  useEffect(() => {
    if (selectedId && !selectedQuestion) {
      setSelectedId(null);
      setDraft(createEmptyDraft());
      setPdfFile(null);
    }
  }, [selectedId, selectedQuestion]);

  useEffect(() => {
    if (!folderImportInputRef.current) {
      return;
    }

    folderImportInputRef.current.setAttribute("webkitdirectory", "");
    folderImportInputRef.current.setAttribute("directory", "");
  }, []);

  const stats = useMemo(
    () => ({
      total: items.length,
      published: items.filter((item) => item.status === "published").length,
      drafts: items.filter((item) => item.status === "draft").length,
    }),
    [items]
  );

  function openNewQuestion() {
    setSelectedId(null);
    setDraft(createEmptyDraft());
    setPdfFile(null);
  }

  function openExistingQuestion(question: BugFixQuestionRow) {
    setSelectedId(question.id);
    setDraft(createDraftFromQuestion(question));
    setPdfFile(null);
  }

  async function handleImportSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (!selectedFiles.length || importing) {
      return;
    }

    setImportFeedback(null);
    setImporting(true);

    try {
      const parsed = await parseBugFixImportFiles(selectedFiles);

      if (!parsed.questions.length) {
        const fallbackMessage = parsed.skippedFiles[0]?.message || "No valid BugFix question JSON files were found.";
        setImportFeedback({
          tone: "warning",
          message: fallbackMessage,
        });
        toast.error("No valid BugFix questions found in that selection.");
        return;
      }

      setImportProgress({
        completed: 0,
        total: parsed.questions.length,
        currentTitle: parsed.questions[0]?.title || "",
      });

      const result = await onImportQuestions(parsed.questions, (completed, total, currentTitle) => {
        setImportProgress({
          completed,
          total,
          currentTitle,
        });
      });

      const feedbackParts = [
        `Imported ${result.importedCount} question${result.importedCount === 1 ? "" : "s"} from ${parsed.importedFileCount} JSON file${parsed.importedFileCount === 1 ? "" : "s"}`,
      ];

      if (parsed.skippedFiles.length) {
        feedbackParts.push(
          `${parsed.skippedFiles.length} file${parsed.skippedFiles.length === 1 ? "" : "s"} skipped while parsing`
        );
      }

      if (result.failures.length) {
        feedbackParts.push(
          `${result.failures.length} question${result.failures.length === 1 ? "" : "s"} could not be saved`
        );
      }

      setImportFeedback({
        tone: result.failures.length || parsed.skippedFiles.length ? "warning" : "success",
        message: `${feedbackParts.join(". ")}.`,
      });

      if (result.importedCount) {
        toast.success(`Imported ${result.importedCount} BugFix question${result.importedCount === 1 ? "" : "s"}.`);
      }

      if (parsed.skippedFiles.length) {
        toast.error(
          `Skipped ${parsed.skippedFiles.length} file${parsed.skippedFiles.length === 1 ? "" : "s"}.`
        );
      }

      if (result.failures.length) {
        const firstFailure = result.failures[0];
        toast.error(`Some questions failed: ${firstFailure.label}.`);
      }
    } finally {
      setImportProgress(null);
      setImporting(false);
    }
  }

  async function handleSubmit() {
    const timeLimitSeconds = Number(draft.timeLimitSeconds);
    const points = Number(draft.points);

    if (!draft.title.trim() || !draft.prompt.trim() || !draft.brokenCode.trim() || !draft.solutionCode.trim()) {
      return;
    }

    if (!Number.isFinite(timeLimitSeconds) || timeLimitSeconds < 15) {
      return;
    }

    if (!Number.isFinite(points) || points < 10) {
      return;
    }

    setSaving(true);

    try {
      const saved = await onSaveQuestion({
        id: draft.id,
        title: draft.title,
        language: draft.language,
        difficulty: draft.difficulty,
        prompt: draft.prompt,
        brokenCode: draft.brokenCode,
        solutionCode: draft.solutionCode,
        hint: draft.hint,
        explanation: draft.explanation,
        tags: parseTags(draft.tags),
        timeLimitSeconds,
        points,
        status: draft.status,
        pdfFile,
        removePdf: draft.removePdf,
      });

      setSelectedId(saved.id);
      setDraft(createDraftFromQuestion(saved));
      setPdfFile(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedQuestion) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selectedQuestion.title}"?`);

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      await onDeleteQuestion(selectedQuestion);
      openNewQuestion();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="grid gap-2.5 md:grid-cols-3">
        <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Total</p>
          <p className="mt-1 font-display text-2xl font-semibold text-app-text">{stats.total}</p>
        </div>
        <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Published</p>
          <p className="mt-1 font-display text-2xl font-semibold text-app-text">{stats.published}</p>
        </div>
        <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Drafts</p>
          <p className="mt-1 font-display text-2xl font-semibold text-app-text">{stats.drafts}</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
          <input
            ref={fileImportInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(event) => void handleImportSelection(event)}
            className="hidden"
          />
          <input
            ref={folderImportInputRef}
            type="file"
            multiple
            accept=".json,application/json"
            onChange={(event) => void handleImportSelection(event)}
            className="hidden"
          />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-app-text">Question bank</p>
              <p className="mt-1 text-xs text-app-muted">Published and draft BugFix questions.</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => void onRefresh()} className="btn-secondary gap-2 !px-3 !py-2 text-xs">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => fileImportInputRef.current?.click()}
                disabled={importing}
                className="btn-secondary gap-2 !px-3 !py-2 text-xs"
              >
                <Upload className="h-4 w-4" />
                Import JSON
              </button>
              <button
                type="button"
                onClick={() => folderImportInputRef.current?.click()}
                disabled={importing}
                className="btn-secondary gap-2 !px-3 !py-2 text-xs"
              >
                <Upload className="h-4 w-4" />
                Import folder
              </button>
              <button type="button" onClick={openNewQuestion} className="btn-primary gap-2 !px-3 !py-2 text-xs">
                <Plus className="h-4 w-4" />
                New
              </button>
            </div>
          </div>

          {importProgress ? (
            <p className="mt-3 rounded-[16px] border border-brand/20 bg-brand/10 px-3 py-2.5 text-sm text-brand">
              Importing {importProgress.completed} / {importProgress.total}
              {importProgress.currentTitle ? ` • ${importProgress.currentTitle}` : ""}
            </p>
          ) : importFeedback ? (
            <p
              className={`mt-3 rounded-[16px] border px-3 py-2.5 text-sm ${
                importFeedback.tone === "success"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-700"
              }`}
            >
              {importFeedback.message}
            </p>
          ) : (
            <p className="mt-3 rounded-[16px] border border-app-border bg-app-secondary/20 px-3 py-2.5 text-xs text-app-muted">
              Import one JSON file or a full folder of JSON files. The generated placeholder bank can be imported as a folder.
            </p>
          )}

          {loadError ? (
            <p className="mt-3 rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-600">
              {loadError}
            </p>
          ) : null}

          <div className="mt-3 space-y-2">
            {items.length ? (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openExistingQuestion(item)}
                  className={`w-full rounded-[16px] border px-3 py-3 text-left transition ${
                    item.id === selectedId
                      ? "border-brand/25 bg-brand/10"
                      : "border-app-border bg-app-secondary/30 hover:border-brand/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-app-text">{item.title}</p>
                      <p className="mt-1 text-xs text-app-muted">
                        {item.language} • {item.difficulty}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        item.status === "published"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : item.status === "archived"
                            ? "bg-slate-500/10 text-slate-600"
                            : "bg-amber-500/10 text-amber-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-app-muted">
                    <span>{item.points} pts</span>
                    <span>{item.reference_pdf_url ? "PDF attached" : "No PDF"}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[16px] border border-dashed border-app-border bg-app-secondary/20 px-4 py-6 text-center">
                <FileText className="mx-auto h-6 w-6 text-app-muted" />
                <p className="mt-3 text-sm font-semibold text-app-text">
                  {loading ? "Loading questions..." : "No BugFix questions found"}
                </p>
              </div>
            )}
          </div>
        </aside>

        <article className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-app-text">{selectedQuestion ? "Edit question" : "Create question"}</p>
              <p className="mt-1 text-xs text-app-muted">
                Manage the content, solution, and optional PDF reference used in BugFix Lab.
              </p>
            </div>

            {selectedQuestion ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-600"
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete"}
                </span>
              </button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Question title"
              className="input-field"
            />
            <input
              value={draft.tags}
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
              placeholder="Tags, comma separated"
              className="input-field"
            />
            <select
              value={draft.language}
              onChange={(event) =>
                setDraft((current) => ({ ...current, language: event.target.value as BugFixLanguage }))
              }
              className="input-field"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={draft.difficulty}
              onChange={(event) =>
                setDraft((current) => ({ ...current, difficulty: event.target.value as BugFixDifficulty }))
              }
              className="input-field"
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={15}
              max={1800}
              value={draft.timeLimitSeconds}
              onChange={(event) => setDraft((current) => ({ ...current, timeLimitSeconds: event.target.value }))}
              placeholder="Time limit seconds"
              className="input-field"
            />
            <input
              type="number"
              min={10}
              max={5000}
              value={draft.points}
              onChange={(event) => setDraft((current) => ({ ...current, points: event.target.value }))}
              placeholder="Points"
              className="input-field"
            />
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({ ...current, status: event.target.value as BugFixQuestionStatus }))
              }
              className="input-field lg:col-span-2"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={draft.prompt}
            onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))}
            placeholder="Challenge prompt"
            className="input-field mt-3 min-h-[120px] resize-y"
          />

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <textarea
              value={draft.brokenCode}
              onChange={(event) => setDraft((current) => ({ ...current, brokenCode: event.target.value }))}
              placeholder="Broken code shown to the student"
              className="input-field min-h-[220px] resize-y font-mono text-[13px] leading-6"
            />

            <textarea
              value={draft.solutionCode}
              onChange={(event) => setDraft((current) => ({ ...current, solutionCode: event.target.value }))}
              placeholder="Correct solution code"
              className="input-field min-h-[220px] resize-y font-mono text-[13px] leading-6"
            />
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <textarea
              value={draft.hint}
              onChange={(event) => setDraft((current) => ({ ...current, hint: event.target.value }))}
              placeholder="Hint"
              className="input-field min-h-[100px] resize-y"
            />
            <textarea
              value={draft.explanation}
              onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))}
              placeholder="Explanation shown after review"
              className="input-field min-h-[100px] resize-y"
            />
          </div>

          <div className="mt-3 rounded-[16px] border border-app-border bg-app-secondary/25 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-app-text">Reference PDF</p>
                <p className="mt-1 text-xs text-app-muted">Upload an optional PDF reference for the challenge.</p>
              </div>

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
                className="text-xs text-app-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand"
              />
            </div>

            {selectedQuestion?.reference_pdf_url ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-app-border bg-app-card px-3 py-2.5">
                <a
                  href={selectedQuestion.reference_pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-semibold text-brand"
                >
                  {selectedQuestion.reference_pdf_name || "Current reference PDF"}
                </a>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-app-muted">
                  <input
                    type="checkbox"
                    checked={draft.removePdf}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, removePdf: event.target.checked }))
                    }
                  />
                  Remove current PDF
                </label>
              </div>
            ) : null}

            {pdfFile ? (
              <p className="mt-3 text-xs text-app-muted">Ready to upload: {pdfFile.name}</p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="btn-primary gap-2 !px-4 !py-2.5"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : draft.id ? "Save changes" : "Create question"}
            </button>

            <button type="button" onClick={openNewQuestion} className="btn-secondary !px-4 !py-2.5">
              Reset form
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
