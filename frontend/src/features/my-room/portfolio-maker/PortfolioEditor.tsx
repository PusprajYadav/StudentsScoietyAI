import {
  ArrowLeft,
  Copy,
  Eraser,
  FileJson,
  Globe2,
  RefreshCcw,
  Save,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { createPost, loadCommunityMemberships, loadVisibleCommunities } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import type { CommunityRow, ProfileRow } from "../../../types/database";
import { portfolioTemplateOptions } from "./constants";
import { PortfolioPreviewPanel } from "./components/PortfolioPreviewPanel";
import { PortfolioSectionList } from "./components/PortfolioSectionList";
import { Field, Input, SectionCard } from "./components/editorPrimitives";
import {
  clearLocalPortfolioDraft,
  loadLocalPortfolioDraft,
  saveLocalPortfolioDraft,
} from "./localDraftStore";
import { parsePortfolioImportPayload } from "./schema";
import { PortfolioShareSheet, type PortfolioShareState } from "./PortfolioShareSheet";
import type { PortfolioColorMode, PortfolioRecord, PortfolioSection, PortfolioViewportKey } from "./types";
import {
  buildPublicPortfolioUrl,
  clearPortfolioDocumentContent,
  createDemoPortfolioDocument,
  createPortfolioEntityId,
  downloadJsonFile,
  getDefaultPortfolioTheme,
  normalizePortfolioDocument,
  normalizeTheme,
  resolveTemplateLabel,
} from "./utils";

interface PortfolioEditorProps {
  portfolio: PortfolioRecord;
  profile: ProfileRow;
  saving: boolean;
  onBack: () => void;
  onSave: (portfolio: PortfolioRecord) => Promise<PortfolioRecord>;
  onDelete: (portfolio: PortfolioRecord) => Promise<void>;
}

function createSectionForType(type: string) {
  const id = createPortfolioEntityId(type);
  const base: Record<string, unknown> = { id, type, enabled: true };

  if (type === "about") {
    return { ...base, title: "About", body: "" };
  }
  if (type === "skills") {
    return { ...base, title: "Skills", skills: [] };
  }
  if (type === "contact") {
    return { ...base, title: "Contact", email: "", phone: "", location: "", links: [] };
  }
  if (type === "projects") {
    return { ...base, title: "Projects", projects: [] };
  }
  if (type === "experience") {
    return { ...base, title: "Experience", items: [] };
  }
  if (type === "education") {
    return { ...base, title: "Education", items: [] };
  }
  if (type === "testimonials") {
    return { ...base, title: "Testimonials", items: [] };
  }
  if (type === "hero") {
    return { ...base, headline: "", subheadline: "", ctaLabel: "Contact", ctaHref: "#contact", links: [] };
  }

  return { ...base, title: "Section", body: "" };
}

export function PortfolioEditor({ portfolio, profile, saving, onBack, onSave, onDelete }: PortfolioEditorProps) {
  const profileId = profile.id;
  const remoteRevision = `${profileId}:${portfolio.id}:${portfolio.updated_at}`;
  const [localPortfolio, setLocalPortfolio] = useState<PortfolioRecord>(() => ({
    ...portfolio,
    content: normalizePortfolioDocument(portfolio.content, profile),
    theme: normalizeTheme(portfolio.theme, portfolio.template_key),
  }));
  const [dirty, setDirty] = useState(false);
  const [restoredLocalDraftAt, setRestoredLocalDraftAt] = useState<string | null>(null);
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<string | null>(null);
  const [savingNow, setSavingNow] = useState(false);
  const [designViewport, setDesignViewport] = useState<PortfolioViewportKey>("desktop");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuthStore();
  const [shareState, setShareState] = useState<PortfolioShareState>({
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
  const incomingRemoteRef = useRef({ portfolio, profile });

  incomingRemoteRef.current = { portfolio, profile };

  useEffect(() => {
    const nextRemote = incomingRemoteRef.current;

    setLocalPortfolio({
      ...nextRemote.portfolio,
      content: normalizePortfolioDocument(nextRemote.portfolio.content, nextRemote.profile),
      theme: normalizeTheme(nextRemote.portfolio.theme, nextRemote.portfolio.template_key),
    });
    setDirty(false);
    setRestoredLocalDraftAt(null);
    setLocalDraftSavedAt(null);
  }, [remoteRevision]);

  useEffect(() => {
    let active = true;
    const currentProfile = incomingRemoteRef.current.profile;

    void loadLocalPortfolioDraft(profileId, portfolio.id).then((snapshot) => {
      if (!active || !snapshot) {
        return;
      }

      const remoteUpdatedAt = new Date(portfolio.updated_at).getTime();
      const draftRemoteUpdatedAt = new Date(snapshot.remoteUpdatedAt).getTime();
      const shouldRestore = draftRemoteUpdatedAt >= remoteUpdatedAt;

      if (!shouldRestore) {
        return;
      }

      setLocalPortfolio((current) => ({
        ...current,
        title: snapshot.title,
        template_key: snapshot.templateKey,
        is_live: snapshot.isLive,
        content: normalizePortfolioDocument(snapshot.content, currentProfile),
        theme: normalizeTheme(snapshot.theme, snapshot.templateKey),
      }));
      setDirty(true);
      setRestoredLocalDraftAt(snapshot.savedAt);
      setLocalDraftSavedAt(snapshot.savedAt);
    });

    return () => {
      active = false;
    };
  }, [portfolio.id, portfolio.updated_at, profileId]);

  const normalizedTheme = useMemo(
    () => normalizeTheme(localPortfolio.theme, localPortfolio.template_key),
    [localPortfolio.theme, localPortfolio.template_key]
  );
  const previewPortfolio = useMemo(
    () => ({ ...localPortfolio, theme: normalizedTheme }),
    [localPortfolio, normalizedTheme]
  );
  const publicUrl = useMemo(() => buildPublicPortfolioUrl(localPortfolio), [localPortfolio]);

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

    if (!localPortfolio.is_live) {
      toast.error("Your portfolio must be live (public) to share it.");
      return;
    }

    const shareCommunity = joinedCommunities.find((community: CommunityRow) => community.id === shareState.communityId) || null;
    if (shareState.destination === "community" && !shareCommunity) {
      toast.error("Choose a community first.");
      return;
    }

    const title = shareState.title.trim() || `My Portfolio: ${localPortfolio.title}`;

    setShareState((current) => ({ ...current, submitting: true }));

    try {
      await createPost({
        authorId: user.id,
        visibilityScope: shareState.destination,
        communityId: shareState.destination === "community" ? shareCommunity?.id : undefined,
        discussionKind: shareState.category === "study" ? "study" : shareState.category === "anonymous" ? "anonymous" : "job",
        title,
        content: shareState.note.trim(),
        tags: ["sys-portfolio-share", shareState.category],
        isAnonymous: shareState.category === "anonymous",
        settings: {
          max_post_title_length: 120,
          max_post_content_length: 5000,
        },
        linkUrl: publicUrl,
      });

      toast.success("Portfolio shared to feed.");
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

  const updateTheme = useCallback((updater: (theme: ReturnType<typeof normalizeTheme>) => ReturnType<typeof normalizeTheme>) => {
    setLocalPortfolio((current) => {
      const nextTheme = updater(normalizeTheme(current.theme, current.template_key));
      return { ...current, theme: nextTheme };
    });
    setDirty(true);
  }, []);

  const saveNow = useCallback(async (nextIsLive: boolean) => {
    setSavingNow(true);

    try {
      const payload: PortfolioRecord = {
        ...localPortfolio,
        title: localPortfolio.title.trim() || "Untitled portfolio",
        is_live: nextIsLive,
        content: normalizePortfolioDocument(localPortfolio.content, profile),
        theme: normalizeTheme(localPortfolio.theme, localPortfolio.template_key),
      };

      const persisted = await onSave(payload);
      setLocalPortfolio({
        ...persisted,
        content: normalizePortfolioDocument(persisted.content, profile),
        theme: normalizeTheme(persisted.theme, persisted.template_key),
      });
      setDirty(false);

      if (nextIsLive) {
        toast.success(localPortfolio.is_live ? "Changes saved and public page updated." : "Saved and published.");
      } else {
        toast.success(localPortfolio.is_live ? "Portfolio unpublished and saved privately." : "Private draft saved.");
      }

      return persisted;
    } finally {
      setSavingNow(false);
    }
  }, [localPortfolio, onSave, profile]);

  const saveLocalDraftNow = useCallback(async () => {
    try {
      const savedAt = new Date().toISOString();

      await saveLocalPortfolioDraft(profileId, {
        portfolioId: localPortfolio.id,
        title: localPortfolio.title.trim() || "Untitled portfolio",
        templateKey: localPortfolio.template_key,
        isLive: localPortfolio.is_live,
        content: normalizePortfolioDocument(localPortfolio.content, profile),
        theme: normalizeTheme(localPortfolio.theme, localPortfolio.template_key),
        remoteUpdatedAt: localPortfolio.updated_at,
        savedAt,
      });

      setLocalDraftSavedAt(savedAt);
      toast.success("Local draft saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save local draft.");
    }
  }, [localPortfolio, profile, profileId]);

  const updateSection = (sectionId: string, patch: Record<string, unknown>) => {
    setLocalPortfolio((current) => ({
      ...current,
      content: {
        ...current.content,
        sections: current.content.sections.map((section) =>
          section.id === sectionId ? ({ ...section, ...patch } as PortfolioSection) : section
        ),
      },
    }));
    setDirty(true);
  };

  const updateSectionStyle = (
    sectionId: string,
    mode: PortfolioColorMode,
    viewport: PortfolioViewportKey,
    patch: Record<string, unknown>
  ) => {
    updateTheme((currentTheme) => {
      const sectionStyles = { ...currentTheme.sectionStyles };
      const sectionStyle = { ...(sectionStyles[sectionId] || {}) };
      const modeStyles = { ...(sectionStyle[mode] || {}) };
      const viewportStyles = { ...(modeStyles[viewport] || {}) };

      modeStyles[viewport] = {
        ...viewportStyles,
        ...patch,
      };
      sectionStyle[mode] = modeStyles;
      sectionStyles[sectionId] = sectionStyle;

      return { ...currentTheme, sectionStyles };
    });
  };

  const clearSectionStyle = (sectionId: string, mode: PortfolioColorMode, viewport: PortfolioViewportKey) => {
    updateTheme((currentTheme) => {
      const sectionStyles = { ...currentTheme.sectionStyles };
      const sectionStyle = { ...(sectionStyles[sectionId] || {}) };
      const modeStyles = { ...(sectionStyle[mode] || {}) };

      delete modeStyles[viewport];
      sectionStyle[mode] = modeStyles;
      sectionStyles[sectionId] = sectionStyle;

      return { ...currentTheme, sectionStyles };
    });
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    setLocalPortfolio((current) => {
      const index = current.content.sections.findIndex((section) => section.id === sectionId);
      if (index < 0) {
        return current;
      }

      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.content.sections.length) {
        return current;
      }

      const nextSections = [...current.content.sections];
      const [picked] = nextSections.splice(index, 1);
      nextSections.splice(nextIndex, 0, picked);

      return { ...current, content: { ...current.content, sections: nextSections } };
    });
    setDirty(true);
  };

  const removeSection = (sectionId: string) => {
    setLocalPortfolio((current) => ({
      ...current,
      content: { ...current.content, sections: current.content.sections.filter((section) => section.id !== sectionId) },
      theme: {
        ...normalizeTheme(current.theme, current.template_key),
        sectionStyles: Object.fromEntries(
          Object.entries(normalizeTheme(current.theme, current.template_key).sectionStyles).filter(
            ([storedSectionId]) => storedSectionId !== sectionId
          )
        ),
      },
    }));
    setDirty(true);
  };

  const addSection = (type: string) => {
    setLocalPortfolio((current) => ({
      ...current,
      content: {
        ...current.content,
        sections: [...current.content.sections, createSectionForType(type) as PortfolioSection],
      },
    }));
    setDirty(true);
  };

  const exportJson = () => {
    downloadJsonFile(`${localPortfolio.title || "portfolio"}.json`, {
      version: 1,
      title: localPortfolio.title,
      template_key: localPortfolio.template_key,
      content: localPortfolio.content,
      theme: localPortfolio.theme,
    });
  };

  const importJsonIntoEditor = async (file: File) => {
    const raw = await file.text();
    const parsed = parsePortfolioImportPayload(JSON.parse(raw));
    const templateKey = parsed.templateKey || localPortfolio.template_key;

    setLocalPortfolio((current) => ({
      ...current,
      title: parsed.title || current.title,
      template_key: templateKey,
      content: normalizePortfolioDocument(parsed.content ?? {}, profile),
      theme: normalizeTheme(parsed.theme, templateKey),
    }));
    setDirty(true);
    toast.success("Imported into editor.");
  };

  const applyTemplateStarter = () => {
    setLocalPortfolio((current) => ({
      ...current,
      content: createDemoPortfolioDocument(profile, current.template_key),
      theme: {
        ...getDefaultPortfolioTheme(current.template_key),
        displayMode: normalizeTheme(current.theme, current.template_key).displayMode,
        editorMode: normalizeTheme(current.theme, current.template_key).editorMode,
      },
    }));
    setDirty(true);
    toast.success("Template starter content loaded.");
  };

  const clearPortfolioContent = () => {
    setLocalPortfolio((current) => ({
      ...current,
      content: clearPortfolioDocumentContent(current.content, profile),
    }));
    setDirty(true);
    toast.success("Portfolio content cleared.");
  };

  const sections = localPortfolio.content.sections;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[520px_minmax(0,1fr)] 2xl:grid-cols-[548px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <SectionCard
          title="Portfolio builder"
          actions={
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2 text-sm font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          }
        >
          <div className="grid gap-3">
            <Field label="Portfolio title">
              <Input
                value={localPortfolio.title}
                onChange={(event) => {
                  setLocalPortfolio((current) => ({ ...current, title: event.target.value }));
                  setDirty(true);
                }}
                placeholder="Untitled portfolio"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Display name">
                <Input
                  value={localPortfolio.content.profile.fullName}
                  onChange={(event) => {
                    setLocalPortfolio((current) => ({
                      ...current,
                      content: {
                        ...current.content,
                        profile: { ...current.content.profile, fullName: event.target.value },
                      },
                    }));
                    setDirty(true);
                  }}
                />
              </Field>
              <Field label="Headline">
                <Input
                  value={localPortfolio.content.profile.headline}
                  onChange={(event) => {
                    setLocalPortfolio((current) => ({
                      ...current,
                      content: {
                        ...current.content,
                        profile: { ...current.content.profile, headline: event.target.value },
                      },
                    }));
                    setDirty(true);
                  }}
                />
              </Field>
            </div>

            <Field label="Template">
              <select
                value={localPortfolio.template_key}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "minimal_hero" || value === "bold_cards" || value === "creative_timeline") {
                    setLocalPortfolio((current) => ({
                      ...current,
                      template_key: value,
                      theme: normalizeTheme(current.theme, value),
                    }));
                    setDirty(true);
                  }
                }}
                className="input-shell h-10 rounded-[14px] px-3 py-2 text-[13px]"
              >
                {portfolioTemplateOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-app-muted">
                Current: {resolveTemplateLabel(localPortfolio.template_key)}. Use the starter button below to refill template content.
              </span>
            </Field>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyTemplateStarter}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3.5 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
              >
                <RefreshCcw className="h-4 w-4 text-brand" />
                Apply template starter
              </button>
              <button
                type="button"
                onClick={clearPortfolioContent}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3.5 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
              >
                <Eraser className="h-4 w-4 text-brand" />
                Clear content
              </button>
              <button
                type="button"
                onClick={() => {
                  updateTheme((currentTheme) => ({ ...currentTheme, sectionStyles: {} }));
                  toast.success("All section style overrides cleared.");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3.5 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
              >
                <RefreshCcw className="h-4 w-4 text-brand" />
                Reset section styles
              </button>
            </div>

            <div className="rounded-[20px] border border-app-border bg-app-secondary/35 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Public theme mode">
                  <select
                    value={normalizedTheme.displayMode}
                    onChange={(event) => {
                      const nextValue = event.target.value as "light" | "dark" | "system";
                      updateTheme((currentTheme) => ({ ...currentTheme, displayMode: nextValue }));
                    }}
                    className="input-shell h-10 rounded-[14px] px-3 py-2 text-[13px]"
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </Field>

                <Field label="Editor design mode">
                  <div className="flex flex-wrap gap-2">
                    {(["light", "dark"] as PortfolioColorMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateTheme((currentTheme) => ({ ...currentTheme, editorMode: mode }))}
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          normalizedTheme.editorMode === mode
                            ? "bg-brand text-white"
                            : "border border-app-border bg-app-card text-app-text hover:border-brand/30 hover:bg-brand/5"
                        }`}
                      >
                        {mode === "light" ? "Edit light palette" : "Edit dark palette"}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ["primary", "Primary"],
                  ["accent", "Accent"],
                  ["background", "Background"],
                  ["surface", "Surface"],
                  ["text", "Text"],
                  ["muted", "Muted"],
                ] as const).map(([tokenKey, label]) => (
                  <Field key={tokenKey} label={`${label} (${normalizedTheme.editorMode})`}>
                    <Input
                      value={normalizedTheme.modes[normalizedTheme.editorMode][tokenKey]}
                      onChange={(event) => {
                        updateTheme((currentTheme) => ({
                          ...currentTheme,
                          modes: {
                            ...currentTheme.modes,
                            [normalizedTheme.editorMode]: {
                              ...currentTheme.modes[normalizedTheme.editorMode],
                              [tokenKey]: event.target.value,
                            },
                          },
                          tokens:
                            normalizedTheme.editorMode === "dark"
                              ? {
                                  ...currentTheme.modes.dark,
                                  [tokenKey]: event.target.value,
                                }
                              : currentTheme.tokens,
                        }));
                      }}
                      placeholder={label}
                    />
                  </Field>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveLocalDraftNow()}
                disabled={saving || savingNow}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2 text-sm font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4 text-brand" />
                Save local draft
              </button>

              <button
                type="button"
                onClick={() => void saveNow(true)}
                disabled={saving || savingNow}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving || savingNow ? "Saving..." : localPortfolio.is_live ? "Save changes" : "Save & publish"}
              </button>

              <button
                type="button"
                onClick={() => void saveNow(false)}
                disabled={saving || savingNow}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2 text-sm font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {localPortfolio.is_live ? "Unpublish" : "Save private draft"}
              </button>
              
              <button
                type="button"
                disabled={!localPortfolio.is_live}
                onClick={() => {
                  if (!localPortfolio.is_live) {
                    toast.error("Portfolio must be live to share.");
                    return;
                  }
                  setShareState({
                    open: true,
                    destination: "discussion",
                    category: "job",
                    communityId: joinedCommunities[0]?.id || "",
                    title: `My Portfolio: ${localPortfolio.title}`,
                    note: "",
                    loading: !shareOptionsReady,
                    submitting: false,
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" />
                Share to Feed
              </button>

              <span
                className={`inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold ${
                  dirty ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700"
                }`}
              >
                {dirty ? "Unsaved remote changes" : "Remote copy up to date"}
              </span>
            </div>

            <div className="rounded-[18px] border border-app-border bg-app-secondary/40 p-3 text-xs text-app-muted">
              Local drafts save only when you click `Save local draft`.
              {localDraftSavedAt ? ` Last saved ${new Date(localDraftSavedAt).toLocaleString()}.` : ""}
            </div>

            {localPortfolio.is_live ? (
              <div className="rounded-[18px] border border-app-border bg-app-secondary/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Live link</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-app-card px-3.5 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                  >
                    <Globe2 className="h-4 w-4 text-brand" />
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(publicUrl);
                      toast.success("Link copied.");
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3.5 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                  >
                    <Copy className="h-4 w-4 text-brand" />
                    Copy
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportJson}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3.5 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
              >
                <FileJson className="h-4 w-4 text-brand" />
                Export JSON
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) {
                    void importJsonIntoEditor(file).catch((error: unknown) => {
                      toast.error(error instanceof Error ? error.message : "Could not import JSON.");
                    });
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3.5 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
              >
                <Upload className="h-4 w-4 text-brand" />
                Import JSON
              </button>
            </div>

            {restoredLocalDraftAt ? (
              <div className="rounded-[18px] border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-800">
                Restored a local draft saved {new Date(restoredLocalDraftAt).toLocaleString()}.
              </div>
            ) : null}
          </div>
        </SectionCard>

        <PortfolioSectionList
          sections={sections}
          sectionStyles={normalizedTheme.sectionStyles}
          designViewport={designViewport}
          designMode={normalizedTheme.editorMode}
          onDesignViewportChange={setDesignViewport}
          onDesignModeChange={(mode) => updateTheme((currentTheme) => ({ ...currentTheme, editorMode: mode }))}
          onAddSection={addSection}
          onUpdateSection={updateSection}
          onMoveSection={moveSection}
          onRemoveSection={removeSection}
          onUpdateSectionStyle={updateSectionStyle}
          onClearSectionStyle={clearSectionStyle}
        />

        <SectionCard
          title="Danger zone"
          actions={
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`Delete "${localPortfolio.title}" permanently?`)) {
                  return;
                }
                await onDelete(localPortfolio);
                await clearLocalPortfolioDraft(profileId, localPortfolio.id).catch(() => undefined);
                toast.success("Portfolio deleted.");
                onBack();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/15"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          }
        >
          <p className="text-sm text-app-muted">
            Deleting removes the local draft, private draft, and live page if it has been published.
          </p>
        </SectionCard>
      </div>

      <div className="min-w-0 space-y-4">
        <PortfolioPreviewPanel portfolio={previewPortfolio} />
      </div>

      <PortfolioShareSheet
        shareState={shareState}
        setShareState={setShareState}
        joinedCommunities={joinedCommunities}
        allowedShareCategories={shareState.destination === "community" ? ["job", "study", "anonymous"] : ["job", "study", "anonymous"]}
        shareSnapshotFallback={publicUrl}
        onClose={() => setShareState((current) => ({ ...current, open: false }))}
        onSubmit={handleShareSubmit}
      />
    </div>
  );
}
