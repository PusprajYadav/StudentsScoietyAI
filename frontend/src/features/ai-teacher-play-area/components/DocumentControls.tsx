import { useRef } from "react";
import { Copy, Download, Eye, FileJson, Import, Save, Share2, Trash2 } from "lucide-react";
import type { PlayAreaDocument } from "../types";
import { chipButtonClassName, formatDateLabel, surfaceInputClassName } from "../utils";
import { AutoGrowTextarea } from "./AutoGrowTextarea";

export function DocumentControls({
  activeDocument,
  exportingPdf,
  onChangeDocument,
  onSaveNow,
  onImportJson,
  onExportJson,
  onExportPdf,
  onViewFull,
  onShareToFeed,
  onDuplicateDocument,
  onDeleteDocument,
  sharingToFeed,
  compactMobile = false,
}: {
  activeDocument: PlayAreaDocument;
  exportingPdf: boolean;
  sharingToFeed: boolean;
  onChangeDocument: (updater: (documentData: PlayAreaDocument) => PlayAreaDocument) => void;
  onSaveNow: () => void;
  onImportJson: (file: File) => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onViewFull: () => void;
  onShareToFeed: () => void;
  onDuplicateDocument: () => void;
  onDeleteDocument: () => void;
  compactMobile?: boolean;
}) {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="min-w-0 rounded-[22px] border border-slate-200 bg-white/92 p-3 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.24)] sm:rounded-[28px] sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">
            {compactMobile ? "Controls" : "Document Controls"}
          </p>
          {!compactMobile ? <p className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">Edit, save, export, and reopen anytime</p> : null}
        </div>
        <div className={`grid min-w-0 w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center ${compactMobile ? "grid-cols-3" : "grid-cols-2"}`}>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              event.currentTarget.value = "";
              if (nextFile) {
                onImportJson(nextFile);
              }
            }}
          />
          <button type="button" onClick={onSaveNow} className={`${chipButtonClassName} min-w-0 justify-center ${compactMobile ? "px-2 py-2 text-[10px]" : "px-2.5 py-2 text-[11px]"} sm:px-3 sm:py-2 sm:text-xs`}>
            <Save className="h-4 w-4" />
            {compactMobile ? "Save" : "Save now"}
          </button>
          <button type="button" onClick={() => importInputRef.current?.click()} className={`${chipButtonClassName} min-w-0 justify-center ${compactMobile ? "px-2 py-2 text-[10px]" : "px-2.5 py-2 text-[11px]"} sm:px-3 sm:py-2 sm:text-xs`}>
            <Import className="h-4 w-4" />
            Import
          </button>
          <button type="button" onClick={onViewFull} className={`${chipButtonClassName} min-w-0 justify-center ${compactMobile ? "px-2 py-2 text-[10px]" : "px-2.5 py-2 text-[11px]"} sm:px-3 sm:py-2 sm:text-xs`}>
            <Eye className="h-4 w-4" />
            {compactMobile ? "View" : "Full view"}
          </button>
          <button type="button" onClick={onExportJson} className={`${chipButtonClassName} min-w-0 justify-center ${compactMobile ? "px-2 py-2 text-[10px]" : "px-2.5 py-2 text-[11px]"} sm:px-3 sm:py-2 sm:text-xs`}>
            <FileJson className="h-4 w-4" />
            JSON
          </button>
          <button type="button" onClick={onExportPdf} disabled={exportingPdf} className={`${chipButtonClassName} min-w-0 justify-center ${compactMobile ? "px-2 py-2 text-[10px]" : "px-2.5 py-2 text-[11px]"} sm:px-3 sm:py-2 sm:text-xs`}>
            <Download className="h-4 w-4" />
            {exportingPdf ? "Exporting..." : "PDF"}
          </button>
          <button type="button" onClick={onShareToFeed} disabled={sharingToFeed} className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 ${compactMobile ? "px-2 py-2 text-[10px]" : "px-2.5 py-2 text-[11px]"} sm:px-3 sm:py-2 sm:text-xs`}>
            <Share2 className="h-4 w-4" />
            {sharingToFeed ? "..." : compactMobile ? "Share" : "Share feed"}
          </button>
          <button type="button" onClick={onDuplicateDocument} className={`${chipButtonClassName} min-w-0 justify-center ${compactMobile ? "px-2 py-2 text-[10px]" : "px-2.5 py-2 text-[11px]"} sm:px-3 sm:py-2 sm:text-xs`}>
            <Copy className="h-4 w-4" />
            {compactMobile ? "Clone" : "Duplicate"}
          </button>
          <button type="button" onClick={onDeleteDocument} className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 font-semibold text-rose-700 transition hover:bg-rose-100 ${compactMobile ? "px-2 py-2 text-[10px]" : "px-2.5 py-2 text-[11px]"} sm:px-3 sm:py-2 sm:text-xs`}>
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className={`grid gap-2.5 lg:mt-4 lg:gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] ${compactMobile ? "mt-2.5" : "mt-3"}`}>
        <div className="min-w-0 space-y-3">
          <input
            value={activeDocument.title}
            onChange={(event) => onChangeDocument((documentData) => ({ ...documentData, title: event.target.value }))}
            className={surfaceInputClassName}
            placeholder="Document title"
          />
          <input
            value={activeDocument.subtitle}
            onChange={(event) => onChangeDocument((documentData) => ({ ...documentData, subtitle: event.target.value }))}
            className={surfaceInputClassName}
            placeholder="Subtitle"
          />
        </div>

        <div className="min-w-0 space-y-3">
          <input
            value={activeDocument.tags.join(", ")}
            onChange={(event) =>
              onChangeDocument((documentData) => ({
                ...documentData,
                tags: event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              }))
            }
            className={surfaceInputClassName}
            placeholder="Tags, comma separated"
          />
          <p className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium leading-5 text-emerald-700 sm:rounded-[18px] sm:text-xs">
            Local-first save is active. Last update: {formatDateLabel(activeDocument.updatedAt)}
          </p>
        </div>
      </div>

      <div className={`${compactMobile ? "mt-2" : "mt-2.5 sm:mt-3"}`}>
        <AutoGrowTextarea
          value={activeDocument.summary}
          onChange={(value) => onChangeDocument((documentData) => ({ ...documentData, summary: value }))}
          className={`${surfaceInputClassName} ${compactMobile ? "min-h-[78px]" : "min-h-[94px]"} resize-none`}
          placeholder="Document summary or study objective"
          minRows={compactMobile ? 3 : 4}
        />
      </div>
    </section>
  );
}
