import { Suspense, lazy, startTransition, useEffect, useLayoutEffect } from "react";
import { Toaster } from "react-hot-toast";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  getLatestPushToken,
  isNativePlatform,
  requestNotificationPermission,
  setCapacitorNavigate,
  setOnPushTokenReceived,
} from "./lib/capacitorNotifications";
import { AppShell } from "./components/AppShell";
import { LazyModuleBoundary } from "./components/LazyModuleBoundary";
import { ProgressStoryLoader } from "./components/ProgressStoryLoader";
import { RouteLoadingShell } from "./components/RouteLoadingShell";
import { buildAuthRedirectPath, resolvePostAuthPath } from "./lib/authRedirect";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { lazyWithRetry } from "./lib/lazyRoute";
import {
  preloadAdminPageModule,
  preloadCommunitiesPageModule,
  preloadDailyPlannerModule,
  preloadEmailServiceModule,
  preloadLearningToolsModule,
  preloadPortfolioMakerModule,
  preloadProfilePageModule,
  preloadProfileSettingsPageModule,
  preloadRealtimeMessagesPageModule,
  preloadResumeMakerModule,
  preloadSearchPageModule,
  preloadStudyNotesModule,
  preloadToolWorkspacePageModule,
  preloadWalletRechargePageModule,
  preloadWhitebookNotebookModule,
} from "./lib/modulePreload";
import { normalizeUsername } from "./lib/usernames";
import { useAuthStore } from "./store/authStore";
import { useCoinWalletStore } from "./store/coinWalletStore";
import { registerPushDevice, unregisterCurrentPushDevice } from "./lib/pushDevices";
import { ensureRealtimeRelayReady } from "./lib/realtimeChat/client";
import {
  cancelDeferredTask,
  runWhenDocumentVisible,
  scheduleDeferredTask,
} from "./lib/browserTasks";
import type { ProfileRow } from "./types/database";

const AuthPage = lazyWithRetry(() => import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const CommunitiesPage = lazyWithRetry(() =>
  import("./pages/CommunitiesPage").then((module) => ({ default: module.CommunitiesPage }))
);
const CommunityCreatePage = lazyWithRetry(() =>
  import("./pages/CommunityCreatePage").then((module) => ({ default: module.CommunityCreatePage }))
);
const CommunityDetailPage = lazyWithRetry(() =>
  import("./pages/CommunityDetailPage").then((module) => ({ default: module.CommunityDetailPage }))
);
const CommunityManagePage = lazyWithRetry(() =>
  import("./pages/CommunityManagePage").then((module) => ({ default: module.CommunityManagePage }))
);
const CreatePostPage = lazyWithRetry(() =>
  import("./pages/CreatePostPage").then((module) => ({ default: module.CreatePostPage }))
);
const DeleteAccountPage = lazyWithRetry(() =>
  import("./pages/DeleteAccountPage").then((module) => ({ default: module.DeleteAccountPage }))
);
const DiscussionPage = lazyWithRetry(() =>
  import("./pages/DiscussionPage").then((module) => ({ default: module.DiscussionPage }))
);
const RealtimeMessagesPage = lazyWithRetry(() =>
  import("./pages/RealtimeMessagesPage").then((module) => ({ default: module.RealtimeMessagesPage }))
);
const ProfilePage = lazyWithRetry(() =>
  import("./pages/ProfilePage").then((module) => ({ default: module.ProfilePage }))
);
const ProfileSettingsPage = lazyWithRetry(() =>
  import("./pages/ProfileSettingsPage").then((module) => ({ default: module.ProfileSettingsPage }))
);
const AdminPage = lazyWithRetry(() => import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })));
const PublicPortfolioPage = lazyWithRetry(() =>
  import("./pages/PublicPortfolioPage").then((module) => ({ default: module.PublicPortfolioPage }))
);
const WalletRechargePage = lazyWithRetry(() =>
  import("./pages/WalletRechargePage").then((module) => ({ default: module.WalletRechargePage }))
);
const PublicResumePage = lazyWithRetry(() =>
  import("./pages/PublicResumePage").then((module) => ({ default: module.PublicResumePage }))
);
const PrivacyPolicyPage = lazyWithRetry(() =>
  import("./pages/PrivacyPolicyPage").then((module) => ({ default: module.PrivacyPolicyPage }))
);
const TermsAndConditionsPage = lazyWithRetry(() =>
  import("./pages/TermsAndConditionsPage").then((module) => ({ default: module.TermsAndConditionsPage }))
);
const AtsResumeMakerPage = lazyWithRetry(() => preloadResumeMakerModule().then((module) => ({ default: module.AtsResumeMakerPage })));
const PortfolioMakerPage = lazyWithRetry(() => preloadPortfolioMakerModule().then((module) => ({ default: module.PortfolioMakerPage })));
const DailyPlannerPage = lazyWithRetry(() => preloadDailyPlannerModule().then((module) => ({ default: module.DailyPlannerPage })));
const WhitebookNotebookPage = lazyWithRetry(() =>
  preloadWhitebookNotebookModule().then((module) => ({ default: module.WhitebookNotebookPage }))
);
const VideoNotesMakerPage = lazyWithRetry(() =>
  preloadStudyNotesModule().then((module) => ({ default: module.StudyNotesApp }))
);
const PublicWhitebookPage = lazyWithRetry(() =>
  import("./pages/PublicWhitebookPage").then((module) => ({ default: module.PublicWhitebookPage }))
);
const PublicStudyNotesPage = lazyWithRetry(() =>
  import("./pages/PublicStudyNotesPage").then((module) => ({ default: module.PublicStudyNotesPage }))
);
const PublicPlayAreaPage = lazyWithRetry(() =>
  import("./pages/PublicPlayAreaPage").then((module) => ({ default: module.PublicPlayAreaPage }))
);
const PublicBugFixResultPage = lazyWithRetry(() =>
  import("./pages/PublicBugFixResultPage").then((module) => ({ default: module.PublicBugFixResultPage }))
);
const QrRedirectPage = lazyWithRetry(() =>
  import("./pages/QrRedirectPage").then((module) => ({ default: module.QrRedirectPage }))
);
const LearningToolsPage = lazyWithRetry(() => preloadLearningToolsModule().then((module) => ({ default: module.LearningToolsPage })));
const EmailsPage = lazyWithRetry(() => preloadEmailServiceModule().then((module) => ({ default: module.EmailsPage })));
const ToolWorkspacePage = lazyWithRetry(() =>
  preloadToolWorkspacePageModule().then((module) => ({ default: module.ToolWorkspacePage }))
);
const SearchPage = lazyWithRetry(() =>
  import("./pages/SearchPage").then((module) => ({ default: module.SearchPage }))
);
const PostDetailPage = lazyWithRetry(() =>
  import("./pages/PostDetailPage").then((module) => ({ default: module.PostDetailPage }))
);

function RouteFallback() {
  return <RouteLoadingShell />;
}

function LazyRoute({ children }: { children: JSX.Element }) {
  const location = useLocation();

  return (
    <LazyModuleBoundary
      resetKey={`${location.pathname}${location.search}${location.hash}`}
      title="This page could not finish loading."
    >
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </LazyModuleBoundary>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to={buildAuthRedirectPath(location)} replace />;
  }

  return children;
}

function AuthRouteGate() {
  const location = useLocation();
  const { user } = useAuthStore();
  const redirectTarget = resolvePostAuthPath(new URLSearchParams(location.search).get("redirectTo"));

  if (user) {
    return <Navigate to={redirectTarget} replace />;
  }

  return <AuthPage />;
}

function LegacyProfileRedirect() {
  const { username } = useParams();
  const normalized = normalizeUsername(username || "");

  if (!normalized) {
    return <Navigate to="/profile" replace />;
  }

  return <Navigate to={`/profile/${normalized}`} replace />;
}

function LegacyVideoNotesMakerRedirect() {
  const location = useLocation();
  return <Navigate to={`/app/myroom/video-notes-maker${location.search}${location.hash}`} replace />;
}

function LegacyMyRoomHomeRedirect() {
  return <Navigate to="/app/tools?view=my-room" replace />;
}

/** Connects Capacitor notification deep-links to React Router. */
function CapacitorNavigateSetup() {
  const navigate = useNavigate();
  useEffect(() => {
    setCapacitorNavigate((path) => navigate(path));
  }, [navigate]);
  return null;
}

function RouteScrollReset() {
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.key]);

  return null;
}

function isPublicStandalonePath(pathname: string) {
  return (
    /^\/app\/myroom\/ats-resume-maker\/live\/[^/]+\/[^/]+\/?$/.test(pathname) ||
    /^\/p\/[^/]+\/[^/]+\/?$/.test(pathname) ||
    /^\/app\/myroom\/whitebook\/live\/[^/]+\/[^/]+\/?$/.test(pathname) ||
    /^\/app\/myroom\/video-notes-maker\/shared\/[^/]+\/[^/]+\/?$/.test(pathname) ||
    /^\/app\/tools\/study-notes\/shared\/[^/]+\/[^/]+\/?$/.test(pathname) ||
    /^\/app\/tools\/bugfix-lab\/result\/[^/]+\/[^/]+\/?$/.test(pathname) ||
    /^\/q\/[^/]+\/?$/.test(pathname) ||
    /^\/qr\/[^/]+\/?$/.test(pathname)
  );
}

function shouldPrioritizeWalletWarmup(pathname: string) {
  return (
    pathname.startsWith("/app/create") ||
    pathname.startsWith("/app/messages") ||
    pathname.startsWith("/app/communities/create") ||
    pathname.startsWith("/app/wallet/recharge") ||
    pathname.startsWith("/app/myroom/ats-resume-maker") ||
    pathname.startsWith("/app/myroom/portfolio-maker") ||
    pathname.startsWith("/app/tools/instagram-automation") ||
    /^\/profile\/[^/]+\/settings(?:\/[^/]+)?\/?$/.test(pathname)
  );
}

function shouldPrioritizeChatWarmup(pathname: string) {
  return pathname.startsWith("/app/messages");
}

function NativePushRegistration({
  loading,
  profile,
}: {
  loading: boolean;
  profile: ProfileRow | null;
}) {
  useEffect(() => {
    let disposed = false;

    const handleToken = async (token?: string | null) => {
      if (!profile || !token || disposed) {
        if (!token) {
          console.log("[NativePush] handleToken called but token is empty/null.");
        }
        return;
      }

      try {
        await registerPushDevice({
          userId: profile.id,
          token,
        });
      } catch (error) {
        if (!disposed) {
          console.error("[NativePush] Failed to register push device.", error);
        }
      }
    };

    if (!isNativePlatform()) {
      setOnPushTokenReceived(() => undefined);
      return () => {
        disposed = true;
      };
    }

    if (profile) {
      console.log("[NativePush] Profile available, setting up push registration…");

      // Always request permissions to ensure FCM token is generated
      void requestNotificationPermission()
        .then((granted) => {
          if (!disposed) {
            console.log("[NativePush] Permission request result:", granted);
          }
        })
        .catch((error) => {
          if (!disposed) {
            console.error("[NativePush] Failed to request notification permission.", error);
          }
        });

      // Try registering with any existing token immediately
      const existingToken = getLatestPushToken();
      if (existingToken) {
        console.log("[NativePush] Existing token found, registering immediately…");
        void handleToken(existingToken);
      } else {
        console.log("[NativePush] No existing token found, waiting for FCM callback…");
      }

      // Set up callback for when a new token arrives from FCM
      setOnPushTokenReceived((token) => {
        console.log("[NativePush] New FCM token received via callback, registering…");
        void handleToken(token);
      });

      // Retry registration on focus/visibility/interval to handle edge cases
      const retryRegistration = () => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          return;
        }

        const token = getLatestPushToken();
        if (token) {
          void handleToken(token);
        }
      };

      // Short initial retry in case token arrives right after mount
      const earlyRetry = window.setTimeout(retryRegistration, 5000);
      const interval = window.setInterval(retryRegistration, 120000);
      window.addEventListener("focus", retryRegistration);
      document.addEventListener("visibilitychange", retryRegistration);

      return () => {
        disposed = true;
        window.clearTimeout(earlyRetry);
        window.clearInterval(interval);
        window.removeEventListener("focus", retryRegistration);
        document.removeEventListener("visibilitychange", retryRegistration);
        setOnPushTokenReceived(() => undefined);
      };
    }

    setOnPushTokenReceived(() => undefined);

    if (!loading) {
      void unregisterCurrentPushDevice().catch((error) => {
        if (!disposed) {
          console.error("[NativePush] Failed to unregister push device.", error);
        }
      });
    }

    return () => {
      disposed = true;
    };
  }, [loading, profile]);

  return null;
}

function BackgroundChatBootstrap({
  profile,
  prioritize,
}: {
  profile: ProfileRow | null;
  prioritize: boolean;
}) {
  useEffect(() => {
    let disposed = false;
    let cancelOnVisible: (() => void) | null = null;

    if (!profile) {
      return () => {
        disposed = true;
      };
    }

    const bootstrap = () => {
      if (disposed) {
        return;
      }

      void ensureRealtimeRelayReady(profile).catch((error) => {
        if (!disposed) {
          console.error("Failed to bootstrap realtime relay chat for this user.", error);
        }
      });
    };

    if (prioritize) {
      bootstrap();
    } else {
      const deferredTask = scheduleDeferredTask(() => {
        if (disposed) {
          return;
        }

        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          cancelOnVisible = runWhenDocumentVisible(bootstrap);
          return;
        }

        bootstrap();
      }, { timeout: 6500 });

      return () => {
        disposed = true;
        cancelDeferredTask(deferredTask);
        cancelOnVisible?.();
      };
    }

    return () => {
      disposed = true;
      cancelOnVisible?.();
    };
  }, [prioritize, profile]);

  return null;
}

function RouteAwareRuntime({
  loading,
  profile,
  userId,
  isAdmin,
}: {
  loading: boolean;
  profile: ProfileRow | null;
  userId: string | null | undefined;
  isAdmin: boolean;
}) {
  const location = useLocation();
  const hydrateCoinWallet = useCoinWalletStore((state) => state.hydrateForUser);
  const hydrateWalletPreview = useCoinWalletStore((state) => state.hydrateWalletPreviewForUser);
  const prioritizeWalletWarmup = shouldPrioritizeWalletWarmup(location.pathname);
  const prioritizeChatWarmup = shouldPrioritizeChatWarmup(location.pathname);

  useEffect(() => {
    let cancelOnVisible: (() => void) | null = null;

    if (!userId) {
      void hydrateWalletPreview(null);
      return () => {
        cancelOnVisible?.();
      };
    }

    const warmWallet = () => {
      if (prioritizeWalletWarmup) {
        void hydrateCoinWallet(userId);
        return;
      }

      void hydrateWalletPreview(userId);
    };

    if (prioritizeWalletWarmup) {
      warmWallet();
      return () => {
        cancelOnVisible?.();
      };
    }

    const deferredTask = scheduleDeferredTask(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        cancelOnVisible = runWhenDocumentVisible(warmWallet);
        return;
      }

      warmWallet();
    }, { timeout: 2200 });

    return () => {
      cancelDeferredTask(deferredTask);
      cancelOnVisible?.();
    };
  }, [hydrateCoinWallet, hydrateWalletPreview, prioritizeWalletWarmup, userId]);

  useEffect(() => {
    let disposed = false;
    let cancelOnVisible: (() => void) | null = null;
    let timer = 0;

    const warmRouteModules = () => {
      if (disposed) {
        return;
      }

      void preloadCommunitiesPageModule();
      void preloadSearchPageModule();

      if (userId) {
        void preloadProfilePageModule();
        void preloadProfileSettingsPageModule();
        void preloadRealtimeMessagesPageModule();
        void preloadWalletRechargePageModule();
      }

      if (isAdmin) {
        void preloadAdminPageModule();
      }
    };

    timer = window.setTimeout(() => {
      if (disposed) {
        return;
      }

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        cancelOnVisible = runWhenDocumentVisible(warmRouteModules);
        return;
      }

      warmRouteModules();
    }, 1600);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      cancelOnVisible?.();
    };
  }, [isAdmin, userId]);

  return (
    <>
      <CapacitorNavigateSetup />
      <RouteScrollReset />
      <NativePushRegistration loading={loading} profile={profile} />
      <BackgroundChatBootstrap profile={profile} prioritize={prioritizeChatWarmup} />
    </>
  );
}

function App() {
  const { user, profile, isAdmin, loading, hydrateSession } = useAuthStore();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
  const bypassGlobalLoading = isPublicStandalonePath(currentPath);

  useEffect(() => {
    const bootstrap = async () => {
      if (!isSupabaseConfigured) {
        await hydrateSession(null);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      await hydrateSession(session);
    };

    void bootstrap();

    if (!isSupabaseConfigured) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      startTransition(() => {
        const currentState = useAuthStore.getState();

        if (
          event === "TOKEN_REFRESHED" &&
          session?.user &&
          currentState.user?.id === session.user.id &&
          currentState.profile
        ) {
          useAuthStore.setState({
            user: session.user,
            loading: false,
          });
          return;
        }

        void hydrateSession(session);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hydrateSession]);

  if (loading && !bypassGlobalLoading) {
    return <ProgressStoryLoader />;
  }

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <RouteAwareRuntime loading={loading} profile={profile} userId={user?.id} isAdmin={isAdmin} />
      <Toaster position="top-right" toastOptions={{ className: "toast-card" }} />
      <Routes>
        <Route path="/" element={<Navigate to="/app/discussions/study" replace />} />
        <Route path="/auth" element={<LazyRoute><AuthRouteGate /></LazyRoute>} />
        <Route path="/privacy-policy" element={<LazyRoute><PrivacyPolicyPage /></LazyRoute>} />
        <Route path="/term-and-condition" element={<LazyRoute><TermsAndConditionsPage /></LazyRoute>} />
        <Route path="/delete" element={<AppShell />}>
          <Route index element={<LazyRoute><DeleteAccountPage /></LazyRoute>} />
        </Route>
        <Route
          path="/admin"
          element={
            <LazyRoute>
              <RequireAuth>
                {isAdmin ? <AdminPage /> : <Navigate to="/app/discussions/study" replace />}
              </RequireAuth>
            </LazyRoute>
          }
        />
        <Route
          path="/app/myroom/ats-resume-maker/live/:shareSlug/:username"
          element={<LazyRoute><PublicResumePage /></LazyRoute>}
        />
        <Route path="/p/:username/:shareSlug" element={<LazyRoute><PublicPortfolioPage /></LazyRoute>} />
        <Route
          path="/app/myroom/whitebook/live/:shareSlug/:username"
          element={<LazyRoute><PublicWhitebookPage /></LazyRoute>}
        />
        <Route
          path="/app/myroom/video-notes-maker/shared/:shareSlug/:username"
          element={<LazyRoute><PublicStudyNotesPage /></LazyRoute>}
        />
        <Route
          path="/app/myroom/ai-teacher-playarea/view/:documentId"
          element={<LazyRoute><PublicPlayAreaPage /></LazyRoute>}
        />
        <Route
          path="/app/myroom/ai-teacher-playarea/shared"
          element={<LazyRoute><PublicPlayAreaPage /></LazyRoute>}
        />
        <Route
          path="/app/tools/study-notes/shared/:shareSlug/:username"
          element={<LazyRoute><PublicStudyNotesPage /></LazyRoute>}
        />
        <Route
          path="/app/tools/bugfix-lab/result/:shareSlug/:username"
          element={<LazyRoute><PublicBugFixResultPage /></LazyRoute>}
        />
        <Route path="/q/:shortCode" element={<LazyRoute><QrRedirectPage /></LazyRoute>} />
        <Route path="/qr/:shortCode" element={<LazyRoute><QrRedirectPage /></LazyRoute>} />

        <Route path="/app" element={<AppShell />}>
          <Route path="discussions" element={<Navigate to="/app/discussions/study" replace />} />
          <Route path="discussions/:kind" element={<LazyRoute><DiscussionPage /></LazyRoute>} />
          <Route
            path="create"
            element={
              <LazyRoute>
                <RequireAuth>
                  <CreatePostPage />
                </RequireAuth>
              </LazyRoute>
            }
          />
          <Route path="search" element={<LazyRoute><SearchPage /></LazyRoute>} />
          <Route path="posts/:postId" element={<LazyRoute><PostDetailPage /></LazyRoute>} />
          <Route path="communities" element={<LazyRoute><CommunitiesPage /></LazyRoute>} />
          <Route
            path="communities/create"
            element={
              <LazyRoute>
                <RequireAuth>
                  <CommunityCreatePage />
                </RequireAuth>
              </LazyRoute>
            }
          />
          <Route path="communities/:communitySlug" element={<LazyRoute><CommunityDetailPage /></LazyRoute>} />
          <Route
            path="communities/:communitySlug/manage"
            element={
              <LazyRoute>
                <RequireAuth>
                  <CommunityManagePage />
                </RequireAuth>
              </LazyRoute>
            }
          />
          <Route
            path="messages"
            element={
              <LazyRoute>
                <RequireAuth>
                  <RealtimeMessagesPage />
                </RequireAuth>
              </LazyRoute>
            }
          />
          <Route
            path="wallet/recharge"
            element={
              <LazyRoute>
                <RequireAuth>
                  <WalletRechargePage />
                </RequireAuth>
              </LazyRoute>
            }
          />
          <Route path="experiments" element={<Navigate to="/app/tools?view=my-room" replace />} />
          <Route path="myroom" element={<LegacyMyRoomHomeRedirect />} />
          <Route
            path="myroom/ats-resume-maker"
            element={
              <RequireAuth>
                <LazyRoute><AtsResumeMakerPage /></LazyRoute>
              </RequireAuth>
            }
          />
          <Route
            path="myroom/portfolio-maker"
            element={
              <RequireAuth>
                <LazyRoute><PortfolioMakerPage /></LazyRoute>
              </RequireAuth>
            }
          />
          <Route
            path="myroom/daily-planner"
            element={
              <RequireAuth>
                <LazyRoute><DailyPlannerPage /></LazyRoute>
              </RequireAuth>
            }
          />
          <Route
            path="myroom/whitebook-notebook"
            element={
              <RequireAuth>
                <LazyRoute><WhitebookNotebookPage /></LazyRoute>
              </RequireAuth>
            }
          />
          <Route
            path="myroom/video-notes-maker"
            element={
              <RequireAuth>
                <LazyRoute><VideoNotesMakerPage /></LazyRoute>
              </RequireAuth>
            }
          />
          <Route path="myroom/tools/study-notes" element={<LegacyVideoNotesMakerRedirect />} />
          <Route
            path="myroom/tools/:toolSlug/*"
            element={
              <RequireAuth>
                <LazyRoute><ToolWorkspacePage /></LazyRoute>
              </RequireAuth>
            }
          />
          <Route
            path="myroom/ats-resume-maker/edit/:resumeId"
            element={
              <RequireAuth>
                <LazyRoute><AtsResumeMakerPage /></LazyRoute>
              </RequireAuth>
            }
          />
          <Route
            path="myroom/portfolio-maker/edit/:portfolioId"
            element={
              <RequireAuth>
                <LazyRoute><PortfolioMakerPage /></LazyRoute>
              </RequireAuth>
            }
          />
          <Route path="tools" element={<LazyRoute><LearningToolsPage /></LazyRoute>} />
          <Route path="emails/*" element={<LazyRoute><EmailsPage /></LazyRoute>} />
          <Route path="tools/study-notes" element={<LegacyVideoNotesMakerRedirect />} />
          <Route
            path="tools/:toolSlug/*"
            element={
              <RequireAuth>
                <LazyRoute><ToolWorkspacePage /></LazyRoute>
              </RequireAuth>
            }
          />
        </Route>

        <Route path="/myroom" element={<Navigate to="/app/tools?view=my-room" replace />} />
        <Route path="/app/experiments/:shareSlug/:username" element={<Navigate to="/app/tools?view=my-room" replace />} />

        <Route path="/profile" element={<AppShell />}>
          <Route
            index
            element={
              profile ? (
                <Navigate to={`/profile/${profile.username}`} replace />
              ) : (
                <LazyRoute><ProfilePage /></LazyRoute>
              )
            }
          />
          <Route
            path=":username/edit"
            element={
              <LazyRoute>
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              </LazyRoute>
            }
          />
          <Route
            path=":username/settings"
            element={
              <LazyRoute>
                <RequireAuth>
                  <ProfileSettingsPage />
                </RequireAuth>
              </LazyRoute>
            }
          />
          <Route
            path=":username/settings/:section"
            element={
              <LazyRoute>
                <RequireAuth>
                  <ProfileSettingsPage />
                </RequireAuth>
              </LazyRoute>
            }
          />
          <Route path=":username" element={<LazyRoute><ProfilePage /></LazyRoute>} />
        </Route>

        <Route
          path="/app/profile"
          element={
            user && profile ? (
              <Navigate to={`/profile/${profile.username}`} replace />
            ) : (
              <Navigate to="/profile" replace />
            )
          }
        />
        <Route path="/app/profile/:username" element={<LegacyProfileRedirect />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
