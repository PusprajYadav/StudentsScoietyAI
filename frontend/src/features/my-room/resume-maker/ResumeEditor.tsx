import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Copy,
  FileJson,
  FileText,
  Globe2,
  ImagePlus,
  Link2,
  Plus,
  Save,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { createPost, loadCommunityMemberships, loadVisibleCommunities } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import type { CommunityRow, ProfileRow } from "../../../types/database";
import { resumeTemplateOptions } from "./constants";
import {
  clearLocalResumeDraft,
  loadLocalResumeDraft,
  saveLocalResumeDraft,
} from "./localDraftStore";
import { ResumePreview, type ResumePreviewHandle } from "./ResumePreview";
import { ResumeShareSheet, type ResumeShareState } from "./ResumeShareSheet";
import type {
  ResumeAtsSectionKey,
  ResumeDesignBlockKey,
  ResumeDesignBlockStyle,
  ResumeDesignLayoutSettings,
  ResumeDesignSelection,
  ResumeDesignStyleOverride,
  ResumeDocument,
  ResumeExecutiveSectionKey,
  ResumeSidebarSectionKey,
  ResumeThemeSettings,
  ResumeRecord,
} from "./types";
import {
  buildPublicResumeUrl,
  createClearedResumeDocument,
  createDefaultResumeDesignSettings,
  createResumeEntityId,
  downloadJsonFile,
  joinTextareaLines,
  normalizeResumeDocument,
  resolveResumeDesignStyle,
  splitTextareaLines,
} from "./utils";

const designBlockOptions: Array<{
  key: ResumeDesignBlockKey;
  label: string;
}> = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "sectionTitle", label: "Section title" },
  { key: "body", label: "Body text" },
  { key: "meta", label: "Meta text" },
];

const atsSectionLabels: Record<ResumeAtsSectionKey, string> = {
  summary: "Summary",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  achievements: "Achievements",
  languages: "Languages",
  certifications: "Certifications",
  interests: "Interests",
  references: "References",
};

const sidebarSectionLabels: Record<ResumeSidebarSectionKey, string> = {
  contact: "Contact",
  summary: "Profile",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  achievements: "Achievements",
  languages: "Languages",
  certifications: "Certifications",
  interests: "Interests",
  references: "References",
};

const executiveSectionLabels: Record<ResumeExecutiveSectionKey, string> = {
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  achievements: "Achievements",
  languages: "Languages",
  certifications: "Certifications",
  interests: "Interests",
  references: "References",
};

interface ResumeEditorProps {
  resume: ResumeRecord;
  profile: ProfileRow;
  saving: boolean;
  onBack: () => void;
  onSave: (resume: ResumeRecord, pageCount: number) => Promise<ResumeRecord>;
  onDelete: (resume: ResumeRecord) => Promise<void>;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-app-muted">{hint}</span> : null}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`input-shell h-10 rounded-[14px] px-3 py-2 text-[13px] ${props.className || ""}`.trim()}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`input-shell min-h-[96px] resize-y rounded-[14px] px-3 py-2 text-[13px] ${props.className || ""}`.trim()}
    />
  );
}

function SectionCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface-card rounded-[24px] p-4 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-app-text">{title}</h2>
        {actions}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ItemCard({
  title,
  onRemove,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  children,
}: {
  title: string;
  onRemove: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-app-border bg-app-secondary/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-app-text">{title}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onMoveUp || onMoveDown ? (
            <div className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-card px-1 py-1">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-app-text transition hover:bg-brand/8 disabled:cursor-not-allowed disabled:opacity-35"
                title="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-app-text transition hover:bg-brand/8 disabled:cursor-not-allowed disabled:opacity-35"
                title="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/15"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function FlowItem({
  label,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  transferLabel,
  transferDirection = "right",
  onTransfer,
}: {
  label: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  transferLabel?: string;
  transferDirection?: "left" | "right";
  onTransfer?: () => void;
}) {
  const TransferIcon = transferDirection === "left" ? ArrowLeft : ArrowRight;

  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-app-border bg-app-card px-3 py-2.5 transition hover:border-brand/25 hover:bg-white">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-app-text">{label}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1 rounded-full border border-app-border bg-app-secondary/20 p-1">
        {onTransfer ? (
          <button
            type="button"
            onClick={onTransfer}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-white text-app-text transition hover:border-brand/30 hover:bg-brand/5"
            title={transferLabel}
          >
            <TransferIcon className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-white text-app-text transition hover:border-brand/30 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-35"
          title="Move up"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-white text-app-text transition hover:border-brand/30 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-35"
          title="Move down"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function updateListItem<T>(
  items: T[],
  index: number,
  patch: Partial<T>
) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function moveListItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

type DesignNumberFieldKey =
  | "fontSize"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft";

function buildDesignStyleOverride(
  nextStyle: ResumeDesignBlockStyle,
  baseStyle: ResumeDesignBlockStyle
): ResumeDesignStyleOverride {
  const override: ResumeDesignStyleOverride = {};

  if (nextStyle.fontSize !== baseStyle.fontSize) {
    override.fontSize = nextStyle.fontSize;
  }

  if (nextStyle.color !== baseStyle.color) {
    override.color = nextStyle.color;
  }

  if (nextStyle.paddingTop !== baseStyle.paddingTop) {
    override.paddingTop = nextStyle.paddingTop;
  }

  if (nextStyle.paddingRight !== baseStyle.paddingRight) {
    override.paddingRight = nextStyle.paddingRight;
  }

  if (nextStyle.paddingBottom !== baseStyle.paddingBottom) {
    override.paddingBottom = nextStyle.paddingBottom;
  }

  if (nextStyle.paddingLeft !== baseStyle.paddingLeft) {
    override.paddingLeft = nextStyle.paddingLeft;
  }

  return override;
}

export function ResumeEditor({
  resume,
  profile,
  saving,
  onBack,
  onSave,
  onDelete,
}: ResumeEditorProps) {
  const previewRef = useRef<ResumePreviewHandle | null>(null);
  const { user } = useAuthStore();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [localResume, setLocalResume] = useState(() => ({
    ...resume,
    content: normalizeResumeDocument(resume.content, profile),
  }));
  const [pageCount, setPageCount] = useState(resume.page_count || 1);
  const [dirty, setDirty] = useState(false);
  const [activePane, setActivePane] = useState<"edit" | "preview">("edit");
  const [selectedDesignSelection, setSelectedDesignSelection] = useState<ResumeDesignSelection>({
    block: "body",
    targetKey: null,
    label: null,
  });
  const [localAutosavedAt, setLocalAutosavedAt] = useState<string | null>(null);
  const [restoredFromLocalDraft, setRestoredFromLocalDraft] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [liveSyncing, setLiveSyncing] = useState(false);
  const [shareState, setShareState] = useState<ResumeShareState>({
    open: false,
    destination: "discussion",
    category: "job",
    communityId: "",
    title: "",
    note: "",
    loading: false,
    submitting: false,
  });
  const [joinedCommunities, setJoinedCommunities] = useState<CommunityRow[]>([]);
  const [shareOptionsReady, setShareOptionsReady] = useState(false);
  const dirtyRef = useRef(false);
  const changeVersionRef = useRef(0);
  const liveSyncErrorShownRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    let active = true;
    setDraftReady(false);
    setLiveSyncing(false);
    changeVersionRef.current = 0;
    liveSyncErrorShownRef.current = false;
    setLocalResume({
      ...resume,
      content: normalizeResumeDocument(resume.content, profile),
    });
    setPageCount(resume.page_count || 1);
    setSelectedDesignSelection({
      block: "body",
      targetKey: null,
      label: null,
    });
    setDirty(false);
    setLocalAutosavedAt(null);
    setRestoredFromLocalDraft(false);

    void loadLocalResumeDraft(profile.id, resume.id).then(
      (draft) => {
        if (!active) {
          return;
        }

        if (dirtyRef.current) {
          setDraftReady(true);
          return;
        }

        if (!draft) {
          setDraftReady(true);
          return;
        }

        const remoteUpdatedAtMs = Date.parse(resume.updated_at);
        const localSavedAtMs = Date.parse(draft.savedAt);
        const basedOnSameRemote = draft.remoteUpdatedAt === resume.updated_at;
        const newerThanRemote =
          Number.isFinite(remoteUpdatedAtMs) && Number.isFinite(localSavedAtMs)
            ? localSavedAtMs > remoteUpdatedAtMs
            : false;

        if (basedOnSameRemote || newerThanRemote) {
          setLocalResume({
            ...resume,
            title: draft.title,
            template_key: draft.templateKey,
            is_live: draft.isLive,
            content: normalizeResumeDocument(draft.content, profile),
          });
          setPageCount(Math.max(1, draft.pageCount || resume.page_count || 1));
          changeVersionRef.current += 1;
          setDirty(true);
          setLocalAutosavedAt(draft.savedAt);
          setRestoredFromLocalDraft(true);
          toast.success("Restored your local offline draft.");
        } else {
          void clearLocalResumeDraft(profile.id, resume.id);
        }

        setDraftReady(true);
      },
      () => {
        if (!active) {
          return;
        }
        setDraftReady(true);
      }
    );

    return () => {
      active = false;
    };
  }, [profile, profile.id, resume]);

  useEffect(() => {
    if (!draftReady || !dirty) {
      return;
    }

    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const nextPageCount = previewRef.current?.getPageCount() || pageCount;

      void saveLocalResumeDraft(profile.id, {
        resumeId: localResume.id,
        title: localResume.title,
        templateKey: localResume.template_key,
        isLive: localResume.is_live,
        content: localResume.content,
        pageCount: nextPageCount,
        remoteUpdatedAt: resume.updated_at,
        savedAt,
      }).then(
        () => {
          setLocalAutosavedAt(savedAt);
        },
        () => undefined
      );
    }, 420);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftReady, dirty, localResume, pageCount, profile.id, resume.updated_at]);

  useEffect(() => {
    if (!draftReady || !dirty || !localResume.is_live || saving) {
      return;
    }

    const snapshot = localResume;
    const snapshotPageCount = previewRef.current?.getPageCount() || pageCount;
    const snapshotVersion = changeVersionRef.current;
    const timer = window.setTimeout(() => {
      setLiveSyncing(true);

      void onSave(
        {
          ...snapshot,
          is_live: true,
        },
        snapshotPageCount
      ).then(
        async (persisted) => {
          liveSyncErrorShownRef.current = false;

          if (changeVersionRef.current !== snapshotVersion) {
            return;
          }

          setLocalResume({
            ...persisted,
            content: normalizeResumeDocument(persisted.content, profile),
          });
          setDirty(false);
          setPageCount(persisted.page_count);
          setLocalAutosavedAt(null);
          setRestoredFromLocalDraft(false);
          await clearLocalResumeDraft(profile.id, persisted.id).catch(() => undefined);
        },
        (error: unknown) => {
          if (!liveSyncErrorShownRef.current) {
            toast.error(error instanceof Error ? error.message : "Could not sync the live resume.");
            liveSyncErrorShownRef.current = true;
          }
        }
      ).finally(() => {
        setLiveSyncing(false);
      });
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftReady, dirty, localResume, onSave, pageCount, profile, saving]);

  const shareUrl = useMemo(
    () => buildPublicResumeUrl(localResume),
    [localResume]
  );
  
  useEffect(() => {
    if (!shareState.open || shareOptionsReady || !user) {
      return;
    }

    let cancelled = false;
    setShareState((current) => ({ ...current, loading: true }));

    void Promise.all([
      loadVisibleCommunities(),
      loadCommunityMemberships(user.id),
    ])
      .then(([communities, memberships]) => {
        if (cancelled) return;
        const joined = (communities as CommunityRow[]).filter((community: CommunityRow) => memberships.has(community.id));
        setJoinedCommunities(joined);
        setShareOptionsReady(true);
        setShareState((current) => ({
          ...current,
          loading: false,
          communityId: current.communityId || joined[0]?.id || "",
        }));
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Could not load share options.");
        setShareState((current) => ({ ...current, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [shareOptionsReady, shareState.open, user]);

  const handleShareSubmit = async () => {
    if (!user || !profile) {
      toast.error("Sign in to share.");
      return;
    }

    if (!localResume.is_live) {
      toast.error("Your resume must be live (public) to share it.");
      return;
    }

    const shareCommunity = joinedCommunities.find((community: CommunityRow) => community.id === shareState.communityId) || null;
    if (shareState.destination === "community" && !shareCommunity) {
      toast.error("Choose a community first.");
      return;
    }

    const title = shareState.title.trim() || `My Resume: ${localResume.title}`;

    setShareState((current) => ({ ...current, submitting: true }));

    try {
      await createPost({
        authorId: user.id,
        visibilityScope: shareState.destination,
        communityId: shareState.destination === "community" ? shareCommunity?.id : undefined,
        discussionKind: shareState.category === "study" ? "study" : shareState.category === "anonymous" ? "anonymous" : "job",
        title,
        content: shareState.note.trim(),
        tags: ["sys-resume-share", shareState.category],
        isAnonymous: shareState.category === "anonymous",
        settings: {
          max_post_title_length: 120,
          max_post_content_length: 5000,
        },
        linkUrl: shareUrl,
      });

      toast.success("Resume shared to feed.");
      setShareState((current) => ({
        ...current,
        open: false,
        submitting: false,
        note: "",
        title: "",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sharing failed.");
      setShareState((current) => ({ ...current, submitting: false }));
    }
  };
  const localAutosaveTimeLabel = useMemo(() => {
    if (!localAutosavedAt) {
      return null;
    }

    return new Date(localAutosavedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [localAutosavedAt]);

  const setResumeState = (updater: (current: ResumeRecord) => ResumeRecord) => {
    setLocalResume((current) => {
      const next = updater(current);
      changeVersionRef.current += 1;
      setDirty(true);
      return next;
    });
  };

  const replaceContent = <K extends keyof ResumeDocument>(
    key: K,
    nextValue: ResumeDocument[K]
  ) => {
    setResumeState((current) => ({
      ...current,
      content: {
        ...current.content,
        [key]: nextValue,
      },
    }));
  };

  const selectedDesignBlock = selectedDesignSelection.block;
  const selectedDesignTargetKey = selectedDesignSelection.targetKey;
  const selectedDesignTargetLabel = selectedDesignSelection.label;
  const selectedDesignStyle: ResumeDesignBlockStyle = resolveResumeDesignStyle(
    localResume.content.design,
    selectedDesignBlock,
    selectedDesignTargetKey
  );

  const [designNumberDrafts, setDesignNumberDrafts] = useState<Record<DesignNumberFieldKey, string>>({
    fontSize: String(selectedDesignStyle.fontSize),
    paddingTop: String(selectedDesignStyle.paddingTop),
    paddingRight: String(selectedDesignStyle.paddingRight),
    paddingBottom: String(selectedDesignStyle.paddingBottom),
    paddingLeft: String(selectedDesignStyle.paddingLeft),
  });

  useEffect(() => {
    setDesignNumberDrafts({
      fontSize: String(selectedDesignStyle.fontSize),
      paddingTop: String(selectedDesignStyle.paddingTop),
      paddingRight: String(selectedDesignStyle.paddingRight),
      paddingBottom: String(selectedDesignStyle.paddingBottom),
      paddingLeft: String(selectedDesignStyle.paddingLeft),
    });
  }, [
    selectedDesignBlock,
    selectedDesignStyle.fontSize,
    selectedDesignStyle.paddingTop,
    selectedDesignStyle.paddingRight,
    selectedDesignStyle.paddingBottom,
    selectedDesignStyle.paddingLeft,
  ]);

  const updateSelectedDesignStyle = (patch: Partial<ResumeDesignBlockStyle>) => {
    setResumeState((current) => {
      const currentDesign = current.content.design || createDefaultResumeDesignSettings();
      const currentStyle = currentDesign.styles[selectedDesignBlock];

      if (selectedDesignTargetKey) {
        const mergedStyle = resolveResumeDesignStyle(
          currentDesign,
          selectedDesignBlock,
          selectedDesignTargetKey
        );
        const nextStyle = {
          ...mergedStyle,
          ...patch,
        };
        const nextOverride = buildDesignStyleOverride(nextStyle, currentStyle);
        const nextOverrides = {
          ...(currentDesign.overrides || {}),
        };

        if (Object.keys(nextOverride).length) {
          nextOverrides[selectedDesignTargetKey] = nextOverride;
        } else {
          delete nextOverrides[selectedDesignTargetKey];
        }

        return {
          ...current,
          content: {
            ...current.content,
            design: {
              ...currentDesign,
              overrides: nextOverrides,
            },
          },
        };
      }

      return {
        ...current,
        content: {
          ...current.content,
          design: {
            ...currentDesign,
            styles: {
              ...currentDesign.styles,
              [selectedDesignBlock]: {
                ...currentStyle,
                ...patch,
              },
            },
          },
        },
      };
    });
  };

  const currentTheme: ResumeThemeSettings = localResume.content.design.theme;
  const currentLayout: ResumeDesignLayoutSettings = localResume.content.design.layout;

  const updateThemeColor = (patch: Partial<ResumeThemeSettings>) => {
    setResumeState((current) => {
      const currentDesign = current.content.design || createDefaultResumeDesignSettings();
      return {
        ...current,
        content: {
          ...current.content,
          design: {
            ...currentDesign,
            theme: {
              ...currentDesign.theme,
              ...patch,
            },
          },
        },
      };
    });
  };

  const updateLayoutSettings = (nextLayout: ResumeDesignLayoutSettings) => {
    setResumeState((current) => {
      const currentDesign = current.content.design || createDefaultResumeDesignSettings();
      return {
        ...current,
        content: {
          ...current.content,
          design: {
            ...currentDesign,
            layout: nextLayout,
          },
        },
      };
    });
  };

  const reorderAtsSection = (fromIndex: number, toIndex: number) => {
    updateLayoutSettings({
      ...currentLayout,
      atsOrder: moveListItem(currentLayout.atsOrder, fromIndex, toIndex),
    });
  };

  const reorderColumnSection = <
    K extends "sidebarSections" | "executiveColumns",
    T extends K extends "sidebarSections" ? ResumeSidebarSectionKey : ResumeExecutiveSectionKey,
  >(
    layoutKey: K,
    column: "left" | "right",
    fromIndex: number,
    toIndex: number
  ) => {
    const nextColumns = {
      ...currentLayout[layoutKey],
      [column]: moveListItem(currentLayout[layoutKey][column] as T[], fromIndex, toIndex),
    };

    updateLayoutSettings({
      ...currentLayout,
      [layoutKey]: nextColumns,
    });
  };

  const moveColumnSection = <
    K extends "sidebarSections" | "executiveColumns",
    T extends K extends "sidebarSections" ? ResumeSidebarSectionKey : ResumeExecutiveSectionKey,
  >(
    layoutKey: K,
    from: "left" | "right",
    key: T
  ) => {
    const to = from === "left" ? "right" : "left";
    const source = currentLayout[layoutKey][from] as T[];
    const destination = currentLayout[layoutKey][to] as T[];

    updateLayoutSettings({
      ...currentLayout,
      [layoutKey]: {
        left:
          from === "left"
            ? source.filter((entry) => entry !== key)
            : [...destination, key],
        right:
          from === "right"
            ? source.filter((entry) => entry !== key)
            : [...destination, key],
      },
    });
  };

  const parseNumericControl = (value: string, fallback: number, min: number, max: number) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, parsed));
  };

  const updateDesignNumberDraft = (field: DesignNumberFieldKey, value: string) => {
    setDesignNumberDrafts((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const commitDesignNumberDraft = (
    field: DesignNumberFieldKey,
    min: number,
    max: number
  ) => {
    const nextValue = parseNumericControl(
      designNumberDrafts[field],
      selectedDesignStyle[field],
      min,
      max
    );

    updateSelectedDesignStyle({
      [field]: nextValue,
    } as Pick<ResumeDesignBlockStyle, DesignNumberFieldKey>);

    setDesignNumberDrafts((current) => ({
      ...current,
      [field]: String(nextValue),
    }));
  };

  const clearResumeData = () => {
    if (!window.confirm("Clear all dummy/example content from this resume?")) {
      return;
    }

    setResumeState((current) => ({
      ...current,
      content: createClearedResumeDocument(profile, current.content.design),
    }));
    toast.success("Resume content cleared. Design styles are kept.");
  };

  const saveNow = async (nextLive = localResume.is_live) => {
    const persisted = await onSave(
      {
        ...localResume,
        is_live: nextLive,
      },
      previewRef.current?.getPageCount() || pageCount
    );
    liveSyncErrorShownRef.current = false;
    setLocalResume({
      ...persisted,
      content: normalizeResumeDocument(persisted.content, profile),
    });
    setDirty(false);
    setPageCount(persisted.page_count);
    setLocalAutosavedAt(null);
    setRestoredFromLocalDraft(false);
    await clearLocalResumeDraft(profile.id, persisted.id).catch(() => undefined);
    return persisted;
  };

  return (
    <div className="space-y-6 xl:flex xl:h-[calc(100vh-5.5rem)] xl:flex-col xl:overflow-hidden xl:space-y-5">
      <section className="surface-card rounded-[30px] p-4 sm:p-6 xl:shrink-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-secondary/40 px-3 py-1.5 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to library
            </button>
            <h1 className="mt-3 font-display text-[1.6rem] font-bold tracking-tight text-app-text">
              {localResume.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-app-secondary px-3 py-1 text-app-text">
                {localResume.is_live ? "Live public resume" : "Draft resume"}
              </span>
              <span className="rounded-full bg-app-secondary px-3 py-1 text-app-text">
                {pageCount} page{pageCount === 1 ? "" : "s"}
              </span>
              {!draftReady ? (
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-700">Loading local draft...</span>
              ) : null}
              {dirty ? (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-700">Unsaved changes</span>
              ) : (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-700">
                  Saved
                </span>
              )}
              {dirty && localAutosaveTimeLabel ? (
                <span className="rounded-full bg-brand/12 px-3 py-1 text-brand">
                  Local autosave {localAutosaveTimeLabel}
                </span>
              ) : null}
              {localResume.is_live && liveSyncing ? (
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-700">Updating public resume...</span>
              ) : null}
              {restoredFromLocalDraft ? (
                <span className="rounded-full bg-violet-500/15 px-3 py-1 text-violet-700">Restored offline draft</span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";

                if (!file) {
                  return;
                }

                void file.text().then(
                  (raw) => {
                    const parsed = JSON.parse(raw) as Record<string, unknown>;
                    const importedContent = normalizeResumeDocument(parsed.content ?? parsed, profile);
                    setLocalResume((current) => ({
                      ...current,
                      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : current.title,
                      template_key:
                        parsed.template_key === "sidebar_professional" ||
                        parsed.template_key === "executive_dark" ||
                        parsed.template_key === "ats_classic"
                          ? parsed.template_key
                          : current.template_key,
                      content: importedContent,
                    }));
                    changeVersionRef.current += 1;
                    setDirty(true);
                    toast.success("Resume JSON imported into the editor.");
                  },
                  () => {
                    toast.error("Could not read that import file.");
                  }
                ).catch(() => {
                  toast.error("That file is not a valid resume JSON export.");
                });
              }}
            />

            <button
              type="button"
              onClick={() =>
                downloadJsonFile("resume-backup.json", {
                  title: localResume.title,
                  template_key: localResume.template_key,
                  content: localResume.content,
                })
              }
              className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-2.5 py-2 text-[11px] font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5 sm:px-3 sm:text-xs"
            >
              <FileJson className="h-4 w-4 text-brand" />
              Export JSON
            </button>

            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-2.5 py-2 text-[11px] font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5 sm:px-3 sm:text-xs"
            >
              <Upload className="h-4 w-4 text-brand" />
              Import JSON
            </button>

            <button
              type="button"
              onClick={clearResumeData}
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-500/15 sm:px-3 sm:text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear data
            </button>

            <button
              type="button"
              onClick={() => {
                void previewRef.current?.exportPngPages().then(
                  () => toast.success("PNG pages downloaded."),
                  (error: unknown) => toast.error(error instanceof Error ? error.message : "PNG export failed.")
                );
              }}
              className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-2.5 py-2 text-[11px] font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5 sm:px-3 sm:text-xs"
            >
              <ImagePlus className="h-4 w-4 text-brand" />
              Export PNG
            </button>

            <button
              type="button"
              onClick={() => {
                void previewRef.current?.exportPdfPages().then(
                  () => toast.success("PDF downloaded."),
                  (error: unknown) => toast.error(error instanceof Error ? error.message : "PDF export failed.")
                );
              }}
              className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-2.5 py-2 text-[11px] font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5 sm:px-3 sm:text-xs"
            >
              <FileText className="h-4 w-4 text-brand" />
              Export PDF
            </button>

            <button
              type="button"
              disabled={saving || !draftReady}
              onClick={() => {
                void saveNow().then(
                  () => toast.success("Resume saved."),
                  (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not save the resume.")
                );
              }}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-2.5 py-2 text-[11px] font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-xs"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : draftReady ? "Save draft" : "Preparing..."}
            </button>
            
            <button
              type="button"
              disabled={!localResume.is_live}
              onClick={() => {
                if (!localResume.is_live) {
                  toast.error("Resume must be live to share.");
                  return;
                }
                setShareState({
                  open: true,
                  destination: "discussion",
                  category: "job",
                  communityId: joinedCommunities[0]?.id || "",
                  title: `My Resume: ${localResume.title}`,
                  note: "",
                  loading: !shareOptionsReady,
                  submitting: false,
                });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-app-border bg-brand/10 px-2.5 py-2 text-[11px] font-semibold text-brand transition hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              <Share2 className="h-4 w-4" />
              Share to Feed
            </button>

            <button
              type="button"
              disabled={saving || !draftReady}
              onClick={() => {
                void saveNow(!localResume.is_live).then(
                  (persisted) => {
                    toast.success(
                      persisted.is_live ? "Resume is now live." : "Resume removed from public view."
                    );
                  },
                  (error: unknown) =>
                    toast.error(error instanceof Error ? error.message : "Could not update live status.")
                );
              }}
              className={`inline-flex items-center gap-2 rounded-full px-2.5 py-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-xs ${
                localResume.is_live
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                  : "border border-app-border bg-app-card text-app-text hover:border-brand/30 hover:bg-brand/5"
              }`}
            >
              <Globe2 className="h-4 w-4" />
              {localResume.is_live ? "Unpublish" : "Make live"}
            </button>
          </div>
        </div>

        {localResume.is_live ? (
          <div className="mt-5 rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-800">Public live link</p>
                <p className="mt-1 break-all text-sm text-emerald-700">{shareUrl}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl).then(
                    () => toast.success("Live resume link copied."),
                    () => toast.error("Could not copy the live link.")
                  );
                }}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-white/80 px-3 py-2 text-xs font-semibold text-emerald-800"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex gap-2 xl:hidden">
        {(["edit", "preview"] as const).map((pane) => (
          <button
            key={pane}
            type="button"
            onClick={() => setActivePane(pane)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
              activePane === pane ? "bg-brand text-white" : "bg-app-card text-app-muted"
            }`}
          >
            {pane === "edit" ? "Edit resume" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,470px)_minmax(0,1fr)] xl:overflow-hidden">
        <div className={`${activePane === "preview" ? "hidden xl:block" : ""} xl:min-h-0`}>
          <div className="space-y-5 xl:h-full xl:overflow-y-auto xl:overscroll-contain xl:pr-3 xl:pb-6">
            <SectionCard title="Resume Settings">
              <Field label="Resume title">
                <Input
                  value={localResume.title}
                  onChange={(event) => setResumeState((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Placement Resume 2026"
                />
              </Field>

              <div className="grid gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">
                  Template
                </span>
                <div className="grid gap-3">
                  {resumeTemplateOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() =>
                        setResumeState((current) => ({ ...current, template_key: option.key }))
                      }
                      className={`rounded-[22px] border p-4 text-left transition ${
                        localResume.template_key === option.key
                          ? "border-brand bg-brand/5"
                          : "border-app-border bg-app-secondary/20 hover:border-brand/25"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-app-text">{option.label}</p>
                          <p className="mt-1 text-sm leading-6 text-app-muted">{option.description}</p>
                        </div>
                        {localResume.template_key === option.key ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" />
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Guided Section Flow">
              <p className="text-sm leading-6 text-app-muted">
                Reorder the guided template here so you can decide what shows first, what comes next, and how the
                template flows across pages. When there is not enough room, the preview will move the whole section or
                item to the next page instead of cutting the remaining lines awkwardly.
              </p>

              {localResume.template_key === "ats_classic" ? (
                <div className="space-y-2 rounded-[24px] border border-app-border bg-app-secondary/10 p-3">
                  {currentLayout.atsOrder.map((sectionKey, index) => (
                    <FlowItem
                      key={sectionKey}
                      label={atsSectionLabels[sectionKey]}
                      canMoveUp={index > 0}
                      canMoveDown={index < currentLayout.atsOrder.length - 1}
                      onMoveUp={() => reorderAtsSection(index, index - 1)}
                      onMoveDown={() => reorderAtsSection(index, index + 1)}
                    />
                  ))}
                </div>
              ) : null}

              {localResume.template_key === "sidebar_professional" ? (
                <div className="space-y-4">
                  <div className="space-y-2 rounded-[24px] border border-app-border bg-app-secondary/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                      Sidebar stack
                    </p>
                    {currentLayout.sidebarSections.left.map((sectionKey, index) => (
                      <FlowItem
                        key={sectionKey}
                        label={sidebarSectionLabels[sectionKey]}
                        canMoveUp={index > 0}
                        canMoveDown={index < currentLayout.sidebarSections.left.length - 1}
                        onMoveUp={() => reorderColumnSection("sidebarSections", "left", index, index - 1)}
                        onMoveDown={() => reorderColumnSection("sidebarSections", "left", index, index + 1)}
                      />
                    ))}
                  </div>

                  <div className="space-y-2 rounded-[24px] border border-app-border bg-app-secondary/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                      Main content
                    </p>
                    {currentLayout.sidebarSections.right.map((sectionKey, index) => (
                      <FlowItem
                        key={sectionKey}
                        label={sidebarSectionLabels[sectionKey]}
                        canMoveUp={index > 0}
                        canMoveDown={index < currentLayout.sidebarSections.right.length - 1}
                        onMoveUp={() => reorderColumnSection("sidebarSections", "right", index, index - 1)}
                        onMoveDown={() => reorderColumnSection("sidebarSections", "right", index, index + 1)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {localResume.template_key === "executive_dark" ? (
                <div className="space-y-4">
                  <div className="space-y-2 rounded-[24px] border border-app-border bg-app-secondary/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                      Left column
                    </p>
                    {currentLayout.executiveColumns.left.map((sectionKey, index) => (
                      <FlowItem
                        key={sectionKey}
                        label={executiveSectionLabels[sectionKey]}
                        canMoveUp={index > 0}
                        canMoveDown={index < currentLayout.executiveColumns.left.length - 1}
                        onMoveUp={() => reorderColumnSection("executiveColumns", "left", index, index - 1)}
                        onMoveDown={() => reorderColumnSection("executiveColumns", "left", index, index + 1)}
                        transferLabel="Move right"
                        transferDirection="right"
                        onTransfer={() => moveColumnSection("executiveColumns", "left", sectionKey)}
                      />
                    ))}
                  </div>

                  <div className="space-y-2 rounded-[24px] border border-app-border bg-app-secondary/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                      Right column
                    </p>
                    {currentLayout.executiveColumns.right.map((sectionKey, index) => (
                      <FlowItem
                        key={sectionKey}
                        label={executiveSectionLabels[sectionKey]}
                        canMoveUp={index > 0}
                        canMoveDown={index < currentLayout.executiveColumns.right.length - 1}
                        onMoveUp={() => reorderColumnSection("executiveColumns", "right", index, index - 1)}
                        onMoveDown={() => reorderColumnSection("executiveColumns", "right", index, index + 1)}
                        transferLabel="Move left"
                        transferDirection="left"
                        onTransfer={() => moveColumnSection("executiveColumns", "right", sectionKey)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="rounded-[18px] border border-app-border bg-app-secondary/20 px-4 py-3 text-sm leading-6 text-app-muted">
                Experience, education, project, and skill group cards below also have move controls, so you can decide
                which entry appears first inside each section.
              </p>
            </SectionCard>

            <SectionCard title="Preview Text Style">
              <p className="text-sm leading-6 text-app-muted">
                Use the chips to edit a shared text style, or click one exact line in the preview to adjust only that item.
              </p>

              <div className="flex flex-wrap gap-2">
                {designBlockOptions.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() =>
                      setSelectedDesignSelection({
                        block: entry.key,
                        targetKey: null,
                        label: null,
                      })
                    }
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      selectedDesignBlock === entry.key
                        ? selectedDesignTargetKey
                          ? "border border-brand/30 bg-brand/8 text-brand"
                          : "bg-brand text-white"
                        : "border border-app-border bg-app-card text-app-text hover:border-brand/30 hover:bg-brand/5"
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>

              <div className="rounded-[18px] border border-app-border bg-app-secondary/20 px-4 py-3 text-sm leading-6 text-app-muted">
                {selectedDesignTargetKey ? (
                  <>
                    <span className="font-semibold text-app-text">
                      Editing only this {selectedDesignBlock === "body" ? "body text" : designBlockOptions.find((entry) => entry.key === selectedDesignBlock)?.label.toLowerCase() || "text"}:
                    </span>{" "}
                    {selectedDesignTargetLabel || "Selected preview item"}.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-app-text">
                      Editing all {designBlockOptions.find((entry) => entry.key === selectedDesignBlock)?.label.toLowerCase() || "text"}.
                    </span>{" "}
                    Click a specific text line in the preview if you want unique spacing or color just for that one.
                  </>
                )}
              </div>

              {selectedDesignTargetKey ? (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDesignSelection((current) => ({
                      ...current,
                      targetKey: null,
                      label: null,
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2.5 text-sm font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                >
                  Switch back to shared style
                </button>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Font size (px)">
                  <Input
                    type="number"
                    min={10}
                    max={72}
                    step={1}
                    value={designNumberDrafts.fontSize}
                    onChange={(event) => updateDesignNumberDraft("fontSize", event.target.value)}
                    onBlur={() => commitDesignNumberDraft("fontSize", 10, 72)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitDesignNumberDraft("fontSize", 10, 72);
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </Field>

                <Field label="Text color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedDesignStyle.color}
                      onChange={(event) =>
                        updateSelectedDesignStyle({
                          color: event.target.value,
                        })
                      }
                      className="h-12 w-14 cursor-pointer rounded-[14px] border border-app-border bg-app-card p-1"
                    />
                    <Input
                      value={selectedDesignStyle.color}
                      onChange={(event) =>
                        updateSelectedDesignStyle({
                          color: event.target.value.trim(),
                        })
                      }
                      placeholder="#334155"
                    />
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Page color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentTheme.pageBackground}
                      onChange={(event) => updateThemeColor({ pageBackground: event.target.value })}
                      className="h-10 w-11 cursor-pointer rounded-[10px] border border-app-border bg-app-card p-1"
                    />
                    <Input
                      value={currentTheme.pageBackground}
                      onChange={(event) => updateThemeColor({ pageBackground: event.target.value.trim() })}
                      placeholder="#ffffff"
                    />
                  </div>
                </Field>

                <Field label="Accent color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentTheme.primaryColor}
                      onChange={(event) => updateThemeColor({ primaryColor: event.target.value })}
                      className="h-10 w-11 cursor-pointer rounded-[10px] border border-app-border bg-app-card p-1"
                    />
                    <Input
                      value={currentTheme.primaryColor}
                      onChange={(event) => updateThemeColor({ primaryColor: event.target.value.trim() })}
                      placeholder="#334155"
                    />
                  </div>
                </Field>

                <Field label="Panel color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentTheme.panelColor}
                      onChange={(event) => updateThemeColor({ panelColor: event.target.value })}
                      className="h-10 w-11 cursor-pointer rounded-[10px] border border-app-border bg-app-card p-1"
                    />
                    <Input
                      value={currentTheme.panelColor}
                      onChange={(event) => updateThemeColor({ panelColor: event.target.value.trim() })}
                      placeholder="#1e293b"
                    />
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Padding top">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    step={1}
                    value={designNumberDrafts.paddingTop}
                    onChange={(event) => updateDesignNumberDraft("paddingTop", event.target.value)}
                    onBlur={() => commitDesignNumberDraft("paddingTop", 0, 120)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitDesignNumberDraft("paddingTop", 0, 120);
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </Field>
                <Field label="Padding right">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    step={1}
                    value={designNumberDrafts.paddingRight}
                    onChange={(event) => updateDesignNumberDraft("paddingRight", event.target.value)}
                    onBlur={() => commitDesignNumberDraft("paddingRight", 0, 120)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitDesignNumberDraft("paddingRight", 0, 120);
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </Field>
                <Field label="Padding bottom">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    step={1}
                    value={designNumberDrafts.paddingBottom}
                    onChange={(event) => updateDesignNumberDraft("paddingBottom", event.target.value)}
                    onBlur={() => commitDesignNumberDraft("paddingBottom", 0, 120)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitDesignNumberDraft("paddingBottom", 0, 120);
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </Field>
                <Field label="Padding left">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    step={1}
                    value={designNumberDrafts.paddingLeft}
                    onChange={(event) => updateDesignNumberDraft("paddingLeft", event.target.value)}
                    onBlur={() => commitDesignNumberDraft("paddingLeft", 0, 120)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitDesignNumberDraft("paddingLeft", 0, 120);
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (selectedDesignTargetKey) {
                    setResumeState((current) => {
                      const currentDesign = current.content.design || createDefaultResumeDesignSettings();
                      const nextOverrides = {
                        ...(currentDesign.overrides || {}),
                      };
                      delete nextOverrides[selectedDesignTargetKey];

                      return {
                        ...current,
                        content: {
                          ...current.content,
                          design: {
                            ...currentDesign,
                            overrides: nextOverrides,
                          },
                        },
                      };
                    });
                    return;
                  }

                  const defaults = createDefaultResumeDesignSettings();
                  updateSelectedDesignStyle(defaults.styles[selectedDesignBlock]);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2.5 text-sm font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
              >
                {selectedDesignTargetKey ? "Reset this item style" : "Reset selected style"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const defaults = createDefaultResumeDesignSettings();
                  updateThemeColor(defaults.theme);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2.5 text-sm font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
              >
                Reset theme colors
              </button>
            </SectionCard>

            <SectionCard title="Basic Details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <Input
                    value={localResume.content.contact.fullName}
                    onChange={(event) =>
                      replaceContent("contact", {
                        ...localResume.content.contact,
                        fullName: event.target.value,
                      })
                    }
                    placeholder="Charles Bloomberg"
                  />
                </Field>
                <Field label="Role / Headline">
                  <Input
                    value={localResume.content.contact.role}
                    onChange={(event) =>
                      replaceContent("contact", {
                        ...localResume.content.contact,
                        role: event.target.value,
                      })
                    }
                    placeholder="Product Designer"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    value={localResume.content.contact.email}
                    onChange={(event) =>
                      replaceContent("contact", {
                        ...localResume.content.contact,
                        email: event.target.value,
                      })
                    }
                    placeholder="name@example.com"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={localResume.content.contact.phone}
                    onChange={(event) =>
                      replaceContent("contact", {
                        ...localResume.content.contact,
                        phone: event.target.value,
                      })
                    }
                    placeholder="+91 9876543210"
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={localResume.content.contact.location}
                    onChange={(event) =>
                      replaceContent("contact", {
                        ...localResume.content.contact,
                        location: event.target.value,
                      })
                    }
                    placeholder="Delhi, India"
                  />
                </Field>
                <Field label="LinkedIn">
                  <Input
                    value={localResume.content.contact.linkedin}
                    onChange={(event) =>
                      replaceContent("contact", {
                        ...localResume.content.contact,
                        linkedin: event.target.value,
                      })
                    }
                    placeholder="linkedin.com/in/username"
                  />
                </Field>
                <Field label="Website">
                  <Input
                    value={localResume.content.contact.website}
                    onChange={(event) =>
                      replaceContent("contact", {
                        ...localResume.content.contact,
                        website: event.target.value,
                      })
                    }
                    placeholder="portfolio.site"
                  />
                </Field>
                <Field label="GitHub / Profile URL">
                  <Input
                    value={localResume.content.contact.github}
                    onChange={(event) =>
                      replaceContent("contact", {
                        ...localResume.content.contact,
                        github: event.target.value,
                      })
                    }
                    placeholder="github.com/username"
                  />
                </Field>
              </div>

              <Field label="Photo URL" hint="Useful for the sidebar and executive formats.">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={localResume.content.contact.photoUrl}
                    onChange={(event) =>
                      replaceContent("contact", {
                        ...localResume.content.contact,
                        photoUrl: event.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() =>
                      replaceContent("contact", {
                        ...localResume.content.contact,
                        photoUrl: profile.avatar_url || "",
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-app-border bg-app-card px-4 py-3 text-sm font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                  >
                    <Link2 className="h-4 w-4 text-brand" />
                    Use profile photo
                  </button>
                </div>
              </Field>
            </SectionCard>

            <SectionCard title="Summary">
              <Field label="Professional summary">
                <Textarea
                  value={localResume.content.summary}
                  onChange={(event) => replaceContent("summary", event.target.value)}
                  placeholder="Write a short summary tailored for internships, placements, or freelance work."
                  className="min-h-[160px]"
                />
              </Field>
            </SectionCard>

            <SectionCard
              title="Experience"
              actions={
                <button
                  type="button"
                  onClick={() =>
                    replaceContent("experience", [
                      ...localResume.content.experience,
                      {
                        id: createResumeEntityId("exp"),
                        role: "",
                        company: "",
                        location: "",
                        startDate: "",
                        endDate: "",
                        current: false,
                        bullets: [""],
                      },
                    ])
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add experience
                </button>
              }
            >
              {localResume.content.experience.map((item, index) => (
                <ItemCard
                  key={item.id}
                  title={`Experience ${index + 1}`}
                  canMoveUp={index > 0}
                  canMoveDown={index < localResume.content.experience.length - 1}
                  onMoveUp={() =>
                    replaceContent(
                      "experience",
                      moveListItem(localResume.content.experience, index, index - 1)
                    )
                  }
                  onMoveDown={() =>
                    replaceContent(
                      "experience",
                      moveListItem(localResume.content.experience, index, index + 1)
                    )
                  }
                  onRemove={() =>
                    replaceContent(
                      "experience",
                      localResume.content.experience.filter((entry) => entry.id !== item.id)
                    )
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Role">
                      <Input
                        value={item.role}
                        onChange={(event) =>
                          replaceContent(
                            "experience",
                            updateListItem(localResume.content.experience, index, {
                              role: event.target.value,
                            })
                          )
                        }
                        placeholder="CEO & Founder"
                      />
                    </Field>
                    <Field label="Company">
                      <Input
                        value={item.company}
                        onChange={(event) =>
                          replaceContent(
                            "experience",
                            updateListItem(localResume.content.experience, index, {
                              company: event.target.value,
                            })
                          )
                        }
                        placeholder="Rezi"
                      />
                    </Field>
                    <Field label="Location">
                      <Input
                        value={item.location}
                        onChange={(event) =>
                          replaceContent(
                            "experience",
                            updateListItem(localResume.content.experience, index, {
                              location: event.target.value,
                            })
                          )
                        }
                        placeholder="Seoul, South Korea"
                      />
                    </Field>
                    <Field label="Start date">
                      <Input
                        value={item.startDate}
                        onChange={(event) =>
                          replaceContent(
                            "experience",
                            updateListItem(localResume.content.experience, index, {
                              startDate: event.target.value,
                            })
                          )
                        }
                        placeholder="August 2022"
                      />
                    </Field>
                    <Field label="End date">
                      <Input
                        value={item.endDate}
                        onChange={(event) =>
                          replaceContent(
                            "experience",
                            updateListItem(localResume.content.experience, index, {
                              endDate: event.target.value,
                            })
                          )
                        }
                        placeholder="Present"
                      />
                    </Field>
                    <label className="flex items-center gap-3 rounded-[20px] border border-app-border bg-app-card px-4 py-3 text-sm font-semibold text-app-text">
                      <input
                        type="checkbox"
                        checked={item.current}
                        onChange={(event) =>
                          replaceContent(
                            "experience",
                            updateListItem(localResume.content.experience, index, {
                              current: event.target.checked,
                            })
                          )
                        }
                      />
                      Currently working here
                    </label>
                  </div>

                  <Field label="Impact bullets" hint="One bullet per line.">
                    <Textarea
                      value={joinTextareaLines(item.bullets)}
                      onChange={(event) =>
                        replaceContent(
                          "experience",
                          updateListItem(localResume.content.experience, index, {
                            bullets: splitTextareaLines(event.target.value),
                          })
                        )
                      }
                      placeholder={"Built ATS resume product for student users\nImproved recruiter conversion with cleaner structure"}
                    />
                  </Field>
                </ItemCard>
              ))}
            </SectionCard>

            <SectionCard
              title="Education"
              actions={
                <button
                  type="button"
                  onClick={() =>
                    replaceContent("education", [
                      ...localResume.content.education,
                      {
                        id: createResumeEntityId("edu"),
                        degree: "",
                        institution: "",
                        location: "",
                        startDate: "",
                        endDate: "",
                        score: "",
                        details: "",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add education
                </button>
              }
            >
              {localResume.content.education.map((item, index) => (
                <ItemCard
                  key={item.id}
                  title={`Education ${index + 1}`}
                  canMoveUp={index > 0}
                  canMoveDown={index < localResume.content.education.length - 1}
                  onMoveUp={() =>
                    replaceContent(
                      "education",
                      moveListItem(localResume.content.education, index, index - 1)
                    )
                  }
                  onMoveDown={() =>
                    replaceContent(
                      "education",
                      moveListItem(localResume.content.education, index, index + 1)
                    )
                  }
                  onRemove={() =>
                    replaceContent(
                      "education",
                      localResume.content.education.filter((entry) => entry.id !== item.id)
                    )
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Degree">
                      <Input
                        value={item.degree}
                        onChange={(event) =>
                          replaceContent(
                            "education",
                            updateListItem(localResume.content.education, index, {
                              degree: event.target.value,
                            })
                          )
                        }
                        placeholder="Bachelor of Science in Economics"
                      />
                    </Field>
                    <Field label="Institution">
                      <Input
                        value={item.institution}
                        onChange={(event) =>
                          replaceContent(
                            "education",
                            updateListItem(localResume.content.education, index, {
                              institution: event.target.value,
                            })
                          )
                        }
                        placeholder="University of Wisconsin"
                      />
                    </Field>
                    <Field label="Location">
                      <Input
                        value={item.location}
                        onChange={(event) =>
                          replaceContent(
                            "education",
                            updateListItem(localResume.content.education, index, {
                              location: event.target.value,
                            })
                          )
                        }
                        placeholder="Madison, WI"
                      />
                    </Field>
                    <Field label="Start date">
                      <Input
                        value={item.startDate}
                        onChange={(event) =>
                          replaceContent(
                            "education",
                            updateListItem(localResume.content.education, index, {
                              startDate: event.target.value,
                            })
                          )
                        }
                        placeholder="2019"
                      />
                    </Field>
                    <Field label="End date">
                      <Input
                        value={item.endDate}
                        onChange={(event) =>
                          replaceContent(
                            "education",
                            updateListItem(localResume.content.education, index, {
                              endDate: event.target.value,
                            })
                          )
                        }
                        placeholder="2023"
                      />
                    </Field>
                    <Field label="Score / GPA">
                      <Input
                        value={item.score}
                        onChange={(event) =>
                          replaceContent(
                            "education",
                            updateListItem(localResume.content.education, index, {
                              score: event.target.value,
                            })
                          )
                        }
                        placeholder="GPA 3.8 / 4.0"
                      />
                    </Field>
                  </div>

                  <Field label="Details">
                    <Textarea
                      value={item.details}
                      onChange={(event) =>
                        replaceContent(
                          "education",
                          updateListItem(localResume.content.education, index, {
                            details: event.target.value,
                          })
                        )
                      }
                      placeholder="Relevant coursework, scholarships, thesis, or leadership highlights."
                    />
                  </Field>
                </ItemCard>
              ))}
            </SectionCard>

            <SectionCard
              title="Projects"
              actions={
                <button
                  type="button"
                  onClick={() =>
                    replaceContent("projects", [
                      ...localResume.content.projects,
                      {
                        id: createResumeEntityId("project"),
                        name: "",
                        role: "",
                        link: "",
                        startDate: "",
                        endDate: "",
                        bullets: [""],
                      },
                    ])
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add project
                </button>
              }
            >
              {localResume.content.projects.map((item, index) => (
                <ItemCard
                  key={item.id}
                  title={`Project ${index + 1}`}
                  canMoveUp={index > 0}
                  canMoveDown={index < localResume.content.projects.length - 1}
                  onMoveUp={() =>
                    replaceContent(
                      "projects",
                      moveListItem(localResume.content.projects, index, index - 1)
                    )
                  }
                  onMoveDown={() =>
                    replaceContent(
                      "projects",
                      moveListItem(localResume.content.projects, index, index + 1)
                    )
                  }
                  onRemove={() =>
                    replaceContent(
                      "projects",
                      localResume.content.projects.filter((entry) => entry.id !== item.id)
                    )
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Project name">
                      <Input
                        value={item.name}
                        onChange={(event) =>
                          replaceContent(
                            "projects",
                            updateListItem(localResume.content.projects, index, {
                              name: event.target.value,
                            })
                          )
                        }
                        placeholder="ATS Resume Builder"
                      />
                    </Field>
                    <Field label="Role / Stack">
                      <Input
                        value={item.role}
                        onChange={(event) =>
                          replaceContent(
                            "projects",
                            updateListItem(localResume.content.projects, index, {
                              role: event.target.value,
                            })
                          )
                        }
                        placeholder="Product lead • React • Supabase"
                      />
                    </Field>
                    <Field label="Project link">
                      <Input
                        value={item.link}
                        onChange={(event) =>
                          replaceContent(
                            "projects",
                            updateListItem(localResume.content.projects, index, {
                              link: event.target.value,
                            })
                          )
                        }
                        placeholder="github.com/user/project"
                      />
                    </Field>
                    <Field label="Start date">
                      <Input
                        value={item.startDate}
                        onChange={(event) =>
                          replaceContent(
                            "projects",
                            updateListItem(localResume.content.projects, index, {
                              startDate: event.target.value,
                            })
                          )
                        }
                        placeholder="January 2025"
                      />
                    </Field>
                    <Field label="End date">
                      <Input
                        value={item.endDate}
                        onChange={(event) =>
                          replaceContent(
                            "projects",
                            updateListItem(localResume.content.projects, index, {
                              endDate: event.target.value,
                            })
                          )
                        }
                        placeholder="Present"
                      />
                    </Field>
                  </div>

                  <Field label="Project bullets" hint="One bullet per line.">
                    <Textarea
                      value={joinTextareaLines(item.bullets)}
                      onChange={(event) =>
                        replaceContent(
                          "projects",
                          updateListItem(localResume.content.projects, index, {
                            bullets: splitTextareaLines(event.target.value),
                          })
                        )
                      }
                      placeholder={"Built public share links for resumes\nAdded PNG export and import/export JSON support"}
                    />
                  </Field>
                </ItemCard>
              ))}
            </SectionCard>

            <SectionCard
              title="Skills"
              actions={
                <button
                  type="button"
                  onClick={() =>
                    replaceContent("skillGroups", [
                      ...localResume.content.skillGroups,
                      {
                        id: createResumeEntityId("skills"),
                        title: "",
                        items: [""],
                      },
                    ])
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add skill group
                </button>
              }
            >
              {localResume.content.skillGroups.map((group, index) => (
                <ItemCard
                  key={group.id}
                  title={`Skill Group ${index + 1}`}
                  canMoveUp={index > 0}
                  canMoveDown={index < localResume.content.skillGroups.length - 1}
                  onMoveUp={() =>
                    replaceContent(
                      "skillGroups",
                      moveListItem(localResume.content.skillGroups, index, index - 1)
                    )
                  }
                  onMoveDown={() =>
                    replaceContent(
                      "skillGroups",
                      moveListItem(localResume.content.skillGroups, index, index + 1)
                    )
                  }
                  onRemove={() =>
                    replaceContent(
                      "skillGroups",
                      localResume.content.skillGroups.filter((entry) => entry.id !== group.id)
                    )
                  }
                >
                  <Field label="Group title">
                    <Input
                      value={group.title}
                      onChange={(event) =>
                        replaceContent(
                          "skillGroups",
                          updateListItem(localResume.content.skillGroups, index, {
                            title: event.target.value,
                          })
                        )
                      }
                      placeholder="Technical Skills"
                    />
                  </Field>
                  <Field label="Items" hint="Use commas or new lines.">
                    <Textarea
                      value={group.items.join("\n")}
                      onChange={(event) =>
                        replaceContent(
                          "skillGroups",
                          updateListItem(localResume.content.skillGroups, index, {
                            items: event.target.value
                              .split(/[\n,]/)
                              .map((entry) => entry.trim())
                              .filter(Boolean),
                          })
                        )
                      }
                      placeholder={"Accounting Principles\nAudit\nData Analysis"}
                    />
                  </Field>
                </ItemCard>
              ))}
            </SectionCard>

            <SectionCard title="Achievements, Certifications, and Extras">
              <Field label="Languages" hint="Separate with commas.">
                <Input
                  value={localResume.content.languages.join(", ")}
                  onChange={(event) =>
                    replaceContent(
                      "languages",
                      event.target.value
                        .split(",")
                        .map((entry) => entry.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="English, Hindi, Spanish"
                />
              </Field>

              <Field label="Interests" hint="Separate with commas.">
                <Input
                  value={localResume.content.interests.join(", ")}
                  onChange={(event) =>
                    replaceContent(
                      "interests",
                      event.target.value
                        .split(",")
                        .map((entry) => entry.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="Volunteer work, football, public speaking"
                />
              </Field>

              <Field label="Achievements" hint="One achievement per line using Title: Detail format.">
                <Textarea
                  value={localResume.content.achievements
                    .map((item) => [item.title, item.detail].filter(Boolean).join(": "))
                    .join("\n")}
                  onChange={(event) =>
                    replaceContent(
                      "achievements",
                      splitTextareaLines(event.target.value).map((line) => {
                        const [title, ...detailParts] = line.split(":");
                        return {
                          id: createResumeEntityId("achievement"),
                          title: title?.trim() || "",
                          detail: detailParts.join(":").trim(),
                        };
                      })
                    )
                  }
                  placeholder={"Best Employee Award (2022): Awarded for exceptional performance\nHackathon Winner: Placed first among 120 teams"}
                />
              </Field>

              <Field label="Certifications" hint="One certification per line using Title | Issuer | Year format.">
                <Textarea
                  value={localResume.content.certifications
                    .map((item) => [item.title, item.issuer, item.year].filter(Boolean).join(" | "))
                    .join("\n")}
                  onChange={(event) =>
                    replaceContent(
                      "certifications",
                      splitTextareaLines(event.target.value).map((line) => {
                        const [title = "", issuer = "", year = ""] = line.split("|").map((entry) => entry.trim());
                        return {
                          id: createResumeEntityId("cert"),
                          title,
                          issuer,
                          year,
                        };
                      })
                    )
                  }
                  placeholder={"Google Data Analytics | Coursera | 2024\nAWS Cloud Practitioner | Amazon | 2025"}
                />
              </Field>

              <Field label="References" hint="One reference per line using Name | Role | Company | Phone | Email format.">
                <Textarea
                  value={localResume.content.references
                    .map((item) =>
                      [item.name, item.role, item.company, item.phone, item.email].filter(Boolean).join(" | ")
                    )
                    .join("\n")}
                  onChange={(event) =>
                    replaceContent(
                      "references",
                      splitTextareaLines(event.target.value).map((line) => {
                        const [name = "", role = "", company = "", phone = "", email = ""] = line
                          .split("|")
                          .map((entry) => entry.trim());
                        return {
                          id: createResumeEntityId("ref"),
                          name,
                          role,
                          company,
                          phone,
                          email,
                        };
                      })
                    )
                  }
                  placeholder={"Julia Silva | Marketing Lead | Wardiere Inc | 123-456-7890 | julia@example.com"}
                />
              </Field>
            </SectionCard>

            <SectionCard title="Danger Zone">
              <p className="text-sm leading-7 text-app-muted">
                Delete this resume permanently from your library. Live public sharing will stop immediately.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm("Delete this resume permanently?")) {
                    return;
                  }

                  void (async () => {
                    try {
                      await onDelete(localResume);
                      await clearLocalResumeDraft(profile.id, localResume.id).catch(() => undefined);
                      toast.success("Resume deleted.");
                      onBack();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not delete the resume.");
                    }
                  })();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/15"
              >
                <Trash2 className="h-4 w-4" />
                Delete resume
              </button>
            </SectionCard>
          </div>
        </div>

        <div className={`${activePane === "edit" ? "hidden xl:block" : ""} xl:min-h-0`}>
          <div className="xl:h-full xl:overflow-y-auto xl:overscroll-contain xl:pl-2 xl:pr-1 xl:pb-20">
            <ResumePreview
              ref={previewRef}
              resume={localResume}
              onPageCountChange={(nextPageCount) => setPageCount(nextPageCount)}
              selectedDesignBlock={selectedDesignBlock}
              selectedDesignTargetKey={selectedDesignTargetKey}
              onSelectDesignBlock={setSelectedDesignSelection}
              interactiveDesignPreview
            />
          </div>
        </div>
      </div>

      <ResumeShareSheet
        shareState={shareState}
        setShareState={setShareState}
        joinedCommunities={joinedCommunities}
        allowedShareCategories={shareState.destination === "community" ? ["job", "study", "anonymous"] : ["job", "study", "anonymous"]}
        shareSnapshotFallback={shareUrl}
        onClose={() => setShareState((current) => ({ ...current, open: false }))}
        onSubmit={handleShareSubmit}
      />
    </div>
  );
}
