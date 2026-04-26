import type { BugFixLanguage } from "../types/database";

export type Judge0LanguageKey =
  | BugFixLanguage
  | "typescript"
  | "go"
  | "rust";

interface Judge0RawLanguage {
  id: number;
  name: string;
}

interface Judge0SubmissionCreateResponse {
  token: string;
}

interface Judge0SubmissionStatus {
  id: number;
  description: string;
}

interface Judge0SubmissionResponse {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status?: Judge0SubmissionStatus | null;
  token?: string;
  language_id?: number;
}

export interface Judge0LanguageOption {
  key: Judge0LanguageKey;
  label: string;
  languageId: number;
  versionName: string;
}

export interface Judge0ExecutionResult {
  token: string;
  languageId: number;
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  statusId: number;
  statusDescription: string;
}

const judge0BaseUrl = (import.meta.env.VITE_JUDGE0_BASE_URL || "https://ce.judge0.com").replace(/\/$/, "");
const judge0AuthToken = import.meta.env.VITE_JUDGE0_AUTH_TOKEN?.trim() || "";
const judge0AuthUser = import.meta.env.VITE_JUDGE0_AUTH_USER?.trim() || "";

const LANGUAGE_LABELS: Record<Judge0LanguageKey, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  csharp: "C#",
  c: "C",
  ruby: "Ruby",
  php: "PHP",
  html: "HTML",
  css: "CSS",
  go: "Go",
  rust: "Rust",
};

const LANGUAGE_MATCHERS: Partial<Record<Judge0LanguageKey, RegExp>> = {
  javascript: /^JavaScript \(/i,
  typescript: /^TypeScript \(/i,
  python: /^Python \((?!2\.)/i,
  java: /^Java \(/i,
  cpp: /^C\+\+ \(/i,
  csharp: /^C# \(/i,
  c: /^C \(/i,
  ruby: /^Ruby \(/i,
  php: /^PHP \(/i,
  go: /^Go \(/i,
  rust: /^Rust \(/i,
};

const EXECUTABLE_LANGUAGES = new Set<Judge0LanguageKey>([
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "csharp",
  "c",
  "ruby",
  "php",
  "go",
  "rust",
]);

function judge0Headers(extra?: Record<string, string>) {
  const headers: Record<string, string> = {
    ...extra,
  };

  if (judge0AuthToken) {
    headers["X-Auth-Token"] = judge0AuthToken;
  }

  if (judge0AuthUser) {
    headers["X-Auth-User"] = judge0AuthUser;
  }

  return headers;
}

function parseVersionParts(name: string) {
  const match = name.match(/\(([^)]+)\)/);
  const source = match ? match[1] : name;
  return source
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((part) => Number(part));
}

function compareVersions(left: string, right: string) {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;

    if (leftValue !== rightValue) {
      return rightValue - leftValue;
    }
  }

  return right.localeCompare(left);
}

function normalizeExecutionText(value?: string | null) {
  return (value || "").replace(/\r/g, "").trim();
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Judge0 request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload;
}

export function isJudge0ExecutableLanguage(language: Judge0LanguageKey) {
  return EXECUTABLE_LANGUAGES.has(language);
}

export async function fetchJudge0LanguageOptions() {
  const response = await fetch(`${judge0BaseUrl}/languages`, {
    headers: judge0Headers(),
  });

  const languages = await readJsonOrThrow<Judge0RawLanguage[]>(response);
  const options = (Object.keys(LANGUAGE_LABELS) as Judge0LanguageKey[])
    .filter((key) => isJudge0ExecutableLanguage(key))
    .map((key) => {
      const matcher = LANGUAGE_MATCHERS[key];
      const matches = languages
        .filter((entry) => (matcher ? matcher.test(entry.name) : false))
        .sort((left, right) => compareVersions(left.name, right.name));
      const selected = matches[0];

      if (!selected) {
        return null;
      }

      return {
        key,
        label: LANGUAGE_LABELS[key],
        languageId: selected.id,
        versionName: selected.name,
      } satisfies Judge0LanguageOption;
    })
    .filter((entry): entry is Judge0LanguageOption => Boolean(entry));

  return options;
}

export async function executeJudge0Submission(input: {
  languageId: number;
  sourceCode: string;
  stdin?: string;
  timeoutMs?: number;
}) {
  const createResponse = await fetch(`${judge0BaseUrl}/submissions/?base64_encoded=false&wait=false`, {
    method: "POST",
    headers: judge0Headers({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      source_code: input.sourceCode,
      language_id: input.languageId,
      stdin: input.stdin || "",
    }),
  });

  const created = await readJsonOrThrow<Judge0SubmissionCreateResponse>(createResponse);
  const token = created.token;

  if (!token) {
    throw new Error("Judge0 did not return a submission token.");
  }

  const startedAt = Date.now();
  const timeoutMs = input.timeoutMs ?? 20000;

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, 850));

    const resultResponse = await fetch(
      `${judge0BaseUrl}/submissions/${encodeURIComponent(
        token
      )}?base64_encoded=false&fields=stdout,stderr,compile_output,message,status,language_id,token`,
      {
        headers: judge0Headers(),
      }
    );

    const result = await readJsonOrThrow<Judge0SubmissionResponse>(resultResponse);
    const statusId = result.status?.id ?? 0;

    if (statusId === 1 || statusId === 2) {
      continue;
    }

    return {
      token: result.token || token,
      languageId: result.language_id || input.languageId,
      stdout: normalizeExecutionText(result.stdout),
      stderr: normalizeExecutionText(result.stderr),
      compileOutput: normalizeExecutionText(result.compile_output),
      message: normalizeExecutionText(result.message),
      statusId,
      statusDescription: result.status?.description || "Unknown",
    } satisfies Judge0ExecutionResult;
  }

  throw new Error("Judge0 timed out while waiting for execution.");
}

export function formatJudge0ExecutionResult(result: Judge0ExecutionResult) {
  const sections = [
    result.compileOutput ? `Compile Output\n${result.compileOutput}` : null,
    result.stdout ? `Stdout\n${result.stdout}` : null,
    result.stderr ? `Stderr\n${result.stderr}` : null,
    result.message ? `Message\n${result.message}` : null,
    `Status\n${result.statusDescription}`,
  ].filter(Boolean);

  return sections.join("\n\n");
}

export function executionResultsMatch(left: Judge0ExecutionResult, right: Judge0ExecutionResult) {
  return (
    left.statusId === right.statusId &&
    left.statusDescription === right.statusDescription &&
    left.stdout === right.stdout &&
    left.stderr === right.stderr &&
    left.compileOutput === right.compileOutput &&
    left.message === right.message
  );
}
