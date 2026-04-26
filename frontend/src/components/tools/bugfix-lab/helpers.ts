import type { BugFixDifficulty, BugFixLanguage } from "../../../types/database";
import type { AttemptResult, BugFixFilterOption } from "./types";

export const LANGUAGE_OPTIONS: Array<BugFixFilterOption<BugFixLanguage>> = [
  { value: "all", label: "All languages" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
];

export const DIFFICULTY_OPTIONS: Array<BugFixFilterOption<BugFixDifficulty>> = [
  { value: "all", label: "All levels" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function resolveMonacoLanguage(language: BugFixLanguage) {
  if (language === "cpp") {
    return "cpp";
  }

  if (language === "csharp") {
    return "csharp";
  }

  return language;
}

export function normalizeSource(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function shuffleQuestions<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

export function calculateAccuracy(attempts: AttemptResult[]) {
  return attempts.length > 0
    ? Math.round((attempts.filter((entry) => entry.result === "correct").length / attempts.length) * 100)
    : 0;
}

export function formatDurationLabel(totalMs: number) {
  const totalSeconds = Math.max(0, Math.round(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatCountdownLabel(totalMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function buildBugFixInviteLink(inviteCode: string) {
  const baseUrl =
    typeof window === "undefined"
      ? "https://studentsociety.in"
      : window.location.hostname.includes("localhost")
        ? "https://studentsociety.in"
        : window.location.origin;

  return `${baseUrl}/app/tools/bugfix-lab?room=${encodeURIComponent(inviteCode)}`;
}

export function buildPublicBugFixResultPath(shareSlug: string, username: string) {
  return `/app/tools/bugfix-lab/result/${shareSlug}/${username}`;
}

export function buildPublicBugFixResultUrl(shareSlug: string, username: string) {
  const path = buildPublicBugFixResultPath(shareSlug, username);

  if (typeof window === "undefined") {
    return `https://studentsociety.in${path}`;
  }

  const origin = window.location.hostname.includes("localhost") ? "https://studentsociety.in" : window.location.origin;
  return `${origin}${path}`;
}

export function parseBugFixResultShareSlug(linkUrl: string | null | undefined) {
  if (!linkUrl) {
    return null;
  }

  try {
    const parsed = new URL(linkUrl, typeof window === "undefined" ? "https://studentsociety.in" : window.location.origin);
    const match = parsed.pathname.match(/\/app\/tools\/bugfix-lab\/result\/([^/]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}
