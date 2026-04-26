import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Download,
  Lock,
  Plus,
  Share2,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent, type Dispatch, type RefObject, type SetStateAction } from "react";
import { getPlannerShareCategoryLabel, type PlannerShareCategory } from "../../../../lib/plannerPost";
import type { CommunityRow } from "../../../../types/database";
import type { DailyTarget, PlannerTask, StudyEntry, StudyEntryMode } from "../types";
import {
  DEFAULT_PLANNER_SKILLS,
  canEditDatedEntry,
  canEditPlannerTask,
  clampPercent,
  formatMinutes,
  getTaskTypeLabel,
  getTaskTypeTone,
} from "../utils";
import type { ShareState, StudyDraft, TargetDraft, TaskDraft } from "../viewModels";
import { EmptyMessage, ProgressBar, SectionCard, SharedReportsList } from "./plannerUi";

function getTargetProgressMeta(percent: number) {
  if (percent >= 100) {
    return {
      label: "Done",
      helper: "Target completed",
      tone: "bg-emerald-500/12 text-emerald-700",
    };
  }

  if (percent <= 0) {
    return {
      label: "Not started",
      helper: "No progress yet",
      tone: "bg-app-secondary text-app-muted",
    };
  }

  return {
    label: `${percent}%`,
    helper: "In progress",
    tone: "bg-brand/10 text-brand",
  };
}

function getTargetCardClassName(percent: number) {
  if (percent >= 100) {
    return "bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.88))] border-emerald-100/90";
  }

  if (percent <= 0) {
    return "bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.88))] border-slate-200/90";
  }

  return "bg-[linear-gradient(180deg,rgba(245,243,255,0.96),rgba(255,255,255,0.88))] border-violet-100/90";
}

function getStudyCardClassName(entry: StudyEntry) {
  return entry.mode === "tasks"
    ? "bg-[linear-gradient(180deg,rgba(245,243,255,0.96),rgba(255,255,255,0.88))] border-violet-100/90"
    : "bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.88))] border-sky-100/90";
}

function getTaskCardClassName(task: PlannerTask) {
  if (task.completed) {
    return "bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.88))] border-emerald-100/90";
  }

  if (task.type === "job_prep") {
    return "bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.88))] border-amber-100/90";
  }

  if (task.type === "personal") {
    return "bg-[linear-gradient(180deg,rgba(240,253,244,0.96),rgba(255,255,255,0.88))] border-green-100/90";
  }

  return "bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.88))] border-sky-100/90";
}

function TargetProgressCard({
  target,
  editable,
  onStartEdit,
  onDelete,
  onUpdatePercent,
}: {
  target: DailyTarget;
  editable: boolean;
  onStartEdit: (target: DailyTarget) => void;
  onDelete: (target: DailyTarget) => void;
  onUpdatePercent: (target: DailyTarget, nextPercent: number) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [draftPercent, setDraftPercent] = useState(`${target.percent}`);
  const progressMeta = getTargetProgressMeta(target.percent);

  useEffect(() => {
    setDraftPercent(`${target.percent}`);
  }, [target.id, target.percent]);

  return (
    <article className={`tracker-panel-soft border p-3 ${getTargetCardClassName(target.percent)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-app-text">{target.title}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${progressMeta.tone}`}>
              {progressMeta.label}
            </span>
            {!editable ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-app-secondary px-2 py-0.5 text-[10px] font-semibold text-app-muted">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-sm font-semibold text-app-text">{target.percent}%</p>
      </div>

      <div className="mt-3">
        <ProgressBar value={target.percent} tone="emerald" />
      </div>

      {editable && isUpdating ? (
        <div className="tracker-panel-soft mt-3 p-3">
          <div className="flex items-center justify-end gap-2 text-[11px] font-medium text-app-muted">
            <span>{clampPercent(Number(draftPercent))}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={draftPercent}
            onChange={(event) => setDraftPercent(event.target.value)}
            className="tracker-range mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-brand/15"
          />
          <div className="mt-2 flex items-center gap-2">
            <input
              value={draftPercent}
              onChange={(event) => setDraftPercent(event.target.value)}
              inputMode="numeric"
              className="input-field h-10 flex-1 px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => onUpdatePercent(target, clampPercent(Number(draftPercent)))}
              className="btn-primary px-3 py-2 text-xs"
            >
              Update
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onUpdatePercent(target, 100)} className="tracker-action-ghost !px-3 !py-2 text-xs">
              Mark done
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftPercent(`${target.percent}`);
                setIsUpdating(false);
              }}
              className="tracker-action-ghost !px-3 !py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editable ? (
          <button type="button" onClick={() => setIsUpdating((current) => !current)} className="tracker-action-ghost !px-3 !py-2 text-xs">
            {isUpdating ? "Hide update" : "Update"}
          </button>
        ) : null}
        <button type="button" onClick={() => onStartEdit(target)} className="tracker-action-ghost !px-3 !py-2 text-xs" disabled={!editable}>
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(target)}
          className="tracker-danger-ghost text-xs"
          disabled={!editable}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </article>
  );
}

function StudyEntryCard({
  entry,
  editable,
  onStartEdit,
  onDelete,
  onUpdateValue,
}: {
  entry: StudyEntry;
  editable: boolean;
  onStartEdit: (entry: StudyEntry) => void;
  onDelete: (entry: StudyEntry) => void;
  onUpdateValue: (entry: StudyEntry, nextValue: number) => void;
}) {
  const currentValue = entry.mode === "tasks" ? entry.taskUnits || 0 : entry.minutes || 0;
  const [isUpdating, setIsUpdating] = useState(false);
  const [draftValue, setDraftValue] = useState(`${currentValue}`);

  useEffect(() => {
    setDraftValue(`${currentValue}`);
  }, [currentValue, entry.id]);

  const quickIncrements = entry.mode === "tasks" ? [1, 3, 5] : [15, 30, 60];

  return (
    <article className={`tracker-panel-soft border p-3 ${getStudyCardClassName(entry)}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-app-text">{entry.skill}</p>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
              {entry.mode === "tasks" ? "Task based" : "Time based"}
            </span>
            {!editable ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-app-secondary px-2 py-0.5 text-[10px] font-semibold text-app-muted">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-app-muted">
            {entry.mode === "tasks"
              ? `${entry.taskUnits || 0} study tasks completed`
              : `${formatMinutes(entry.minutes || 0)} logged`}
          </p>
        </div>
      </div>

      {editable && isUpdating ? (
        <div className="tracker-panel-soft mt-3 p-3">
          <div className="mt-2 flex items-center gap-2">
            <input
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              inputMode="numeric"
              className="input-field h-10 flex-1 px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => onUpdateValue(entry, Math.max(0, Math.round(Number(draftValue) || 0)))}
              className="btn-primary px-3 py-2 text-xs"
            >
              Update
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {quickIncrements.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() =>
                  setDraftValue((current) => `${Math.max(0, Math.round(Number(current) || 0) + amount)}`)
                }
                className="tracker-action-ghost !px-3 !py-2 text-xs"
              >
                {entry.mode === "tasks" ? `+${amount} tasks` : `+${amount}m`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setDraftValue(`${currentValue}`);
                setIsUpdating(false);
              }}
              className="tracker-action-ghost !px-3 !py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editable ? (
          <button type="button" onClick={() => setIsUpdating((current) => !current)} className="tracker-action-ghost !px-3 !py-2 text-xs">
            {isUpdating ? "Hide update" : "Update"}
          </button>
        ) : null}
        <button type="button" onClick={() => onStartEdit(entry)} className="tracker-action-ghost !px-3 !py-2 text-xs" disabled={!editable}>
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry)}
          className="tracker-danger-ghost text-xs"
          disabled={!editable}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </article>
  );
}

export function PlannerTasksSection({
  taskDraft,
  setTaskDraft,
  editingTaskId,
  selectedDateIsPast,
  tasksForDay,
  todayKey,
  onSubmit,
  onReset,
  onToggleComplete,
  onStartEdit,
  onDelete,
  onStartNewTask,
}: {
  taskDraft: TaskDraft;
  setTaskDraft: Dispatch<SetStateAction<TaskDraft>>;
  editingTaskId: string | null;
  selectedDateIsPast: boolean;
  tasksForDay: PlannerTask[];
  todayKey: string;
  onSubmit: () => void;
  onReset: () => void;
  onToggleComplete: (task: PlannerTask) => void;
  onStartEdit: (task: PlannerTask) => void;
  onDelete: (task: PlannerTask) => void;
  onStartNewTask: () => void;
}) {
  return (
    <SectionCard
      title="Daily tasks"
      description="Create tasks for today or future dates, track progress, and keep the workflow focused in one compact list."
      right={
        <button type="button" onClick={onStartNewTask} className="tracker-action-ghost text-xs">
          <Plus className="h-4 w-4" />
          New
        </button>
      }
    >
      <div className="space-y-3">
        <div className="tracker-panel-soft p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              Title
              <input
                value={taskDraft.title}
                onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                className="input-field"
                placeholder="Task"
                disabled={selectedDateIsPast}
              />
            </label>
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              Type
              <select
                value={taskDraft.type}
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    type: event.target.value as TaskDraft["type"],
                  }))
                }
                className="input-field"
                disabled={selectedDateIsPast}
              >
                <option value="study">Study</option>
                <option value="job_prep">Job Prep</option>
                <option value="personal">Personal</option>
              </select>
            </label>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px]">
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              %
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={taskDraft.progress}
                onChange={(event) => setTaskDraft((current) => ({ ...current, progress: event.target.value }))}
                className="tracker-range h-2 w-full cursor-pointer appearance-none rounded-full bg-brand/15"
                disabled={selectedDateIsPast}
              />
            </label>
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              Value
              <input
                value={taskDraft.progress}
                onChange={(event) => setTaskDraft((current) => ({ ...current, progress: event.target.value }))}
                className="input-field"
                inputMode="numeric"
                disabled={selectedDateIsPast}
              />
            </label>
          </div>

          <label className="mt-2 grid gap-1 text-[11px] font-medium text-app-muted">
            Notes
            <textarea
              value={taskDraft.notes}
              onChange={(event) => setTaskDraft((current) => ({ ...current, notes: event.target.value }))}
              className="input-field min-h-[86px] resize-y"
              placeholder="Notes"
              disabled={selectedDateIsPast}
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onSubmit} className="btn-primary inline-flex items-center gap-2 !rounded-full" disabled={selectedDateIsPast}>
              <CheckCircle2 className="h-4 w-4" />
              {editingTaskId ? "Save" : "Add"}
            </button>
            {editingTaskId ? (
              <button type="button" onClick={onReset} className="tracker-action-ghost">
                Cancel
              </button>
            ) : null}
          </div>
        </div>

        {tasksForDay.length === 0 ? (
          <EmptyMessage message="No tasks" />
        ) : (
          <div className="space-y-2.5">
            {tasksForDay.map((task) => {
              const editable = canEditPlannerTask(task, todayKey);
              const isLockedToday = task.date === todayKey && task.completed;

              return (
                <article key={task.id} className={`tracker-panel-soft border p-3 ${getTaskCardClassName(task)}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-app-text">{task.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getTaskTypeTone(task.type)}`}>
                          {getTaskTypeLabel(task.type)}
                        </span>
                        {task.completed ? (
                          <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Completed
                          </span>
                        ) : null}
                        {!editable ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-app-secondary px-2 py-0.5 text-[10px] font-semibold text-app-muted">
                            <Lock className="h-3 w-3" />
                            {isLockedToday ? "Locked today" : "Past task"}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-app-text">{task.progress}%</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <ProgressBar value={task.progress} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => onToggleComplete(task)} className="tracker-action-ghost !px-3 !py-2 text-xs" disabled={!editable}>
                      {task.completed ? "Mark open" : "Mark complete"}
                    </button>
                    <button type="button" onClick={() => onStartEdit(task)} className="tracker-action-ghost !px-3 !py-2 text-xs" disabled={!editable}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(task)}
                      className="tracker-danger-ghost text-xs"
                      disabled={!editable}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function PlannerStudySection({
  studyDraft,
  setStudyDraft,
  editingStudyId,
  selectedDateIsPast,
  studyEntriesForDay,
  todayKey,
  availableSkills,
  skillBuckets,
  totalStudyMinutes,
  totalStudyTaskUnits,
  onSubmit,
  onReset,
  onStartEdit,
  onDelete,
  onUpdateValue,
}: {
  studyDraft: StudyDraft;
  setStudyDraft: Dispatch<SetStateAction<StudyDraft>>;
  editingStudyId: string | null;
  selectedDateIsPast: boolean;
  studyEntriesForDay: StudyEntry[];
  todayKey: string;
  availableSkills: string[];
  skillBuckets: Array<{ skill: string; sessions: number; minutes: number; taskUnits: number }>;
  totalStudyMinutes: number;
  totalStudyTaskUnits: number;
  onSubmit: () => void;
  onReset: () => void;
  onStartEdit: (entry: StudyEntry) => void;
  onDelete: (entry: StudyEntry) => void;
  onUpdateValue: (entry: StudyEntry, nextValue: number) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionCard
        title="Tracker"
        description="Log time-based or task-based study work, keep it skill-based, and review the day cleanly without extra share actions here."
      >
        <div className="space-y-3">
          <div className="tracker-panel-soft p-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px]">
              <label className="grid gap-1 text-[11px] font-medium text-app-muted">
                Skill
                <input
                  list="planner-skills"
                  value={studyDraft.skill}
                  onChange={(event) => setStudyDraft((current) => ({ ...current, skill: event.target.value }))}
                  className="input-field"
                  placeholder="Skill"
                  disabled={selectedDateIsPast}
                />
                <datalist id="planner-skills">
                  {availableSkills.map((skill) => (
                    <option key={skill} value={skill} />
                  ))}
                </datalist>
              </label>
              <label className="grid gap-1 text-[11px] font-medium text-app-muted">
                Mode
                <select
                  value={studyDraft.mode}
                  onChange={(event) =>
                    setStudyDraft((current) => ({
                      ...current,
                      mode: event.target.value as StudyEntryMode,
                    }))
                  }
                  className="input-field"
                  disabled={selectedDateIsPast}
                >
                  <option value="time">Time based</option>
                  <option value="tasks">Task based</option>
                </select>
              </label>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {studyDraft.mode === "time" ? (
                <label className="grid gap-1 text-[11px] font-medium text-app-muted">
                  Min
                  <input
                    value={studyDraft.minutes}
                    onChange={(event) => setStudyDraft((current) => ({ ...current, minutes: event.target.value }))}
                    className="input-field"
                    inputMode="numeric"
                    placeholder="0"
                    disabled={selectedDateIsPast}
                  />
                </label>
              ) : (
                <label className="grid gap-1 text-[11px] font-medium text-app-muted">
                  Units
                  <input
                    value={studyDraft.taskUnits}
                    onChange={(event) => setStudyDraft((current) => ({ ...current, taskUnits: event.target.value }))}
                    className="input-field"
                    inputMode="numeric"
                    placeholder="0"
                    disabled={selectedDateIsPast}
                  />
                </label>
              )}

              <label className="grid gap-1 text-[11px] font-medium text-app-muted">
                Notes
                <input
                  value={studyDraft.notes}
                  onChange={(event) => setStudyDraft((current) => ({ ...current, notes: event.target.value }))}
                  className="input-field"
                  placeholder="Notes"
                  disabled={selectedDateIsPast}
                />
              </label>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {DEFAULT_PLANNER_SKILLS.slice(0, 6).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setStudyDraft((current) => ({ ...current, skill }))}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                    studyDraft.skill === skill
                      ? "bg-brand text-white shadow-[0_16px_26px_-18px_rgba(37,99,235,0.72)]"
                      : "bg-white/80 text-app-muted hover:bg-white dark:bg-slate-950/60"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={onSubmit} className="btn-primary inline-flex items-center gap-2 !rounded-full" disabled={selectedDateIsPast}>
                <BookOpenCheck className="h-4 w-4" />
                {editingStudyId ? "Save" : "Add"}
              </button>
              {editingStudyId ? (
                <button type="button" onClick={onReset} className="tracker-action-ghost">
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          {studyEntriesForDay.length === 0 ? (
            <EmptyMessage message="No study" />
          ) : (
            <div className="space-y-2.5">
              {studyEntriesForDay.map((entry) => {
                const editable = canEditDatedEntry(entry, todayKey);

                return (
                  <StudyEntryCard
                    key={entry.id}
                    entry={entry}
                    editable={editable}
                    onStartEdit={onStartEdit}
                    onDelete={onDelete}
                    onUpdateValue={onUpdateValue}
                  />
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {skillBuckets.length > 0 ? (
        <SectionCard
          title="Activity"
          description="A compact view of which skills took the most time or task effort in the selected day."
        >
          <div className="space-y-2">
            {skillBuckets.map((bucket) => {
              const scoreBase = totalStudyMinutes + totalStudyTaskUnits * 15;
              const bucketScore = bucket.minutes + bucket.taskUnits * 15;
              const ratio = scoreBase > 0 ? (bucketScore / scoreBase) * 100 : 0;

              return (
                <div key={bucket.skill} className="tracker-panel-soft p-3">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-app-text">{bucket.skill}</span>
                    <span className="text-app-muted">
                      {bucket.minutes > 0 ? formatMinutes(bucket.minutes) : `${bucket.taskUnits} tasks`}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={ratio} tone="amber" />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

export function PlannerTargetsSection({
  targetDraft,
  setTargetDraft,
  editingTargetId,
  selectedDateIsPast,
  targetsForDay,
  todayKey,
  onSubmit,
  onReset,
  onStartEdit,
  onDelete,
  onUpdatePercent,
  onStartNewTarget,
}: {
  targetDraft: TargetDraft;
  setTargetDraft: Dispatch<SetStateAction<TargetDraft>>;
  editingTargetId: string | null;
  selectedDateIsPast: boolean;
  targetsForDay: DailyTarget[];
  todayKey: string;
  onSubmit: () => void;
  onReset: () => void;
  onStartEdit: (target: DailyTarget) => void;
  onDelete: (target: DailyTarget) => void;
  onUpdatePercent: (target: DailyTarget, nextPercent: number) => void;
  onStartNewTarget: () => void;
}) {
  return (
    <SectionCard
      title="Daily targets"
      description="Keep daily targets separate from tasks so you can track bigger outcome percentages more clearly."
      right={
        <button type="button" onClick={onStartNewTarget} className="tracker-action-ghost text-xs">
          <Plus className="h-4 w-4" />
          New
        </button>
      }
    >
      <div className="space-y-3">
        <div className="tracker-panel-soft p-3">
          <label className="grid gap-1 text-[11px] font-medium text-app-muted">
            Title
            <input
              value={targetDraft.title}
              onChange={(event) => setTargetDraft((current) => ({ ...current, title: event.target.value }))}
              className="input-field"
              placeholder="Target"
              disabled={selectedDateIsPast}
            />
          </label>

          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px]">
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              %
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={targetDraft.percent}
                onChange={(event) => setTargetDraft((current) => ({ ...current, percent: event.target.value }))}
                className="tracker-range h-2 w-full cursor-pointer appearance-none rounded-full bg-brand/15"
                disabled={selectedDateIsPast}
              />
            </label>
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              Value
              <input
                value={targetDraft.percent}
                onChange={(event) => setTargetDraft((current) => ({ ...current, percent: event.target.value }))}
                className="input-field"
                inputMode="numeric"
                disabled={selectedDateIsPast}
              />
            </label>
          </div>

          <label className="mt-2 grid gap-1 text-[11px] font-medium text-app-muted">
            Notes
            <textarea
              value={targetDraft.notes}
              onChange={(event) => setTargetDraft((current) => ({ ...current, notes: event.target.value }))}
              className="input-field min-h-[76px] resize-y"
              placeholder="Notes"
              disabled={selectedDateIsPast}
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onSubmit} className="btn-primary inline-flex items-center gap-2 !rounded-full" disabled={selectedDateIsPast}>
              <Target className="h-4 w-4" />
              {editingTargetId ? "Save" : "Add"}
            </button>
            {editingTargetId ? (
              <button type="button" onClick={onReset} className="tracker-action-ghost">
                Cancel
              </button>
            ) : null}
          </div>
        </div>

        {targetsForDay.length === 0 ? (
          <EmptyMessage message="No targets" />
        ) : (
          <div className="space-y-2.5">
            {targetsForDay.map((target) => {
              const editable = canEditDatedEntry(target, todayKey);

              return (
                <TargetProgressCard
                  key={target.id}
                  target={target}
                  editable={editable}
                  onStartEdit={onStartEdit}
                  onDelete={onDelete}
                  onUpdatePercent={onUpdatePercent}
                />
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function PlannerDaySection({
  overallPercent,
  completedTaskCount,
  activeSkillCount,
  taskPercent,
  targetPercent,
  dailySnapshot,
  recentSharedReports,
  onShare,
}: {
  overallPercent: number;
  completedTaskCount: number;
  activeSkillCount: number;
  taskPercent: number;
  targetPercent: number;
  dailySnapshot: string;
  recentSharedReports: Array<{
    id: string;
    date: string;
    title: string;
    category: PlannerShareCategory;
    shareType: "daily_summary" | "study_log" | "task_update";
    destination: "discussion" | "community";
    communityId: string | null;
    sharedAt: string;
  }>;
  onShare: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <SectionCard
        title="Day"
        description="A live snapshot of the selected day. This report is what gets locked inside planner report posts."
        right={
          <button type="button" onClick={onShare} className="tracker-action-ghost text-xs">
            <Share2 className="h-4 w-4" />
            Share
          </button>
        }
      >
        <div className="space-y-3">
          <div className="tracker-panel-soft p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Overall progress</p>
                <p className="mt-1 font-display text-[1.5rem] font-semibold tracking-tight text-app-text">
                  {overallPercent}%
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <span className="rounded-full bg-app-secondary px-2 py-1 text-[9px] font-semibold text-app-muted">
                  {completedTaskCount} done
                </span>
                <span className="rounded-full bg-app-secondary px-2 py-1 text-[9px] font-semibold text-app-muted">
                  {activeSkillCount} skills
                </span>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-app-muted">
                  <span>Task progress</span>
                  <span>{taskPercent}%</span>
                </div>
                <ProgressBar value={taskPercent} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-app-muted">
                  <span>Target progress</span>
                  <span>{targetPercent}%</span>
                </div>
                <ProgressBar value={targetPercent} tone="emerald" />
              </div>
            </div>
          </div>

          <details className="tracker-panel-soft p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-app-text">
              <CalendarDays className="h-4 w-4 text-brand" />
              Preview
            </summary>
            <pre className="tracker-dot-grid mt-3 overflow-x-auto whitespace-pre-wrap rounded-[18px] bg-white/70 p-3 text-[11px] leading-5 text-app-text dark:bg-slate-950/55">
              {dailySnapshot}
            </pre>
          </details>
        </div>
      </SectionCard>

      <SectionCard
        title="Shared"
        description="Planner day reports are shared as fixed snapshots so the report block cannot be edited later."
      >
        <SharedReportsList reports={recentSharedReports} />
      </SectionCard>
    </div>
  );
}

export function PlannerSharedSection({
  recentSharedReports,
  importInputRef,
  onExport,
  onImportChange,
}: {
  recentSharedReports: Array<{
    id: string;
    date: string;
    title: string;
    category: PlannerShareCategory;
    shareType: "daily_summary" | "study_log" | "task_update";
    destination: "discussion" | "community";
    communityId: string | null;
    sharedAt: string;
  }>;
  importInputRef: RefObject<HTMLInputElement>;
  onExport: () => void;
  onImportChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionCard
        title="Data"
        description="Export or import your full planner history across all days, including tasks, targets, tracker entries, and shared report records."
      >
        <div className="tracker-panel-soft p-3">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button type="button" onClick={onExport} className="tracker-action-ghost text-[11px]">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="tracker-action-ghost text-[11px]"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onImportChange}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Reports"
        description="Review the planner day reports you already published to the main feed or community feeds."
      >
        <SharedReportsList reports={recentSharedReports} />
      </SectionCard>
    </div>
  );
}

export function PlannerShareSheet({
  shareState,
  setShareState,
  joinedCommunities,
  allowedShareCategories,
  shareSnapshot,
  onClose,
  onSubmit,
}: {
  shareState: ShareState;
  setShareState: Dispatch<SetStateAction<ShareState>>;
  joinedCommunities: CommunityRow[];
  allowedShareCategories: PlannerShareCategory[];
  shareSnapshot: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!shareState.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center sm:p-6">
      <div className="tracker-shell native-sheet max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-[34px] p-4 sm:rounded-[32px] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Share</p>
            <h2 className="mt-1 font-display text-[1.2rem] font-semibold tracking-tight text-app-text sm:text-[1.4rem]">Day</h2>
          </div>
          <button type="button" onClick={onClose} className="tracker-action-ghost text-xs">
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[11px] font-medium text-app-muted">
            To
            <select
              value={shareState.destination}
              onChange={(event) =>
                setShareState((current) => ({
                  ...current,
                  destination: event.target.value as "discussion" | "community",
                }))
              }
              className="input-field"
              disabled={shareState.loading || shareState.submitting}
            >
              <option value="discussion">Main feed</option>
              <option value="community">Community</option>
            </select>
          </label>

          {shareState.destination === "community" ? (
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              Group
              <select
                value={shareState.communityId}
                onChange={(event) =>
                  setShareState((current) => ({
                    ...current,
                    communityId: event.target.value,
                  }))
                }
                className="input-field"
                disabled={shareState.loading || shareState.submitting || joinedCommunities.length === 0}
              >
                {joinedCommunities.length === 0 ? (
                  <option value="">Join a community first</option>
                ) : (
                  joinedCommunities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : (
            <label className="grid gap-1 text-[11px] font-medium text-app-muted">
              Type
              <select
                value={shareState.category}
                onChange={(event) =>
                  setShareState((current) => ({
                    ...current,
                    category: event.target.value as PlannerShareCategory,
                  }))
                }
                className="input-field"
                disabled={shareState.loading || shareState.submitting}
              >
                {allowedShareCategories.map((category) => (
                  <option key={category} value={category}>
                    {getPlannerShareCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {shareState.destination === "community" ? (
          <label className="mt-3 grid gap-1 text-[11px] font-medium text-app-muted">
            Type
            <select
              value={shareState.category}
              onChange={(event) =>
                setShareState((current) => ({
                  ...current,
                  category: event.target.value as PlannerShareCategory,
                }))
              }
              className="input-field"
              disabled={shareState.loading || shareState.submitting}
            >
              {allowedShareCategories.map((category) => (
                <option key={category} value={category}>
                  {getPlannerShareCategoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="mt-3 grid gap-1 text-[11px] font-medium text-app-muted">
          Title
          <input
            value={shareState.title}
            onChange={(event) =>
              setShareState((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            className="input-field"
            disabled={shareState.submitting}
          />
        </label>

        <label className="mt-3 grid gap-1 text-[11px] font-medium text-app-muted">
          Note
          <textarea
            value={shareState.note}
            onChange={(event) =>
              setShareState((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            className="input-field min-h-[100px] resize-y"
            placeholder="Note"
            disabled={shareState.submitting}
          />
        </label>

        <details className="tracker-panel-soft mt-3 p-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-app-text">
            <Lock className="h-4 w-4 text-brand" />
            Preview
          </summary>
          <pre className="tracker-dot-grid mt-3 overflow-x-auto whitespace-pre-wrap rounded-[18px] bg-white/70 p-3 text-[11px] leading-5 text-app-text dark:bg-slate-950/55">
            {shareSnapshot}
          </pre>
        </details>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {shareState.loading ? <span className="tracker-chip">Loading</span> : <span className="tracker-chip">Local</span>}
          <button
            type="button"
            onClick={onSubmit}
            className="btn-primary inline-flex items-center gap-2 !rounded-full"
            disabled={shareState.loading || shareState.submitting}
          >
            <Share2 className="h-4 w-4" />
            {shareState.submitting ? "Sharing" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
