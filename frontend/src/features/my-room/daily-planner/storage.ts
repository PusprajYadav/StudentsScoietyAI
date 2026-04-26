import type { DailyPlannerData, DailyTarget, PlannerTask, SharedPlannerReport, StudyEntry } from "./types";

export const DAILY_PLANNER_STORAGE_KEY = "student-society:daily-planner:v1";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeTask(record: unknown): PlannerTask | null {
  if (!isPlainObject(record)) {
    return null;
  }

  if (
    !isString(record.id) ||
    !isString(record.date) ||
    !isString(record.title) ||
    !isString(record.createdAt) ||
    !isString(record.updatedAt)
  ) {
    return null;
  }

  return {
    id: record.id,
    date: record.date,
    title: record.title,
    type:
      record.type === "job_prep" || record.type === "personal" || record.type === "study"
        ? record.type
        : "study",
    progress: isNumber(record.progress) ? Math.min(100, Math.max(0, Math.round(record.progress))) : 0,
    completed: Boolean(record.completed),
    notes: isString(record.notes) ? record.notes : "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    completedAt: isString(record.completedAt) ? record.completedAt : null,
  };
}

function normalizeTarget(record: unknown): DailyTarget | null {
  if (!isPlainObject(record)) {
    return null;
  }

  if (
    !isString(record.id) ||
    !isString(record.date) ||
    !isString(record.title) ||
    !isString(record.createdAt) ||
    !isString(record.updatedAt)
  ) {
    return null;
  }

  return {
    id: record.id,
    date: record.date,
    title: record.title,
    percent: isNumber(record.percent) ? Math.min(100, Math.max(0, Math.round(record.percent))) : 0,
    notes: isString(record.notes) ? record.notes : "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeStudyEntry(record: unknown): StudyEntry | null {
  if (!isPlainObject(record)) {
    return null;
  }

  if (
    !isString(record.id) ||
    !isString(record.date) ||
    !isString(record.skill) ||
    !isString(record.createdAt) ||
    !isString(record.updatedAt)
  ) {
    return null;
  }

  return {
    id: record.id,
    date: record.date,
    skill: record.skill,
    mode: record.mode === "tasks" ? "tasks" : "time",
    minutes: isNumber(record.minutes) ? Math.max(0, Math.round(record.minutes)) : null,
    taskUnits: isNumber(record.taskUnits) ? Math.max(0, Math.round(record.taskUnits)) : null,
    notes: isString(record.notes) ? record.notes : "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeSharedReport(record: unknown): SharedPlannerReport | null {
  if (!isPlainObject(record)) {
    return null;
  }

  if (
    !isString(record.id) ||
    !isString(record.date) ||
    !isString(record.title) ||
    !isString(record.sharedAt)
  ) {
    return null;
  }

  return {
    id: record.id,
    date: record.date,
    title: record.title,
    category:
      record.category === "job"
        ? "job"
        : record.category === "anonymous"
          ? "anonymous"
          : record.category === "discussion"
            ? "job"
            : "study",
    shareType:
      record.shareType === "study_log" || record.shareType === "task_update"
        ? record.shareType
        : "daily_summary",
    destination: record.destination === "community" ? "community" : "discussion",
    communityId: isString(record.communityId) ? record.communityId : null,
    sharedAt: record.sharedAt,
  };
}

export function createEmptyDailyPlannerData(): DailyPlannerData {
  return {
    version: 1,
    tasks: [],
    targets: [],
    studyEntries: [],
    sharedReports: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export function normalizeDailyPlannerData(candidate: unknown): DailyPlannerData {
  if (!isPlainObject(candidate)) {
    return createEmptyDailyPlannerData();
  }

  const tasks = Array.isArray(candidate.tasks) ? candidate.tasks.map(normalizeTask).filter(Boolean) as PlannerTask[] : [];
  const targets = Array.isArray(candidate.targets)
    ? candidate.targets.map(normalizeTarget).filter(Boolean) as DailyTarget[]
    : [];
  const studyEntries = Array.isArray(candidate.studyEntries)
    ? candidate.studyEntries.map(normalizeStudyEntry).filter(Boolean) as StudyEntry[]
    : [];
  const sharedReports = Array.isArray(candidate.sharedReports)
    ? candidate.sharedReports.map(normalizeSharedReport).filter(Boolean) as SharedPlannerReport[]
    : [];

  return {
    version: 1,
    tasks,
    targets,
    studyEntries,
    sharedReports,
    updatedAt: isString(candidate.updatedAt) ? candidate.updatedAt : new Date().toISOString(),
  };
}

export function loadDailyPlannerData() {
  if (typeof window === "undefined") {
    return createEmptyDailyPlannerData();
  }

  try {
    const stored = window.localStorage.getItem(DAILY_PLANNER_STORAGE_KEY);
    if (!stored) {
      return createEmptyDailyPlannerData();
    }

    return normalizeDailyPlannerData(JSON.parse(stored) as unknown);
  } catch {
    return createEmptyDailyPlannerData();
  }
}

export function saveDailyPlannerData(data: DailyPlannerData) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DAILY_PLANNER_STORAGE_KEY,
    JSON.stringify({
      ...data,
      version: 1,
      updatedAt: new Date().toISOString(),
    } satisfies DailyPlannerData)
  );
}
