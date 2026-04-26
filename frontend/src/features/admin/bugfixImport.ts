import type { SaveBugFixQuestionInput } from "../../lib/bugfixApi";
import type {
  BugFixDifficulty,
  BugFixLanguage,
  BugFixQuestionStatus,
} from "../../types/database";

const LANGUAGE_OPTIONS: BugFixLanguage[] = [
  "javascript",
  "python",
  "java",
  "cpp",
  "csharp",
  "c",
  "ruby",
  "php",
  "html",
  "css",
];

const DIFFICULTY_OPTIONS: BugFixDifficulty[] = ["easy", "medium", "hard"];
const STATUS_OPTIONS: BugFixQuestionStatus[] = ["draft", "published", "archived"];

export type ImportableBugFixQuestionInput = Omit<SaveBugFixQuestionInput, "pdfFile" | "removePdf">;

export interface BugFixImportFailure {
  label: string;
  message: string;
}

export interface BugFixImportExecutionResult {
  importedCount: number;
  failures: BugFixImportFailure[];
}

export interface BugFixImportParseResult {
  questions: ImportableBugFixQuestionInput[];
  skippedFiles: BugFixImportFailure[];
  importedFileCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredText(
  record: Record<string, unknown>,
  field: string,
  label: string,
  fallbackField?: string
) {
  const value = record[field] ?? (fallbackField ? record[fallbackField] : undefined);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

function readOptionalText(record: Record<string, unknown>, field: string, fallbackField?: string) {
  const value = record[field] ?? (fallbackField ? record[fallbackField] : undefined);
  return typeof value === "string" ? value : "";
}

function readLanguage(record: Record<string, unknown>) {
  const value = String(record.language ?? "").trim().toLowerCase() as BugFixLanguage;

  if (!LANGUAGE_OPTIONS.includes(value)) {
    throw new Error("Language is missing or unsupported.");
  }

  return value;
}

function readDifficulty(record: Record<string, unknown>) {
  const value = String(record.difficulty ?? "easy").trim().toLowerCase() as BugFixDifficulty;

  if (!DIFFICULTY_OPTIONS.includes(value)) {
    throw new Error("Difficulty must be easy, medium, or hard.");
  }

  return value;
}

function readStatus(record: Record<string, unknown>) {
  const value = String(record.status ?? "draft").trim().toLowerCase() as BugFixQuestionStatus;

  if (!STATUS_OPTIONS.includes(value)) {
    throw new Error("Status must be draft, published, or archived.");
  }

  return value;
}

function readNumberField(
  record: Record<string, unknown>,
  field: string,
  label: string,
  fallbackField: string | undefined,
  fallbackValue: number,
  min: number,
  max: number
) {
  const value = record[field] ?? (fallbackField ? record[fallbackField] : undefined) ?? fallbackValue;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }

  return Math.floor(parsed);
}

function readTags(record: Record<string, unknown>) {
  const value = record.tags;

  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean))
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    );
  }

  return [];
}

function normalizeQuestionRecord(record: unknown): ImportableBugFixQuestionInput {
  if (!isRecord(record)) {
    throw new Error("Question entry must be an object.");
  }

  const title = readRequiredText(record, "title", "Title").trim();
  const prompt = readRequiredText(record, "prompt", "Prompt").trim();
  const brokenCode = readRequiredText(record, "brokenCode", "Broken code", "broken_code");
  const solutionCode = readRequiredText(record, "solutionCode", "Solution code", "solution_code");
  const idValue = record.id;
  const id = typeof idValue === "string" && idValue.trim() ? idValue.trim() : undefined;

  return {
    ...(id ? { id } : {}),
    title,
    language: readLanguage(record),
    difficulty: readDifficulty(record),
    prompt,
    brokenCode,
    solutionCode,
    hint: readOptionalText(record, "hint") || null,
    explanation: readOptionalText(record, "explanation") || null,
    tags: readTags(record),
    timeLimitSeconds: readNumberField(
      record,
      "timeLimitSeconds",
      "Time limit",
      "time_limit_seconds",
      90,
      15,
      1800
    ),
    points: readNumberField(record, "points", "Points", undefined, 100, 10, 5000),
    status: readStatus(record),
  };
}

function normalizePayload(payload: unknown): ImportableBugFixQuestionInput[] {
  if (Array.isArray(payload)) {
    return payload.map((entry) => normalizeQuestionRecord(entry));
  }

  if (!isRecord(payload)) {
    throw new Error("Import file must contain a question object or a questions array.");
  }

  if (Array.isArray(payload.questions)) {
    return payload.questions.map((entry) => normalizeQuestionRecord(entry));
  }

  return [normalizeQuestionRecord(payload)];
}

function resolveFileLabel(file: File) {
  const relativePath =
    typeof file.webkitRelativePath === "string" && file.webkitRelativePath.trim()
      ? file.webkitRelativePath
      : file.name;

  return relativePath;
}

export async function parseBugFixImportFiles(files: File[]): Promise<BugFixImportParseResult> {
  const orderedFiles = [...files].sort((left, right) => resolveFileLabel(left).localeCompare(resolveFileLabel(right)));
  const questions: ImportableBugFixQuestionInput[] = [];
  const skippedFiles: BugFixImportFailure[] = [];
  const seenKeys = new Set<string>();
  let importedFileCount = 0;

  for (const file of orderedFiles) {
    const label = resolveFileLabel(file);

    if (!file.name.toLowerCase().endsWith(".json")) {
      skippedFiles.push({
        label,
        message: "Skipped because only JSON files can be imported.",
      });
      continue;
    }

    try {
      const text = await file.text();
      const parsed = normalizePayload(JSON.parse(text));

      parsed.forEach((question) => {
        const key = [
          question.id || "",
          question.language,
          question.title.trim().toLowerCase(),
          question.difficulty,
          question.status,
        ].join("|");

        if (seenKeys.has(key)) {
          return;
        }

        seenKeys.add(key);
        questions.push(question);
      });

      importedFileCount += 1;
    } catch (error) {
      skippedFiles.push({
        label,
        message: error instanceof Error ? error.message : "Could not parse this file.",
      });
    }
  }

  return {
    questions,
    skippedFiles,
    importedFileCount,
  };
}
