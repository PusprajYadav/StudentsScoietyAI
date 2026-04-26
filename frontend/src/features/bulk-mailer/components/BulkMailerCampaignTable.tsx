import type { EmailConnectionRow } from "../../emails/types";
import { Clock3, Loader2, Mail, Play, RotateCcw, Trash2 } from "lucide-react";
import { formatBulkMailerPercent, resolveBulkMailerCampaignSenderLabel } from "../helpers";
import type { BulkMailerCampaignWithTemplate, BulkMailerSmtpProfileSummary } from "../types";

interface BulkMailerCampaignTableProps {
  campaigns: BulkMailerCampaignWithTemplate[];
  smtpProfiles: BulkMailerSmtpProfileSummary[];
  emailConnections: EmailConnectionRow[];
  activeCampaignId?: string | null;
  busyCampaignId?: string | null;
  showOwner?: boolean;
  onSelect?: (campaign: BulkMailerCampaignWithTemplate) => void;
  onSend?: (campaign: BulkMailerCampaignWithTemplate) => Promise<void>;
  onDelete?: (campaign: BulkMailerCampaignWithTemplate) => Promise<void>;
}

function CampaignStatusBadge({ status }: { status: BulkMailerCampaignWithTemplate["status"] }) {
  const className =
    status === "completed"
      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/15"
      : status === "sending"
        ? "bg-brand/12 text-brand border-brand/15"
        : status === "paused"
          ? "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/15"
        : status === "failed"
            ? "bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/15"
            : "bg-app-secondary text-app-muted border-app-border";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${className}`}>
      {status}
    </span>
  );
}

function CampaignMetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-app-border/80 bg-app-card/85 px-3 py-2 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.3)] backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-app-text">{value}</p>
    </div>
  );
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function BulkMailerCampaignTable({
  campaigns,
  smtpProfiles,
  emailConnections,
  activeCampaignId = null,
  busyCampaignId = null,
  showOwner = false,
  onSelect,
  onSend,
  onDelete,
}: BulkMailerCampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-[26px] border border-dashed border-app-border bg-app-secondary/40 px-4 py-5 text-sm text-app-muted">
        No campaigns yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 md:hidden">
        {campaigns.map((campaign) => {
          const openRate =
            campaign.sent_count > 0 ? (campaign.opened_recipient_count / campaign.sent_count) * 100 : 0;
          const isBusy = busyCampaignId === campaign.id;
          const isResume = campaign.status === "paused";
          const isActive = campaign.id === activeCampaignId;

          return (
            <article
              key={campaign.id}
              className={`overflow-hidden rounded-[26px] border p-[1px] shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] ${
                isActive ? "border-brand/30 bg-brand/10" : "border-app-border bg-app-card/95"
              }`}
            >
              <div className="rounded-[25px] bg-app-card/95 p-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => onSelect?.(campaign)} className="min-w-0 text-left">
                    <p className="truncate text-base font-semibold text-app-text">{campaign.name}</p>
                    <p className="mt-1 text-xs text-app-muted">
                      {campaign.template?.name || "Custom"} · {formatTimestamp(campaign.created_at)}
                    </p>
                  </button>
                  <CampaignStatusBadge status={campaign.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <CampaignMetaPill label="List" value={campaign.total_recipients.toLocaleString()} />
                  <CampaignMetaPill label="Open" value={formatBulkMailerPercent(openRate)} />
                  <CampaignMetaPill label="Sent" value={campaign.sent_count.toLocaleString()} />
                  <CampaignMetaPill label="Fail" value={campaign.failed_count.toLocaleString()} />
                </div>

                <div className="mt-4 space-y-2 rounded-[20px] border border-app-border/80 bg-app-secondary/35 px-3 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-app-muted">Sender</span>
                    <span className="max-w-[65%] truncate font-semibold text-app-text">
                      {resolveBulkMailerCampaignSenderLabel(campaign, smtpProfiles, emailConnections)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-app-muted">Opens</span>
                    <span className="font-semibold text-app-text">
                      {campaign.opened_recipient_count.toLocaleString()} / {campaign.total_open_count.toLocaleString()}
                    </span>
                  </div>
                  {showOwner ? (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-app-muted">User</span>
                      <span className="max-w-[65%] truncate font-semibold text-app-text">
                        {campaign.owner?.full_name || campaign.owner?.username || "Unknown"}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {onSend ? (
                    <button
                      type="button"
                      onClick={() => void onSend(campaign)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-2 text-xs font-semibold text-brand disabled:opacity-60"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isResume ? (
                        <RotateCcw className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      {isBusy ? "Sending..." : isResume ? "Resume" : "Send"}
                    </button>
                  ) : null}

                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => void onDelete(campaign)}
                      className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-700 dark:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  ) : null}

                  {!onSend && !onDelete ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-secondary/55 px-3.5 py-2 text-xs font-semibold text-app-muted">
                      <Mail className="h-3.5 w-3.5" />
                      View
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-[28px] border border-app-border bg-app-card md:block">
        <table className="min-w-full divide-y divide-app-border text-left text-sm">
          <thead className="bg-app-secondary/55 text-app-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Campaign</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recipients</th>
              <th className="px-4 py-3 font-medium">Open</th>
              <th className="px-4 py-3 font-medium">Sender</th>
              {showOwner ? <th className="px-4 py-3 font-medium">User</th> : null}
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {campaigns.map((campaign) => {
              const openRate =
                campaign.sent_count > 0 ? (campaign.opened_recipient_count / campaign.sent_count) * 100 : 0;
              const isBusy = busyCampaignId === campaign.id;
              const isResume = campaign.status === "paused";

              return (
                <tr key={campaign.id} className={campaign.id === activeCampaignId ? "bg-brand/5" : undefined}>
                  <td className="px-4 py-4">
                    <button type="button" onClick={() => onSelect?.(campaign)} className="min-w-0 text-left">
                      <p className="truncate font-semibold text-app-text">{campaign.name}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-app-muted">
                        <Clock3 className="h-3.5 w-3.5" />
                        {campaign.template?.name || "Custom"} · {formatTimestamp(campaign.created_at)}
                      </p>
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <CampaignStatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-4 text-app-text">
                    <p>{campaign.total_recipients.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-app-muted">
                      Sent {campaign.sent_count.toLocaleString()} · Failed {campaign.failed_count.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-app-text">
                    <p>{formatBulkMailerPercent(openRate)}</p>
                    <p className="mt-1 text-xs text-app-muted">
                      {campaign.opened_recipient_count.toLocaleString()} unique · {campaign.total_open_count.toLocaleString()} opens
                    </p>
                  </td>
                  <td className="px-4 py-4 text-app-text">
                    {resolveBulkMailerCampaignSenderLabel(campaign, smtpProfiles, emailConnections)}
                  </td>
                  {showOwner ? (
                    <td className="px-4 py-4 text-app-text">
                      {campaign.owner?.full_name || campaign.owner?.username || "Unknown"}
                    </td>
                  ) : null}
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {onSend ? (
                        <button
                          type="button"
                          onClick={() => void onSend(campaign)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-2 text-xs font-semibold text-brand disabled:opacity-60"
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isResume ? (
                            <RotateCcw className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          {isBusy ? "Sending..." : isResume ? "Resume" : "Send"}
                        </button>
                      ) : null}

                      {onDelete ? (
                        <button
                          type="button"
                          onClick={() => void onDelete(campaign)}
                          className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      ) : null}

                      {!onSend && !onDelete ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-secondary/50 px-3 py-2 text-xs font-semibold text-app-muted">
                          <Mail className="h-3.5 w-3.5" />
                          View
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
