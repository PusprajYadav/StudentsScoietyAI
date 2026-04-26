import { CheckCircle2, Clock3, Instagram, Link2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import type { InstagramAccountSummary } from "../types";
import { formatInstagramRelativeTime } from "../helpers";

interface InstagramConnectionPanelProps {
  account: InstagramAccountSummary | null;
  busyMode: "connect" | "disconnect" | "toggle" | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onToggleAutomation: (enabled: boolean) => Promise<void>;
}

function StatusBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold sm:gap-2 sm:text-xs ${
        active
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/[0.15] dark:text-emerald-300"
          : "bg-amber-50 text-amber-700 dark:bg-amber-500/[0.15] dark:text-amber-300"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

function ConnectionFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Link2;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[20px] border border-app-border/70 bg-app-secondary/70 px-4 py-3">
      <div className="flex items-center gap-2 text-app-muted">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">{label}</p>
      </div>
      <p className="mt-2 break-all text-xs font-semibold text-app-text sm:text-sm">{value}</p>
    </div>
  );
}

export function InstagramConnectionPanel({
  account,
  busyMode,
  onConnect,
  onDisconnect,
  onToggleAutomation,
}: InstagramConnectionPanelProps) {
  if (!account) {
    return (
      <section className="rounded-[28px] border border-app-border bg-[linear-gradient(135deg,#fff7fb_0%,#ffffff_45%,#fff7ed_100%)] p-4 shadow-[0_28px_64px_-42px_rgba(15,23,42,0.4)] dark:bg-[linear-gradient(135deg,rgba(30,16,40,0.98)_0%,rgba(7,12,24,0.98)_52%,rgba(32,18,14,0.96)_100%)] sm:rounded-[30px] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-[18px] bg-fuchsia-600 p-3 text-white shadow-[0_18px_28px_-18px_rgba(192,38,211,0.6)]">
                <Instagram className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300 sm:text-[11px]">Step 1</p>
                <h3 className="mt-1 font-display text-[1.35rem] font-semibold leading-tight text-app-text sm:text-2xl">
                  Connect Instagram Business
                </h3>
                <p className="mt-2 text-sm text-app-muted sm:leading-6">
                  Link Meta once to unlock comments, DMs, and comment-to-DM flows.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge active label="Meta OAuth" />
              <StatusBadge active label="Webhook ready" />
              <StatusBadge active label="Encrypted token storage" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onConnect()}
            disabled={busyMode === "connect"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-fuchsia-300 sm:w-auto"
          >
            {busyMode === "connect" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {busyMode === "connect" ? "Redirecting..." : "Connect Instagram"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-app-border bg-app-card/90 p-4 shadow-[0_28px_64px_-42px_rgba(15,23,42,0.4)] backdrop-blur sm:rounded-[30px] sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-[18px] bg-gradient-to-br from-fuchsia-600 via-pink-500 to-orange-500 p-3 text-white shadow-[0_20px_32px_-20px_rgba(192,38,211,0.54)]">
              <Instagram className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge active label={account.automation_enabled ? "Automation live" : "Automation paused"} />
                <StatusBadge active={account.webhook_subscribed} label={account.webhook_subscribed ? "Webhook subscribed" : "Webhook pending"} />
              </div>

              <h3 className="mt-3 break-words font-display text-[1.35rem] font-semibold leading-tight text-app-text sm:text-2xl">
                @{account.instagram_username || "instagram-business"}
              </h3>
              <p className="mt-1 text-sm text-app-muted">
                {account.account_name || "Instagram Business Account"} via {account.page_name || "your Facebook Page"}.
              </p>
            </div>
          </div>

          <div className="grid gap-3 min-[430px]:grid-cols-2 xl:grid-cols-4">
            <ConnectionFact icon={Link2} label="IG User" value={account.ig_user_id} />
            <ConnectionFact icon={ShieldCheck} label="Page" value={account.page_name || account.page_id} />
            <ConnectionFact icon={Clock3} label="Connected" value={formatInstagramRelativeTime(account.created_at)} />
            <ConnectionFact icon={RefreshCw} label="Last Sync" value={formatInstagramRelativeTime(account.last_synced_media_at)} />
          </div>
        </div>

        <div className="w-full rounded-[24px] border border-fuchsia-100 bg-[linear-gradient(180deg,#fff7fb_0%,#ffffff_100%)] p-4 dark:border-fuchsia-500/25 dark:bg-[linear-gradient(180deg,rgba(34,17,40,0.98)_0%,rgba(7,12,24,0.98)_100%)] sm:rounded-[26px] sm:p-5 xl:max-w-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-[16px] bg-fuchsia-600 p-3 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-app-text">Automation Master Switch</p>
              <p className="mt-1 text-sm text-app-muted">
                Pause replies instantly without disconnecting Meta.
              </p>
            </div>
          </div>

          <label className="mt-4 flex items-center justify-between rounded-[18px] bg-app-card px-4 py-3 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.45)]">
            <span>
              <span className="block text-sm font-semibold text-app-text">Automations enabled</span>
              <span className="block text-xs text-app-muted">Replies and DMs stay live</span>
            </span>
            <input
              type="checkbox"
              checked={account.automation_enabled}
              disabled={busyMode === "toggle"}
              onChange={(event) => void onToggleAutomation(event.target.checked)}
              className="h-5 w-5 accent-fuchsia-600"
            />
          </label>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void onConnect()}
              disabled={busyMode === "connect"}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-fuchsia-200 bg-app-card px-4 py-3 text-sm font-semibold text-fuchsia-700 transition hover:border-fuchsia-300 hover:bg-fuchsia-50 dark:border-fuchsia-500/25 dark:bg-app-card dark:text-fuchsia-200 dark:hover:bg-fuchsia-500/[0.15] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyMode === "connect" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span className="hidden sm:inline">Refresh Link</span>
              <span className="sm:hidden">Refresh Connection</span>
            </button>
            <button
              type="button"
              onClick={() => void onDisconnect()}
              disabled={busyMode === "disconnect"}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/25 dark:bg-rose-500/[0.12] dark:text-rose-300 dark:hover:bg-rose-500/[0.18] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyMode === "disconnect" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
