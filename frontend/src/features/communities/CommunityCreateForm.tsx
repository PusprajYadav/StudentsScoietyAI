import {
  BookOpen,
  Briefcase,
  Eye,
  FileText,
  Ghost,
  Hash,
  KeyRound,
  Paintbrush,
  Settings2,
  ShieldCheck,
  Sparkles,
  Type,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getDiscussionKindLabel } from "../../data/discussions";
import { slugify } from "../../lib/api";
import { useThemeStore } from "../../store/themeStore";
import type { CommunityFeedVisibility, CommunityJoinPolicy, DiscussionKind } from "../../types/database";
import { CommunityFeedVisibilityPicker } from "./CommunityFeedVisibilityPicker";
import { normalizeCommunityColor, withAppThemeAlpha, withCommunityAlpha } from "./communityTheme";

export interface CommunityCreateFormPayload {
  name: string;
  slug: string;
  description: string;
  heroColor: string;
  postingModes: DiscussionKind[];
  joinPolicy: CommunityJoinPolicy;
  requiresPassword: boolean;
  password: string;
  passwordHint: string;
  feedVisibility: CommunityFeedVisibility;
}

interface CommunityCreateFormProps {
  costLabel: string;
  onSubmit: (payload: CommunityCreateFormPayload) => Promise<void>;
}

const DEFAULT_POSTING_MODES: DiscussionKind[] = ["study", "job", "anonymous"];
const MODE_META: Record<DiscussionKind, { icon: typeof BookOpen }> = {
  study: { icon: BookOpen },
  job: { icon: Briefcase },
  anonymous: { icon: Ghost },
};

export function CommunityCreateForm({ costLabel, onSubmit }: CommunityCreateFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [heroColor, setHeroColor] = useState("#2563eb");
  const [postingModes, setPostingModes] = useState<DiscussionKind[]>(DEFAULT_POSTING_MODES);
  const [joinPolicy, setJoinPolicy] = useState<CommunityJoinPolicy>("open");
  const [feedVisibility, setFeedVisibility] = useState<CommunityFeedVisibility>("community_only");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { resolvedTheme } = useThemeStore();
  const previewAccent = normalizeCommunityColor(heroColor);
  const previewCardBackground =
    resolvedTheme === "dark"
      ? `linear-gradient(145deg, ${withCommunityAlpha(previewAccent, 0.22)}, rgba(15,23,42,0.96) 56%, rgba(2,6,23,0.98) 100%)`
      : `linear-gradient(145deg, ${withCommunityAlpha(previewAccent, 0.16)}, ${withAppThemeAlpha("app-card", 0.94)} 56%, ${withCommunityAlpha(previewAccent, 0.1)})`;
  const previewShine =
    resolvedTheme === "dark"
      ? "linear-gradient(135deg, transparent 18%, rgba(148,163,184,0.08) 48%, transparent 82%)"
      : "linear-gradient(135deg, transparent 18%, rgba(255,255,255,0.42) 48%, transparent 82%)";

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    setSlug(slugify(name));
  }, [name, slugTouched]);

  const handleSubmit = async () => {
    const nextName = name.trim();
    const nextSlug = slugify(slug);
    const nextDescription = description.trim();
    const nextPassword = password.trim();
    const nextPasswordHint = passwordHint.trim();

    if (!nextName) {
      toast.error("Add a community name.");
      return;
    }

    if (!nextSlug) {
      toast.error("Add a valid community slug.");
      return;
    }

    if (postingModes.length === 0) {
      toast.error("Enable at least one posting mode.");
      return;
    }

    if (requiresPassword && nextPassword.length < 4) {
      toast.error("Password protection needs at least 4 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        name: nextName,
        slug: nextSlug,
        description: nextDescription,
        heroColor,
        postingModes,
        joinPolicy,
        requiresPassword,
        password: nextPassword,
        passwordHint: nextPasswordHint,
        feedVisibility,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create this community.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="surface-card rounded-[28px] p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <div className="grid gap-3.5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_248px]">
          <section className="rounded-[24px] border border-app-border bg-app-card/78 p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.32)]">
            <div className="flex items-center gap-2 text-app-text">
              <Settings2 className="h-4 w-4 text-brand" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app-muted">Basics</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_184px]">
              <label className="grid gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
                  <Type className="h-3.5 w-3.5" />
                  Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="input-shell h-11 text-sm"
                  placeholder="Placement Circle"
                  maxLength={60}
                  disabled={submitting}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
                  <Paintbrush className="h-3.5 w-3.5" />
                  Accent
                </span>
                <div className="flex h-11 items-center gap-2 rounded-[18px] border border-app-border bg-app-card px-3">
                  <input
                    type="color"
                    value={heroColor}
                    onChange={(event) => setHeroColor(event.target.value)}
                    className="h-7 w-10 rounded-md border-0 bg-transparent p-0"
                    disabled={submitting}
                  />
                  <span className="min-w-0 truncate text-sm font-semibold text-app-text">{heroColor}</span>
                </div>
              </label>
            </div>

            <div className="mt-3 grid gap-3">
              <label className="grid gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
                  <Hash className="h-3.5 w-3.5" />
                  Slug
                </span>
                <input
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(slugify(event.target.value));
                  }}
                  className="input-shell h-11 text-sm"
                  placeholder="placement-circle"
                  maxLength={40}
                  disabled={submitting}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
                  <FileText className="h-3.5 w-3.5" />
                  About
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="input-shell min-h-[120px] resize-y"
                  placeholder="About this community."
                  maxLength={240}
                  disabled={submitting}
                />
              </label>
            </div>
          </section>

          <aside className="grid gap-3">
            <section className="rounded-[24px] border border-app-border bg-app-card/82 p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.32)]">
              <div className="flex items-center gap-2 text-app-text">
                <Eye className="h-4 w-4 text-brand" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app-muted">Preview</p>
              </div>
              <div
                className="relative mt-3 overflow-hidden rounded-[22px] border border-app-border/80 p-4 shadow-[0_20px_42px_-36px_rgba(15,23,42,0.28)]"
                style={{
                  backgroundImage: previewCardBackground,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ backgroundImage: previewShine }}
                />
                <div className="relative flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-white shadow-[0_18px_32px_-24px_rgba(15,23,42,0.38)]"
                    style={{ backgroundColor: previewAccent }}
                  >
                    {(name.trim().charAt(0) || "C").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold tracking-tight text-app-text">
                      {name.trim() || "New community"}
                    </p>
                    <p className="truncate text-xs text-app-muted">@{slug || "community-slug"}</p>
                  </div>
                </div>
                <p className="relative mt-3 line-clamp-3 text-sm leading-5 text-app-text/82">
                  {description.trim() || "A focused student space with clean posting rules and a moderated member flow."}
                </p>
              </div>
            </section>

            <section className="rounded-[24px] border border-app-border bg-app-card/82 p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.32)]">
              <div className="flex items-center gap-2 text-app-text">
                <Sparkles className="h-4 w-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app-muted">Cost</p>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-2 text-sm font-semibold text-brand">
                <Sparkles className="h-4 w-4" />
                {costLabel}
              </div>
            </section>
          </aside>
        </div>

        <section className="rounded-[24px] border border-app-border bg-app-card/78 p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.32)]">
          <div className="flex items-center gap-2 text-app-text">
            <Users className="h-4 w-4 text-brand" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app-muted">Posts</p>
          </div>
          <div className="mt-3">
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["study", "job", "anonymous"] as DiscussionKind[]).map((mode) => {
                const selected = postingModes.includes(mode);
                const Icon = MODE_META[mode].icon;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setPostingModes((current) =>
                        selected ? current.filter((entry) => entry !== mode) : [...current, mode]
                      )
                    }
                    className={`min-w-0 rounded-[18px] px-2.5 py-2 text-[0.82rem] font-semibold transition ${
                      selected ? "bg-brand text-white" : "bg-app-secondary text-app-text"
                    }`}
                    disabled={submitting}
                  >
                    <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{getDiscussionKindLabel(mode)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
                <Users className="h-3.5 w-3.5" />
                Join
              </span>
              <select
                value={joinPolicy}
                onChange={(event) => setJoinPolicy(event.target.value as CommunityJoinPolicy)}
                className="input-shell h-11 text-sm"
                disabled={submitting}
              >
                <option value="open">Open join</option>
                <option value="approval_required">Manual approval</option>
              </select>
            </label>

            <div className="rounded-[20px] border border-app-border bg-app-card p-3.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-app px-3 py-2 text-sm font-semibold text-app-text shadow-[0_10px_18px_-16px_rgba(15,23,42,0.35)]">
                <Users className="h-3.5 w-3.5 text-brand" />
                {joinPolicy === "approval_required" ? "Manual review" : "Open join"}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <CommunityFeedVisibilityPicker
              value={feedVisibility}
              onChange={setFeedVisibility}
              disabled={submitting}
              helperText="Where posts show."
              compact
            />
          </div>
        </section>

        <section className="rounded-[24px] border border-app-border bg-app-card/78 p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.32)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-app-text">
                <ShieldCheck className="h-4 w-4 text-brand" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app-muted">Access</p>
              </div>
              <p className="mt-1 text-sm font-semibold text-app-text">Password</p>
            </div>
            <label className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-3 py-2 text-sm font-semibold text-app-text">
              <input
                type="checkbox"
                checked={requiresPassword}
                onChange={(event) => setRequiresPassword(event.target.checked)}
                className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
                disabled={submitting}
              />
              Lock
            </label>
          </div>

          {requiresPassword ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
                  <KeyRound className="h-3.5 w-3.5" />
                  Password
                </span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-shell h-11 pl-10 text-sm"
                    placeholder="At least 4 characters"
                    disabled={submitting}
                  />
                </div>
              </label>

              <label className="grid gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
                  <FileText className="h-3.5 w-3.5" />
                  Hint
                </span>
                <input
                  value={passwordHint}
                  onChange={(event) => setPasswordHint(event.target.value)}
                  className="input-shell h-11 text-sm"
                  placeholder="Optional hint for new members"
                  disabled={submitting}
                />
              </label>
            </div>
          ) : null}
        </section>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-app-border pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary inline-flex min-w-[11rem] items-center justify-center !rounded-full !px-5 !py-3 text-sm font-semibold"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </form>
  );
}
