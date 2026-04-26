import type { PlannerShareCategory, PlannerShareType } from "../../../lib/plannerPost";
import type { PlannerTaskType, StudyEntryMode } from "./types";
import { DEFAULT_PLANNER_SKILLS } from "./utils";

export interface TaskDraft {
  title: string;
  type: PlannerTaskType;
  progress: string;
  notes: string;
}

export interface TargetDraft {
  title: string;
  percent: string;
  notes: string;
}

export interface StudyDraft {
  skill: string;
  mode: StudyEntryMode;
  minutes: string;
  taskUnits: string;
  notes: string;
}

export interface ShareState {
  open: boolean;
  shareType: PlannerShareType;
  destination: "discussion" | "community";
  category: PlannerShareCategory;
  title: string;
  note: string;
  communityId: string;
  loading: boolean;
  submitting: boolean;
}

export type PlannerTab = "overview" | "tasks" | "study" | "targets" | "shared";

export function emptyTaskDraft(): TaskDraft {
  return {
    title: "",
    type: "study",
    progress: "0",
    notes: "",
  };
}

export function emptyTargetDraft(): TargetDraft {
  return {
    title: "",
    percent: "0",
    notes: "",
  };
}

export function emptyStudyDraft(): StudyDraft {
  return {
    skill: DEFAULT_PLANNER_SKILLS[0],
    mode: "time",
    minutes: "45",
    taskUnits: "1",
    notes: "",
  };
}

export function emptyShareState(): ShareState {
  return {
    open: false,
    shareType: "daily_summary",
    destination: "discussion",
    category: "study",
    title: "",
    note: "",
    communityId: "",
    loading: false,
    submitting: false,
  };
}

export function getDefaultShareCategory(): PlannerShareCategory {
  return "study";
}
