import {
  ArrowLeft,
  Bot,
  LayoutPanelTop,
  Lock,
  SlidersHorizontal,
  Sun,
  UserCircle2,
  Wallet2,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { PrimaryNavigationEditor } from "../features/navigation/PrimaryNavigationEditor";
import { AccountSettingsSection } from "../features/profile/AccountSettingsSection";
import { AccountStatusTab } from "../features/profile/AccountStatusTab";
import { AiReplySettingsSection } from "../features/profile/AiReplySettingsSection";
import { FeedSettingsSection } from "../features/profile/FeedSettingsSection";
import { PrivacySettingsSection, type ProfilePrivacySettingsState } from "../features/profile/PrivacySettingsSection";
import { ProfileSettingsOverview } from "../features/profile/ProfileSettingsOverview";
import {
  ProfileSettingsTabs,
  type ProfileSettingsSectionId,
} from "../features/profile/ProfileSettingsTabs";
import { ThemeSettingsSection } from "../features/profile/ThemeSettingsSection";
import { normalizeUsername } from "../lib/usernames";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";

function resolveLegacySettingsSection(
  value: string | null
): ProfileSettingsSectionId | null {
  if (
    value === "wallet" ||
    value === "ai-replies" ||
    value === "status" ||
    value === "theme" ||
    value === "privacy" ||
    value === "feed" ||
    value === "navigation" ||
    value === "account"
  ) {
    return value === "status" ? "wallet" : value;
  }

  return null;
}

function isSettingsSectionId(
  value: string | undefined
): value is ProfileSettingsSectionId {
  return (
    value === "wallet" ||
    value === "ai-replies" ||
    value === "theme" ||
    value === "privacy" ||
    value === "feed" ||
    value === "navigation" ||
    value === "account"
  );
}

export function ProfileSettingsPage() {
  const { username, section } = useParams<{
    username?: string;
    section?: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, signOut, updateProfile, refreshProfile } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [privacyState, setPrivacyState] =
    useState<ProfilePrivacySettingsState | null>(null);
  const [privacySaving, setPrivacySaving] = useState(false);
  const currentUsername = profile?.username || "";

  useEffect(() => {
    if (!profile) {
      setPrivacyState(null);
      return;
    }

    setPrivacyState({
      profile_visibility: profile.profile_visibility || "everyone",
      chat_request_policy: profile.chat_request_policy || "everyone",
      show_profile_stats: profile.show_profile_stats ?? true,
      show_study_activity: profile.show_study_activity ?? true,
      show_job_activity: profile.show_job_activity ?? true,
      enable_chat_request_notifications:
        profile.enable_chat_request_notifications ?? true,
      enable_message_notifications:
        profile.enable_message_notifications ?? true,
    });
  }, [profile]);

  const normalizedRouteUsername = normalizeUsername(username || "");
  const isOwnProfileRoute =
    !normalizedRouteUsername || normalizedRouteUsername === currentUsername;

  if (!profile) {
    return null;
  }

  if (!isOwnProfileRoute) {
    return <Navigate to={`/profile/${profile.username}`} replace />;
  }

  const activeSection = isSettingsSectionId(section) ? section : null;
  const legacySection = resolveLegacySettingsSection(searchParams.get("tab"));

  if (!activeSection && legacySection) {
    return (
      <Navigate
        to={`/profile/${profile.username}/settings/${legacySection}`}
        replace
      />
    );
  }

  if (section && !activeSection) {
    return <Navigate to={`/profile/${profile.username}/settings`} replace />;
  }

  const settingsSections = [
    {
      id: "wallet" as const,
      label: "Wallet",
      description: "Coins and passes",
      icon: Wallet2,
      href: `/profile/${currentUsername}/settings/wallet`,
    },
    {
      id: "ai-replies" as const,
      label: "AI Replies",
      description: "Mentions",
      icon: Bot,
      href: `/profile/${currentUsername}/settings/ai-replies`,
    },
    {
      id: "theme" as const,
      label: "Theme",
      description: "Light or dark",
      icon: Sun,
      href: `/profile/${currentUsername}/settings/theme`,
    },
    {
      id: "privacy" as const,
      label: "Privacy",
      description: "Visibility",
      icon: Lock,
      href: `/profile/${currentUsername}/settings/privacy`,
    },
    {
      id: "feed" as const,
      label: "Feed",
      description: "Discuss filter",
      icon: SlidersHorizontal,
      href: `/profile/${currentUsername}/settings/feed`,
    },
    {
      id: "navigation" as const,
      label: "Bottom Navigation",
      description: "Edit tabs",
      icon: LayoutPanelTop,
      href: `/profile/${currentUsername}/settings/navigation`,
    },
    {
      id: "account" as const,
      label: "Account",
      description: "Logout",
      icon: UserCircle2,
      href: `/profile/${currentUsername}/settings/account`,
    },
  ];
  const activeSectionMeta =
    settingsSections.find((item) => item.id === activeSection) || null;

  const canPost = Boolean(
    profile &&
      !profile.is_banned &&
      profile.can_post &&
      (!profile.posting_restricted_until ||
        new Date(profile.posting_restricted_until) < new Date())
  );
  const hasPrivacyChanges = Boolean(
    privacyState &&
      (privacyState.profile_visibility !==
        (profile.profile_visibility || "everyone") ||
        privacyState.chat_request_policy !==
          (profile.chat_request_policy || "everyone") ||
        privacyState.show_profile_stats !==
          (profile.show_profile_stats ?? true) ||
        privacyState.show_study_activity !==
          (profile.show_study_activity ?? true) ||
        privacyState.show_job_activity !==
          (profile.show_job_activity ?? true) ||
        privacyState.enable_chat_request_notifications !==
          (profile.enable_chat_request_notifications ?? true) ||
        privacyState.enable_message_notifications !==
          (profile.enable_message_notifications ?? true))
  );

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully.");
      navigate("/auth", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out.");
    }
  };

  const handlePrivacyChange = (
    updates: Partial<ProfilePrivacySettingsState>
  ) => {
    setPrivacyState((current) => (current ? { ...current, ...updates } : current));
  };

  const handlePrivacySave = async () => {
    if (!privacyState) {
      return;
    }

    setPrivacySaving(true);

    try {
      await updateProfile({
        profile_visibility: privacyState.profile_visibility,
        chat_request_policy: privacyState.chat_request_policy,
        show_profile_stats: privacyState.show_profile_stats,
        show_study_activity: privacyState.show_study_activity,
        show_job_activity: privacyState.show_job_activity,
        enable_chat_request_notifications:
          privacyState.enable_chat_request_notifications,
        enable_message_notifications:
          privacyState.enable_message_notifications,
      });
      await refreshProfile();
      toast.success("Privacy settings updated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update privacy settings."
      );
    } finally {
      setPrivacySaving(false);
    }
  };

  const heroTitle = activeSectionMeta ? activeSectionMeta.label : "Settings";

  return (
    <div className="space-y-2.5 sm:space-y-3">
      <section className="surface-card rounded-[20px] p-3.5 sm:rounded-[24px] sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">
              Settings
            </p>
            <h1 className="truncate font-display text-[1.35rem] font-semibold tracking-tight text-app-text sm:text-[1.6rem]">
              {heroTitle}
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                activeSection
                  ? `/profile/${profile.username}/settings`
                  : `/profile/${profile.username}`
              )
            }
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-secondary text-app-text transition hover:border-brand/25 hover:text-brand"
            aria-label={activeSection ? "Back to settings" : "Back to profile"}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2.5">
          {activeSection ? (
            <ProfileSettingsTabs
              sections={settingsSections}
              activeSection={activeSection}
            />
          ) : null}
        </div>

        <div className="mt-3">
          {!activeSection ? (
            <ProfileSettingsOverview sections={settingsSections} />
          ) : activeSection === "wallet" ? (
            <AccountStatusTab canPost={canPost} profile={profile} />
          ) : activeSection === "ai-replies" ? (
            <AiReplySettingsSection />
          ) : activeSection === "theme" ? (
            <ThemeSettingsSection theme={theme} onChangeTheme={setTheme} />
          ) : activeSection === "privacy" ? (
            <PrivacySettingsSection
              privacyState={privacyState}
              saving={privacySaving}
              hasChanges={hasPrivacyChanges}
              onChange={handlePrivacyChange}
              onSave={handlePrivacySave}
            />
          ) : activeSection === "feed" ? (
            <FeedSettingsSection profileId={profile.id} />
          ) : activeSection === "navigation" ? (
            <PrimaryNavigationEditor
              profilePath={`/profile/${profile.username}`}
            />
          ) : (
            <AccountSettingsSection onLogout={handleLogout} />
          )}
        </div>
      </section>
    </div>
  );
}
