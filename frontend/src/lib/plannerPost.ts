import type { DiscussionKind } from "../types/database";

export type PlannerShareCategory = "study" | "job" | "anonymous";
export type PlannerShareType = "daily_summary" | "study_log" | "task_update";

const PLANNER_TAG_PREFIX = "sys-planner";
const PLANNER_REPORT_TAG = `${PLANNER_TAG_PREFIX}-report`;
const PLANNER_LOCKED_TAG = `${PLANNER_TAG_PREFIX}-locked`;
const PLANNER_APP_TAG = `${PLANNER_TAG_PREFIX}-daily-planner`;

function buildCategoryTag(category: PlannerShareCategory) {
  return `${PLANNER_TAG_PREFIX}-category-${category}`;
}

function buildTypeTag(type: PlannerShareType) {
  return `${PLANNER_TAG_PREFIX}-type-${type}`;
}

export function isPlannerSystemTag(tag: string) {
  return tag.startsWith(PLANNER_TAG_PREFIX);
}

export function getVisiblePostTags(tags: string[]) {
  return tags.filter((tag) => !isPlannerSystemTag(tag));
}

export function getPlannerReportTags(input: {
  category: PlannerShareCategory;
  shareType: PlannerShareType;
}) {
  return [
    PLANNER_APP_TAG,
    PLANNER_REPORT_TAG,
    PLANNER_LOCKED_TAG,
    buildCategoryTag(input.category),
    buildTypeTag(input.shareType),
  ];
}

export function isPlannerReportPost(tags: string[]) {
  return tags.includes(PLANNER_REPORT_TAG);
}

export function isPlannerLockedPost(tags: string[]) {
  return tags.includes(PLANNER_LOCKED_TAG);
}

export function getPlannerShareCategoryFromTags(tags: string[]): PlannerShareCategory | null {
  if (tags.includes(buildCategoryTag("study"))) {
    return "study";
  }

  if (tags.includes(buildCategoryTag("job"))) {
    return "job";
  }

  if (tags.includes(`${PLANNER_TAG_PREFIX}-category-discussion`)) {
    return "job";
  }

  if (tags.includes(buildCategoryTag("anonymous"))) {
    return "anonymous";
  }

  return null;
}

export function getPlannerShareTypeFromTags(tags: string[]): PlannerShareType | null {
  if (tags.includes(buildTypeTag("daily_summary"))) {
    return "daily_summary";
  }

  if (tags.includes(buildTypeTag("study_log"))) {
    return "study_log";
  }

  if (tags.includes(buildTypeTag("task_update"))) {
    return "task_update";
  }

  return null;
}

export function getPlannerShareTypeLabel(type: PlannerShareType) {
  if (type === "study_log") {
    return "Study log";
  }

  if (type === "task_update") {
    return "Task update";
  }

  return "Day report";
}

export function getPlannerShareCategoryLabel(category: PlannerShareCategory) {
  if (category === "study") {
    return "Study";
  }

  if (category === "job") {
    return "Job";
  }

  return "Anonymous";
}

export function getPlannerShareLabel(tags: string[]) {
  const category = getPlannerShareCategoryFromTags(tags);
  return category ? getPlannerShareCategoryLabel(category) : null;
}

export function mapPlannerShareCategoryToDiscussionKind(category: PlannerShareCategory): DiscussionKind {
  if (category === "study") {
    return "study";
  }

  if (category === "job") {
    return "job";
  }

  return "anonymous";
}

export function buildPlannerSharedPostContent(input: {
  note?: string;
  snapshot: string;
}) {
  const note = input.note?.trim();
  const sections = [];

  if (note) {
    sections.push(note);
  }

  sections.push("Daily Planner Snapshot");
  sections.push(input.snapshot.trim());

  return sections.join("\n\n");
}
