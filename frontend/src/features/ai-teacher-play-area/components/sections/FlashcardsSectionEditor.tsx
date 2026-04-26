import { Layers3, Plus, Trash2 } from "lucide-react";
import { PLAY_AREA_ACCENT_COLORS, PLAY_AREA_HIGHLIGHT_COLORS } from "../../storage";
import type { PlayAreaDocument, PlayAreaFlashcard, PlayAreaSection } from "../../types";
import { buildDeskStyle, createEditorId, getFontScaleValue, handwritingStyle } from "../../utils";
import { AutoGrowTextarea } from "../AutoGrowTextarea";
import { ColorSwatchPicker } from "../ColorSwatchPicker";

export function FlashcardsSectionEditor({
  documentData,
  section,
  activeFlashcardId,
  flashcardSide,
  onChange,
  onActiveFlashcardChange,
  onFlashcardSideChange,
}: {
  documentData: PlayAreaDocument;
  section: PlayAreaSection;
  activeFlashcardId?: string;
  flashcardSide?: "front" | "back";
  onChange: (nextSection: PlayAreaSection) => void;
  onActiveFlashcardChange: (cardId: string) => void;
  onFlashcardSideChange: (side: "front" | "back") => void;
}) {
  const activeCard = section.cards.find((card) => card.id === activeFlashcardId) || section.cards[0] || null;
  const showingBack = flashcardSide === "back";
  const fontScale = getFontScaleValue(documentData.appearance.fontScale);
  const activeCardIndex = activeCard ? section.cards.findIndex((card) => card.id === activeCard.id) + 1 : 0;
  const previewBackground =
    documentData.appearance.paperStyle === "plain"
      ? "linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.64))"
      : "repeating-linear-gradient(180deg, transparent 0 35px, rgba(59,130,246,0.12) 35px 36px), linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.64))";
  const deskStyle = buildDeskStyle(documentData);
  const softDeskStyle = {
    ...deskStyle,
    backgroundColor: "#f8efe1",
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.86), rgba(255,247,237,0.72)), ${deskStyle.backgroundImage || ""}`,
  };

  function updateCard(cardId: string, updater: (card: PlayAreaFlashcard) => PlayAreaFlashcard) {
    onChange({
      ...section,
      cards: section.cards.map((candidate) => (candidate.id === cardId ? updater(candidate) : candidate)),
    });
  }

  if (!section.cards.length || !activeCard) {
    return (
      <div className="min-w-0 rounded-[22px] border border-[#ead8b8] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] sm:rounded-[28px] sm:p-5" style={softDeskStyle}>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Flashcard deck</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Build a revision stack you can keep editing later.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...section,
                cards: [
                  ...section.cards,
                  {
                    id: createEditorId("card"),
                    front: "New front",
                    back: "New back",
                    highlightColor: section.highlightColor,
                    accentColor: documentData.appearance.accentColor,
                  },
                ],
              })
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-white/84 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add card
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-[22px] border border-[#ead8b8] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_24px_54px_-42px_rgba(15,23,42,0.34)] sm:rounded-[28px] sm:p-4" style={softDeskStyle}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Flashcard deck</p>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-800 sm:text-sm">Preview, flip, edit, and switch cards without leaving the deck.</p>
        </div>
        <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...section,
                cards: [
                  ...section.cards,
                  {
                    id: createEditorId("card"),
                    front: "New front",
                    back: "New back",
                    highlightColor: section.highlightColor,
                    accentColor: documentData.appearance.accentColor,
                  },
                ],
              })
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-white/84 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-amber-300 hover:bg-white sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add card
          </button>
          <button
            type="button"
            onClick={() => onFlashcardSideChange(showingBack ? "front" : "back")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/84 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-white sm:w-auto"
          >
            <Layers3 className="h-4 w-4" />
            Flip preview
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:mt-5 xl:gap-4 xl:grid-cols-[minmax(0,0.56fr)_minmax(22rem,0.44fr)]">
        <div className="min-w-0 rounded-[20px] border border-white/75 bg-white/72 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_18px_40px_-34px_rgba(15,23,42,0.28)] backdrop-blur-[2px] sm:rounded-[26px] sm:p-4">
          <div className="grid min-w-0 gap-3 sm:gap-4 2xl:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="relative w-full max-w-none sm:mx-auto sm:max-w-[34rem]">
              <div className="absolute inset-0 hidden translate-x-3 translate-y-3 rotate-[4deg] rounded-[22px] border border-[#e9d6b4] bg-[#fff6df]/70 shadow-[0_22px_34px_-28px_rgba(15,23,42,0.35)] sm:block" />
              <div className="absolute inset-0 hidden -translate-x-2 translate-y-1 -rotate-[2deg] rounded-[22px] border border-[#ebd8b9] bg-[#fff9ea]/80 shadow-[0_18px_30px_-26px_rgba(15,23,42,0.3)] sm:block" />

              <div
                className="relative rounded-[20px] border border-[#e7d3b1] px-3.5 py-4 shadow-[0_26px_54px_-36px_rgba(15,23,42,0.38)] sm:rounded-[24px] sm:px-6 sm:py-5"
                style={{
                  backgroundColor: documentData.appearance.paperTone,
                  backgroundImage: previewBackground,
                }}
              >
                <div className="absolute left-5 top-0 h-full w-px bg-rose-200/70 sm:left-6" />
                <div className="absolute right-4 top-4 hidden h-10 w-10 rounded-full opacity-45 blur-2xl sm:block sm:right-6 sm:top-6 sm:h-12 sm:w-12" style={{ backgroundColor: activeCard.highlightColor }} />
                <div className="absolute left-5 top-3 hidden h-1.5 w-12 rounded-full sm:block sm:left-6 sm:top-5 sm:h-2.5 sm:w-16" style={{ backgroundColor: activeCard.accentColor }} />

                <div className="relative pl-6 sm:pl-10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#ead9bc] bg-white/82 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
                        Card {activeCardIndex}
                      </div>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:mt-3 sm:text-[11px] sm:tracking-[0.18em]">
                        {showingBack ? "Back of Card" : "Front of Card"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => onFlashcardSideChange("front")}
                        className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition sm:px-3 sm:text-xs ${
                          !showingBack ? "bg-slate-900 text-white" : "border border-slate-200 bg-white/90 text-slate-600"
                        }`}
                      >
                        Front
                      </button>
                      <button
                        type="button"
                        onClick={() => onFlashcardSideChange("back")}
                        className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition sm:px-3 sm:text-xs ${
                          showingBack ? "bg-slate-900 text-white" : "border border-slate-200 bg-white/90 text-slate-600"
                        }`}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            ...section,
                            cards: section.cards.filter((card) => card.id !== activeCard.id),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 transition hover:border-rose-200 hover:text-rose-600 sm:h-9 sm:w-9"
                        aria-label="Delete flashcard"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 min-h-[9rem] whitespace-pre-wrap leading-[1.95rem] sm:mt-5 sm:min-h-[11rem] sm:leading-[2.25rem]" style={{ ...handwritingStyle, fontSize: `${1.08 * fontScale}rem` }}>
                    {showingBack ? activeCard.back || "Write the answer, summary, or cue." : activeCard.front || "Write the prompt, concept, or question."}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-[18px] border border-slate-200/80 bg-white/88 p-3 shadow-[0_18px_32px_-30px_rgba(15,23,42,0.25)] sm:rounded-[22px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Deck quick switch</p>
              <div className="mt-3 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 2xl:grid-cols-1">
                {section.cards.map((card, index) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onActiveFlashcardChange(card.id)}
                    className={`min-w-0 w-[calc(100%-0.25rem)] shrink-0 snap-start rounded-[16px] border px-3 py-3 text-left transition sm:w-auto sm:rounded-[18px] ${
                      card.id === activeCard.id ? "border-slate-900 bg-white text-slate-900 shadow-sm" : "border-slate-200/80 bg-white/88 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: card.accentColor }} />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Card {index + 1}</p>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm font-semibold">{card.front || "Untitled front"}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-[20px] border border-slate-200/80 bg-white/92 p-3.5 shadow-[0_18px_32px_-24px_rgba(15,23,42,0.24)] sm:rounded-[26px] sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Card editor</p>
          <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
            <ColorSwatchPicker
              label="Card Highlight"
              options={PLAY_AREA_HIGHLIGHT_COLORS}
              value={activeCard.highlightColor}
              onChange={(value) => updateCard(activeCard.id, (current) => ({ ...current, highlightColor: value }))}
            />
            <ColorSwatchPicker
              label="Card Accent"
              options={PLAY_AREA_ACCENT_COLORS}
              value={activeCard.accentColor}
              onChange={(value) => updateCard(activeCard.id, (current) => ({ ...current, accentColor: value }))}
            />

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">Front</p>
              <AutoGrowTextarea
                value={activeCard.front}
                onChange={(value) => updateCard(activeCard.id, (current) => ({ ...current, front: value }))}
                className="mt-2 w-full rounded-[16px] border border-slate-200 bg-[#fffdf8] px-3 py-2.5 text-[1.04rem] leading-7 outline-none transition focus:border-slate-400 sm:rounded-[18px] sm:py-3"
                style={{ ...handwritingStyle, fontSize: `${1.04 * fontScale}rem` }}
                minRows={4}
                placeholder="Write the prompt, concept, or question."
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">Back</p>
              <AutoGrowTextarea
                value={activeCard.back}
                onChange={(value) => updateCard(activeCard.id, (current) => ({ ...current, back: value }))}
                className="mt-2 w-full rounded-[16px] border border-slate-200 bg-[#fffdf8] px-3 py-2.5 text-[1.04rem] leading-7 outline-none transition focus:border-slate-400 sm:rounded-[18px] sm:py-3"
                style={{ ...handwritingStyle, fontSize: `${1.04 * fontScale}rem` }}
                minRows={6}
                placeholder="Write the answer, summary, or cue."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
