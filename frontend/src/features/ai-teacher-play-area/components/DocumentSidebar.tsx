import { FilePlus2, SlidersHorizontal } from "lucide-react";
import type { PlayAreaDocument } from "../types";
import { AppearanceControlsSection } from "./AppearanceControlsSection";
import { DocumentCard } from "./DocumentCard";

export function DocumentSidebar({
  documents,
  activeDocumentId,
  activeDocument,
  onCreateDocument,
  onOpenDocument,
  onUpdateAppearance,
  onOpenMobilePanel,
}: {
  documents: PlayAreaDocument[];
  activeDocumentId: string;
  activeDocument: PlayAreaDocument;
  onCreateDocument: () => void;
  onOpenDocument: (documentId: string) => void;
  onUpdateAppearance: (updater: (documentData: PlayAreaDocument) => PlayAreaDocument) => void;
  onOpenMobilePanel?: () => void;
}) {
  return (
    <aside className="space-y-3 sm:space-y-4 xl:sticky xl:top-24 xl:self-start">
      <section className="rounded-[20px] border border-slate-200 bg-white/90 p-2.5 shadow-[0_24px_46px_-38px_rgba(15,23,42,0.22)] sm:rounded-[28px] sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">Workspace Library</p>
            <p className="mt-1 text-[14px] font-semibold text-slate-900 sm:text-lg">Saved PlayArea docs</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCreateDocument} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 sm:h-11 sm:w-11" aria-label="Create document">
              <FilePlus2 className="h-4 w-4" />
            </button>
            {onOpenMobilePanel ? (
              <button
                type="button"
                onClick={onOpenMobilePanel}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm sm:hidden"
                aria-label="Open PlayArea controls"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-2.5 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-4 sm:mx-0 sm:block sm:space-y-2.5 sm:overflow-visible sm:px-0 sm:pb-0">
          {documents.map((documentData) => (
            <DocumentCard
              key={documentData.id}
              documentData={documentData}
              active={documentData.id === activeDocumentId}
              onOpen={() => onOpenDocument(documentData.id)}
            />
          ))}
        </div>
      </section>

      <AppearanceControlsSection
        activeDocument={activeDocument}
        onUpdateAppearance={onUpdateAppearance}
        className="hidden sm:block"
      />
    </aside>
  );
}
