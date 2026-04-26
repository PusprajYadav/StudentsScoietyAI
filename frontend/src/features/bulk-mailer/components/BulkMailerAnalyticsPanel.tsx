import { BarChart3, Eye, MailCheck, MailX } from "lucide-react";
import { formatBulkMailerPercent } from "../helpers";
import type { BulkMailerDashboardStats, BulkMailerLogWithCampaign } from "../types";
import { BulkMailerStatCard } from "./BulkMailerStatCard";

interface BulkMailerAnalyticsPanelProps {
  stats: BulkMailerDashboardStats;
  logs: BulkMailerLogWithCampaign[];
}

function LogStatusBadge({ status }: { status: BulkMailerLogWithCampaign["status"] }) {
  const className =
    status === "opened"
      ? "border-emerald-500/15 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
      : status === "sent"
        ? "border-brand/15 bg-brand/12 text-brand"
        : status === "failed"
          ? "border-red-500/15 bg-red-500/12 text-red-700 dark:text-red-300"
          : "border-app-border bg-app-secondary text-app-muted";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${className}`}>
      {status}
    </span>
  );
}

function formatStamp(value?: string | null, fallback = "Pending") {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function BulkMailerAnalyticsPanel({ stats, logs }: BulkMailerAnalyticsPanelProps) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BulkMailerStatCard
          title="Sent"
          value={stats.totalSent.toLocaleString()}
          hint="Delivered"
          icon={MailCheck}
          tone="brand"
        />
        <BulkMailerStatCard
          title="Failed"
          value={stats.totalFailed.toLocaleString()}
          hint="Rejected"
          icon={MailX}
          tone="amber"
        />
        <BulkMailerStatCard
          title="Opened"
          value={stats.totalOpenedRecipients.toLocaleString()}
          hint="Unique"
          icon={Eye}
          tone="emerald"
        />
        <BulkMailerStatCard
          title="Rate"
          value={formatBulkMailerPercent(stats.averageOpenRate)}
          hint="Average"
          icon={BarChart3}
          tone="slate"
        />
      </section>

      <section className="overflow-hidden rounded-[30px] border border-app-border/80 bg-app-card/95 p-[1px] shadow-[0_22px_54px_-36px_rgba(15,23,42,0.32)]">
        <div className="rounded-[29px] bg-app-card/95 p-4 backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Logs</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-app-text">Recent</p>
            </div>
            <span className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand">
              {logs.length.toLocaleString()}
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-app-border bg-app-secondary/40 px-4 py-5 text-sm text-app-muted">
              No logs yet.
            </div>
          ) : (
            <>
              <div className="mt-5 space-y-3 md:hidden">
                {logs.map((log) => (
                  <article key={log.id} className="rounded-[24px] border border-app-border bg-app-card/95 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-app-text">
                          {log.recipient_name || log.recipient_email}
                        </p>
                        <p className="mt-1 truncate text-xs text-app-muted">{log.recipient_email}</p>
                      </div>
                      <LogStatusBadge status={log.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-[18px] border border-app-border/80 bg-app-secondary/35 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Mail</p>
                        <p className="mt-1 text-sm font-semibold text-app-text">{log.campaign?.name || "Manual"}</p>
                      </div>
                      <div className="rounded-[18px] border border-app-border/80 bg-app-secondary/35 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Open</p>
                        <p className="mt-1 text-sm font-semibold text-app-text">{log.open_count.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                      <span className="text-app-muted">Sent</span>
                      <span className="text-right font-semibold text-app-text">{formatStamp(log.sent_at)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-app-muted">Opened</span>
                      <span className="text-right font-semibold text-app-text">
                        {formatStamp(log.opened_at, "No")}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-5 hidden overflow-x-auto rounded-[24px] border border-app-border bg-app-card md:block">
                <table className="min-w-full divide-y divide-app-border text-left text-sm">
                  <thead className="bg-app-secondary/50 text-app-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Recipient</th>
                      <th className="px-4 py-3 font-medium">Campaign</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Opens</th>
                      <th className="px-4 py-3 font-medium">Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-app-text">{log.recipient_name || log.recipient_email}</p>
                          <p className="mt-1 text-xs text-app-muted">{log.recipient_email}</p>
                        </td>
                        <td className="px-4 py-4 text-app-text">{log.campaign?.name || "Manual"}</td>
                        <td className="px-4 py-4">
                          <LogStatusBadge status={log.status} />
                        </td>
                        <td className="px-4 py-4 text-app-text">
                          <p>{log.open_count.toLocaleString()}</p>
                          <p className="mt-1 text-xs text-app-muted">{formatStamp(log.opened_at, "No")}</p>
                        </td>
                        <td className="px-4 py-4 text-app-text">{formatStamp(log.sent_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
