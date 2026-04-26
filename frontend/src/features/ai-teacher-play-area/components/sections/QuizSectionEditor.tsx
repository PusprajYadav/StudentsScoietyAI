import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { PlayAreaQuizQuestion, PlayAreaSection } from "../../types";
import { createEditorId, surfaceInputClassName } from "../../utils";
import { AutoGrowTextarea } from "../AutoGrowTextarea";

export function QuizSectionEditor({
  section,
  onChange,
}: {
  section: PlayAreaSection;
  onChange: (nextSection: PlayAreaSection) => void;
}) {
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);

  function updateQuestion(questionId: string, updater: (question: PlayAreaQuizQuestion) => PlayAreaQuizQuestion) {
    onChange({
      ...section,
      questions: section.questions.map((candidate) => (candidate.id === questionId ? updater(candidate) : candidate)),
    });
  }

  function moveQuestion(draggedId: string, targetId: string, placement: "before" | "after") {
    if (draggedId === targetId) {
      return;
    }

    const draggedIndex = section.questions.findIndex((candidate) => candidate.id === draggedId);
    const targetIndex = section.questions.findIndex((candidate) => candidate.id === targetId);
    if (draggedIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextQuestions = [...section.questions];
    const [draggedQuestion] = nextQuestions.splice(draggedIndex, 1);
    const targetPosition = nextQuestions.findIndex((candidate) => candidate.id === targetId);
    const insertIndex = placement === "after" ? targetPosition + 1 : targetPosition;
    nextQuestions.splice(insertIndex, 0, draggedQuestion);
    onChange({ ...section, questions: nextQuestions });
  }

  return (
    <div className="min-w-0 rounded-[20px] border border-white/80 bg-white/82 p-3 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.32)] sm:rounded-[24px] sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Practice builder</p>
          <p className="mt-1 text-sm text-slate-600">Keep every question, option, answer, and explanation neatly grouped for export.</p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...section,
              questions: [
                ...section.questions,
                {
                  id: createEditorId("quiz"),
                  question: "",
                  options: ["", "", "", ""],
                  answer: "",
                  explanation: "",
                  highlightColor: section.highlightColor,
                },
              ],
            })
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/92 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {section.questions.map((question, questionIndex) => (
          <article
            key={question.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!draggedQuestionId) {
                return;
              }
              const bounds = event.currentTarget.getBoundingClientRect();
              moveQuestion(draggedQuestionId, question.id, event.clientY > bounds.top + bounds.height / 2 ? "after" : "before");
              setDraggedQuestionId(null);
            }}
            className={`overflow-hidden rounded-[20px] border bg-[#fffdfa]/96 shadow-[0_18px_30px_-28px_rgba(15,23,42,0.3)] transition sm:rounded-[24px] ${
              draggedQuestionId === question.id ? "border-slate-400 opacity-70" : "border-slate-200/80"
            }`}
          >
            <div className="flex flex-col gap-2.5 border-b border-slate-100 bg-white/78 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    setDraggedQuestionId(question.id);
                  }}
                  onDragEnd={() => setDraggedQuestionId(null)}
                  className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 active:cursor-grabbing sm:h-8 sm:w-8"
                  aria-label="Drag to reorder question"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <p className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-800" style={{ backgroundColor: question.highlightColor }}>
                  Question {questionIndex + 1}
                </p>
                <p className="text-xs text-slate-500">Multiple-choice block</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...section,
                    questions: section.questions.filter((candidate) => candidate.id !== question.id),
                  })
                }
                className="inline-flex h-8 w-8 items-center justify-center self-end rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600 sm:h-9 sm:w-9 sm:self-auto"
                aria-label="Remove question"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-3 sm:p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Question prompt</p>
                <input
                  value={question.question}
                  onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, question: event.target.value }))}
                  className="mt-2 w-full rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-slate-400 sm:rounded-[18px] sm:py-3 sm:text-base"
                  placeholder="Question prompt"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Options</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={`${question.id}-${optionIndex}`} className="rounded-[16px] border border-slate-200/80 bg-white/88 px-3 py-2.5 sm:rounded-[18px]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Option {String.fromCharCode(65 + optionIndex)}</p>
                      <input
                        value={option}
                        onChange={(event) =>
                          updateQuestion(question.id, (current) => ({
                            ...current,
                            options: current.options.map((currentOption, index) => (index === optionIndex ? event.target.value : currentOption)),
                          }))
                        }
                        className="mt-1 w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Correct answer</p>
                  <input
                    value={question.answer}
                    onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, answer: event.target.value }))}
                    className={`mt-2 ${surfaceInputClassName}`}
                    placeholder="Correct answer"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Explanation</p>
                  <AutoGrowTextarea
                    value={question.explanation}
                    onChange={(value) => updateQuestion(question.id, (current) => ({ ...current, explanation: value }))}
                    className="mt-2 w-full rounded-[16px] border border-slate-200/80 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:rounded-[18px]"
                    minRows={3}
                    placeholder="Explain why this answer is correct."
                  />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
