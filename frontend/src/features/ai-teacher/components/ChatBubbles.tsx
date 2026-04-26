import { BookOpen, Bot, Download, FileText, Loader2, Save } from "lucide-react";
import type { AiTeacherFolder, AiTeacherMessage, AiTeacherToolType } from "../types";
import { StructuredBlockRenderer } from "./StructuredBlockRenderer";
import { THEME_META, formatDateLabel, getTheme, getToolOption, summarizeMessage } from "../ui";

function SourcePreviewCard({
  label,
  summary,
  fileUrl,
  mimeType,
  tone = "light",
}: {
  label?: string | null;
  summary?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  tone?: "light" | "dark";
}) {
  if (!label && !fileUrl) {
    return null;
  }

  const isImage = Boolean(fileUrl && mimeType?.startsWith("image/"));
  const cardClassName =
    tone === "dark"
      ? "border-white/10 bg-white/8 text-slate-100"
      : "border-slate-200 bg-slate-50 text-slate-800";
  const metaClassName = tone === "dark" ? "text-slate-300" : "text-slate-500";
  const iconWrapClassName =
    tone === "dark"
      ? "border-white/10 bg-white/10 text-slate-100"
      : "border-slate-200 bg-white text-slate-600";

  return (
    <div className={`mt-3 overflow-hidden rounded-[18px] border ${cardClassName}`}>
      <div className="flex items-center gap-3 p-2.5">
        {isImage ? (
          <img
            src={fileUrl || ""}
            alt={label || "Attached source"}
            className="h-14 w-14 shrink-0 rounded-[14px] border border-black/5 object-cover"
            loading="lazy"
          />
        ) : (
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] border ${iconWrapClassName}`}>
            <FileText className="h-5 w-5" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${iconWrapClassName}`}>
              {isImage ? "Image" : mimeType === "application/pdf" ? "PDF" : "Source"}
            </span>
          </div>
          {label ? <p className="mt-2 line-clamp-1 text-sm font-semibold">{label}</p> : null}
          {summary ? <p className={`mt-1 line-clamp-2 text-xs leading-5 ${metaClassName}`}>{summary}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function UserBubble({
  toolType,
  text,
  createdAt,
  pending = false,
  fileLabel,
  fileUrl,
  fileMimeType,
  fileSummary,
}: {
  toolType: AiTeacherToolType;
  text: string;
  createdAt?: string | null;
  pending?: boolean;
  fileLabel?: string | null;
  fileUrl?: string | null;
  fileMimeType?: string | null;
  fileSummary?: string | null;
}) {
  const tool = getToolOption(toolType);
  const ToolIcon = tool.icon;

  return (
    <article className="ml-auto mr-2 sm:mr-0 max-w-[90%] sm:max-w-[78%] rounded-[20px] bg-[#2f2f2f] px-3.5 sm:px-4 py-3 sm:py-3.5 text-white shadow-sm break-words">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-300">
        <span className="inline-flex items-center gap-1.5 break-words">
          <ToolIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{tool.promptLabel}</span>
        </span>
        <span className="text-slate-500 shrink-0">•</span>
        <span className="shrink-0">{pending ? "Sending..." : formatDateLabel(createdAt)}</span>
      </div>
      {text ? (
        <p className="mt-2.5 whitespace-pre-wrap text-sm leading-6 text-white break-words">
          {text}
        </p>
      ) : null}
      {fileLabel || fileUrl ? (
        <SourcePreviewCard
          label={fileLabel}
          summary={fileSummary}
          fileUrl={fileUrl}
          mimeType={fileMimeType}
          tone="dark"
        />
      ) : null}
    </article>
  );
}

export function AssistantBubble({
  message,
  saveFolderId,
  folders,
  busyMessageId,
  onFolderChange,
  onSave,
  onExport,
  onExportToPlayArea,
}: {
  message: AiTeacherMessage;
  saveFolderId: string;
  folders: AiTeacherFolder[];
  busyMessageId: string | null;
  onFolderChange: (folderId: string) => void;
  onSave: (message: AiTeacherMessage) => void;
  onExport: (message: AiTeacherMessage) => void;
  onExportToPlayArea: (message: AiTeacherMessage) => void;
}) {
  const theme = getTheme(message.content.theme);
  const themeMeta = THEME_META[theme];
  const blocks = Array.isArray(message.content.blocks) ? message.content.blocks : [];
  const isBusy = busyMessageId === message.id;
  const sourceFileName =
    (typeof message.content.source_file_name === "string" ? message.content.source_file_name : null) || null;
  const sourceMimeType =
    (typeof message.content.source_mime_type === "string" ? message.content.source_mime_type : null) || null;
  const sourceSummary =
    (typeof message.content.source_context_summary === "string" ? message.content.source_context_summary : null) ||
    null;
  const isLocalOnly = message.api_mode === "local_ollama";

  return (
    <div className="flex w-full items-start sm:gap-2.5">
      <div className="mt-1 hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <article className={`min-w-0 flex-1 overflow-hidden rounded-none sm:rounded-[28px] border-y sm:border ${themeMeta.border} bg-white/95 p-1.5 sm:p-3.5 shadow-sm sm:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.34)] break-words`}>
        <div className={`relative overflow-hidden rounded-[16px] sm:rounded-[24px] border ${themeMeta.border} bg-gradient-to-br ${themeMeta.surface} p-3.5 sm:p-5`}>
          <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-white/70 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-2.5 sm:gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${themeMeta.chip}`}>
                  {getToolOption(message.tool_type).promptLabel}
                </span>
                <span className="text-xs text-slate-500 shrink-0">{formatDateLabel(message.created_at)}</span>
              </div>
              <h3 className="mt-2.5 text-[0.95rem] font-semibold text-slate-900 sm:text-[1.18rem] break-words">
                {message.content.title || getToolOption(message.tool_type).label}
              </h3>
              <p className="mt-1.5 max-w-3xl text-[0.82rem] sm:text-sm leading-6 text-slate-600 break-words">
                {message.content.message || summarizeMessage(message)}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full border px-2.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[11px] font-medium shrink-0 ${
                isLocalOnly
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-white/80 bg-white/80 text-slate-700"
              }`}
            >
              <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {isLocalOnly ? "Local" : "Notebook"}
            </div>
          </div>
        </div>

        {message.file_url || sourceFileName || sourceSummary ? (
          <SourcePreviewCard
            label={sourceFileName}
            summary={sourceSummary}
            fileUrl={message.file_url}
            mimeType={sourceMimeType}
          />
        ) : null}

        <div className="mt-3.5 space-y-3">
          {blocks.length ? (
            blocks.map((block, index) => (
              <StructuredBlockRenderer
                key={`${message.id}-${block.type}-${index}`}
                block={block}
                theme={theme}
                toolType={message.tool_type}
              />
            ))
          ) : (
            <StructuredBlockRenderer
              block={{
                type: "paragraph",
                title: "Answer",
                text: message.content.plain_text_fallback || message.content.message || "Structured answer ready.",
              }}
              theme={theme}
              toolType={message.tool_type}
            />
          )}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2 rounded-[16px] sm:rounded-[20px] border border-slate-200 bg-slate-50/80 px-2.5 sm:px-3 py-2.5 sm:py-3">
          <button
            type="button"
            onClick={() => onExportToPlayArea(message)}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-slate-700 transition hover:border-slate-300"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PlayArea</span>
          </button>
          <select
            value={saveFolderId}
            onChange={(event) => onFolderChange(event.target.value)}
            disabled={isLocalOnly}
            className="rounded-full border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-slate-700 outline-none transition focus:border-slate-400"
          >
            <option value="">Quick Saves</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSave(message)}
            disabled={isBusy || isLocalOnly}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="hidden lg:inline">Save</span>
          </button>
          <button
            type="button"
            onClick={() => onExport(message)}
            disabled={isBusy || isLocalOnly}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">PDF</span>
          </button>
          {isLocalOnly ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-medium text-emerald-700">
              Local only
            </span>
          ) : null}
        </div>
      </article>
    </div>
  );
}

export function AssistantLoadingBubble({ status }: { status: string | null }) {
  return (
    <div className="flex w-full items-start gap-2.5">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <article className="flex-1 rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.25)]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          <p className="text-sm leading-6 text-slate-600">
            {status === "loading_context"
              ? "Loading your chat context and source file..."
              : status === "validating"
                ? "Checking coins and preparing the turn..."
                : "Thinking through the next response..."}
          </p>
        </div>
      </article>
    </div>
  );
}
