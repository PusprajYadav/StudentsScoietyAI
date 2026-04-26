import html2canvas from "html2canvas";
import { Capacitor } from "@capacitor/core";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { RESUME_PAGE_HEIGHT, RESUME_PAGE_WIDTH } from "./constants";
import { ResumeTemplateRenderer } from "./templates";
import type {
  ResumeCanvasSectionKey,
  ResumeDesignBlockKey,
  ResumeDesignSelection,
  ResumeDesignLayoutSettings,
  ResumeFreeformSectionPlacement,
  ResumeRecord,
} from "./types";
import {
  createDefaultResumeDesignSettings,
  formatResumeDateRange,
  slugifyResumeSeed,
} from "./utils";
import { downloadBlobNatively } from "../../../lib/nativeDownload";

export interface ResumePreviewHandle {
  exportPngPages: () => Promise<void>;
  exportPdfPages: () => Promise<void>;
  getPageCount: () => number;
}

interface ResumePreviewProps {
  resume: ResumeRecord;
  onPageCountChange?: (pageCount: number) => void;
  onLayoutChange?: (layout: ResumeDesignLayoutSettings) => void;
  freeformViewMode?: "arrange" | "preview";
  emptyMessage?: string;
  selectedDesignBlock?: ResumeDesignBlockKey | null;
  selectedDesignTargetKey?: string | null;
  onSelectDesignBlock?: (selection: ResumeDesignSelection) => void;
  interactiveDesignPreview?: boolean;
  showPreviewChrome?: boolean;
  showPageFrame?: boolean;
}

interface SectionBounds {
  top: number;
  bottom: number;
  height: number;
}

interface MeasuredPageLayout {
  anchors: number[];
  blocks: SectionBounds[];
  contentBottom: number;
}

const PAGE_BREAK_EPSILON = 1;
const FREEFORM_CANVAS_MARGIN = 24;
const FREEFORM_MIN_BLOCK_WIDTH = 180;
const FREEFORM_MAX_PAGE_COUNT = 20;
const FREEFORM_PAGE_DROP_BUFFER = 24;

const freeformSectionOrder: ResumeCanvasSectionKey[] = [
  "header",
  "contact",
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "achievements",
  "languages",
  "certifications",
  "interests",
  "references",
];

const defaultFreeformPlacements =
  createDefaultResumeDesignSettings().layout.freeform
    .placements as Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>;

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(color: string) {
  const normalized = color.replace("#", "").trim();
  if (normalized.length === 3) {
    const r = Number.parseInt(normalized[0] + normalized[0], 16);
    const g = Number.parseInt(normalized[1] + normalized[1], 16);
    const b = Number.parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }

  if (normalized.length === 6) {
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
  }

  return { r: 30, g: 41, b: 59 };
}

function withAlpha(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function contrastText(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#0f172a" : "#f8fafc";
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

async function waitForLayoutStability() {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }

  await waitForNextPaint();
}

function getResumeExportScale() {
  if (Capacitor.getPlatform() === "android") {
    return 1.25;
  }

  return Capacitor.isNativePlatform() ? 1.5 : 2;
}

async function renderResumeExportCanvas(node: HTMLElement) {
  await waitForLayoutStability();

  // Clone the page node into an isolated container so html2canvas
  // renders from a clean parent chain (no inherited opacity/position issues).
  const tempContainer = document.createElement("div");
  tempContainer.style.cssText =
    "position: fixed; left: 0px; top: 0px; z-index: 2147483647; " +
    "width: " + RESUME_PAGE_WIDTH + "px; height: " + RESUME_PAGE_HEIGHT + "px; " +
    "overflow: visible; background: white; pointer-events: none;";
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.opacity = "1";
  clone.style.width = RESUME_PAGE_WIDTH + "px";
  clone.style.height = RESUME_PAGE_HEIGHT + "px";
  tempContainer.appendChild(clone);
  document.body.appendChild(tempContainer);

  await waitForNextPaint();

  try {
    const canvas = await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: getResumeExportScale(),
      useCORS: true,
      logging: false,
      width: RESUME_PAGE_WIDTH,
      height: RESUME_PAGE_HEIGHT,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      windowWidth: Math.max(RESUME_PAGE_WIDTH, 1200),
      windowHeight: Math.max(RESUME_PAGE_HEIGHT, 1600),
    });
    return canvas;
  } finally {
    document.body.removeChild(tempContainer);
  }
}

function toVisibleItems(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function resumeLinkLabel(value: string) {
  return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function styleForBlock(
  resume: ResumeRecord,
  block: ResumeDesignBlockKey,
  options?: { includePadding?: boolean; includeColor?: boolean }
): CSSProperties {
  const style = resume.content.design.styles[block];
  const includePadding = options?.includePadding ?? true;
  const includeColor = options?.includeColor ?? true;

  return {
    fontSize: `${style.fontSize}px`,
    ...(includeColor ? { color: style.color } : {}),
    ...(includePadding
      ? {
          paddingTop: `${style.paddingTop}px`,
          paddingRight: `${style.paddingRight}px`,
          paddingBottom: `${style.paddingBottom}px`,
          paddingLeft: `${style.paddingLeft}px`,
        }
      : {}),
  };
}

function blockProps(
  resume: ResumeRecord,
  block: ResumeDesignBlockKey,
  selectedDesignBlock: ResumeDesignBlockKey | null,
  interactiveDesignPreview?: boolean,
  options?: { includePadding?: boolean; includeColor?: boolean; extraStyle?: CSSProperties; targetKey?: string; label?: string }
) {
  const style = styleForBlock(resume, block, options);
  const isSelected = interactiveDesignPreview && selectedDesignBlock === block;

  return {
    "data-design-block": block,
    "data-design-target": options?.targetKey,
    "data-design-label": options?.label,
    style: {
      ...style,
      ...options?.extraStyle,
      cursor: interactiveDesignPreview ? "pointer" : undefined,
      outline: isSelected ? "2px solid #3b82f6" : undefined,
      outlineOffset: isSelected ? "2px" : undefined,
      borderRadius: isSelected ? "6px" : undefined,
    } as CSSProperties,
  };
}

function areOffsetListsEqual(previous: number[], next: number[]) {
  if (previous.length !== next.length) {
    return false;
  }

  return previous.every((offset, index) => Math.abs(offset - next[index]) < PAGE_BREAK_EPSILON);
}

function boundarySlicesBlock(boundary: number, blocks: SectionBounds[]) {
  return blocks.some(
    (block) =>
      block.height <= RESUME_PAGE_HEIGHT - PAGE_BREAK_EPSILON &&
      block.top < boundary - PAGE_BREAK_EPSILON &&
      block.bottom > boundary + PAGE_BREAK_EPSILON
  );
}

function buildPageOffsets(totalHeight: number, blocks: SectionBounds[], anchors: number[]) {
  const contentHeight = Math.max(totalHeight, RESUME_PAGE_HEIGHT);
  const offsets = [0];
  let start = 0;

  while (start < contentHeight - PAGE_BREAK_EPSILON) {
    const naturalEnd = Math.min(contentHeight, start + RESUME_PAGE_HEIGHT);

    if (naturalEnd >= contentHeight - PAGE_BREAK_EPSILON) {
      break;
    }

    const candidateEnds = Array.from(
      new Set(
        [Math.round(naturalEnd)].concat(
          anchors.filter(
            (anchorTop) => anchorTop > start + PAGE_BREAK_EPSILON && anchorTop <= naturalEnd + PAGE_BREAK_EPSILON
          )
        )
      )
    )
      .sort((left, right) => right - left);

    const safeEnd =
      candidateEnds.find((candidateEnd) => {
        if (candidateEnd - start > RESUME_PAGE_HEIGHT + PAGE_BREAK_EPSILON) {
          return false;
        }

        if (candidateEnd >= contentHeight - PAGE_BREAK_EPSILON) {
          return true;
        }

        return !boundarySlicesBlock(candidateEnd, blocks);
      }) ??
      candidateEnds.find(
        (candidateEnd) =>
          candidateEnd > start + PAGE_BREAK_EPSILON &&
          candidateEnd - start <= RESUME_PAGE_HEIGHT + PAGE_BREAK_EPSILON &&
          !boundarySlicesBlock(candidateEnd, blocks)
      ) ??
      Math.round(naturalEnd);

    const nextOffset = Math.min(contentHeight, safeEnd);

    if (nextOffset <= start + PAGE_BREAK_EPSILON) {
      break;
    }

    offsets.push(nextOffset);
    start = nextOffset;
  }

  return offsets;
}

function getMeasuredPageLayout(measureNode: HTMLElement): MeasuredPageLayout {
  const measureRect = measureNode.getBoundingClientRect();
  const measuredNodes = Array.from(
    measureNode.querySelectorAll<HTMLElement>("[data-resume-section], [data-resume-break-block]")
  );
  const measuredBounds = measuredNodes
    .map((node) => {
      const rect = node.getBoundingClientRect();
      const top = Math.max(0, rect.top - measureRect.top);
      const height = Math.max(0, rect.height);
      return {
        node,
        top,
        bottom: top + height,
        height,
      };
    })
    .filter((bound) => bound.height > PAGE_BREAK_EPSILON);
  const anchors = Array.from(
    new Set(measuredBounds.map((bound) => Math.round(bound.top)).filter((top) => top > PAGE_BREAK_EPSILON))
  ).sort((a, b) => a - b);
  const candidates = measuredNodes.filter((node) => {
    if (!node.hasAttribute("data-resume-section")) {
      return true;
    }

    return !node.querySelector("[data-resume-break-block]");
  });

  const blocks = measuredBounds
    .filter((bound) => candidates.includes(bound.node))
    .map((bound) => ({
      top: bound.top,
      bottom: bound.bottom,
      height: bound.height,
    }))
    .filter((section) => section.height > PAGE_BREAK_EPSILON)
    .sort((a, b) => a.top - b.top);

  return {
    anchors,
    blocks,
    contentBottom: Math.ceil(
      Math.max(
        measureNode.scrollHeight,
        measureRect.height,
        measuredBounds.reduce((maximum, bound) => Math.max(maximum, bound.bottom), 0),
        RESUME_PAGE_HEIGHT
      )
    ),
  };
}

function clampFreeformPlacement(
  placement: ResumeFreeformSectionPlacement,
  blockHeight: number
): ResumeFreeformSectionPlacement {
  const width = clampNumber(
    placement.width,
    FREEFORM_MIN_BLOCK_WIDTH,
    RESUME_PAGE_WIDTH - FREEFORM_CANVAS_MARGIN * 2
  );
  const maxX = Math.max(FREEFORM_CANVAS_MARGIN, RESUME_PAGE_WIDTH - FREEFORM_CANVAS_MARGIN - width);
  const maxY = Math.max(
    FREEFORM_CANVAS_MARGIN,
    RESUME_PAGE_HEIGHT - FREEFORM_CANVAS_MARGIN - Math.max(0, blockHeight)
  );

  return {
    page: Math.round(clampNumber(placement.page, 1, FREEFORM_MAX_PAGE_COUNT)),
    x: clampNumber(placement.x, FREEFORM_CANVAS_MARGIN, maxX),
    y: clampNumber(placement.y, FREEFORM_CANVAS_MARGIN, maxY),
    width,
  };
}

function resolveFreeformPlacements(
  placements: Partial<Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>>,
  blockHeights: Partial<Record<ResumeCanvasSectionKey, number>>
) {
  return freeformSectionOrder.reduce<Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>>(
    (accumulator, key) => {
      const basePlacement = placements[key] || defaultFreeformPlacements[key];
      accumulator[key] = clampFreeformPlacement(basePlacement, blockHeights[key] || 0);
      return accumulator;
    },
    {} as Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>
  );
}

function arePlacementMapsEqual(
  previous: Partial<Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>>,
  next: Partial<Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>>
) {
  return freeformSectionOrder.every((key) => {
    const previousPlacement = previous[key];
    const nextPlacement = next[key];

    if (!previousPlacement || !nextPlacement) {
      return previousPlacement === nextPlacement;
    }

    return (
      previousPlacement.page === nextPlacement.page &&
      Math.abs(previousPlacement.x - nextPlacement.x) < PAGE_BREAK_EPSILON &&
      Math.abs(previousPlacement.y - nextPlacement.y) < PAGE_BREAK_EPSILON &&
      Math.abs(previousPlacement.width - nextPlacement.width) < PAGE_BREAK_EPSILON
    );
  });
}

function areHeightMapsEqual(
  previous: Partial<Record<ResumeCanvasSectionKey, number>>,
  next: Partial<Record<ResumeCanvasSectionKey, number>>
) {
  return freeformSectionOrder.every(
    (key) => Math.abs((previous[key] || 0) - (next[key] || 0)) < PAGE_BREAK_EPSILON
  );
}

function getVisibleFreeformSectionKeys(resume: ResumeRecord) {
  const { contact, summary, experience, education, projects, skillGroups, achievements, certifications, languages, interests, references } =
    resume.content;
  const visible: ResumeCanvasSectionKey[] = ["header"];
  const contactItems = [
    contact.phone,
    contact.email,
    contact.location,
    contact.linkedin,
    contact.website,
    contact.github,
    contact.portfolio,
  ].filter(hasValue);

  if (contactItems.length) {
    visible.push("contact");
  }

  if (hasValue(summary)) {
    visible.push("summary");
  }

  if (
    experience.some(
      (item) =>
        hasValue(item.role) ||
        hasValue(item.company) ||
        hasValue(item.location) ||
        hasValue(item.startDate) ||
        hasValue(item.endDate) ||
        item.current ||
        toVisibleItems(item.bullets).length > 0
    )
  ) {
    visible.push("experience");
  }

  if (
    projects.some(
      (item) =>
        hasValue(item.name) ||
        hasValue(item.role) ||
        hasValue(item.link) ||
        hasValue(item.startDate) ||
        hasValue(item.endDate) ||
        toVisibleItems(item.bullets).length > 0
    )
  ) {
    visible.push("projects");
  }

  if (
    education.some(
      (item) =>
        hasValue(item.degree) ||
        hasValue(item.institution) ||
        hasValue(item.location) ||
        hasValue(item.startDate) ||
        hasValue(item.endDate) ||
        hasValue(item.score) ||
        hasValue(item.details)
    )
  ) {
    visible.push("education");
  }

  if (skillGroups.some((group) => hasValue(group.title) || toVisibleItems(group.items).length > 0)) {
    visible.push("skills");
  }

  if (achievements.some((item) => hasValue(item.title) || hasValue(item.detail))) {
    visible.push("achievements");
  }

  if (languages.some(hasValue)) {
    visible.push("languages");
  }

  if (certifications.some((item) => hasValue(item.title) || hasValue(item.issuer) || hasValue(item.year))) {
    visible.push("certifications");
  }

  if (interests.some(hasValue)) {
    visible.push("interests");
  }

  if (
    references.some(
      (item) =>
        hasValue(item.name) ||
        hasValue(item.role) ||
        hasValue(item.company) ||
        hasValue(item.phone) ||
        hasValue(item.email)
    )
  ) {
    visible.push("references");
  }

  return visible;
}

function handleDesignBlockSelection(
  event: { target: EventTarget | null; preventDefault: () => void; stopPropagation: () => void },
  interactiveDesignPreview: boolean | undefined,
  onSelectDesignBlock?: (selection: ResumeDesignSelection) => void
) {
  if (!interactiveDesignPreview || !onSelectDesignBlock) {
    return;
  }

  const target = event.target as HTMLElement | null;
  const styleNode = target?.closest<HTMLElement>("[data-design-block]");
  const block = styleNode?.dataset.designBlock as ResumeDesignBlockKey | undefined;
  const targetKey = styleNode?.dataset.designTarget || null;
  const label = styleNode?.dataset.designLabel || null;

  if (!block) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  onSelectDesignBlock({
    block,
    targetKey,
    label,
  });
}

function renderRichLines(
  items: string[],
  resume: ResumeRecord,
  selectedDesignBlock: ResumeDesignBlockKey | null,
  interactiveDesignPreview?: boolean
) {
  return toVisibleItems(items).map((item) => (
    <li
      key={item}
      className="leading-6 text-slate-700"
      {...blockProps(resume, "body", selectedDesignBlock, interactiveDesignPreview)}
    >
      {item}
    </li>
  ));
}

function getFreeformTemplateSkin(resume: ResumeRecord) {
  const { pageBackground, primaryColor, panelColor } = resume.content.design.theme;

  if (resume.template_key === "ats_classic") {
    return {
      cardBackground: pageBackground,
      cardBorder: withAlpha(primaryColor, 0.18),
      toolbarBackground: withAlpha(primaryColor, 0.05),
      toolbarBorder: withAlpha(primaryColor, 0.14),
      titleColor: primaryColor,
      titleRule: true,
      pagePatternColor: withAlpha(primaryColor, 0.045),
    };
  }

  if (resume.template_key === "sidebar_professional") {
    return {
      cardBackground: withAlpha(panelColor, 0.06),
      cardBorder: withAlpha(panelColor, 0.16),
      toolbarBackground: withAlpha(panelColor, 0.1),
      toolbarBorder: withAlpha(panelColor, 0.12),
      titleColor: primaryColor,
      titleRule: false,
      pagePatternColor: withAlpha(panelColor, 0.055),
    };
  }

  return {
    cardBackground: withAlpha(pageBackground, 0.97),
    cardBorder: withAlpha(panelColor, 0.16),
    toolbarBackground: withAlpha(panelColor, 0.06),
    toolbarBorder: withAlpha(panelColor, 0.12),
    titleColor: primaryColor,
    titleRule: false,
    pagePatternColor: withAlpha(panelColor, 0.06),
  };
}

function EmptySectionHint({ message }: { message: string }) {
  return <p className="text-sm leading-6 text-slate-400">{message}</p>;
}

function FreeformSectionShell({
  resume,
  sectionKey,
  toolbarLabel,
  title,
  placement,
  selectedDesignBlock,
  interactiveDesignPreview,
  interactiveLayoutPreview,
  dragging,
  onMovePage,
  onStartDrag,
  measureOnly,
  children,
}: {
  resume: ResumeRecord;
  sectionKey: ResumeCanvasSectionKey;
  toolbarLabel: string;
  title?: string | null;
  placement: ResumeFreeformSectionPlacement;
  selectedDesignBlock: ResumeDesignBlockKey | null;
  interactiveDesignPreview?: boolean;
  interactiveLayoutPreview?: boolean;
  dragging?: boolean;
  onMovePage?: (sectionKey: ResumeCanvasSectionKey, delta: number) => void;
  onStartDrag?: (sectionKey: ResumeCanvasSectionKey, event: ReactPointerEvent<HTMLButtonElement>) => void;
  measureOnly?: boolean;
  children: React.ReactNode;
}) {
  const skin = getFreeformTemplateSkin(resume);

  return (
    <section
      data-resume-section={sectionKey}
      data-freeform-block={sectionKey}
      className={measureOnly ? "mb-4" : "absolute"}
      style={
        measureOnly
          ? {
              width: placement.width,
            }
          : {
              left: placement.x,
              top: placement.y,
              width: placement.width,
            }
      }
    >
      <div
        className="overflow-hidden rounded-[24px] border"
        style={{
          borderColor: skin.cardBorder,
          backgroundColor: skin.cardBackground,
          boxShadow: dragging
            ? "0 28px 80px rgba(15,23,42,0.22)"
            : "0 16px 42px rgba(15,23,42,0.10)",
        }}
      >
        {interactiveLayoutPreview && !measureOnly ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2"
            style={{
              borderColor: skin.toolbarBorder,
              backgroundColor: skin.toolbarBackground,
            }}
          >
            <div className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              <GripVertical className="h-3.5 w-3.5" />
              <span className="truncate">{toolbarLabel}</span>
            </div>

            <div className="ml-auto inline-flex flex-wrap items-center justify-end gap-1.5">
              <span className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                P{placement.page}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onMovePage?.(sectionKey, -1);
                }}
                disabled={placement.page <= 1}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Move ${toolbarLabel} to previous page`}
                title="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onMovePage?.(sectionKey, 1);
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                aria-label={`Move ${toolbarLabel} to next page`}
                title="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onPointerDown={(event) => onStartDrag?.(sectionKey, event)}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${
                  dragging
                    ? "border-brand bg-brand text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                style={{ touchAction: "none" }}
                aria-label={`Drag ${toolbarLabel}`}
                title="Drag"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        <div className="px-5 py-4">
          {title ? (
            <div>
              <h3
                className="text-[14px] font-extrabold uppercase tracking-[0.18em]"
                {...blockProps(resume, "sectionTitle", selectedDesignBlock, interactiveDesignPreview, {
                  includeColor: false,
                  extraStyle: { color: skin.titleColor },
                })}
              >
                {title}
              </h3>
              {skin.titleRule ? (
                <div
                  className="mt-2 h-[2px] w-full rounded-full"
                  style={{ backgroundColor: withAlpha(skin.titleColor, 0.9) }}
                />
              ) : null}
            </div>
          ) : null}
          <div className={title ? "mt-4" : ""}>{children}</div>
        </div>
      </div>
    </section>
  );
}

function FreeformSectionCard({
  resume,
  sectionKey,
  placement,
  selectedDesignBlock,
  interactiveDesignPreview,
  interactiveLayoutPreview,
  dragging,
  onMovePage,
  onStartDrag,
  showPlaceholder,
  measureOnly,
}: {
  resume: ResumeRecord;
  sectionKey: ResumeCanvasSectionKey;
  placement: ResumeFreeformSectionPlacement;
  selectedDesignBlock: ResumeDesignBlockKey | null;
  interactiveDesignPreview?: boolean;
  interactiveLayoutPreview?: boolean;
  dragging?: boolean;
  onMovePage?: (sectionKey: ResumeCanvasSectionKey, delta: number) => void;
  onStartDrag?: (sectionKey: ResumeCanvasSectionKey, event: ReactPointerEvent<HTMLButtonElement>) => void;
  showPlaceholder?: boolean;
  measureOnly?: boolean;
}) {
  const { contact, summary, experience, education, projects, skillGroups, achievements, certifications, languages, interests, references } =
    resume.content;
  const accent = resume.content.design.theme.primaryColor;
  const pageBackground = resume.content.design.theme.pageBackground;
  const panelColor = resume.content.design.theme.panelColor;
  const headerTextColor = contrastText(panelColor);
  const contactItems = [
    contact.phone,
    contact.email,
    contact.location,
    contact.linkedin,
    contact.website,
    contact.github,
    contact.portfolio,
  ].filter(hasValue);

  if (sectionKey === "header") {
    const sidebarTint = withAlpha(panelColor, 0.12);

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Header"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        {resume.template_key === "ats_classic" ? (
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              Resume
            </p>
            <h1
              className="mt-2 font-[Space_Grotesk] text-[36px] font-bold tracking-tight text-slate-900"
              {...blockProps(resume, "name", selectedDesignBlock, interactiveDesignPreview)}
            >
              {contact.fullName || "Your Name"}
            </h1>
            {contact.role ? (
              <p
                className="mt-2 text-[20px] font-semibold"
                {...blockProps(resume, "role", selectedDesignBlock, interactiveDesignPreview, {
                  includeColor: false,
                  extraStyle: { color: accent },
                })}
              >
                {contact.role}
              </p>
            ) : null}
            <div
              className="mx-auto mt-4 h-[2px] w-full max-w-[240px] rounded-full"
              style={{ backgroundColor: withAlpha(accent, 0.9) }}
            />
          </div>
        ) : resume.template_key === "sidebar_professional" ? (
          <div
            className="flex items-start gap-4 rounded-[22px] border px-5 py-5"
            style={{
              borderColor: withAlpha(panelColor, 0.14),
              backgroundColor: sidebarTint,
            }}
          >
            {contact.photoUrl ? (
              <img
                src={contact.photoUrl}
                alt={contact.fullName || "Resume portrait"}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold"
                style={{
                  backgroundColor: withAlpha(panelColor, 0.18),
                  color: contrastText(pageBackground),
                }}
              >
                {(contact.fullName || "SS").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                Profile
              </p>
              <h1
                className="mt-2 font-[Space_Grotesk] text-[32px] font-bold tracking-tight text-slate-900"
                {...blockProps(resume, "name", selectedDesignBlock, interactiveDesignPreview)}
              >
                {contact.fullName || "Your Name"}
              </h1>
              {contact.role ? (
                <p
                  className="mt-2 text-[15px] font-semibold uppercase tracking-[0.18em] text-slate-600"
                  {...blockProps(resume, "role", selectedDesignBlock, interactiveDesignPreview)}
                >
                  {contact.role}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-[22px] px-5 py-5"
            style={{
              backgroundColor: panelColor,
              color: headerTextColor,
            }}
          >
            <div className="flex items-start gap-5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em]" style={{ color: withAlpha(headerTextColor, 0.72) }}>
                  Resume
                </p>
                <h1
                  className="mt-2 font-[Space_Grotesk] text-[36px] font-bold tracking-tight"
                  {...blockProps(resume, "name", selectedDesignBlock, interactiveDesignPreview, {
                    includeColor: false,
                    extraStyle: { color: headerTextColor },
                  })}
                >
                  {contact.fullName || "Your Name"}
                </h1>
                {contact.role ? (
                  <p
                    className="mt-2 text-[20px] font-semibold"
                    {...blockProps(resume, "role", selectedDesignBlock, interactiveDesignPreview, {
                      includeColor: false,
                      extraStyle: { color: accent },
                    })}
                  >
                    {contact.role}
                  </p>
                ) : null}
              </div>

              {contact.photoUrl ? (
                <img
                  src={contact.photoUrl}
                  alt={contact.fullName || "Resume portrait"}
                  className="h-24 w-24 rounded-[24px] object-cover"
                />
              ) : (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-[24px] text-3xl font-bold"
                  style={{
                    backgroundColor: withAlpha(headerTextColor, 0.12),
                    color: headerTextColor,
                  }}
                >
                  {(contact.fullName || "SS").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}
      </FreeformSectionShell>
    );
  }

  if (sectionKey === "contact") {
    if (!contactItems.length && !showPlaceholder) {
      return null;
    }

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Contact"
        title="Contact"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        <div className="space-y-2">
          {contactItems.length ? (
            contactItems.map((item) => (
              <p
                key={item}
                className="leading-6 text-slate-700"
                {...blockProps(resume, "meta", selectedDesignBlock, interactiveDesignPreview)}
              >
                {resumeLinkLabel(item)}
              </p>
            ))
          ) : (
            <EmptySectionHint message="Add phone, email, links, or location to populate this card." />
          )}
        </div>
      </FreeformSectionShell>
    );
  }

  if (sectionKey === "summary") {
    if (!hasValue(summary) && !showPlaceholder) {
      return null;
    }

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Summary"
        title="Professional Summary"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        {hasValue(summary) ? (
          <p className="leading-7 text-slate-700" {...blockProps(resume, "body", selectedDesignBlock, interactiveDesignPreview)}>
            {summary}
          </p>
        ) : (
          <EmptySectionHint message="Drop a professional summary here once you add it in the editor." />
        )}
      </FreeformSectionShell>
    );
  }

  if (sectionKey === "experience") {
    const hasExperience = experience.some(
      (item) =>
        hasValue(item.role) ||
        hasValue(item.company) ||
        hasValue(item.location) ||
        hasValue(item.startDate) ||
        hasValue(item.endDate) ||
        item.current ||
        toVisibleItems(item.bullets).length > 0
    );

    if (!hasExperience && !showPlaceholder) {
      return null;
    }

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Experience"
        title="Work Experience"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        <div className="space-y-5">
          {hasExperience ? (
            experience.map((item) => {
              const bullets = toVisibleItems(item.bullets);
              if (!item.role && !item.company && !item.location && !bullets.length && !item.startDate && !item.endDate && !item.current) {
                return null;
              }

              return (
                <div key={item.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[18px] font-bold text-slate-900">{item.role || "Role title"}</p>
                      <p className="mt-1 font-semibold text-slate-600">
                        {[item.company, item.location].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    <p
                      className="text-right text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                      {...blockProps(resume, "meta", selectedDesignBlock, interactiveDesignPreview)}
                    >
                      {formatResumeDateRange(item)}
                    </p>
                  </div>
                  {bullets.length ? (
                    <ul className="mt-3 list-disc space-y-1.5 pl-5">
                      {renderRichLines(bullets, resume, selectedDesignBlock, interactiveDesignPreview)}
                    </ul>
                  ) : null}
                </div>
              );
            })
          ) : (
            <EmptySectionHint message="Add experience entries, then drag this section wherever you want it." />
          )}
        </div>
      </FreeformSectionShell>
    );
  }

  if (sectionKey === "projects") {
    const hasProjects = projects.some(
      (item) =>
        hasValue(item.name) ||
        hasValue(item.role) ||
        hasValue(item.link) ||
        hasValue(item.startDate) ||
        hasValue(item.endDate) ||
        toVisibleItems(item.bullets).length > 0
    );

    if (!hasProjects && !showPlaceholder) {
      return null;
    }

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Projects"
        title="Projects"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        <div className="space-y-4">
          {hasProjects ? (
            projects.map((item) => {
              const bullets = toVisibleItems(item.bullets);
              if (!item.name && !item.role && !item.link && !bullets.length) {
                return null;
              }

              return (
                <div key={item.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[17px] font-bold text-slate-900">{item.name || "Project name"}</p>
                      <p className="mt-1 text-slate-600">{item.role}</p>
                    </div>
                    {(item.link || item.startDate || item.endDate) ? (
                      <div className="text-right">
                        {item.link ? (
                          <a
                            href={normalizeUrl(item.link)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[12px] font-semibold underline"
                            {...blockProps(resume, "meta", selectedDesignBlock, interactiveDesignPreview, {
                              includeColor: false,
                              extraStyle: { color: accent },
                            })}
                          >
                            {resumeLinkLabel(item.link)}
                          </a>
                        ) : null}
                        {(item.startDate || item.endDate) ? (
                          <p
                            className="mt-1 text-[12px] uppercase tracking-[0.16em] text-slate-500"
                            {...blockProps(resume, "meta", selectedDesignBlock, interactiveDesignPreview)}
                          >
                            {formatResumeDateRange(item)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {bullets.length ? (
                    <ul className="mt-3 list-disc space-y-1.5 pl-5">
                      {renderRichLines(bullets, resume, selectedDesignBlock, interactiveDesignPreview)}
                    </ul>
                  ) : null}
                </div>
              );
            })
          ) : (
            <EmptySectionHint message="Projects can be dragged anywhere once you start adding them." />
          )}
        </div>
      </FreeformSectionShell>
    );
  }

  if (sectionKey === "education") {
    const hasEducation = education.some(
      (item) =>
        hasValue(item.degree) ||
        hasValue(item.institution) ||
        hasValue(item.location) ||
        hasValue(item.startDate) ||
        hasValue(item.endDate) ||
        hasValue(item.score) ||
        hasValue(item.details)
    );

    if (!hasEducation && !showPlaceholder) {
      return null;
    }

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Education"
        title="Education"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        <div className="space-y-4">
          {hasEducation ? (
            education.map((item) => {
              if (!item.degree && !item.institution && !item.details && !item.score) {
                return null;
              }

              return (
                <div key={item.id}>
                  <p className="text-[16px] font-bold text-slate-900">{item.degree || "Degree"}</p>
                  <p className="mt-1 font-semibold text-slate-600">{item.institution}</p>
                  <p
                    className="mt-1 text-[12px] uppercase tracking-[0.16em] text-slate-500"
                    {...blockProps(resume, "meta", selectedDesignBlock, interactiveDesignPreview)}
                  >
                    {[formatResumeDateRange(item), item.location].filter(Boolean).join(" • ")}
                  </p>
                  {[item.score, item.details].filter(Boolean).length ? (
                    <p className="mt-2 leading-6 text-slate-700" {...blockProps(resume, "body", selectedDesignBlock, interactiveDesignPreview)}>
                      {[item.score, item.details].filter(Boolean).join(" • ")}
                    </p>
                  ) : null}
                </div>
              );
            })
          ) : (
            <EmptySectionHint message="Keep an education card ready and place it exactly where you want." />
          )}
        </div>
      </FreeformSectionShell>
    );
  }

  if (sectionKey === "skills") {
    const hasSkills = skillGroups.some((group) => hasValue(group.title) || toVisibleItems(group.items).length > 0);

    if (!hasSkills && !showPlaceholder) {
      return null;
    }

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Skills"
        title="Skills"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        <div className="space-y-4">
          {hasSkills ? (
            skillGroups.map((group) => {
              const items = toVisibleItems(group.items);
              if (!items.length && !group.title.trim()) {
                return null;
              }

              return (
                <div key={group.id}>
                  <p className="font-bold text-slate-900">{group.title || "Skills"}</p>
                  {items.length ? (
                    <ul className="mt-2 list-disc space-y-1.5 pl-5">
                      {renderRichLines(items, resume, selectedDesignBlock, interactiveDesignPreview)}
                    </ul>
                  ) : null}
                </div>
              );
            })
          ) : (
            <EmptySectionHint message="Add skills later, but you can already position this card now." />
          )}
        </div>
      </FreeformSectionShell>
    );
  }

  if (sectionKey === "achievements") {
    const hasAchievements = achievements.some((item) => hasValue(item.title) || hasValue(item.detail));

    if (!hasAchievements && !showPlaceholder) {
      return null;
    }

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Achievements"
        title="Achievements"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        {hasAchievements ? (
          <ul className="list-disc space-y-2 pl-5">
            {achievements.map((item) =>
              item.title || item.detail ? (
                <li
                  key={item.id}
                  className="leading-6 text-slate-700"
                  {...blockProps(resume, "body", selectedDesignBlock, interactiveDesignPreview)}
                >
                  <span className="font-bold text-slate-900">{item.title}</span>
                  {item.detail ? `: ${item.detail}` : ""}
                </li>
              ) : null
            )}
          </ul>
        ) : (
          <EmptySectionHint message="Use this space for awards, wins, or standout results." />
        )}
      </FreeformSectionShell>
    );
  }

  if (sectionKey === "languages") {
    if (!languages.some(hasValue) && !showPlaceholder) {
      return null;
    }

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Languages"
        title="Languages"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        {languages.some(hasValue) ? (
          <ul className="list-disc space-y-1.5 pl-5">
            {renderRichLines(languages, resume, selectedDesignBlock, interactiveDesignPreview)}
          </ul>
        ) : (
          <EmptySectionHint message="Keep a language block ready even before you fill it in." />
        )}
      </FreeformSectionShell>
    );
  }

  if (sectionKey === "certifications") {
    const hasCertifications = certifications.some((item) => hasValue(item.title) || hasValue(item.issuer) || hasValue(item.year));

    if (!hasCertifications && !showPlaceholder) {
      return null;
    }

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Certifications"
        title="Certifications"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        {hasCertifications ? (
          <ul className="list-disc space-y-1.5 pl-5">
            {certifications.map((item) =>
              item.title || item.issuer || item.year ? (
                <li
                  key={item.id}
                  className="leading-6 text-slate-700"
                  {...blockProps(resume, "body", selectedDesignBlock, interactiveDesignPreview)}
                >
                  <span className="font-bold text-slate-900">{item.title}</span>
                  {item.issuer ? ` • ${item.issuer}` : ""}
                  {item.year ? ` • ${item.year}` : ""}
                </li>
              ) : null
            )}
          </ul>
        ) : (
          <EmptySectionHint message="Certifications can stay parked here until you add them." />
        )}
      </FreeformSectionShell>
    );
  }

  if (sectionKey === "interests") {
    if (!interests.some(hasValue) && !showPlaceholder) {
      return null;
    }

    return (
      <FreeformSectionShell
        resume={resume}
        sectionKey={sectionKey}
        toolbarLabel="Interests"
        title="Interests"
        placement={placement}
        selectedDesignBlock={selectedDesignBlock}
        interactiveDesignPreview={interactiveDesignPreview}
        interactiveLayoutPreview={interactiveLayoutPreview}
        dragging={dragging}
        onMovePage={onMovePage}
        onStartDrag={onStartDrag}
        measureOnly={measureOnly}
      >
        {interests.some(hasValue) ? (
          <ul className="list-disc space-y-1.5 pl-5">
            {renderRichLines(interests, resume, selectedDesignBlock, interactiveDesignPreview)}
          </ul>
        ) : (
          <EmptySectionHint message="Interests can be placed now and filled in later." />
        )}
      </FreeformSectionShell>
    );
  }

  const hasReferences = references.some(
    (item) =>
      hasValue(item.name) ||
      hasValue(item.email) ||
      hasValue(item.phone) ||
      hasValue(item.role) ||
      hasValue(item.company)
  );

  if (!hasReferences && !showPlaceholder) {
    return null;
  }

  return (
    <FreeformSectionShell
      resume={resume}
      sectionKey={sectionKey}
      toolbarLabel="References"
      title="References"
      placement={placement}
      selectedDesignBlock={selectedDesignBlock}
      interactiveDesignPreview={interactiveDesignPreview}
      interactiveLayoutPreview={interactiveLayoutPreview}
      dragging={dragging}
      onMovePage={onMovePage}
      onStartDrag={onStartDrag}
      measureOnly={measureOnly}
    >
      {hasReferences ? (
        <div className="grid gap-3 md:grid-cols-2">
          {references.map((item) =>
            item.name || item.email || item.phone || item.role || item.company ? (
              <div
                key={item.id}
                className="rounded-[18px] border px-3 py-3"
                style={{
                  borderColor: withAlpha(panelColor, 0.12),
                  backgroundColor: withAlpha(panelColor, 0.04),
                }}
              >
                <p className="font-bold text-slate-900">{item.name || "Reference"}</p>
                <p className="mt-1 text-slate-700" {...blockProps(resume, "body", selectedDesignBlock, interactiveDesignPreview)}>
                  {[item.role, item.company].filter(Boolean).join(" • ")}
                </p>
                {item.phone ? (
                  <p className="mt-1 text-[12px] text-slate-500" {...blockProps(resume, "meta", selectedDesignBlock, interactiveDesignPreview)}>
                    {item.phone}
                  </p>
                ) : null}
                {item.email ? (
                  <p className="mt-1 text-[12px] text-slate-500" {...blockProps(resume, "meta", selectedDesignBlock, interactiveDesignPreview)}>
                    {item.email}
                  </p>
                ) : null}
              </div>
            ) : null
          )}
        </div>
      ) : (
        <EmptySectionHint message="References can stay here as a placeholder until you add them." />
      )}
    </FreeformSectionShell>
  );
}

function PreviewPage({
  resume,
  pageOffset,
  clipHeight,
  scale,
  exportMode,
  selectedDesignBlock,
  selectedDesignTargetKey,
  onSelectDesignBlock,
  interactiveDesignPreview,
  plainPage,
}: {
  resume: ResumeRecord;
  pageOffset: number;
  clipHeight: number;
  scale: number;
  exportMode?: boolean;
  selectedDesignBlock?: ResumeDesignBlockKey | null;
  selectedDesignTargetKey?: string | null;
  onSelectDesignBlock?: (selection: ResumeDesignSelection) => void;
  interactiveDesignPreview?: boolean;
  plainPage?: boolean;
}) {
  const scaledWidth = RESUME_PAGE_WIDTH * scale;
  const scaledHeight = RESUME_PAGE_HEIGHT * scale;
  const framedPage = !exportMode && !plainPage;
  const pageShellStyle =
    resume.template_key === "sidebar_professional"
      ? {
          backgroundColor: resume.content.design.theme.pageBackground,
          backgroundImage: `linear-gradient(to right, ${withAlpha(
            resume.content.design.theme.panelColor,
            0.16
          )} 0px, ${withAlpha(
            resume.content.design.theme.panelColor,
            0.16
          )} 230px, ${resume.content.design.theme.pageBackground} 230px, ${
            resume.content.design.theme.pageBackground
          } 100%)`,
        }
      : {
          backgroundColor: resume.content.design.theme.pageBackground,
        };

  return (
    <div
      className={exportMode ? "" : "mx-auto"}
      style={{
        width: exportMode ? RESUME_PAGE_WIDTH : scaledWidth,
        height: exportMode ? RESUME_PAGE_HEIGHT : scaledHeight,
      }}
    >
      <div
        data-resume-export-page={exportMode ? "true" : undefined}
        className={`overflow-hidden bg-white ${framedPage ? "rounded-[28px] border border-slate-200/90" : ""}`}
        style={{
          width: RESUME_PAGE_WIDTH,
          height: RESUME_PAGE_HEIGHT,
          transform: exportMode ? undefined : `scale(${scale})`,
          transformOrigin: "top left",
          ...pageShellStyle,
          boxShadow: framedPage ? "0 24px 60px rgba(15,23,42,0.16)" : "none",
        }}
      >
        <div
          style={{
            height: clipHeight,
            overflow: "hidden",
          }}
        >
          <div
            onClick={(event) =>
              handleDesignBlockSelection(event, !exportMode && interactiveDesignPreview, onSelectDesignBlock)
            }
            style={{
              transform: `translateY(-${pageOffset}px)`,
            }}
          >
            <ResumeTemplateRenderer
              resume={resume}
              selectedDesignBlock={selectedDesignBlock}
              selectedDesignTargetKey={selectedDesignTargetKey}
              interactiveDesignPreview={interactiveDesignPreview && !exportMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FreeformPreviewPage({
  resume,
  pageNumber,
  pageRef,
  scale,
  exportMode,
  selectedDesignBlock,
  onSelectDesignBlock,
  interactiveDesignPreview,
  interactiveLayoutPreview,
  plainPage,
  placements,
  visibleSectionKeys,
  showPlaceholders,
  draggingSectionKey,
  onMovePage,
  onStartDrag,
}: {
  resume: ResumeRecord;
  pageNumber: number;
  pageRef?: (node: HTMLDivElement | null) => void;
  scale: number;
  exportMode?: boolean;
  selectedDesignBlock?: ResumeDesignBlockKey | null;
  onSelectDesignBlock?: (selection: ResumeDesignSelection) => void;
  interactiveDesignPreview?: boolean;
  interactiveLayoutPreview?: boolean;
  plainPage?: boolean;
  placements: Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>;
  visibleSectionKeys: ResumeCanvasSectionKey[];
  showPlaceholders?: boolean;
  draggingSectionKey?: ResumeCanvasSectionKey | null;
  onMovePage?: (sectionKey: ResumeCanvasSectionKey, delta: number) => void;
  onStartDrag?: (sectionKey: ResumeCanvasSectionKey, event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const scaledWidth = RESUME_PAGE_WIDTH * scale;
  const scaledHeight = RESUME_PAGE_HEIGHT * scale;
  const skin = getFreeformTemplateSkin(resume);
  const framedPage = !exportMode && !plainPage;
  const pageSections = visibleSectionKeys
    .filter((key) => placements[key].page === pageNumber)
    .sort((left, right) => placements[left].y - placements[right].y);

  return (
    <div
      ref={pageRef}
      className={exportMode ? "" : "mx-auto"}
      style={{
        width: exportMode ? RESUME_PAGE_WIDTH : scaledWidth,
        height: exportMode ? RESUME_PAGE_HEIGHT : scaledHeight,
      }}
    >
      <div
        data-resume-export-page={exportMode ? "true" : undefined}
        className={`overflow-hidden bg-white ${framedPage ? "rounded-[28px] border border-slate-200/90" : ""}`}
        style={{
          width: RESUME_PAGE_WIDTH,
          height: RESUME_PAGE_HEIGHT,
          transform: exportMode ? undefined : `scale(${scale})`,
          transformOrigin: "top left",
          backgroundColor: resume.content.design.theme.pageBackground,
          boxShadow: framedPage ? "0 24px 60px rgba(15,23,42,0.16)" : "none",
        }}
      >
        <div
          className="relative h-full w-full"
          onClick={(event) =>
            handleDesignBlockSelection(event, !exportMode && interactiveDesignPreview, onSelectDesignBlock)
          }
          style={{
            ...styleForBlock(resume, "body", { includePadding: false }),
            backgroundImage:
              interactiveLayoutPreview && !exportMode
                ? `linear-gradient(to right, ${skin.pagePatternColor} 1px, transparent 1px), linear-gradient(to bottom, ${skin.pagePatternColor} 1px, transparent 1px)`
                : undefined,
            backgroundSize: interactiveLayoutPreview && !exportMode ? "24px 24px" : undefined,
          }}
        >
          {pageSections.map((sectionKey) => (
            <FreeformSectionCard
              key={sectionKey}
              resume={resume}
              sectionKey={sectionKey}
              placement={placements[sectionKey]}
              selectedDesignBlock={selectedDesignBlock || null}
              interactiveDesignPreview={interactiveDesignPreview && !exportMode}
              interactiveLayoutPreview={interactiveLayoutPreview && !exportMode}
              showPlaceholder={showPlaceholders}
              dragging={draggingSectionKey === sectionKey}
              onMovePage={onMovePage}
              onStartDrag={onStartDrag}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const ResumePreview = forwardRef<ResumePreviewHandle, ResumePreviewProps>(
  function ResumePreview(
    {
      resume,
      onPageCountChange,
      onLayoutChange,
      freeformViewMode = "preview",
      emptyMessage = "Your live resume preview will appear here.",
      selectedDesignBlock = null,
      selectedDesignTargetKey = null,
      onSelectDesignBlock,
      interactiveDesignPreview,
      showPreviewChrome = true,
      showPageFrame,
    },
    ref
  ) {
    const measureRef = useRef<HTMLDivElement | null>(null);
    const exportRootRef = useRef<HTMLDivElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const dragCleanupRef = useRef<(() => void) | null>(null);
    const layoutRef = useRef(resume.content.design.layout);
    const [pageOffsets, setPageOffsets] = useState<number[]>([0]);
    const [scale, setScale] = useState(1);
    const [fontRenderKey, setFontRenderKey] = useState(0);
    const [freeformBlockHeights, setFreeformBlockHeights] = useState<
      Partial<Record<ResumeCanvasSectionKey, number>>
    >({});
    const [workingFreeformPlacements, setWorkingFreeformPlacements] = useState(
      resume.content.design.layout.freeform.placements
    );
    const [draggingSectionKey, setDraggingSectionKey] = useState<ResumeCanvasSectionKey | null>(null);

    layoutRef.current = resume.content.design.layout;

    const isFreeform = false;
    const interactiveLayoutPreview = Boolean(
      isFreeform && freeformViewMode === "arrange" && interactiveDesignPreview && onLayoutChange
    );
    const contentFreeformSectionKeys = useMemo(() => getVisibleFreeformSectionKeys(resume), [resume]);
    const previewFreeformSectionKeys = interactiveLayoutPreview
      ? freeformSectionOrder
      : contentFreeformSectionKeys;
    const resolvedFreeformPlacements = useMemo(
      () => resolveFreeformPlacements(workingFreeformPlacements, freeformBlockHeights),
      [freeformBlockHeights, workingFreeformPlacements]
    );
    const workingPlacementsRef = useRef(workingFreeformPlacements);
    const resolvedPlacementsRef = useRef(resolvedFreeformPlacements);
    const blockHeightsRef = useRef(freeformBlockHeights);
    const scaleRef = useRef(scale);
    const previewPageCountRef = useRef(1);

    useEffect(() => {
      workingPlacementsRef.current = workingFreeformPlacements;
    }, [workingFreeformPlacements]);

    useEffect(() => {
      resolvedPlacementsRef.current = resolvedFreeformPlacements;
    }, [resolvedFreeformPlacements]);

    useEffect(() => {
      blockHeightsRef.current = freeformBlockHeights;
    }, [freeformBlockHeights]);

    useEffect(() => {
      scaleRef.current = scale;
    }, [scale]);

    useEffect(() => {
      if (typeof document === "undefined" || !("fonts" in document)) {
        return;
      }

      let active = true;
      const fontSet = document.fonts;
      const handleFontChange = () => {
        if (!active) {
          return;
        }

        setFontRenderKey((current) => current + 1);
      };

      void fontSet.ready.then(() => {
        handleFontChange();
      });

      fontSet.addEventListener?.("loadingdone", handleFontChange);
      fontSet.addEventListener?.("loadingerror", handleFontChange);

      return () => {
        active = false;
        fontSet.removeEventListener?.("loadingdone", handleFontChange);
        fontSet.removeEventListener?.("loadingerror", handleFontChange);
      };
    }, []);

    useEffect(() => {
      setWorkingFreeformPlacements(resume.content.design.layout.freeform.placements);
    }, [resume.content.design.layout.freeform.placements]);

    const setWorkingPlacementsState = (
      nextPlacements: Partial<Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>>
    ) => {
      workingPlacementsRef.current = nextPlacements;
      setWorkingFreeformPlacements(nextPlacements);
    };

    const commitFreeformLayout = (
      nextPlacements: Partial<Record<ResumeCanvasSectionKey, ResumeFreeformSectionPlacement>>
    ) => {
      setWorkingPlacementsState(nextPlacements);
      onLayoutChange?.({
        ...layoutRef.current,
        mode: "freeform",
        freeform: {
          ...layoutRef.current.freeform,
          placements: nextPlacements,
        },
      });
    };

    const freeformPageCount = useMemo(() => {
      const highestPage = contentFreeformSectionKeys.reduce((maximum, key) => {
        return Math.max(maximum, resolvedFreeformPlacements[key].page);
      }, 1);

      return Math.max(1, highestPage);
    }, [contentFreeformSectionKeys, resolvedFreeformPlacements]);

    const previewFreeformContentPageCount = useMemo(() => {
      const highestPage = previewFreeformSectionKeys.reduce((maximum, key) => {
        return Math.max(maximum, resolvedFreeformPlacements[key].page);
      }, 1);

      return Math.max(1, highestPage);
    }, [previewFreeformSectionKeys, resolvedFreeformPlacements]);

    const previewFreeformPageCount = interactiveLayoutPreview
      ? Math.min(FREEFORM_MAX_PAGE_COUNT, previewFreeformContentPageCount + 1)
      : previewFreeformContentPageCount;

    previewPageCountRef.current = previewFreeformPageCount;

    const templatePages = useMemo(
      () =>
        pageOffsets.map((offset, index) => {
          const nextOffset = pageOffsets[index + 1];
          const rawHeight =
            typeof nextOffset === "number" ? nextOffset - offset : RESUME_PAGE_HEIGHT;

          return {
            index,
            offset,
            clipHeight: Math.max(1, Math.min(RESUME_PAGE_HEIGHT, Math.ceil(rawHeight))),
          };
        }),
      [pageOffsets]
    );

    useLayoutEffect(() => {
      if (isFreeform) {
        return;
      }

      const measureNode = measureRef.current;

      if (!measureNode) {
        return;
      }

      let frameId = 0;

      const measure = () => {
        const measuredLayout = getMeasuredPageLayout(measureNode);
        const totalHeight = Math.max(measuredLayout.contentBottom, RESUME_PAGE_HEIGHT);
        const nextOffsets = buildPageOffsets(totalHeight, measuredLayout.blocks, measuredLayout.anchors);
        setPageOffsets((current) => (areOffsetListsEqual(current, nextOffsets) ? current : nextOffsets));
      };

      frameId = window.requestAnimationFrame(measure);

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }, [fontRenderKey, isFreeform, resume]);

    useLayoutEffect(() => {
      if (!isFreeform) {
        return;
      }

      const measureNode = measureRef.current;

      if (!measureNode) {
        return;
      }

      let frameId = 0;

      const measure = () => {
        const nextHeights = previewFreeformSectionKeys.reduce<
          Partial<Record<ResumeCanvasSectionKey, number>>
        >((accumulator, key) => {
          const node = measureNode.querySelector<HTMLElement>(`[data-freeform-measure-key="${key}"]`);
          if (node) {
            accumulator[key] = Math.ceil(node.getBoundingClientRect().height);
          }
          return accumulator;
        }, {});

        setFreeformBlockHeights((current) => (areHeightMapsEqual(current, nextHeights) ? current : nextHeights));
      };

      frameId = window.requestAnimationFrame(measure);

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }, [isFreeform, previewFreeformSectionKeys, resume, resolvedFreeformPlacements]);

    useEffect(() => {
      if (!isFreeform || draggingSectionKey) {
        return;
      }

      if (arePlacementMapsEqual(workingPlacementsRef.current, resolvedFreeformPlacements)) {
        return;
      }

      setWorkingPlacementsState(resolvedFreeformPlacements);
      onLayoutChange?.({
        ...layoutRef.current,
        mode: "freeform",
        freeform: {
          ...layoutRef.current.freeform,
          placements: resolvedFreeformPlacements,
        },
      });
    }, [draggingSectionKey, isFreeform, onLayoutChange, resolvedFreeformPlacements]);

    useEffect(() => {
      const pageCount = isFreeform ? freeformPageCount : templatePages.length;
      onPageCountChange?.(pageCount);
    }, [freeformPageCount, isFreeform, onPageCountChange, templatePages.length]);

    useEffect(() => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const updateScale = () => {
        const nextScale = Math.min(1, Math.max(0.36, viewport.clientWidth / RESUME_PAGE_WIDTH));
        setScale((current) => (Math.abs(current - nextScale) < 0.005 ? current : nextScale));
      };

      updateScale();

      if (typeof ResizeObserver === "undefined") {
        window.addEventListener("resize", updateScale);
        return () => {
          window.removeEventListener("resize", updateScale);
        };
      }

      const observer = new ResizeObserver(() => updateScale());
      observer.observe(viewport);

      return () => {
        observer.disconnect();
      };
    }, []);

    useEffect(() => {
      return () => {
        dragCleanupRef.current?.();
      };
    }, []);

    const moveFreeformSectionByPage = (sectionKey: ResumeCanvasSectionKey, delta: number) => {
      const currentPlacement = resolvedPlacementsRef.current[sectionKey];
      const nextPlacement = clampFreeformPlacement(
        {
          ...currentPlacement,
          page: currentPlacement.page + delta,
        },
        blockHeightsRef.current[sectionKey] || 0
      );

      commitFreeformLayout({
        ...workingPlacementsRef.current,
        [sectionKey]: nextPlacement,
      });
    };

    const resolveTargetPage = (clientX: number, clientY: number) => {
      const pageEntries = Array.from({ length: previewPageCountRef.current }, (_, index) => index + 1)
        .map((pageNumber) => {
          const node = pageRefs.current[pageNumber];
          return node
            ? {
                pageNumber,
                rect: node.getBoundingClientRect(),
              }
            : null;
        })
        .filter(Boolean) as Array<{ pageNumber: number; rect: DOMRect }>;

      if (!pageEntries.length) {
        return null;
      }

      const directMatch = pageEntries.find(
        ({ rect }) =>
          clientX >= rect.left - FREEFORM_PAGE_DROP_BUFFER &&
          clientX <= rect.right + FREEFORM_PAGE_DROP_BUFFER &&
          clientY >= rect.top - FREEFORM_PAGE_DROP_BUFFER &&
          clientY <= rect.bottom + FREEFORM_PAGE_DROP_BUFFER
      );

      if (directMatch) {
        return directMatch;
      }

      return pageEntries.reduce((best, entry) => {
        const dx =
          clientX < entry.rect.left
            ? entry.rect.left - clientX
            : clientX > entry.rect.right
              ? clientX - entry.rect.right
              : 0;
        const dy =
          clientY < entry.rect.top
            ? entry.rect.top - clientY
            : clientY > entry.rect.bottom
              ? clientY - entry.rect.bottom
              : 0;
        const entryDistance = Math.hypot(dx, dy);

        if (!best || entryDistance < best.distance) {
          return {
            pageNumber: entry.pageNumber,
            rect: entry.rect,
            distance: entryDistance,
          };
        }

        return best;
      }, null as { pageNumber: number; rect: DOMRect; distance: number } | null);
    };

    const startFreeformDrag = (
      sectionKey: ResumeCanvasSectionKey,
      event: ReactPointerEvent<HTMLButtonElement>
    ) => {
      if (!interactiveLayoutPreview) {
        return;
      }

      const blockNode = event.currentTarget.closest<HTMLElement>("[data-freeform-block]");

      if (!blockNode) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      dragCleanupRef.current?.();

      const blockRect = blockNode.getBoundingClientRect();
      const pointerOffsetX = (event.clientX - blockRect.left) / scaleRef.current;
      const pointerOffsetY = (event.clientY - blockRect.top) / scaleRef.current;

      setDraggingSectionKey(sectionKey);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const targetPage = resolveTargetPage(moveEvent.clientX, moveEvent.clientY);

        if (!targetPage) {
          return;
        }

        const currentPlacement = resolvedPlacementsRef.current[sectionKey];
        const nextPlacement = clampFreeformPlacement(
          {
            ...currentPlacement,
            page: targetPage.pageNumber,
            x: (moveEvent.clientX - targetPage.rect.left) / scaleRef.current - pointerOffsetX,
            y: (moveEvent.clientY - targetPage.rect.top) / scaleRef.current - pointerOffsetY,
          },
          blockHeightsRef.current[sectionKey] || 0
        );

        setWorkingPlacementsState({
          ...workingPlacementsRef.current,
          [sectionKey]: nextPlacement,
        });
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        dragCleanupRef.current = null;
      };

      const handlePointerUp = () => {
        cleanup();
        const nextPlacements = resolveFreeformPlacements(
          workingPlacementsRef.current,
          blockHeightsRef.current
        );
        commitFreeformLayout(nextPlacements);
        setDraggingSectionKey(null);
      };

      dragCleanupRef.current = cleanup;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    };

    useImperativeHandle(
      ref,
      () => ({
        getPageCount: () => (isFreeform ? freeformPageCount : templatePages.length),
        exportPngPages: async () => {
          await waitForLayoutStability();
          const exportRoot = exportRootRef.current;

          if (!exportRoot) {
            throw new Error("Resume export is still preparing. Please try again.");
          }

          const pageNodes = Array.from(
            exportRoot.querySelectorAll<HTMLElement>('[data-resume-export-page="true"]')
          );

          if (!pageNodes.length) {
            throw new Error("No resume pages are ready for export.");
          }

          const filenameBase = slugifyResumeSeed(resume.title || resume.content.contact.fullName || "resume");
          const canvases: HTMLCanvasElement[] = [];

          for (let index = 0; index < pageNodes.length; index += 1) {
            const canvas = await renderResumeExportCanvas(pageNodes[index]);
            canvases.push(canvas);
            await waitForNextPaint();
          }

          for (let index = 0; index < canvases.length; index += 1) {
            const blob = await new Promise<Blob | null>((resolve) =>
              canvases[index].toBlob(resolve, "image/png")
            );

            if (!blob) {
              throw new Error("Could not create the PNG export file.");
            }

            const suffix = canvases.length > 1 ? `-page-${index + 1}` : "";
            await downloadBlobNatively(blob, `${filenameBase}${suffix}.png`);
            await waitForNextPaint();
          }
        },
        exportPdfPages: async () => {
          await waitForLayoutStability();
          const exportRoot = exportRootRef.current;

          if (!exportRoot) {
            throw new Error("Resume export is still preparing. Please try again.");
          }

          const pageNodes = Array.from(
            exportRoot.querySelectorAll<HTMLElement>('[data-resume-export-page="true"]')
          );

          if (!pageNodes.length) {
            throw new Error("No resume pages are ready for export.");
          }

          const { jsPDF } = await import("jspdf");
          const filenameBase = slugifyResumeSeed(resume.title || resume.content.contact.fullName || "resume");
          const canvases: HTMLCanvasElement[] = [];

          for (let index = 0; index < pageNodes.length; index += 1) {
            const canvas = await renderResumeExportCanvas(pageNodes[index]);
            canvases.push(canvas);
            await waitForNextPaint();
          }

          const orientation: "portrait" | "landscape" =
            RESUME_PAGE_WIDTH > RESUME_PAGE_HEIGHT ? "landscape" : "portrait";
          const pdf = new jsPDF({
            orientation,
            unit: "px",
            format: [RESUME_PAGE_WIDTH, RESUME_PAGE_HEIGHT],
            compress: true,
          });

          canvases.forEach((canvas, index) => {
            if (index > 0) {
              pdf.addPage([RESUME_PAGE_WIDTH, RESUME_PAGE_HEIGHT], orientation);
            }

            pdf.addImage(
              canvas.toDataURL("image/png"),
              "PNG",
              0,
              0,
              RESUME_PAGE_WIDTH,
              RESUME_PAGE_HEIGHT,
              "",
              "FAST"
            );
          });

          await downloadBlobNatively(pdf.output("blob"), `${filenameBase}.pdf`);
        },
      }),
      [freeformPageCount, isFreeform, resume, templatePages.length]
    );

    const previewPages = isFreeform
      ? Array.from({ length: previewFreeformPageCount }, (_, index) => index + 1)
      : templatePages.map((page) => page.index + 1);
    const exportPages = isFreeform
      ? Array.from({ length: freeformPageCount }, (_, index) => index + 1)
      : templatePages.map((page) => page.index + 1);
    const shouldShowPageFrame = showPageFrame ?? showPreviewChrome;

    return (
      <div className="space-y-4">
        <div
          ref={viewportRef}
          className={
            showPreviewChrome
              ? "rounded-[28px] border border-app-border bg-app-secondary/40 p-3 sm:p-4"
              : ""
          }
        >
          {showPreviewChrome ? (
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <p className="text-sm font-semibold text-app-text">Live Resume Preview</p>
                <p className="text-xs text-app-muted">
                  {(isFreeform ? freeformPageCount : templatePages.length)} page
                  {(isFreeform ? freeformPageCount : templatePages.length) === 1 ? "" : "s"} ready for share and export.
                </p>
                {interactiveLayoutPreview ? (
                  <p className="mt-1 text-xs font-semibold text-brand">
                    Drag section cards anywhere, or move them to the next page if they are getting cut off.
                  </p>
                ) : isFreeform && freeformViewMode === "preview" ? (
                  <p className="mt-1 text-xs font-semibold text-brand">
                    Freeform view is showing the clean layout exactly as it will look when shared or exported.
                  </p>
                ) : interactiveDesignPreview ? (
                  <p className="mt-1 text-xs font-semibold text-brand">
                    Click any preview text to edit its style.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            className={
              showPreviewChrome
                ? "space-y-0 pb-10 sm:pb-12"
                : shouldShowPageFrame
                  ? "space-y-6 pb-4 sm:space-y-8 sm:pb-8"
                  : "space-y-0 pb-10 sm:pb-12"
            }
          >
            {previewPages.length ? (
              previewPages.map((pageNumber, pageIndex) => (
                <Fragment key={pageNumber}>
                  {isFreeform ? (
                    <FreeformPreviewPage
                      resume={resume}
                      pageNumber={pageNumber}
                      pageRef={(node) => {
                        pageRefs.current[pageNumber] = node;
                      }}
                      scale={scale}
                      selectedDesignBlock={selectedDesignBlock}
                      onSelectDesignBlock={onSelectDesignBlock}
                      interactiveDesignPreview={interactiveDesignPreview}
                      interactiveLayoutPreview={interactiveLayoutPreview}
                      plainPage={!shouldShowPageFrame}
                      placements={resolvedFreeformPlacements}
                      visibleSectionKeys={previewFreeformSectionKeys}
                      showPlaceholders={interactiveLayoutPreview}
                      draggingSectionKey={draggingSectionKey}
                      onMovePage={moveFreeformSectionByPage}
                      onStartDrag={startFreeformDrag}
                    />
                  ) : (
                    <PreviewPage
                      resume={resume}
                      pageOffset={templatePages[pageNumber - 1].offset}
                      clipHeight={templatePages[pageNumber - 1].clipHeight}
                      scale={scale}
                      selectedDesignBlock={selectedDesignBlock}
                      selectedDesignTargetKey={selectedDesignTargetKey}
                      onSelectDesignBlock={onSelectDesignBlock}
                      interactiveDesignPreview={interactiveDesignPreview}
                      plainPage={!shouldShowPageFrame}
                    />
                  )}

                  {showPreviewChrome && pageIndex < previewPages.length - 1 ? (
                    <div className="mx-auto flex w-full max-w-[980px] items-center gap-3 px-4 pb-6 pt-8 text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                      <span className="h-px flex-1 bg-app-border" />
                      <span>
                        Page {previewPages[pageIndex + 1]}
                        {isFreeform && previewPages[pageIndex + 1] > freeformPageCount ? " • Drop zone" : ""}
                      </span>
                      <span className="h-px flex-1 bg-app-border" />
                    </div>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-app-border bg-app-card px-5 py-10 text-center text-sm text-app-muted">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute left-[-99999px] top-0 opacity-0" aria-hidden="true">
          <div ref={measureRef} style={{ width: RESUME_PAGE_WIDTH }}>
            {isFreeform ? (
              <div className="space-y-4">
                {previewFreeformSectionKeys.map((sectionKey) => (
                  <div key={sectionKey} data-freeform-measure-key={sectionKey}>
                    <FreeformSectionCard
                      resume={resume}
                      sectionKey={sectionKey}
                      placement={resolvedFreeformPlacements[sectionKey]}
                      selectedDesignBlock={null}
                      showPlaceholder={interactiveLayoutPreview}
                      measureOnly
                    />
                  </div>
                ))}
              </div>
            ) : (
              <ResumeTemplateRenderer resume={resume} />
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute left-[-99999px] top-0 opacity-0" aria-hidden="true">
          <div ref={exportRootRef}>
            {exportPages.map((pageNumber) =>
              isFreeform ? (
                <FreeformPreviewPage
                  key={`export-${pageNumber}`}
                  resume={resume}
                  pageNumber={pageNumber}
                  scale={1}
                  exportMode
                  selectedDesignBlock={selectedDesignBlock}
                  placements={resolvedFreeformPlacements}
                  visibleSectionKeys={contentFreeformSectionKeys}
                />
              ) : (
                <PreviewPage
                  key={`export-${pageNumber}`}
                  resume={resume}
                  pageOffset={templatePages[pageNumber - 1].offset}
                  clipHeight={templatePages[pageNumber - 1].clipHeight}
                  scale={1}
                  exportMode
                  selectedDesignBlock={selectedDesignBlock}
                  selectedDesignTargetKey={selectedDesignTargetKey}
                />
              )
            )}
          </div>
        </div>
      </div>
    );
  }
);
