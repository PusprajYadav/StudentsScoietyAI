import { Camera, Globe, Instagram, Link2, Linkedin, Mail, MessageCircle, Phone, Send, Youtube } from "lucide-react";
import {
  buildAvatarSeed,
  getSeededAvatarPath,
  isLegacyDefaultAvatarUrl,
  isPresetAvatarUrl,
  PRESET_AVATAR_PATHS,
  resolveAvatarUrl,
} from "../../lib/avatar";
import { USERNAME_HINT, normalizeUsername } from "../../lib/usernames";
import type { ChatRequestPolicy, ProfileVisibility } from "../../types/database";

export interface ProfileFormState {
  username: string;
  full_name: string;
  headline: string;
  bio: string;
  campus: string;
  course: string;
  year_of_study: string;
  skills: string;
  instagram: string;
  linkedin: string;
  email: string;
  mobile_number: string;
  whatsapp: string;
  youtube: string;
  telegram: string;
  website: string;
  other_links: string;
  avatar_url: string;
  banner_url: string;
  profile_visibility: ProfileVisibility;
  chat_request_policy: ChatRequestPolicy;
  show_profile_stats: boolean;
  show_study_activity: boolean;
  show_job_activity: boolean;
  enable_chat_request_notifications: boolean;
  enable_message_notifications: boolean;
}

interface ProfileEditFormProps {
  formState: ProfileFormState;
  avatarFile: File | null;
  bannerFile: File | null;
  saving: boolean;
  onChange: (updates: Partial<ProfileFormState>) => void;
  onAvatarFileChange: (file: File | null) => void;
  onBannerFileChange: (file: File | null) => void;
  onSave: () => Promise<void>;
}

export function ProfileEditForm({
  formState,
  avatarFile,
  bannerFile,
  saving,
  onChange,
  onAvatarFileChange,
  onBannerFileChange,
  onSave,
}: ProfileEditFormProps) {
  const avatarSeed = buildAvatarSeed({
    username: formState.username,
    full_name: formState.full_name,
  });
  const suggestedAvatar = getSeededAvatarPath(avatarSeed);
  const normalizedAvatarUrl = formState.avatar_url.trim();
  const usesSuggestedAvatar =
    !normalizedAvatarUrl || isLegacyDefaultAvatarUrl(normalizedAvatarUrl);
  const selectedPresetAvatar = isPresetAvatarUrl(normalizedAvatarUrl)
    ? normalizedAvatarUrl
    : usesSuggestedAvatar
      ? suggestedAvatar
      : "";

  const socialInputs = [
    { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "@student_handle or full URL" },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "linkedin username or full URL" },
    { key: "email", label: "Gmail / Email", icon: Mail, placeholder: "name@example.com" },
    { key: "mobile_number", label: "Mobile number", icon: Phone, placeholder: "+91 98xxxxxx" },
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "+91 98xxxxxx or full URL" },
    { key: "youtube", label: "YouTube", icon: Youtube, placeholder: "@channel or full URL" },
    { key: "telegram", label: "Telegram", icon: Send, placeholder: "@username or full URL" },
    { key: "website", label: "Website", icon: Globe, placeholder: "https://your-portfolio.com" },
  ] as const;

  return (
    <section className="surface-card rounded-[24px] p-3 sm:rounded-[30px] sm:p-8">
      <div>
        <p className="font-display text-lg font-semibold sm:text-2xl">Edit your profile</p>
        <p className="mt-1 text-sm text-app-muted">Update your public information and media.</p>
      </div>

      <div className="mt-4 grid gap-2.5 md:grid-cols-2 sm:mt-6 sm:gap-4">
        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-app-muted sm:text-sm">Username</span>
          <input
            value={formState.username}
            onChange={(event) => onChange({ username: normalizeUsername(event.target.value) })}
            className="input-shell"
            placeholder="student_society"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            minLength={3}
            maxLength={24}
          />
          <span className="text-xs text-app-muted">{USERNAME_HINT}</span>
        </label>

        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-app-muted sm:text-sm">Full name</span>
          <input
            value={formState.full_name}
            onChange={(event) => onChange({ full_name: event.target.value })}
            className="input-shell"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-app-muted sm:text-sm">Headline</span>
          <input
            value={formState.headline}
            onChange={(event) => onChange({ headline: event.target.value })}
            className="input-shell"
            placeholder="CS student | Preparing for placement season"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-app-muted sm:text-sm">Course</span>
          <input
            value={formState.course}
            onChange={(event) => onChange({ course: event.target.value })}
            className="input-shell"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-app-muted sm:text-sm">Year of study</span>
          <input
            value={formState.year_of_study}
            onChange={(event) => onChange({ year_of_study: event.target.value })}
            className="input-shell"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-app-muted sm:text-sm">Campus</span>
          <input
            value={formState.campus}
            onChange={(event) => onChange({ campus: event.target.value })}
            className="input-shell"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-app-muted sm:text-sm">Skills</span>
          <input
            value={formState.skills}
            onChange={(event) => onChange({ skills: event.target.value })}
            className="input-shell"
            placeholder="React, SQL, public speaking"
          />
        </label>
      </div>

      <label className="mt-3 grid gap-2 sm:mt-4">
        <span className="text-[13px] font-medium text-app-muted sm:text-sm">Bio</span>
        <textarea
          value={formState.bio}
          onChange={(event) => onChange({ bio: event.target.value })}
          className="input-shell min-h-[130px] resize-y"
        />
      </label>

      <section className="mt-4 rounded-[22px] border border-app-border bg-app-secondary/50 p-2.5 sm:rounded-[24px] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-app-text">Preset avatars</p>
            <p className="mt-1 text-sm text-app-muted">
              We suggest one automatically from your profile identity, and you can switch to any of these 10 student avatars.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onAvatarFileChange(null);
              onChange({ avatar_url: "" });
            }}
            className="inline-flex items-center justify-center rounded-full bg-app-card px-3 py-2 text-[11px] font-semibold text-app-text transition hover:border hover:border-brand/30 hover:text-brand sm:text-xs"
          >
            Use suggested
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-[20px] border border-brand/10 bg-app-card px-3 py-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-brand/10">
            <img
              src={resolveAvatarUrl(formState.avatar_url, avatarSeed)}
              alt="Selected avatar"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-app-text">
              {avatarFile ? "Uploaded avatar ready" : usesSuggestedAvatar ? "Suggested avatar" : "Selected avatar"}
            </p>
            <p className="mt-1 text-xs leading-5 text-app-muted">
              {avatarFile
                ? "Your uploaded image will replace the current avatar after you save the profile."
                : usesSuggestedAvatar
                  ? "This one is picked from your profile name and username, so it stays consistent everywhere."
                  : formState.avatar_url.trim()
                ? "This preset will be saved across your profile, posts, comments, search, and notifications."
                : "This one is picked from your profile name and username, so it stays consistent everywhere."}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
          {PRESET_AVATAR_PATHS.map((avatarPath, index) => {
            const selected = selectedPresetAvatar === avatarPath;

            return (
              <button
                key={avatarPath}
                type="button"
                onClick={() => {
                  onAvatarFileChange(null);
                  onChange({ avatar_url: avatarPath });
                }}
                className={`group rounded-[18px] border p-1.5 transition sm:rounded-[20px] sm:p-2 ${
                  selected
                    ? "border-brand bg-brand/10 shadow-[0_12px_24px_rgba(37,99,235,0.12)]"
                    : "border-app-border bg-app-card hover:border-brand/30 hover:bg-brand/5"
                }`}
                aria-label={`Choose avatar ${index + 1}`}
                title={`Avatar ${index + 1}`}
              >
                <div className="aspect-square overflow-hidden rounded-[14px] bg-brand/10">
                  <img
                    src={avatarPath}
                    alt={`Avatar ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-[22px] border border-app-border bg-app-secondary/50 p-2.5 sm:rounded-[24px] sm:p-4">
        <p className="text-sm font-semibold text-app-text">Social & contact links</p>
        <p className="mt-1 text-sm text-app-muted">
          Add your public handles and links. Icons will be shown on your profile.
        </p>

        <div className="mt-3 grid gap-2.5 md:grid-cols-2 sm:mt-4 sm:gap-3">
          {socialInputs.map((entry) => (
            <label key={entry.key} className="grid gap-2">
              <span className="inline-flex items-center gap-2 text-[13px] font-medium text-app-muted sm:text-sm">
                <entry.icon className="h-4 w-4 text-brand" />
                {entry.label}
              </span>
              <input
                value={formState[entry.key]}
                onChange={(event) => onChange({ [entry.key]: event.target.value })}
                className="input-shell"
                placeholder={entry.placeholder}
              />
            </label>
          ))}
        </div>

        <label className="mt-3 grid gap-2">
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-app-muted sm:text-sm">
            <Link2 className="h-4 w-4 text-brand" />
            Other links (one per line)
          </span>
          <textarea
            value={formState.other_links}
            onChange={(event) => onChange({ other_links: event.target.value })}
            className="input-shell min-h-[100px] resize-y"
            placeholder="https://github.com/username"
          />
        </label>
      </section>

      <div className="mt-4 rounded-[22px] border border-app-border bg-app-secondary/50 px-4 py-3 text-sm text-app-muted">
        Profile media is stored automatically on Student Society media hosting. Uploaded avatars are converted to
        WebP and banners stay on the same managed media pipeline.
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 sm:gap-4">
        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-app-muted sm:text-sm">Upload avatar</span>
          <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-app-border bg-app-secondary px-3 py-2.5 text-sm text-app-muted">
            <Camera className="h-4 w-4 text-brand" />
            <span>{avatarFile ? avatarFile.name : "Upload your own avatar image"}</span>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(event) => onAvatarFileChange(event.target.files?.[0] || null)}
            />
          </label>
        </label>

        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-app-muted sm:text-sm">Upload banner</span>
          <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-app-border bg-app-secondary px-3 py-2.5 text-sm text-app-muted">
            <Camera className="h-4 w-4 text-brand" />
            <span>{bannerFile ? bannerFile.name : "Choose banner image"}</span>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(event) => onBannerFileChange(event.target.files?.[0] || null)}
            />
          </label>
        </label>
      </div>

      <div className="mt-4 rounded-[24px] border border-app-border bg-app-secondary/60 px-3 py-2.5 text-sm text-app-muted sm:px-4 sm:py-3">
        Your public profile link: <span className="font-semibold text-app-text">/profile/{formState.username || "username"}</span>
      </div>

      <div className="mt-5 flex justify-end sm:mt-6">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60 sm:px-5 sm:py-3"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </section>
  );
}
