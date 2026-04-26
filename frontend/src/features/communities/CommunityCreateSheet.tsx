import { KeyRound, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getDiscussionKindLabel } from "../../data/discussions";
import { slugify } from "../../lib/api";
import type { CommunityFeedVisibility, CommunityJoinPolicy, DiscussionKind } from "../../types/database";
import { CommunityFeedVisibilityPicker } from "./CommunityFeedVisibilityPicker";

interface CommunityCreateSheetProps {
  open: boolean;
  costLabel: string;
  onClose: () => void;
  onSubmit: (payload: {
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
  }) => Promise<void>;
}

const DEFAULT_POSTING_MODES: DiscussionKind[] = ["study", "job", "anonymous"];

export function CommunityCreateSheet({ open, costLabel, onClose, onSubmit }: CommunityCreateSheetProps) {
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

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setHeroColor("#2563eb");
    setPostingModes(DEFAULT_POSTING_MODES);
    setJoinPolicy("open");
    setFeedVisibility("community_only");
    setRequiresPassword(false);
    setPassword("");
    setPasswordHint("");
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    setSlug(slugify(name));
  }, [name, slugTouched]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex h-full items-end justify-center p-0 sm:p-4">
        <div className="native-sheet flex h-[86dvh] w-full max-w-2xl flex-col p-4 sm:h-auto sm:max-h-[88dvh] sm:rounded-[32px] sm:border sm:shadow-2xl">
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-app-border sm:hidden" />

          <div className="flex items-start justify-between gap-3 pb-4">
            <div>
              <p className="font-display text-[1.5rem] font-bold tracking-tight text-app-text sm:text-[2rem]">
                Create community
              </p>
              <p className="mt-1 text-sm text-app-muted">
                Start a moderated space with your own join rules and posting setup.
              </p>
            </div>

            <button type="button" onClick={onClose} className="native-icon-button h-10 w-10" aria-label="Close create community sheet">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <div className="grid gap-4 pb-2">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Name</span>
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
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Accent</span>
                  <input
                    type="color"
                    value={heroColor}
                    onChange={(event) => setHeroColor(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-app-border bg-app-card p-1.5"
                    disabled={submitting}
                  />
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Slug</span>
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
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="input-shell min-h-[110px] resize-y"
                  placeholder="What this community is for, who it helps, and what members should post here."
                  maxLength={240}
                  disabled={submitting}
                />
              </label>

              <div className="rounded-[22px] border border-app-border bg-app-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-app-text">Creation cost</p>
                    <p className="mt-1 text-xs text-app-muted">This is controlled from the admin coin economy.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand">
                    <Sparkles className="h-4 w-4" />
                    {costLabel}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Allowed posts</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["study", "job", "anonymous"] as DiscussionKind[]).map((mode) => {
                    const selected = postingModes.includes(mode);

                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setPostingModes((current) =>
                            selected ? current.filter((entry) => entry !== mode) : [...current, mode]
                          )
                        }
                        className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                          selected ? "bg-brand text-white" : "bg-app-secondary text-app-text"
                        }`}
                        disabled={submitting}
                      >
                        {getDiscussionKindLabel(mode)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Join flow</span>
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

                <div className="rounded-[22px] border border-app-border bg-app-card p-4">
                  <p className="text-sm font-semibold text-app-text">How people join</p>
                  <p className="mt-1 text-xs leading-5 text-app-muted">
                    {joinPolicy === "approval_required"
                      ? "Students can request access, and an admin approves them before they become members."
                      : "Students can join instantly unless you also turn on password protection below."}
                  </p>
                </div>
              </div>

              <CommunityFeedVisibilityPicker
                value={feedVisibility}
                onChange={setFeedVisibility}
                disabled={submitting}
                helperText="Pick whether posts stay private to members, stay on the community page, or can also appear in Discuss."
              />

              <div className="rounded-[22px] border border-app-border bg-app-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-app-text">Password protection</p>
                    <p className="mt-1 text-xs text-app-muted">Ask new members for a shared password before they can join.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-3 py-1.5 text-sm font-semibold text-app-text">
                    <input
                      type="checkbox"
                      checked={requiresPassword}
                      onChange={(event) => setRequiresPassword(event.target.checked)}
                      className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
                      disabled={submitting}
                    />
                    Enable
                  </label>
                </div>

                {requiresPassword ? (
                  <div className="mt-3 grid gap-3">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Password</span>
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
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Password hint</span>
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
              </div>
            </div>
          </div>

          <div className="border-t border-app-border pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setSubmitting(true);
                void onSubmit({
                  name,
                  slug,
                  description,
                  heroColor,
                  postingModes,
                  joinPolicy,
                  requiresPassword,
                  password,
                  passwordHint,
                  feedVisibility,
                }).finally(() => setSubmitting(false));
              }}
              className="btn-primary w-full !rounded-full !py-3"
            >
              {submitting ? "Creating community..." : "Create community"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
