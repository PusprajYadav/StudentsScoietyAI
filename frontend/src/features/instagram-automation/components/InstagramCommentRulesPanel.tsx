import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Clock3, MessageCircle, PencilLine, Plus, Trash2 } from "lucide-react";
import type { InstagramCommentRuleRow } from "../../../types/database";
import {
  buildInstagramMediaLabel,
  createEmptyInstagramCommentRuleDraft,
  formatInstagramRelativeTime,
  parseInstagramKeywordInput,
  stringifyInstagramKeywordInput,
  truncateInstagramText,
} from "../helpers";
import type { InstagramCommentRuleDraft, InstagramMediaItem } from "../types";

interface InstagramCommentRulesPanelProps {
  rules: InstagramCommentRuleRow[];
  media: InstagramMediaItem[];
  busySaving: boolean;
  deletingRuleId: string | null;
  onSave: (draft: InstagramCommentRuleDraft) => Promise<void>;
  onDelete: (ruleId: string) => Promise<void>;
}

const inputClassName =
  "w-full rounded-[16px] border border-app-border bg-app-card px-4 py-3 text-sm text-app-text outline-none transition placeholder:text-app-muted focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-100";

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MessageCircle;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-secondary/70 px-3 py-1.5 text-xs font-semibold text-app-text">
      <Icon className="h-3.5 w-3.5 text-fuchsia-600 dark:text-fuchsia-300" />
      <span className="text-app-muted">{label}</span>
      <span>{value}</span>
    </span>
  );
}

export function InstagramCommentRulesPanel({
  rules,
  media,
  busySaving,
  deletingRuleId,
  onSave,
  onDelete,
}: InstagramCommentRulesPanelProps) {
  const [draft, setDraft] = useState<InstagramCommentRuleDraft>(createEmptyInstagramCommentRuleDraft());
  const [formOpen, setFormOpen] = useState(rules.length === 0);

  useEffect(() => {
    if (draft.id && !rules.some((rule) => rule.id === draft.id)) {
      setDraft(createEmptyInstagramCommentRuleDraft());
    }
  }, [draft.id, rules]);

  useEffect(() => {
    if (draft.id || rules.length === 0) {
      setFormOpen(true);
    }
  }, [draft.id, rules.length]);

  const liveCount = rules.filter((rule) => rule.is_active).length;
  const canSubmit = Boolean(draft.media_id.trim() && draft.keyword.trim() && draft.reply_text.trim());

  function handleCreateNew() {
    setDraft(createEmptyInstagramCommentRuleDraft());
    setFormOpen(true);
  }

  function handleCancel() {
    setDraft(createEmptyInstagramCommentRuleDraft());
    setFormOpen(rules.length === 0);
  }

  async function handleSubmit() {
    await onSave(draft);
    setDraft(createEmptyInstagramCommentRuleDraft());
    setFormOpen(false);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <section className="rounded-[28px] border border-app-border bg-app-card/90 p-4 shadow-[0_28px_64px_-42px_rgba(15,23,42,0.4)] backdrop-blur sm:rounded-[30px] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-[16px] bg-app-secondary/80 p-3 text-fuchsia-600 dark:text-fuchsia-300">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300 sm:text-[11px]">
                Comment Rules
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold text-app-text sm:text-2xl">Post reply rules</h3>
              <p className="mt-2 text-sm text-app-muted">Compact per-post keyword replies with delay and variants.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {formOpen ? (
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-app-border bg-app-card px-4 py-2.5 text-sm font-semibold text-app-text transition hover:bg-app-secondary min-[430px]:w-auto"
              >
                <ChevronUp className="h-4 w-4" />
                <span className="hidden sm:inline">Hide</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-2.5 text-sm font-semibold text-fuchsia-700 transition hover:bg-fuchsia-100 dark:border-fuchsia-500/25 dark:bg-fuchsia-500/[0.12] dark:text-fuchsia-200 dark:hover:bg-fuchsia-500/[0.18] min-[430px]:w-auto"
            >
              <Plus className="h-4 w-4" />
              New Rule
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <MetricPill icon={MessageCircle} label="Rules" value={rules.length.toString()} />
          <MetricPill icon={CheckCircle2} label="Live" value={liveCount.toString()} />
          <MetricPill icon={Clock3} label="Media" value={media.length.toString()} />
        </div>

        {formOpen ? (
          <div className="mt-4 rounded-[24px] border border-app-border bg-app-secondary/45 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Media</span>
                <input
                  className={inputClassName}
                  value={draft.media_id}
                  onChange={(event) => setDraft((current) => ({ ...current, media_id: event.target.value }))}
                  placeholder="17895695668004550"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Keyword</span>
                <input
                  className={inputClassName}
                  value={draft.keyword}
                  onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))}
                  placeholder="price"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Extra keywords</span>
                <textarea
                  className={`${inputClassName} min-h-[88px] resize-y`}
                  value={stringifyInstagramKeywordInput(draft.keyword_list)}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, keyword_list: parseInstagramKeywordInput(event.target.value) }))
                  }
                  placeholder="price, cost, rate"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Match mode</span>
                <select
                  className={inputClassName}
                  value={draft.match_mode || "contains_any"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      match_mode: event.target.value as InstagramCommentRuleDraft["match_mode"],
                    }))
                  }
                >
                  <option value="contains_any">Contains any keyword</option>
                  <option value="contains_all">Contains all keywords</option>
                  <option value="exact">Exact text match</option>
                  <option value="regex">Regex</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Negative keywords</span>
                <input
                  className={inputClassName}
                  value={stringifyInstagramKeywordInput(draft.negative_keywords || [])}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      negative_keywords: parseInstagramKeywordInput(event.target.value),
                    }))
                  }
                  placeholder="refund, spam"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Reply</span>
                <textarea
                  className={`${inputClassName} min-h-[100px] resize-y`}
                  value={draft.reply_text}
                  onChange={(event) => setDraft((current) => ({ ...current, reply_text: event.target.value }))}
                  placeholder="Check your DM for the details."
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Variants</span>
                <textarea
                  className={`${inputClassName} min-h-[88px] resize-y`}
                  value={stringifyInstagramKeywordInput(draft.reply_variants)}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, reply_variants: parseInstagramKeywordInput(event.target.value) }))
                  }
                  placeholder="Sending details in DM, Check your inbox, DM sent"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Else reply</span>
                <textarea
                  className={`${inputClassName} min-h-[88px] resize-y`}
                  value={draft.fallback_reply_text || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, fallback_reply_text: event.target.value }))}
                  placeholder="Optional fallback when the comment does not match the keyword condition"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Priority</span>
                <input
                  type="number"
                  min={1}
                  className={inputClassName}
                  value={draft.priority}
                  onChange={(event) => setDraft((current) => ({ ...current, priority: Number(event.target.value) || 100 }))}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Min delay</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  className={inputClassName}
                  value={draft.delay_min_seconds}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, delay_min_seconds: Number(event.target.value) || 0 }))
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Max delay</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  className={inputClassName}
                  value={draft.delay_max_seconds}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, delay_max_seconds: Number(event.target.value) || 0 }))
                  }
                />
              </label>

              <label className="flex items-center justify-between rounded-[18px] border border-app-border bg-app-card px-4 py-3 md:col-span-2">
                <span>
                  <span className="block text-sm font-semibold text-app-text">Rule active</span>
                  <span className="block text-xs text-app-muted">Pause without deleting</span>
                </span>
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(event) => setDraft((current) => ({ ...current, is_active: event.target.checked }))}
                  className="h-5 w-5 accent-fuchsia-600"
                />
              </label>
            </div>

            {media.length > 0 ? (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Recent media</p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {media.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, media_id: item.id }))}
                      className="shrink-0 rounded-full border border-fuchsia-100 bg-fuchsia-50 px-3 py-2 text-xs font-semibold text-fuchsia-700 transition hover:bg-fuchsia-100 dark:border-fuchsia-500/25 dark:bg-fuchsia-500/[0.12] dark:text-fuchsia-200 dark:hover:bg-fuchsia-500/[0.18]"
                    >
                      {buildInstagramMediaLabel(item.id, media)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={busySaving || !canSubmit}
                className="inline-flex items-center gap-2 rounded-full bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-fuchsia-300"
              >
                {draft.id ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {busySaving ? "Saving..." : draft.id ? "Update Rule" : "Create Rule"}
              </button>
              {(draft.id || rules.length > 0) && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-full border border-app-border bg-app-card px-5 py-3 text-sm font-semibold text-app-text transition hover:bg-app-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCreateNew}
            className="mt-4 flex w-full items-center justify-between rounded-[22px] border border-dashed border-app-border bg-app-secondary/35 px-4 py-4 text-left transition hover:bg-app-secondary/55"
          >
            <div>
              <p className="text-sm font-semibold text-app-text">Create a new comment reply rule</p>
              <p className="mt-1 text-xs text-app-muted">Keep the editor closed until you need it.</p>
            </div>
            <ChevronDown className="h-4 w-4 text-app-muted" />
          </button>
        )}
      </section>

      <section className="rounded-[28px] border border-app-border bg-app-card/90 p-4 shadow-[0_28px_64px_-42px_rgba(15,23,42,0.4)] backdrop-blur sm:rounded-[30px] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300 sm:text-[11px]">
              Saved Rules
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold text-app-text sm:text-2xl">Active playbook</h3>
          </div>
          <span className="rounded-full border border-app-border bg-app-secondary/70 px-3 py-1 text-xs font-semibold text-app-muted">
            {rules.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {rules.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-app-border px-5 py-10 text-center text-sm text-app-muted">
              No comment reply rules yet. Create one to start replying per post.
            </div>
          ) : null}

          {rules.map((rule) => (
            <article key={rule.id} className="rounded-[22px] border border-app-border/80 bg-app-secondary/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-app-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                      {buildInstagramMediaLabel(rule.media_id, media)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        rule.is_active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/[0.15] dark:text-emerald-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-700/25 dark:text-slate-300"
                      }`}
                    >
                      {rule.is_active ? "Active" : "Paused"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-semibold text-app-text">{truncateInstagramText(rule.reply_text, 88)}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-muted">
                    <span>Keyword: {rule.keyword}</span>
                    {rule.keyword_list.length > 0 ? <span>Extras: {rule.keyword_list.join(", ")}</span> : null}
                    {rule.match_mode ? <span>Mode: {rule.match_mode.replace(/_/g, " ")}</span> : null}
                    {rule.negative_keywords && rule.negative_keywords.length > 0 ? <span>Excludes: {rule.negative_keywords.join(", ")}</span> : null}
                    {rule.fallback_reply_text ? <span>Else: {truncateInstagramText(rule.fallback_reply_text, 38)}</span> : null}
                    <span>Updated {formatInstagramRelativeTime(rule.updated_at)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 self-start">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({ ...rule });
                      setFormOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-200 bg-app-card px-3 py-2 text-xs font-semibold text-fuchsia-700 transition hover:bg-fuchsia-50 dark:border-fuchsia-500/25 dark:text-fuchsia-200 dark:hover:bg-fuchsia-500/[0.15]"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(rule.id)}
                    disabled={deletingRuleId === rule.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/25 dark:bg-rose-500/[0.12] dark:text-rose-300 dark:hover:bg-rose-500/[0.18] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{deletingRuleId === rule.id ? "Deleting..." : "Delete"}</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
