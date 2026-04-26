import { Ban, Save, Trash2 } from "lucide-react";
import type {
  BulkMailerPlatformSettingsRow,
  BulkMailerUserLimitOverrideRow,
  ProfileRow,
} from "../../../types/database";

interface BulkMailerLimitsPanelProps {
  settings: BulkMailerPlatformSettingsRow;
  overrides: Array<BulkMailerUserLimitOverrideRow & { profile?: Partial<ProfileRow> | null }>;
  overrideDraft: Partial<BulkMailerUserLimitOverrideRow>;
  users: ProfileRow[];
  settingsSaving?: boolean;
  overrideSaving?: boolean;
  deletingOverrideId?: string | null;
  onSettingsChange: (updates: Partial<BulkMailerPlatformSettingsRow>) => void;
  onSaveSettings: () => Promise<void>;
  onOverrideDraftChange: (updates: Partial<BulkMailerUserLimitOverrideRow>) => void;
  onSelectOverride: (override: BulkMailerUserLimitOverrideRow) => void;
  onNewOverride: () => void;
  onSaveOverride: () => Promise<void>;
  onDeleteOverride: (override: BulkMailerUserLimitOverrideRow) => Promise<void>;
}

function numberValue(value?: number | null) {
  return value == null ? "" : String(value);
}

export function BulkMailerLimitsPanel({
  settings,
  overrides,
  overrideDraft,
  users,
  settingsSaving = false,
  overrideSaving = false,
  deletingOverrideId = null,
  onSettingsChange,
  onSaveSettings,
  onOverrideDraftChange,
  onSelectOverride,
  onNewOverride,
  onSaveOverride,
  onDeleteOverride,
}: BulkMailerLimitsPanelProps) {
  const defaultCards = [
    { label: "Hourly", value: settings.default_hourly_send_limit.toLocaleString() },
    { label: "Daily", value: settings.default_daily_send_limit.toLocaleString() },
    { label: "Campaign", value: settings.default_campaign_recipient_limit.toLocaleString() },
    { label: "SMTP", value: settings.default_max_smtp_profiles_per_user.toLocaleString() },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="overflow-hidden rounded-[30px] border border-white/70 bg-gradient-to-br from-white via-[#eef6ff] to-[#f0fdf4] p-[1px] shadow-[0_24px_56px_-36px_rgba(15,23,42,0.34)]">
        <div className="rounded-[29px] bg-white/94 p-4 backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Limits</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-app-text">Platform</p>
            </div>

            <button
              type="button"
              onClick={() => void onSaveSettings()}
              disabled={settingsSaving}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_28px_-20px_rgba(37,99,235,0.72)] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {settingsSaving ? "Saving..." : "Save"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {defaultCards.map((item) => (
              <div key={item.label} className="rounded-[22px] border border-app-border bg-app-secondary/30 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-app-text">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Hourly</span>
              <input
                type="number"
                min={1}
                value={settings.default_hourly_send_limit}
                onChange={(event) =>
                  onSettingsChange({ default_hourly_send_limit: Number(event.target.value) || 1 })
                }
                className="input-shell"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Daily</span>
              <input
                type="number"
                min={1}
                value={settings.default_daily_send_limit}
                onChange={(event) =>
                  onSettingsChange({ default_daily_send_limit: Number(event.target.value) || 1 })
                }
                className="input-shell"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Campaign</span>
              <input
                type="number"
                min={1}
                value={settings.default_campaign_recipient_limit}
                onChange={(event) =>
                  onSettingsChange({ default_campaign_recipient_limit: Number(event.target.value) || 1 })
                }
                className="input-shell"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">SMTP</span>
              <input
                type="number"
                min={1}
                value={settings.default_max_smtp_profiles_per_user}
                onChange={(event) =>
                  onSettingsChange({
                    default_max_smtp_profiles_per_user: Number(event.target.value) || 1,
                  })
                }
                className="input-shell"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Templates</span>
              <input
                type="number"
                min={1}
                value={settings.default_max_templates_per_user}
                onChange={(event) =>
                  onSettingsChange({ default_max_templates_per_user: Number(event.target.value) || 1 })
                }
                className="input-shell"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Per day</span>
              <input
                type="number"
                min={1}
                value={settings.default_max_campaigns_per_day}
                onChange={(event) =>
                  onSettingsChange({ default_max_campaigns_per_day: Number(event.target.value) || 1 })
                }
                className="input-shell"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-3">
              <div>
                <p className="font-semibold text-app-text">User SMTP</p>
                <p className="text-xs text-app-muted">Allow custom.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_user_smtp_profiles}
                onChange={(event) => onSettingsChange({ allow_user_smtp_profiles: event.target.checked })}
                className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
              />
            </label>

            <label className="flex items-center justify-between rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-3">
              <div>
                <p className="font-semibold text-app-text">Tracking</p>
                <p className="text-xs text-app-muted">Count opens.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.open_tracking_enabled}
                onChange={(event) => onSettingsChange({ open_tracking_enabled: event.target.checked })}
                className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-white/70 bg-gradient-to-br from-[#eff6ff] via-white to-[#fff7ed] p-[1px] shadow-[0_22px_56px_-36px_rgba(15,23,42,0.34)]">
        <div className="rounded-[29px] bg-white/94 p-4 backdrop-blur sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">Overrides</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-app-text">Users</p>
            </div>

            <button
              type="button"
              onClick={onNewOverride}
              className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-4 py-2 text-xs font-semibold text-brand"
            >
              New
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {overrides.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-sky-200 bg-sky-50/60 px-4 py-5 text-sm text-app-muted">
                No overrides.
              </div>
            ) : null}

            {overrides.map((override) => (
              <button
                key={override.id}
                type="button"
                onClick={() => onSelectOverride(override)}
                className={`w-full rounded-[22px] border p-4 text-left transition ${
                  overrideDraft.id === override.id
                    ? "border-transparent bg-gradient-to-br from-brand/12 via-sky-100/70 to-emerald-100/50 shadow-[0_18px_34px_-26px_rgba(37,99,235,0.45)]"
                    : "border-app-border bg-app-card hover:border-brand/20 hover:bg-brand/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-app-text">
                      {override.profile?.full_name || override.profile?.username || override.user_id}
                    </p>
                    <p className="mt-1 text-xs text-app-muted">
                      H {override.hourly_send_limit ?? "D"} · D {override.daily_send_limit ?? "D"}
                    </p>
                  </div>
                  {!override.sending_enabled ? (
                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-700">
                      Off
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4 rounded-[24px] border border-app-border bg-app-secondary/28 p-4">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">User</span>
              <select
                value={overrideDraft.user_id || ""}
                onChange={(event) => onOverrideDraftChange({ user_id: event.target.value })}
                className="input-shell"
              >
                <option value="">Select</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Hourly</span>
                <input
                  type="number"
                  min={1}
                  value={numberValue(overrideDraft.hourly_send_limit)}
                  onChange={(event) =>
                    onOverrideDraftChange({ hourly_send_limit: Number(event.target.value) || null })
                  }
                  className="input-shell"
                  placeholder="Default"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Daily</span>
                <input
                  type="number"
                  min={1}
                  value={numberValue(overrideDraft.daily_send_limit)}
                  onChange={(event) =>
                    onOverrideDraftChange({ daily_send_limit: Number(event.target.value) || null })
                  }
                  className="input-shell"
                  placeholder="Default"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Campaign</span>
                <input
                  type="number"
                  min={1}
                  value={numberValue(overrideDraft.campaign_recipient_limit)}
                  onChange={(event) =>
                    onOverrideDraftChange({
                      campaign_recipient_limit: Number(event.target.value) || null,
                    })
                  }
                  className="input-shell"
                  placeholder="Default"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">SMTP</span>
                <input
                  type="number"
                  min={1}
                  value={numberValue(overrideDraft.max_smtp_profiles)}
                  onChange={(event) =>
                    onOverrideDraftChange({ max_smtp_profiles: Number(event.target.value) || null })
                  }
                  className="input-shell"
                  placeholder="Default"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Templates</span>
                <input
                  type="number"
                  min={1}
                  value={numberValue(overrideDraft.max_templates)}
                  onChange={(event) =>
                    onOverrideDraftChange({ max_templates: Number(event.target.value) || null })
                  }
                  className="input-shell"
                  placeholder="Default"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Per day</span>
                <input
                  type="number"
                  min={1}
                  value={numberValue(overrideDraft.max_campaigns_per_day)}
                  onChange={(event) =>
                    onOverrideDraftChange({
                      max_campaigns_per_day: Number(event.target.value) || null,
                    })
                  }
                  className="input-shell"
                  placeholder="Default"
                />
              </label>
            </div>

            <label className="flex items-center justify-between rounded-[22px] border border-app-border bg-white px-4 py-3">
              <div>
                <p className="font-semibold text-app-text">Send</p>
                <p className="text-xs text-app-muted">Block or allow.</p>
              </div>
              <input
                type="checkbox"
                checked={overrideDraft.sending_enabled ?? true}
                onChange={(event) => onOverrideDraftChange({ sending_enabled: event.target.checked })}
                className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">Note</span>
              <textarea
                value={overrideDraft.override_note || ""}
                onChange={(event) => onOverrideDraftChange({ override_note: event.target.value })}
                rows={4}
                className="input-shell min-h-[120px]"
                placeholder="Reason"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onSaveOverride()}
                disabled={overrideSaving}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_28px_-20px_rgba(37,99,235,0.72)] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {overrideSaving ? "Saving..." : "Save"}
              </button>

              {overrideDraft.id ? (
                <button
                  type="button"
                  onClick={() => void onDeleteOverride(overrideDraft as BulkMailerUserLimitOverrideRow)}
                  disabled={deletingOverrideId === overrideDraft.id}
                  className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingOverrideId === overrideDraft.id ? "Deleting..." : "Delete"}
                </button>
              ) : null}

              {!overrideDraft.sending_enabled ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700">
                  <Ban className="h-4 w-4" />
                  Blocked
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
