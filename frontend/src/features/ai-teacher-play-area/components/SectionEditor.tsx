import { BookOpen, ChevronDown, Highlighter, Layers3, NotebookPen, Sparkles } from "lucide-react";
import { PLAY_AREA_HIGHLIGHT_COLORS } from "../storage";
import type { PlayAreaDocument, PlayAreaSection, PlayAreaSectionType } from "../types";
import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { FlashcardsSectionEditor } from "./sections/FlashcardsSectionEditor";
import { GraphSectionEditor } from "./sections/GraphSectionEditor";
import { ListSectionEditor } from "./sections/ListSectionEditor";
import { MindmapSectionEditor } from "./sections/MindmapSectionEditor";
import { ParagraphSectionEditor } from "./sections/ParagraphSectionEditor";
import { QuizSectionEditor } from "./sections/QuizSectionEditor";

export const ADD_SECTION_ACTIONS: readonly {
  type: PlayAreaSectionType;
  label: string;
  icon: typeof NotebookPen;
}[] = [
  { type: "paragraph", label: "Note", icon: NotebookPen },
  { type: "bullet_list", label: "List", icon: Highlighter },
  { type: "steps", label: "Steps", icon: Layers3 },
  { type: "flashcards", label: "Flashcards", icon: BookOpen },
  { type: "quiz", label: "Quiz", icon: Sparkles },
  { type: "mindmap", label: "Mindmap", icon: ChevronDown },
  { type: "graph", label: "Graph", icon: Highlighter },
] as const;

export function SectionEditor({
  documentData,
  section,
  onChange,
  activeFlashcardId,
  flashcardSide,
  onActiveFlashcardChange,
  onFlashcardSideChange,
}: {
  documentData: PlayAreaDocument;
  section: PlayAreaSection;
  onChange: (nextSection: PlayAreaSection) => void;
  activeFlashcardId?: string;
  flashcardSide?: "front" | "back";
  onActiveFlashcardChange: (cardId: string) => void;
  onFlashcardSideChange: (side: "front" | "back") => void;
}) {
  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <ColorSwatchPicker
          label="Section Highlight"
          options={PLAY_AREA_HIGHLIGHT_COLORS}
          value={section.highlightColor}
          onChange={(value) => onChange({ ...section, highlightColor: value })}
        />

        {section.type === "paragraph" ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...section,
                text: section.text.trim() ? `${section.text}\n` : section.text,
              })
            }
            className="w-full max-w-full self-start rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 sm:w-auto"
          >
            Quick line break
          </button>
        ) : null}
      </div>

      {section.type === "paragraph" ? (
        <ParagraphSectionEditor documentData={documentData} section={section} onChange={onChange} />
      ) : null}

      {section.type === "bullet_list" || section.type === "steps" ? (
        <ListSectionEditor documentData={documentData} section={section} onChange={onChange} />
      ) : null}

      {section.type === "flashcards" ? (
        <FlashcardsSectionEditor
          documentData={documentData}
          section={section}
          activeFlashcardId={activeFlashcardId}
          flashcardSide={flashcardSide}
          onChange={onChange}
          onActiveFlashcardChange={onActiveFlashcardChange}
          onFlashcardSideChange={onFlashcardSideChange}
        />
      ) : null}

      {section.type === "quiz" ? <QuizSectionEditor section={section} onChange={onChange} /> : null}
      {section.type === "mindmap" ? <MindmapSectionEditor section={section} onChange={onChange} /> : null}
      {section.type === "graph" ? <GraphSectionEditor section={section} onChange={onChange} /> : null}
    </div>
  );
}
