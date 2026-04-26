import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { downloadBlobNatively } from "../../lib/nativeDownload";
import { createPost, defaultPlatformSettings, loadPlatformSettings } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { DocumentControls } from "./components/DocumentControls";
import { DocumentSidebar } from "./components/DocumentSidebar";
import { MobilePlayAreaControlsSheet } from "./components/MobilePlayAreaControlsSheet";
import { ADD_SECTION_ACTIONS, SectionEditor } from "./components/SectionEditor";
import { SectionWrapper } from "./components/SectionWrapper";
import { exportPlayAreaDocumentPdf } from "./pdf";
import { buildPlayAreaFullViewPath, createHostedPlayAreaShareUrl, PLAY_AREA_SYSTEM_SHARE_TAG } from "./share";
import {
  createEmptyPlayAreaDocument,
  deletePlayAreaDocument,
  duplicatePlayAreaDocument,
  importPlayAreaDocumentSnapshot,
  loadPlayAreaStorage,
  savePlayAreaStorage,
} from "./storage";
import type { PlayAreaDocument, PlayAreaSection, PlayAreaSectionType, PlayAreaStorage } from "./types";
import { buildDeskStyle, buildSectionTemplate, sanitizeFileName } from "./utils";

export function AiTeacherPlayArea({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [storage, setStorage] = useState<PlayAreaStorage>(() => loadPlayAreaStorage());
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sharingToFeed, setSharingToFeed] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [activeFlashcardIdBySection, setActiveFlashcardIdBySection] = useState<Record<string, string>>({});
  const [flashcardSideBySection, setFlashcardSideBySection] = useState<Record<string, "front" | "back">>({});
  const requestedDocId = searchParams.get("doc");
  const documents = storage.documents;
  const [activeDocumentId, setActiveDocumentId] = useState<string>(() => {
    if (requestedDocId && documents.some((documentData) => documentData.id === requestedDocId)) {
      return requestedDocId;
    }
    return storage.lastOpenedDocumentId || documents[0]?.id || "";
  });

  useEffect(() => {
    if (!documents.some((documentData) => documentData.id === activeDocumentId)) {
      setActiveDocumentId(documents[0]?.id || "");
    }
  }, [activeDocumentId, documents]);

  useEffect(() => {
    if (!requestedDocId) {
      return;
    }

    if (!documents.some((documentData) => documentData.id === requestedDocId)) {
      return;
    }

    setActiveDocumentId((current) => (current === requestedDocId ? current : requestedDocId));
  }, [requestedDocId]);

  useEffect(() => {
    const nextStorage: PlayAreaStorage = {
      documents,
      lastOpenedDocumentId: activeDocumentId || documents[0]?.id || null,
    };
    savePlayAreaStorage(nextStorage);
  }, [activeDocumentId, documents]);

  useEffect(() => {
    if (!mobileControlsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setMobileControlsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("resize", handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileControlsOpen]);

  useEffect(() => {
    if (!activeDocumentId || requestedDocId === activeDocumentId) {
      return;
    }

    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (next.get("doc") === activeDocumentId) {
        return current;
      }
      next.set("doc", activeDocumentId);
      return next;
    }, { replace: true });
  }, [activeDocumentId, requestedDocId, setSearchParams]);

  const activeDocument = useMemo(
    () => documents.find((documentData) => documentData.id === activeDocumentId) || documents[0] || null,
    [activeDocumentId, documents]
  );

  function updateDocuments(updater: (documents: PlayAreaDocument[]) => PlayAreaDocument[]) {
    setStorage((current) => ({ ...current, documents: updater(current.documents) }));
  }

  function updateActiveDocument(updater: (documentData: PlayAreaDocument) => PlayAreaDocument) {
    if (!activeDocument) {
      return;
    }

    updateDocuments((currentDocuments) =>
      currentDocuments.map((documentData) =>
        documentData.id === activeDocument.id
          ? {
              ...updater(documentData),
              updatedAt: new Date().toISOString(),
            }
          : documentData
      )
    );
  }

  function updateSection(sectionId: string, updater: (section: PlayAreaSection) => PlayAreaSection) {
    updateActiveDocument((documentData) => ({
      ...documentData,
      sections: documentData.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    }));
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    updateActiveDocument((documentData) => {
      const index = documentData.sections.findIndex((section) => section.id === sectionId);
      if (index < 0) {
        return documentData;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= documentData.sections.length) {
        return documentData;
      }

      const nextSections = [...documentData.sections];
      const [section] = nextSections.splice(index, 1);
      nextSections.splice(targetIndex, 0, section);
      return { ...documentData, sections: nextSections };
    });
  }

  function createDocument() {
    const documentData = createEmptyPlayAreaDocument();
    setStorage((current) => ({
      documents: [documentData, ...current.documents],
      lastOpenedDocumentId: documentData.id,
    }));
    setActiveDocumentId(documentData.id);
    toast.success("New PlayArea document created.");
  }

  function handleDuplicateDocument() {
    if (!activeDocument) {
      return;
    }
    const nextStorage = duplicatePlayAreaDocument(activeDocument);
    setStorage(nextStorage);
    setActiveDocumentId(nextStorage.lastOpenedDocumentId || nextStorage.documents[0]?.id || "");
    toast.success("Document duplicated.");
  }

  function handleDeleteDocument() {
    if (!activeDocument) {
      return;
    }
    const nextStorage = deletePlayAreaDocument(activeDocument.id);
    setStorage(nextStorage);
    setActiveDocumentId(nextStorage.lastOpenedDocumentId || nextStorage.documents[0]?.id || "");
    toast.success("Document removed.");
  }

  function handleSaveNow() {
    if (!activeDocument) {
      return;
    }
    savePlayAreaStorage({
      documents,
      lastOpenedDocumentId: activeDocument.id,
    });
    toast.success("PlayArea saved locally.");
  }

  async function handleExportJson() {
    if (!activeDocument) {
      return;
    }

    const blob = new Blob([JSON.stringify(activeDocument, null, 2)], {
      type: "application/json",
    });
    await downloadBlobNatively(blob, `${sanitizeFileName(activeDocument.title)}.json`);
    toast.success("JSON exported.");
  }

  async function handleImportJson(file: File) {
    try {
      const raw = await file.text();
      const imported = importPlayAreaDocumentSnapshot(JSON.parse(raw));
      setStorage((current) => ({
        documents: [imported, ...current.documents.filter((documentData) => documentData.id !== imported.id)],
        lastOpenedDocumentId: imported.id,
      }));
      setActiveDocumentId(imported.id);
      toast.success("PlayArea document imported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import this PlayArea JSON.");
    }
  }

  async function handleExportPdf() {
    if (!activeDocument) {
      return;
    }

    setExportingPdf(true);
    try {
      await exportPlayAreaDocumentPdf(activeDocument);
      toast.success("PDF exported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  function handleViewFull() {
    if (!activeDocument) {
      return;
    }

    navigate(buildPlayAreaFullViewPath(activeDocument.id));
  }

  async function handleShareToFeed() {
    if (!activeDocument) {
      return;
    }

    if (!user) {
      toast.error("Sign in to share this PlayArea to the feed.");
      return;
    }

    setSharingToFeed(true);
    try {
      const shareUrl = await createHostedPlayAreaShareUrl(activeDocument);
      const settings = await loadPlatformSettings().catch(() => defaultPlatformSettings);
      const baseTitle = `AI Teacher PlayArea: ${activeDocument.title.trim() || "Study Workspace"}`;
      const title = baseTitle.slice(0, settings.max_post_title_length || 120);
      const baseContent =
        activeDocument.summary.trim() ||
        `Shared an editable AI Teacher PlayArea with ${activeDocument.sections.length} study section${activeDocument.sections.length === 1 ? "" : "s"}.`;
      const content = baseContent.slice(0, settings.max_post_content_length || 5000);

      await createPost({
        authorId: user.id,
        visibilityScope: "discussion",
        discussionKind: "study",
        title,
        content,
        tags: [PLAY_AREA_SYSTEM_SHARE_TAG, "ai-teacher", "playarea"],
        isAnonymous: false,
        settings,
        linkUrl: shareUrl,
      });

      toast.success("PlayArea shared to feed.");
      navigate("/app/discussions/study");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share this PlayArea.");
    } finally {
      setSharingToFeed(false);
    }
  }

  function addSection(type: PlayAreaSectionType) {
    updateActiveDocument((documentData) => ({
      ...documentData,
      sections: [...documentData.sections, buildSectionTemplate(type)],
    }));
  }

  if (!activeDocument) {
    return null;
  }

  return (
    <div className="space-y-3 sm:space-y-4 xl:flex xl:flex-col xl:h-[calc(100dvh-7rem)]">
      <MobilePlayAreaControlsSheet
        activeDocument={activeDocument}
        exportingPdf={exportingPdf}
        sharingToFeed={sharingToFeed}
        open={mobileControlsOpen}
        onClose={() => setMobileControlsOpen(false)}
        onUpdateAppearance={updateActiveDocument}
        onChangeDocument={updateActiveDocument}
        onSaveNow={handleSaveNow}
        onImportJson={(file) => void handleImportJson(file)}
        onExportJson={handleExportJson}
        onExportPdf={handleExportPdf}
        onViewFull={handleViewFull}
        onShareToFeed={() => void handleShareToFeed()}
        onDuplicateDocument={handleDuplicateDocument}
        onDeleteDocument={handleDeleteDocument}
      />

      {showTitleBlock ? (
        <section className="relative overflow-hidden rounded-[24px] border border-app-border bg-[radial-gradient(circle_at_top_left,_rgba(254,240,138,0.35),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.22),_transparent_30%),linear-gradient(135deg,#fffef8_0%,#fff7ed_45%,#eff6ff_100%)] p-3.5 shadow-[0_30px_60px_-42px_rgba(15,23,42,0.24)] sm:rounded-[34px] sm:p-5">
          <div className="relative flex items-start justify-between gap-3 sm:flex-wrap sm:gap-4">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-700 sm:text-[0.72rem] sm:tracking-[0.24em]">Ai Teacher Studio</p>
              <h1 className="mt-1 font-display text-[1.45rem] font-semibold tracking-tight text-app-text sm:mt-1.5 sm:text-[2.3rem]">
                PlayArea
              </h1>
              <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-app-muted sm:mt-2 sm:text-sm sm:leading-6">
                Export AI Teacher answers into a local-first study workspace, then edit notes, redesign flashcards, reorder sections,
                change colours, tune paper style, and export polished PDFs whenever you want.
              </p>
            </div>

            <div className="rounded-[18px] border border-white/90 bg-white/85 p-2 text-slate-700 shadow-[0_18px_32px_-18px_rgba(15,23,42,0.18)] sm:rounded-[24px] sm:p-3">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[310px_minmax(0,1fr)] xl:min-h-0 xl:flex-1">
        <div className="xl:min-h-0 xl:overflow-y-auto xl:pr-0.5 xl:[scrollbar-width:none]">
          <DocumentSidebar
            documents={documents}
            activeDocumentId={activeDocument.id}
            activeDocument={activeDocument}
            onCreateDocument={createDocument}
            onOpenDocument={setActiveDocumentId}
            onUpdateAppearance={updateActiveDocument}
            onOpenMobilePanel={() => setMobileControlsOpen(true)}
          />
        </div>

        <div className="min-w-0 space-y-4 xl:overflow-y-auto xl:pr-1.5 xl:pb-6 [scrollbar-width:thin]">
          <div className="hidden sm:block">
            <DocumentControls
              activeDocument={activeDocument}
              exportingPdf={exportingPdf}
              sharingToFeed={sharingToFeed}
              onChangeDocument={updateActiveDocument}
              onSaveNow={handleSaveNow}
              onImportJson={(file) => void handleImportJson(file)}
              onExportJson={handleExportJson}
              onExportPdf={handleExportPdf}
              onViewFull={handleViewFull}
              onShareToFeed={() => void handleShareToFeed()}
              onDuplicateDocument={handleDuplicateDocument}
              onDeleteDocument={handleDeleteDocument}
            />
          </div>

          <section className="min-w-0 rounded-[24px] border border-slate-200 p-3.5 shadow-[0_30px_60px_-42px_rgba(15,23,42,0.24)] sm:rounded-[32px] sm:p-5" style={buildDeskStyle(activeDocument)}>
            <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 sm:text-[11px] sm:tracking-[0.18em]">Ai Teacher PlayArea</p>
                <h2 className="mt-1 text-[1.2rem] font-semibold tracking-tight text-white sm:text-[1.5rem]">{activeDocument.title}</h2>
              </div>

              <div className="-mx-1 flex min-w-0 w-full snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 sm:gap-2">
                {ADD_SECTION_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.type}
                      type="button"
                      onClick={() => addSection(action.type)}
                      className="inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-1.5 text-[10px] font-semibold text-white backdrop-blur transition hover:bg-white/25 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
                    >
                      <Icon className="h-4 w-4" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3.5 sm:space-y-5">
              {activeDocument.sections.map((section, index) => (
                <SectionWrapper
                  key={section.id}
                  documentData={activeDocument}
                  section={section}
                  onTitleChange={(value) => updateSection(section.id, (current) => ({ ...current, title: value }))}
                  onKickerChange={(value) => updateSection(section.id, (current) => ({ ...current, kicker: value }))}
                  onMoveUp={() => moveSection(section.id, "up")}
                  onMoveDown={() => moveSection(section.id, "down")}
                  canMoveUp={index > 0}
                  canMoveDown={index < activeDocument.sections.length - 1}
                  onRemove={() =>
                    updateActiveDocument((documentData) => ({
                      ...documentData,
                      sections: documentData.sections.filter((candidate) => candidate.id !== section.id),
                    }))
                  }
                >
                  <SectionEditor
                    documentData={activeDocument}
                    section={section}
                    onChange={(nextSection) => updateSection(section.id, () => nextSection)}
                    activeFlashcardId={activeFlashcardIdBySection[section.id]}
                    flashcardSide={flashcardSideBySection[section.id]}
                    onActiveFlashcardChange={(cardId) =>
                      setActiveFlashcardIdBySection((current) => ({
                        ...current,
                        [section.id]: cardId,
                      }))
                    }
                    onFlashcardSideChange={(side) =>
                      setFlashcardSideBySection((current) => ({
                        ...current,
                        [section.id]: side,
                      }))
                    }
                  />
                </SectionWrapper>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
