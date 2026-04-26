import type { BugFixBattleHistoryRecord } from "./types";

const STORAGE_KEY = "student-society-bugfix-battle-history-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHistoryRecord(value: unknown): BugFixBattleHistoryRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
    roomId: typeof value.roomId === "string" ? value.roomId : "",
    roomTitle: typeof value.roomTitle === "string" ? value.roomTitle : "BugFix Arena",
    shareSlug: typeof value.shareSlug === "string" ? value.shareSlug : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    status: typeof value.status === "string" ? (value.status as BugFixBattleHistoryRecord["status"]) : "completed",
    participantCount: Number(value.participantCount) > 0 ? Number(value.participantCount) : 0,
    questionCount: Number(value.questionCount) > 0 ? Number(value.questionCount) : 0,
    rankPosition: Number(value.rankPosition) > 0 ? Number(value.rankPosition) : 1,
    score: Number(value.score) > 0 ? Number(value.score) : 0,
    correctCount: Number(value.correctCount) > 0 ? Number(value.correctCount) : 0,
    totalTimeMs: Number(value.totalTimeMs) > 0 ? Number(value.totalTimeMs) : 0,
    leaderboard: Array.isArray(value.leaderboard) ? (value.leaderboard as BugFixBattleHistoryRecord["leaderboard"]) : [],
    owner: isRecord(value.owner) ? (value.owner as BugFixBattleHistoryRecord["owner"]) : null,
  };
}

export function loadLocalBugFixBattleHistory() {
  if (typeof window === "undefined") {
    return [] as BugFixBattleHistoryRecord[];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown[];
    return parsed
      .map((entry) => normalizeHistoryRecord(entry))
      .filter((entry): entry is BugFixBattleHistoryRecord => Boolean(entry))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    return [];
  }
}

export function saveLocalBugFixBattleHistory(records: BugFixBattleHistoryRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 20)));
}

export function upsertLocalBugFixBattleHistory(record: BugFixBattleHistoryRecord) {
  const existing = loadLocalBugFixBattleHistory().filter((entry) => entry.id !== record.id && entry.roomId !== record.roomId);
  const next = [record, ...existing].slice(0, 20);
  saveLocalBugFixBattleHistory(next);
  return next;
}
