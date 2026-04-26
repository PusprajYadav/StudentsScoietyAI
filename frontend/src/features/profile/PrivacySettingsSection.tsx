import type {
  ChatRequestPolicy,
  ProfileVisibility,
} from "../../types/database";

export interface ProfilePrivacySettingsState {
  profile_visibility: ProfileVisibility;
  chat_request_policy: ChatRequestPolicy;
  show_profile_stats: boolean;
  show_study_activity: boolean;
  show_job_activity: boolean;
  enable_chat_request_notifications: boolean;
  enable_message_notifications: boolean;
}

export function PrivacySettingsSection({
  privacyState,
  saving,
  hasChanges,
  onChange,
  onSave,
}: {
  privacyState: ProfilePrivacySettingsState | null;
  saving: boolean;
  hasChanges: boolean;
  onChange: (updates: Partial<ProfilePrivacySettingsState>) => void;
  onSave: () => void | Promise<void>;
}) {
  if (!privacyState) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <p className="font-display text-xl font-semibold sm:text-2xl">
          Privacy
        </p>
        <p className="mt-1 text-sm text-app-muted">Profile + chat controls.</p>
      </div>

      <div className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
        <p className="text-base font-semibold text-app-text">Profile privacy</p>
        <p className="mt-1 text-sm text-app-muted">Who can see your profile.</p>

        <label className="mt-4 grid gap-2 md:max-w-sm">
          <span className="text-sm font-medium text-app-muted">
            Who can view this profile
          </span>
          <select
            value={privacyState.profile_visibility}
            onChange={(event) =>
              onChange({
                profile_visibility: event.target.value as ProfileVisibility,
              })
            }
            className="input-shell"
          >
            <option value="everyone">Everyone</option>
            <option value="followers">Followers only</option>
            <option value="followers_and_following">
              Followers and following
            </option>
            <option value="following">Following only</option>
            <option value="no_one">No one</option>
          </select>
        </label>

        <div className="mt-4 grid gap-2">
          {[
            {
              label: "Show profile stats publicly",
              checked: privacyState.show_profile_stats,
              key: "show_profile_stats" as const,
            },
            {
              label: "Show Study activity on profile",
              checked: privacyState.show_study_activity,
              key: "show_study_activity" as const,
            },
            {
              label: "Show Job activity on profile",
              checked: privacyState.show_job_activity,
              key: "show_job_activity" as const,
            },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between rounded-[18px] bg-app-secondary/65 px-3 py-3 text-sm"
            >
              <span className="text-app-text">{item.label}</span>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(event) =>
                  onChange({ [item.key]: event.target.checked })
                }
                className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
        <p className="text-base font-semibold text-app-text">Chat privacy</p>
        <p className="mt-1 text-sm text-app-muted">Requests + alerts.</p>

        <label className="mt-4 grid gap-2 md:max-w-sm">
          <span className="text-sm font-medium text-app-muted">
            Who can send chat requests
          </span>
          <select
            value={privacyState.chat_request_policy}
            onChange={(event) =>
              onChange({
                chat_request_policy: event.target.value as ChatRequestPolicy,
              })
            }
            className="input-shell"
          >
            <option value="everyone">Everyone</option>
            <option value="followers">Followers only</option>
            <option value="following">Following only</option>
            <option value="followers_and_following">
              Followers and following
            </option>
            <option value="no_one">No one</option>
          </select>
          <span className="text-xs text-app-muted">
            Selecting <span className="font-semibold text-app-text">No one</span>{" "}
            hides the chat-request entry point from your profile.
          </span>
        </label>

        <div className="mt-4 grid gap-2">
          {[
            {
              label: "Notify me about new chat requests",
              checked: privacyState.enable_chat_request_notifications,
              key: "enable_chat_request_notifications" as const,
            },
            {
              label: "Notify me about new private messages",
              checked: privacyState.enable_message_notifications,
              key: "enable_message_notifications" as const,
            },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between rounded-[18px] bg-app-secondary/65 px-3 py-3 text-sm"
            >
              <span className="text-app-text">{item.label}</span>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(event) =>
                  onChange({ [item.key]: event.target.checked })
                }
                className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!hasChanges || saving}
          className="btn-primary !rounded-full !px-5 !py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save privacy settings"}
        </button>
      </div>
    </div>
  );
}
