import { ArrowLeft, Maximize2, Minimize2, Moon, Search, Shield, Sun, UserCircle2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { usePrimaryNavigationPreferences } from "../hooks/usePrimaryNavigationPreferences";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { ChatSyncBridge } from "./ChatSyncBridge";
import { ProfileViewToggle } from "../features/profile/ProfileViewToggle";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { MessageInboxButton } from "./MessageInboxButton";
import { NotificationBell } from "./NotificationBell";
import { PrimaryMobileNav } from "./PrimaryMobileNav";
import { VerifiedBadge } from "./VerifiedBadge";
import { WalletBalancePill } from "./WalletBalancePill";

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const { profile, isAdmin } = useAuthStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const messageParams = new URLSearchParams(location.search);
  const isMessagesRoute = location.pathname.startsWith("/app/messages");
  const isEmailsRoute = location.pathname.startsWith("/app/emails");
  const isWorkspaceRoute = location.pathname.startsWith("/app/tools") || location.pathname.startsWith("/app/myroom");
  const isAiTeacherWorkspaceRoute = /^\/app\/(?:tools|myroom\/tools)\/ai-teacher(?:-play-area)?(?:\/.*)?$/.test(location.pathname);
  const isWorkspaceInsideMyRoom = location.pathname.startsWith("/app/myroom/");
  const isMobileConversationOpen = isMessagesRoute && messageParams.has("conversation");
  const workspaceView = messageParams.get("view") === "tools" ? "tools" : "my-room";
  const profilePath = profile?.username ? `/profile/${profile.username}` : "/profile";
  const { selectedItems: tabs } = usePrimaryNavigationPreferences(profilePath);
  const backgroundGlow =
    resolvedTheme === "dark"
      ? "radial-gradient(circle_at_top, rgba(96,165,250,0.2), transparent 56%), radial-gradient(circle_at_right, rgba(37,99,235,0.16), transparent 45%)"
      : "radial-gradient(circle_at_top, rgba(59,130,246,0.2), transparent 58%), radial-gradient(circle_at_right, rgba(37,99,235,0.14), transparent 42%)";
  const showCommunitySearch = location.pathname === "/app/communities";
  const isSearchRoute = location.pathname.startsWith("/app/search");
  const isProfileRoute = location.pathname.startsWith("/profile");
  const hideMobileHeaderDivider = location.pathname.startsWith("/app/discussions");
  const hideShellHeaderOnMobileOnly = isEmailsRoute;
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const headerSearchValue = showCommunitySearch ? messageParams.get("communitySearch") || "" : "";
  const showHeaderNotifications = !isProfileRoute;
  const showDesktopHeaderActions = !showCommunitySearch && !isWorkspaceRoute;
  const showMobileMessageButton = !isWorkspaceRoute;
  const showMobileNotificationButton = !showCommunitySearch && !isWorkspaceRoute && showHeaderNotifications;
  const isOwnProfileRoute = Boolean(
    profile?.username &&
      (location.pathname === profilePath ||
        location.pathname === `/profile/${profile.username}/settings` ||
        location.pathname.startsWith(`/profile/${profile.username}/settings/`))
  );
  const profileHeaderToggle = isOwnProfileRoute && profile?.username ? (
    <ProfileViewToggle
      username={profile.username}
      activeMode={location.pathname.includes("/settings") ? "settings" : "profile"}
      compact
      className="w-full"
    />
  ) : null;
  const showMobileHeaderSearch = !isSearchRoute && !isWorkspaceRoute && !profileHeaderToggle;
  const updateCommunityPageParams = (patch: { search?: string }) => {
    const params = new URLSearchParams(location.search);

    if (patch.search !== undefined) {
      if (patch.search.trim()) {
        params.set("communitySearch", patch.search);
      } else {
        params.delete("communitySearch");
      }
    }

    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true }
    );
  };
  const updateWorkspaceView = (nextView: "my-room" | "tools") => {
    const params = new URLSearchParams(location.search);

    if (nextView === "my-room") {
      params.delete("view");
    } else {
      params.set("view", "tools");
    }

    navigate(
      {
        pathname: "/app/tools",
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true }
    );
  };

  const isTabActive = (matchPrefixes: string[]) =>
    matchPrefixes.some((matchPrefix) => location.pathname === matchPrefix || location.pathname.startsWith(`${matchPrefix}/`));
  const workspaceHeaderToggle = isWorkspaceRoute ? (
    <div className="inline-flex items-center gap-[3px] rounded-full border border-app-border bg-app-card p-[3px] shadow-[0_12px_26px_-24px_rgba(15,23,42,0.18)]">
      {[
        { id: "my-room" as const, label: "My Room" },
        { id: "tools" as const, label: "Tools" },
      ].map((entry) => {
        const active = workspaceView === entry.id;

        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => updateWorkspaceView(entry.id)}
            className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold leading-none transition ${
              active
                ? "bg-brand text-white shadow-[0_14px_24px_-18px_rgba(37,99,235,0.72)]"
                : "text-app-muted hover:bg-app-secondary hover:text-app-text"
            }`}
          >
            {entry.label}
          </button>
        );
      })}
    </div>
  ) : null;
  const workspaceHeaderBackButton = isAiTeacherWorkspaceRoute ? (
    <button
      type="button"
      onClick={() =>
        navigate(isWorkspaceInsideMyRoom ? "/app/tools?view=my-room" : "/app/tools?view=tools")
      }
      className="inline-flex h-11 items-center gap-2 rounded-full border border-app-border bg-app-card px-4 text-sm font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5 hover:text-brand xl:hidden"
      aria-label={isWorkspaceInsideMyRoom ? "Back to My Room" : "Back to Tools"}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{isWorkspaceInsideMyRoom ? "Back to My Room" : "Back to Tools"}</span>
    </button>
  ) : null;
  const workspaceHeaderControl = workspaceHeaderBackButton || workspaceHeaderToggle;
  const hideShellHeaderInFullscreen = isFullscreen && isWorkspaceRoute;

  const mainClassName = isMessagesRoute
    ? isMobileConversationOpen
      ? "w-full min-h-0 flex-1 overflow-hidden px-0 pb-0 pt-0 md:px-6 md:pb-0 md:pt-0 lg:px-8 xl:px-10 2xl:px-14"
      : "w-full min-h-0 flex-1 overflow-hidden px-0 pb-[5.8rem] pt-0 sm:px-6 sm:pt-5 md:pb-8 lg:px-8 xl:px-10 2xl:px-14"
    : hideShellHeaderInFullscreen
      ? "w-full min-h-0 flex-1 [overflow-x:clip] px-4 pb-[6.25rem] pt-0 sm:px-6 sm:pt-0 md:pb-8 lg:px-8 xl:px-10 2xl:px-14"
      : "w-full min-h-0 flex-1 [overflow-x:clip] px-4 pb-[6.25rem] pt-3 sm:px-6 sm:pt-5 md:pb-8 lg:px-8 xl:px-10 2xl:px-14";
  const shellClassName = isMessagesRoute
    ? "relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden [overflow-x:clip] bg-app text-app-text"
    : "relative flex min-h-[100dvh] flex-col [overflow-x:clip] bg-app text-app-text";

  useEffect(() => {
    const root = document.documentElement;
    setFullscreenSupported(typeof root.requestFullscreen === "function");
    setIsFullscreen(Boolean(document.fullscreenElement));

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error("Fullscreen toggle failed", error);
    }
  }

  return (
    <div className={shellClassName}>
      <ChatSyncBridge profile={profile} />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80" style={{ backgroundImage: backgroundGlow }} />

      {!hideShellHeaderInFullscreen ? (
        <header
          className={`sticky top-0 z-40 ${
            hideMobileHeaderDivider ? "border-b-0 md:border-b md:border-app-border/70" : "border-b border-app-border/70"
          } bg-app/90 backdrop-blur-xl pt-[max(var(--safe-area-top),0.45rem)] md:pt-safe ${
            hideShellHeaderOnMobileOnly ? "hidden md:block" : isMobileConversationOpen ? "hidden md:block" : ""
          }`}
        >
          <div className="hidden w-full px-4 py-3 sm:px-6 md:block lg:px-8 xl:px-10 2xl:px-14">
            <div className="flex flex-nowrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <nav className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="inline-flex min-w-max items-center gap-1 rounded-full border border-app-border/80 bg-app-card/80 p-1 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.2)] backdrop-blur-sm">
                    {tabs.map((tab) => (
                      <NavLink
                        key={tab.to}
                        to={tab.to}
                        className={() =>
                          `shrink-0 rounded-full px-3 py-2 text-sm font-medium transition ${
                            isTabActive(tab.matchPrefixes)
                              ? "bg-brand text-white shadow-lg shadow-brand/20"
                              : "text-app-muted hover:bg-app-card hover:text-app-text"
                          }`
                        }
                      >
                        {tab.label}
                      </NavLink>
                    ))}
                  </div>
                </nav>
              </div>

              <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2 sm:gap-2.5">
                  {!isWorkspaceRoute ? (
                    <div className="order-last min-w-0 basis-full xl:order-none xl:basis-auto xl:w-[24rem] 2xl:w-[30rem]">
                      {profileHeaderToggle ? (
                        profileHeaderToggle
                      ) : showCommunitySearch ? (
                        <GlobalSearchBar
                          className="max-w-none"
                          placeholder="Search communities"
                          value={headerSearchValue}
                          hideResults
                          onValueChange={(nextValue) => {
                            updateCommunityPageParams({ search: nextValue });
                          }}
                        />
                      ) : (
                        <GlobalSearchBar className="max-w-none" />
                      )}
                    </div>
                  ) : null}

                  {isAdmin ? (
                    <NavLink
                      to="/admin"
                      aria-label="Open admin panel"
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 text-sm font-medium text-brand"
                    >
                      <Shield className="h-4 w-4" />
                      <span className="hidden xl:inline">Admin Panel</span>
                      <span className="hidden lg:inline xl:hidden">Admin</span>
                    </NavLink>
                  ) : null}

                  {workspaceHeaderControl}

                  {profile && showDesktopHeaderActions && showHeaderNotifications ? (
                    <NotificationBell userId={profile.id} />
                  ) : null}

                  {profile && showDesktopHeaderActions ? <MessageInboxButton /> : null}

                  <WalletBalancePill />

                  {fullscreenSupported ? (
                    <button
                      type="button"
                      onClick={() => {
                        void toggleFullscreen();
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-app-border bg-app-card text-app-muted transition hover:text-app-text"
                      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-app-border bg-app-card text-app-muted transition hover:text-app-text"
                    aria-label="Toggle theme"
                  >
                    {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>

                  <NavLink
                    to={profilePath}
                    aria-label="Open profile"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-app-border bg-app-card text-brand transition hover:border-brand/30 hover:bg-brand/5 xl:hidden"
                  >
                    <UserCircle2 className="h-4 w-4" />
                  </NavLink>

                  <NavLink
                    to={profilePath}
                    className="hidden max-w-[13rem] items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-2 text-sm transition hover:border-brand/30 hover:bg-brand/5 xl:inline-flex"
                  >
                    <UserCircle2 className="h-4 w-4 text-brand" />
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{profile?.full_name || profile?.username || "Profile"}</span>
                      {profile?.is_verified ? <VerifiedBadge /> : null}
                    </span>
                  </NavLink>
                </div>
              </div>
            </div>

          <div className="flex items-center gap-1.5 px-4 pb-3 pt-3.5 md:hidden">
            {isWorkspaceRoute ? (
              <div className="min-w-0 flex-1">{workspaceHeaderControl}</div>
            ) : profileHeaderToggle ? (
              <div className="min-w-0 flex-1">{profileHeaderToggle}</div>
            ) : showMobileHeaderSearch ? (
              <div className="min-w-0 flex-1">
                {showCommunitySearch ? (
                  <GlobalSearchBar
                    className="max-w-none"
                    compact
                    placeholder="Search communities"
                    value={headerSearchValue}
                    hideResults
                    onValueChange={(nextValue) => {
                      updateCommunityPageParams({ search: nextValue });
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/app/search")}
                    className="input-shell flex h-11 w-full items-center justify-start gap-2.5 px-3.5 text-app-muted"
                  >
                    <Search className="h-4 w-4 shrink-0" />
                    <span>Search</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(isProfileRoute ? profilePath : "/app/discussions/study")}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-card text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                  aria-label={isProfileRoute ? "Back to profile" : "Back to homepage"}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            )}

            {profile && showMobileNotificationButton ? (
              <NotificationBell userId={profile.id} />
            ) : null}
            {profile && showMobileMessageButton ? <MessageInboxButton compact /> : null}
            {profile ? <WalletBalancePill mobile /> : null}
          </div>

        </header>
      ) : null}

      {!isOnline ? (
        <div className="border-b border-amber-200/70 bg-amber-50/92 backdrop-blur-xl dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-start gap-3 px-4 py-3 text-sm text-amber-800 sm:px-6 lg:px-8 xl:px-10 2xl:px-14 dark:text-amber-100">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              You&apos;re offline. My Room and tools already loaded on this device can still work locally, while
              Discussion, Community, sharing, and live sync will reconnect when internet returns.
            </p>
          </div>
        </div>
      ) : null}

      <main className={mainClassName}>
        <Outlet />
      </main>

      {!isMobileConversationOpen ? <PrimaryMobileNav pathname={location.pathname} tabs={tabs} /> : null}

    </div>
  );
}
