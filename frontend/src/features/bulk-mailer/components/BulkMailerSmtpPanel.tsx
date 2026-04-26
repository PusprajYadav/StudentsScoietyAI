import { CheckCircle2, Mail, Plus, Save, Shield, TestTube2, Trash2, UserCircle2 } from "lucide-react";
import type { BulkMailerSmtpProfileInput, BulkMailerSmtpProfileSummary } from "../types";

interface BulkMailerSmtpPanelProps {
  profiles: BulkMailerSmtpProfileSummary[];
  draft: BulkMailerSmtpProfileInput;
  saving?: boolean;
  testing?: boolean;
  deletingId?: string | null;
  adminMode?: boolean;
  onDraftChange: (updates: Partial<BulkMailerSmtpProfileInput>) => void;
  onNew: () => void;
  onSelect: (profile: BulkMailerSmtpProfileSummary) => void;
  onSave: () => Promise<void>;
  onTest: () => Promise<void>;
  onDelete: (profile: BulkMailerSmtpProfileSummary) => Promise<void>;
}

function SmtpProfileBadge({ profile }: { profile: BulkMailerSmtpProfileSummary }) {
  const isAdminDefault = profile.scope === "admin_default";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        isAdminDefault ? "bg-brand/10 text-brand" : "bg-app-secondary text-app-muted"
      }`}
    >
      {isAdminDefault ? <Shield className="h-3.5 w-3.5" /> : <UserCircle2 className="h-3.5 w-3.5" />}
      {isAdminDefault ? "Admin" : "User"}
    </span>
  );
}

export function BulkMailerSmtpPanel({
  profiles,
  draft,
  saving = false,
  testing = false,
  deletingId = null,
  adminMode = false,
  onDraftChange,
  onNew,
  onSelect,
  onSave,
  onTest,
  onDelete,
}: BulkMailerSmtpPanelProps) {
  const activeProfile = draft.id ? profiles.find((profile) => profile.id === draft.id) || null : null;

  return (
    <section className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-[30px] border border-app-border/80 bg-app-card/95 p-[1px] shadow-[0_22px_54px_-36px_rgba(15,23,42,0.32)]">
        <div className="rounded-[29px] bg-app-card/95 p-4 backdrop-blur sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">SMTP</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-app-text">Profiles</p>
            </div>

            <button
              type="button"
              onClick={onNew}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_24px_-18px_rgba(37,99,235,0.72)]"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>

          <p className="mt-3 text-sm text-app-muted">
            {adminMode ? "Fallback + user pools." : "Your SMTP or admin fallback."}
          </p>

          <div className="mt-4 space-y-3">
            {profiles.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-app-border bg-app-secondary/40 px-4 py-5 text-sm text-app-muted">
                No profiles yet.
              </div>
            ) : null}

            {profiles.map((profile) => {
              const selected = profile.id === draft.id;

              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => onSelect(profile)}
                  className={`w-full rounded-[22px] border p-4 text-left transition ${
                    selected
                      ? "border-brand/25 bg-brand/10 shadow-[0_18px_34px_-26px_rgba(37,99,235,0.45)]"
                      : "border-app-border bg-app-card hover:border-brand/20 hover:bg-brand/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-app-text">{profile.name}</p>
                      <p className="mt-1 truncate text-sm text-app-muted">
                        {profile.from_email} via {profile.host}:{profile.port}
                      </p>
                    </div>
                    {profile.last_test_status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <SmtpProfileBadge profile={profile} />
                    {profile.is_default_fallback ? (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        Fallback
                      </span>
                    ) : null}
                    {!profile.is_active ? (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        Off
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs text-app-muted">
                    Sent {profile.total_sent_count.toLocaleString()} · Failed {profile.total_failed_count.toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="space-y-5">
        <section className="overflow-hidden rounded-[30px] border border-app-border/80 bg-app-card/95 p-[1px] shadow-[0_24px_54px_-36px_rgba(15,23,42,0.34)]">
          <div className="rounded-[29px] bg-app-card/95 p-4 backdrop-blur sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Name</span>
                <input
                  value={draft.name}
                  onChange={(event) => onDraftChange({ name: event.target.value })}
                  className="input-shell"
                  placeholder="Campus SMTP"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Scope</span>
                <select
                  value={draft.scope}
                  onChange={(event) =>
                    onDraftChange({ scope: event.target.value as BulkMailerSmtpProfileInput["scope"] })
                  }
                  disabled={!adminMode}
                  className="input-shell"
                >
                  <option value="user_owned">User</option>
                  {adminMode ? <option value="admin_default">Admin</option> : null}
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Host</span>
                <input
                  value={draft.host}
                  onChange={(event) => onDraftChange({ host: event.target.value })}
                  className="input-shell"
                  placeholder="smtp.gmail.com"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Port</span>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={draft.port}
                  onChange={(event) => onDraftChange({ port: Number(event.target.value) || 587 })}
                  className="input-shell"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">User</span>
                <input
                  value={draft.username}
                  onChange={(event) => onDraftChange({ username: event.target.value })}
                  className="input-shell"
                  placeholder="notifications@studentsociety.in"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
                  Password {draft.id ? "(keep blank)" : ""}
                </span>
                <input
                  type="password"
                  value={draft.password || ""}
                  onChange={(event) => onDraftChange({ password: event.target.value })}
                  className="input-shell"
                  placeholder="SMTP password"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Encrypt</span>
                <select
                  value={draft.encryption}
                  onChange={(event) =>
                    onDraftChange({ encryption: event.target.value as BulkMailerSmtpProfileInput["encryption"] })
                  }
                  className="input-shell"
                >
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Auth</span>
                <select
                  value={draft.auth_method}
                  onChange={(event) =>
                    onDraftChange({ auth_method: event.target.value as BulkMailerSmtpProfileInput["auth_method"] })
                  }
                  className="input-shell"
                >
                  <option value="login">LOGIN</option>
                  <option value="plain">PLAIN</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">From</span>
                <input
                  value={draft.from_name}
                  onChange={(event) => onDraftChange({ from_name: event.target.value })}
                  className="input-shell"
                  placeholder="Student Society"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Email</span>
                <input
                  value={draft.from_email}
                  onChange={(event) => onDraftChange({ from_email: event.target.value })}
                  className="input-shell"
                  placeholder="hello@studentsociety.in"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Reply</span>
                <input
                  value={draft.reply_to_email || ""}
                  onChange={(event) => onDraftChange({ reply_to_email: event.target.value })}
                  className="input-shell"
                  placeholder="support@studentsociety.in"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-3">
                  <div>
                    <p className="font-semibold text-app-text">Active</p>
                    <p className="text-xs text-app-muted">Allow send.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(event) => onDraftChange({ is_active: event.target.checked })}
                    className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
                  />
                </label>

                <label className="flex items-center justify-between rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-3">
                  <div>
                    <p className="font-semibold text-app-text">Fallback</p>
                    <p className="text-xs text-app-muted">Use auto.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.is_default_fallback}
                    onChange={(event) => onDraftChange({ is_default_fallback: event.target.checked })}
                    className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
                  />
                </label>
              </div>
            </div>

            {adminMode ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Minute</span>
                <input
                  type="number"
                  min={1}
                  value={draft.rate_limit_per_minute}
                  onChange={(event) => onDraftChange({ rate_limit_per_minute: Number(event.target.value) || 1 })}
                  className="input-shell"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Hour</span>
                <input
                  type="number"
                  min={1}
                  value={draft.rate_limit_per_hour}
                  onChange={(event) => onDraftChange({ rate_limit_per_hour: Number(event.target.value) || 1 })}
                  className="input-shell"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Day</span>
                <input
                  type="number"
                  min={1}
                  value={draft.daily_limit}
                  onChange={(event) => onDraftChange({ daily_limit: Number(event.target.value) || 1 })}
                  className="input-shell"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Month</span>
                <input
                  type="number"
                  min={1}
                  value={draft.monthly_limit}
                  onChange={(event) => onDraftChange({ monthly_limit: Number(event.target.value) || 1 })}
                  className="input-shell"
                />
              </label>
            </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_28px_-20px_rgba(37,99,235,0.72)] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                type="button"
                onClick={() => void onTest()}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-5 py-3 text-sm font-semibold text-brand disabled:opacity-60"
              >
                <TestTube2 className="h-4 w-4" />
                {testing ? "Testing..." : "Test"}
              </button>

              {draft.id ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = profiles.find((profile) => profile.id === draft.id);
                    if (target) {
                      void onDelete(target);
                    }
                  }}
                  disabled={deletingId === draft.id}
                  className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-700 dark:text-red-300 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingId === draft.id ? "Deleting..." : "Delete"}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-app-border/80 bg-app-card/95 p-[1px] shadow-[0_20px_46px_-34px_rgba(15,23,42,0.3)]">
          <div className="rounded-[29px] bg-app-card/95 p-4 backdrop-blur sm:p-5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand" />
              <p className="font-semibold text-app-text">Usage</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Sent</p>
                <p className="mt-2 font-display text-2xl font-semibold text-app-text">
                  {activeProfile?.total_sent_count.toLocaleString() || "0"}
                </p>
              </div>
              <div className="rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Failed</p>
                <p className="mt-2 font-display text-2xl font-semibold text-app-text">
                  {activeProfile?.total_failed_count.toLocaleString() || "0"}
                </p>
              </div>
              <div className="rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Tested</p>
                <p className="mt-2 text-sm font-semibold text-app-text">
                  {activeProfile?.last_tested_at?.slice(0, 16).replace("T", " ") || "Never"}
                </p>
              </div>
              <div className="rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">Status</p>
                <p className="mt-2 text-sm font-semibold capitalize text-app-text">
                  {activeProfile?.last_test_status || "untested"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
