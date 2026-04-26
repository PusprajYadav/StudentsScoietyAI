import type { PlannerTaskType, StudyEntry, DailyTarget, PlannerTask } from "./types";

export const DEFAULT_PLANNER_SKILLS = ["DSA", "React", "Aptitude", "System Design", "JavaScript", "Communication"];

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function getTodayDateKey() {
  return toDateKey(new Date());
}

export function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map((entry) => Number(entry));
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDaysToDateKey(value: string, days: number) {
  const next = parseDateKey(value);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
}

export function compareDateKeys(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function isPastDateKey(value: string, today = getTodayDateKey()) {
  return compareDateKeys(value, today) < 0;
}

export function isFutureDateKey(value: string, today = getTodayDateKey()) {
  return compareDateKeys(value, today) > 0;
}

export function formatPlannerDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseDateKey(value));
}

export function formatShortDateLabel(value: string) {
  const today = getTodayDateKey();
  if (value === today) {
    return "Today";
  }

  const tomorrow = addDaysToDateKey(today, 1);
  if (value === tomorrow) {
    return "Tomorrow";
  }

  const yesterday = addDaysToDateKey(today, -1);
  if (value === yesterday) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(parseDateKey(value));
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export function averagePercent(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return clampPercent(values.reduce((total, value) => total + value, 0) / values.length);
}

export function getTaskTypeLabel(type: PlannerTaskType) {
  if (type === "job_prep") {
    return "Job Prep";
  }

  if (type === "personal") {
    return "Personal";
  }

  return "Study";
}

export function getTaskTypeTone(type: PlannerTaskType) {
  if (type === "job_prep") {
    return "bg-amber-500/12 text-amber-700";
  }

  if (type === "personal") {
    return "bg-emerald-500/12 text-emerald-700";
  }

  return "bg-brand/10 text-brand";
}

export function canEditPlannerTask(task: PlannerTask, today = getTodayDateKey()) {
  if (isPastDateKey(task.date, today)) {
    return false;
  }

  if (task.date === today && task.completed) {
    return false;
  }

  return true;
}

export function canEditDatedEntry(entry: { date: string }, today = getTodayDateKey()) {
  return !isPastDateKey(entry.date, today);
}

export function sortByNewestDate<T extends { date: string; createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function sortByCreatedAt<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function formatMinutes(minutes: number) {
  if (minutes <= 0) {
    return "0m";
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder}m`;
  }

  if (remainder === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}

export function summarizeSkillBuckets(entries: StudyEntry[]) {
  const buckets = new Map<string, { skill: string; sessions: number; minutes: number; taskUnits: number }>();

  entries.forEach((entry) => {
    const current = buckets.get(entry.skill) || {
      skill: entry.skill,
      sessions: 0,
      minutes: 0,
      taskUnits: 0,
    };

    current.sessions += 1;
    current.minutes += entry.minutes || 0;
    current.taskUnits += entry.taskUnits || 0;
    buckets.set(entry.skill, current);
  });

  return Array.from(buckets.values()).sort((left, right) => {
    const leftScore = left.minutes + left.taskUnits * 15;
    const rightScore = right.minutes + right.taskUnits * 15;
    return rightScore - leftScore;
  });
}

export function buildDailySnapshot(input: {
  date: string;
  tasks: PlannerTask[];
  targets: DailyTarget[];
  studyEntries: StudyEntry[];
  overallPercent: number;
  taskPercent: number;
  targetPercent: number;
}) {
  const taskLines =
    input.tasks.length === 0
      ? ["No tasks planned yet."]
      : input.tasks.map(
          (task) =>
            `- ${task.title} [${getTaskTypeLabel(task.type)}] ${task.progress}%${task.completed ? " completed" : ""}`
        );

  const targetLines =
    input.targets.length === 0
      ? ["No daily targets yet."]
      : input.targets.map((target) => `- ${target.title} ${target.percent}%`);

  const studyLines =
    input.studyEntries.length === 0
      ? ["No study sessions logged yet."]
      : input.studyEntries.map((entry) => {
          const amount = entry.mode === "tasks" ? `${entry.taskUnits || 0} tasks` : formatMinutes(entry.minutes || 0);
          return `- ${entry.skill}: ${amount}${entry.notes ? ` (${entry.notes})` : ""}`;
        });

  return [
    `Date: ${formatPlannerDate(input.date)}`,
    `Overall progress: ${input.overallPercent}%`,
    `Task progress: ${input.taskPercent}%`,
    `Target progress: ${input.targetPercent}%`,
    "",
    "Tasks",
    ...taskLines,
    "",
    "Targets",
    ...targetLines,
    "",
    "Study log",
    ...studyLines,
  ].join("\n");
}

export function buildTaskSnapshot(input: {
  date: string;
  tasks: PlannerTask[];
  taskPercent: number;
}) {
  const completedCount = input.tasks.filter((task) => task.completed).length;
  const taskLines =
    input.tasks.length === 0
      ? ["No tasks planned yet."]
      : input.tasks.map(
          (task) =>
            `- ${task.title} [${getTaskTypeLabel(task.type)}] ${task.progress}%${task.completed ? " completed" : ""}`
        );

  return [
    `Date: ${formatPlannerDate(input.date)}`,
    `Task progress: ${input.taskPercent}%`,
    `Completed tasks: ${completedCount}/${input.tasks.length}`,
    "",
    "Task list",
    ...taskLines,
  ].join("\n");
}

export function buildStudyLogSnapshot(input: {
  date: string;
  studyEntries: StudyEntry[];
}) {
  const skillSummary = summarizeSkillBuckets(input.studyEntries);
  const lines =
    input.studyEntries.length === 0
      ? ["No study sessions logged yet."]
      : input.studyEntries.map((entry) => {
          const amount = entry.mode === "tasks" ? `${entry.taskUnits || 0} tasks` : formatMinutes(entry.minutes || 0);
          return `- ${entry.skill}: ${amount}${entry.notes ? ` (${entry.notes})` : ""}`;
        });

  const summaryLines =
    skillSummary.length === 0
      ? ["No skill activity yet."]
      : skillSummary.map((bucket) => {
          const parts = [];

          if (bucket.minutes > 0) {
            parts.push(formatMinutes(bucket.minutes));
          }

          if (bucket.taskUnits > 0) {
            parts.push(`${bucket.taskUnits} tasks`);
          }

          return `- ${bucket.skill}: ${parts.join(" • ")} across ${bucket.sessions} session${bucket.sessions === 1 ? "" : "s"}`;
        });

  return [
    `Date: ${formatPlannerDate(input.date)}`,
    "",
    "Study sessions",
    ...lines,
    "",
    "Skill summary",
    ...summaryLines,
  ].join("\n");
}
