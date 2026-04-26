import { SlidersHorizontal, X } from "lucide-react";
import type { PlayAreaDocument } from "../types";
import { AppearanceControlsSection } from "./AppearanceControlsSection";
import { DocumentControls } from "./DocumentControls";

export function MobilePlayAreaControlsSheet({
  activeDocument,
  exportingPdf,
  sharingToFeed,
  open,
  onClose,
  onUpdateAppearance,
  onChangeDocument,
  onSaveNow,
  onImportJson,
  onExportJson,
  onExportPdf,
  onViewFull,
  onShareToFeed,
  onDuplicateDocument,
  onDeleteDocument,
}: {
  activeDocument: PlayAreaDocument;
  exportingPdf: boolean;
  sharingToFeed: boolean;
  open: boolean;
  onClose: () => void;
  onUpdateAppearance: (updater: (documentData: PlayAreaDocument) => PlayAreaDocument) => void;
  onChangeDocument: (updater: (documentData: PlayAreaDocument) => PlayAreaDocument) => void;
  onSaveNow: () => void;
  onImportJson: (file: File) => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onViewFull: () => void;
  onShareToFeed: () => void;
  onDuplicateDocument: () => void;
  onDeleteDocument: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
        aria-label="Close PlayArea controls"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[24rem] flex-col border-l border-slate-200 bg-app px-3 pb-[calc(1rem+var(--safe-area-bottom))] pt-[max(0.75rem,var(--safe-area-top))] shadow-[-24px_0_48px_-36px_rgba(15,23,42,0.42)]">
        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-app-border bg-app-card/92 p-3 shadow-[0_22px_46px_-36px_rgba(15,23,42,0.26)] backdrop-blur">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace Controls</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">PlayArea controls</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
            aria-label="Close controls"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="rounded-[18px] border border-slate-200 bg-white/92 px-3 py-2.5 shadow-[0_18px_42px_-38px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              <p className="text-[12px] font-semibold text-slate-900">Compact mobile controls</p>
            </div>
          </div>

          <DocumentControls
            activeDocument={activeDocument}
            exportingPdf={exportingPdf}
            sharingToFeed={sharingToFeed}
            onChangeDocument={onChangeDocument}
            onSaveNow={onSaveNow}
            onImportJson={onImportJson}
            onExportJson={onExportJson}
            onExportPdf={onExportPdf}
            onViewFull={onViewFull}
            onShareToFeed={onShareToFeed}
            onDuplicateDocument={onDuplicateDocument}
            onDeleteDocument={onDeleteDocument}
            compactMobile
          />

          <AppearanceControlsSection
            activeDocument={activeDocument}
            onUpdateAppearance={onUpdateAppearance}
          />
        </div>
      </aside>
    </div>
  );
}
