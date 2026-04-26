import { BarChart3, MessageCircle, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInstagramRelativeTime, truncateInstagramText } from "../helpers";
import type { InstagramAccountSummary, InstagramAnalyticsSummary, InstagramRecentComment } from "../types";

interface InstagramAnalyticsPanelProps {
  account: InstagramAccountSummary | null;
  analytics: InstagramAnalyticsSummary;
  mediaCount: number;
  recentComments: InstagramRecentComment[];
  mediaError: string | null;
  refreshingMedia: boolean;
  onRefreshMedia: () => Promise<void>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[22px] border border-app-border bg-app-card/90 px-3.5 py-4 shadow-[0_22px_45px_-36px_rgba(15,23,42,0.4)] backdrop-blur sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-app-muted sm:text-[11px]">{label}</p>
          <p className="mt-2 font-display text-[1.7rem] font-semibold leading-none text-app-text sm:text-3xl">{value}</p>
        </div>
        <div className="rounded-[14px] bg-app-secondary/80 p-2 text-fuchsia-600 dark:text-fuchsia-300">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-app-muted sm:text-sm">{hint}</p>
    </div>
  );
}

export function InstagramAnalyticsPanel({
  account,
  analytics,
  mediaCount,
  recentComments,
  mediaError,
  refreshingMedia,
  onRefreshMedia,
}: InstagramAnalyticsPanelProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Sparkles} label="Automations" value={analytics.total_actions.toLocaleString()} hint="Recent logged actions" />
        <StatCard icon={ShieldCheck} label="Success" value={`${analytics.success_rate.toFixed(1)}%`} hint="Webhook actions completed" />
        <StatCard icon={MessageCircle} label="Comments" value={analytics.comment_replies.toLocaleString()} hint="Public comment responses" />
        <StatCard icon={Send} label="DM Replies" value={analytics.dm_replies.toLocaleString()} hint="Inbox automations sent" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={ShieldCheck} label="Skipped" value={`${analytics.skipped_actions || 0}`} hint="Rate-limited or policy-gated" />
        <StatCard icon={ShieldCheck} label="Partial" value={`${analytics.partial_actions || 0}`} hint="Only part of the workflow executed" />
        <StatCard icon={MessageCircle} label="Comment to DM" value={analytics.comment_to_dm.toLocaleString()} hint="Lead-flow combos triggered" />
        <StatCard icon={BarChart3} label="Media Cache" value={mediaCount.toLocaleString()} hint="Posts/reels available for targeting" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <section className="rounded-[28px] border border-app-border bg-app-card/90 p-4 shadow-[0_28px_64px_-42px_rgba(15,23,42,0.4)] backdrop-blur sm:rounded-[30px] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-[16px] bg-app-secondary/80 p-3 text-fuchsia-600 dark:text-fuchsia-300">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300 sm:text-[11px]">Analytics</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-app-text sm:text-2xl">Last 7 days</h3>
                <p className="mt-2 text-sm text-app-muted">See how often the rules actually fired.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 h-[220px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.daily_actions} margin={{ top: 16, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="instagramAutomationArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d946ef" stopOpacity={0.44} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--app-border) / 0.5)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--app-muted))", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "rgb(var(--app-muted))", fontSize: 12 }} />
                <Tooltip
                  cursor={{ stroke: "#c026d3", strokeDasharray: "4 4" }}
                  contentStyle={{
                    borderRadius: 20,
                    border: "1px solid rgb(var(--app-border))",
                    backgroundColor: "rgb(var(--app-card))",
                    color: "rgb(var(--app-text))",
                    boxShadow: "0 18px 40px -28px rgba(15,23,42,0.38)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#c026d3"
                  strokeWidth={3}
                  fill="url(#instagramAutomationArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-[28px] border border-fuchsia-100 bg-[linear-gradient(180deg,#fff7fb_0%,#ffffff_100%)] p-4 shadow-[0_28px_64px_-42px_rgba(15,23,42,0.4)] dark:border-fuchsia-500/25 dark:bg-[linear-gradient(180deg,rgba(34,17,40,0.98)_0%,rgba(7,12,24,0.98)_100%)] sm:rounded-[30px] sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-[16px] bg-app-card p-3 text-fuchsia-600 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.35)] dark:text-fuchsia-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300 sm:text-[11px]">Connection Health</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-app-text sm:text-2xl">Live diagnostics</h3>
              </div>
            </div>

            <div className="mt-4 grid gap-3 min-[430px]:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[20px] bg-app-card px-4 py-3 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-muted">Account</p>
                <p className="mt-2 text-sm font-semibold text-app-text">
                  {account ? `@${account.instagram_username || account.ig_user_id}` : "No account connected"}
                </p>
              </div>
              <div className="rounded-[20px] bg-app-card px-4 py-3 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-muted">Known Media</p>
                <p className="mt-2 text-sm font-semibold text-app-text">{mediaCount.toLocaleString()} recent post(s) loaded</p>
                <p className="mt-1 text-xs text-app-muted">Use these ids to attach post-specific rules fast.</p>
              </div>
              <div className="rounded-[20px] bg-app-card px-4 py-3 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-muted">Webhook Health</p>
                <p className="mt-2 text-sm font-semibold text-app-text">
                  {account?.webhook_subscribed ? "Subscribed and ready" : "Needs attention"}
                </p>
                <p className="mt-1 text-xs text-app-muted">
                  {mediaError || "If a Meta permission is missing, reconnect once the app is approved in your Meta dashboard."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onRefreshMedia()}
              disabled={refreshingMedia || !account}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-fuchsia-200 bg-app-card px-4 py-3 text-sm font-semibold text-fuchsia-700 transition hover:border-fuchsia-300 hover:bg-fuchsia-50 dark:border-fuchsia-500/25 dark:bg-app-card dark:text-fuchsia-200 dark:hover:bg-fuchsia-500/[0.15] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshingMedia ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh media
            </button>
          </section>

          <section className="rounded-[28px] border border-app-border bg-app-card/90 p-4 shadow-[0_28px_64px_-42px_rgba(15,23,42,0.4)] backdrop-blur sm:rounded-[30px] sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-[16px] bg-app-secondary/80 p-3 text-fuchsia-600 dark:text-fuchsia-300">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300 sm:text-[11px]">Comment Feed</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-app-text sm:text-2xl">Recent synced comments</h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentComments.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-app-border px-5 py-8 text-center text-sm text-app-muted">
                  No synced comments yet. New comment webhooks and manual comment fetches will appear here.
                </div>
              ) : null}

              {recentComments.slice(0, 6).map((comment) => (
                <article key={comment.id} className="rounded-[20px] border border-app-border/80 bg-app-secondary/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-app-text">
                      {comment.commenter_username ? `@${comment.commenter_username}` : comment.commenter_ig_user_id || "Instagram user"}
                    </p>
                    <p className="text-xs text-app-muted">{formatInstagramRelativeTime(comment.commented_at)}</p>
                  </div>
                  <p className="mt-2 text-sm text-app-text">{truncateInstagramText(comment.comment_text, 140)}</p>
                  {comment.ig_media_id ? (
                    <p className="mt-2 text-xs text-app-muted">Media: {truncateInstagramText(comment.ig_media_id, 24)}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
