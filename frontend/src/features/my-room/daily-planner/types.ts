import type { PlannerShareCategory, PlannerShareType } from "../../../lib/plannerPost";

export type PlannerTaskType = "study" | "job_prep" | "personal";
export type StudyEntryMode = "time" | "tasks";

export interface PlannerTask {
  id: string;
  date: string;
  title: string;
  type: PlannerTaskType;
  progress: number;
  completed: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface DailyTarget {
  id: string;
  date: string;
  title: string;
  percent: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyEntry {
  id: string;
  date: string;
  skill: string;
  mode: StudyEntryMode;
  minutes: number | null;
  taskUnits: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedPlannerReport {
  id: string;
  date: string;
  title: string;
  category: PlannerShareCategory;
  shareType: PlannerShareType;
  destination: "discussion" | "community";
  communityId: string | null;
  sharedAt: string;
}

export interface DailyPlannerData {
  version: 1;
  tasks: PlannerTask[];
  targets: DailyTarget[];
  studyEntries: StudyEntry[];
  sharedReports: SharedPlannerReport[];
  updatedAt: string;
}
