import { Activity } from "lucide-react";
import type { InstagramAutomationLogRow } from "../../../types/database";
import { formatInstagramRelativeTime, truncateInstagramText } from "../helpers";

interface InstagramLogsPanelProps {
  logs: InstagramAutomationLogRow[];
}

function LogBadge({ status }: { status: string }) {
  const tone =
    status === "success"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/[0.15] dark:text-emerald-300"
      : status === "failed"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-500/[0.15] dark:text-rose-300"
        : "bg-slate-100 text-slate-700 dark:bg-slate-700/25 dark:text-slate-300";

  return <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone}`}>{status}</span>;
}

export function InstagramLogsPanel({ logs }: InstagramLogsPanelProps) {
  return (
    <section className="rounded-[28px] border border-app-border bg-app-card/90 p-4 shadow-[0_28px_64px_-42px_rgba(15,23,42,0.4)] backdrop-blur sm:rounded-[30px] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-[16px] bg-app-secondary/80 p-3 text-fuchsia-600 dark:text-fuchsia-300">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300 sm:text-[11px]">Logs</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-app-text sm:text-2xl">Recent activity</h3>
            <p className="mt-2 text-sm text-app-muted">Every webhook action appears here with status and keyword.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {logs.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-app-border px-5 py-10 text-center text-sm text-app-muted">
            No automation activity yet. Once comments or DMs trigger your rules, the delivery history will appear here.
          </div>
        ) : null}

        {logs.map((log) => (
          <article
            key={log.id}
            className="grid gap-3 rounded-[22px] border border-app-border/70 bg-app-secondary/70 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <LogBadge status={log.status} />
                <span className="rounded-full bg-app-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
                  {log.action_type.replace(/_/g, " ")}
                </span>
                {log.matched_keyword ? (
                  <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-fuchsia-700 dark:bg-fuchsia-500/[0.15] dark:text-fuchsia-200">
                    {log.matched_keyword}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-semibold text-app-text">{truncateInstagramText(log.message, 86)}</p>
              <p className="mt-2 text-xs text-app-muted sm:text-sm">
                {truncateInstagramText(typeof log.payload?.text === "string" ? log.payload.text : log.error_message || "", 120)}
              </p>
            </div>

            <div className="text-left text-xs text-app-muted md:text-right md:text-sm">
              <p>{formatInstagramRelativeTime(log.created_at)}</p>
              {log.related_media_id ? <p className="mt-2 font-semibold text-app-text">{truncateInstagramText(log.related_media_id, 18)}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
