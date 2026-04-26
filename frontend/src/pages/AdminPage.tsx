import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Coins, Search, Settings2, ShieldOff, Wallet2 } from "lucide-react";
import toast from "react-hot-toast";
import { AdminHeader } from "../features/admin/AdminHeader";
import { AdminPagination } from "../features/admin/AdminPagination";
import { AdminOverviewSection } from "../features/admin/AdminOverviewSection";
import { AdminPillTabs } from "../features/admin/AdminUi";
import { WalletRechargeAdminSection } from "../features/admin/WalletRechargeAdminSection";
import { AdminTrustAndReportsSection } from "../features/admin/AdminTrustAndReportsSection";
import { BugFixManagementSection } from "../features/admin/BugFixManagementSection";
import {
  ADMIN_TAB_DEFINITIONS,
  AdminTabsSidebar,
  getAdminTabDefinition,
  type AdminTabId,
} from "../features/admin/AdminTabsSidebar";
import { BulkMailerAdminSection } from "../features/bulk-mailer/BulkMailerAdminSection";
import { CacheManagementSection } from "../features/admin/CacheManagementSection";
import { CoinEconomySection } from "../features/admin/CoinEconomySection";
import { CommentModerationSection } from "../features/admin/CommentModerationSection";
import { CommunityManagementSection } from "../features/admin/CommunityManagementSection";
import { AiTeacherRoutingAdminSection } from "../features/admin/AiTeacherRoutingAdminSection";
import {
  ContentModerationSection,
  type AdminPostAgeFilter,
  type AdminPostCleanupPreset,
} from "../features/admin/ContentModerationSection";
import { EmailServicesAdminSection } from "../features/emails/EmailServicesAdminSection";
import { MediaManagementSection } from "../features/admin/MediaManagementSection";
import { PlatformSettingsSection } from "../features/admin/PlatformSettingsSection";
import {
  type BugFixImportExecutionResult,
  type ImportableBugFixQuestionInput,
} from "../features/admin/bugfixImport";
import { APP_VERSION } from "../lib/appVersion";
import {
  clearRuntimeCachesFromDevice,
  clearRuntimeLocalState,
  getRuntimeCacheSummary,
  refreshOfflineWorkerRegistration,
  type RuntimeCacheSummary,
} from "../lib/appRuntime";
import {
  loadAdminAccountDeletionRequests,
  reviewAccountDeletionRequest,
} from "../lib/accountDeletion";
import {
  getPostReportStatusLabel,
  loadAdminPostReports,
  reviewPostReportsForPost,
} from "../lib/postReports";
import { UserModerationSection } from "../features/admin/UserModerationSection";
import { deleteBugFixQuestion, listBugFixQuestions, saveBugFixQuestion } from "../lib/bugfixApi";
import {
  clearDeviceCache,
  clearBackendCache,
  getCacheHealth,
  getDeviceCacheSummary,
  isBackendCacheConfigured,
  requestPersistentDeviceStorage,
  type DeviceCacheNamespace,
} from "../lib/cache";
import { adminAdjustUserCoins, loadCoinFeatureSettings, saveCoinFeatureSettings } from "../lib/coins";
import type { OfflineCacheSummary } from "../lib/offlineCache";
import { loadVerificationRequestsForUsers, reviewVerificationRequest } from "../lib/verification";
import {
  clearCurrentUserDeviceDataCache,
  countPostsOlderThan,
  createCommunity,
  defaultPlatformSettings,
  deleteManagedMediaAsset,
  deletePostsOlderThan,
  deletePost,
  loadAdminR2BucketObjects,
  loadAdminMediaAssetsPage,
  loadPlatformSettings,
  logModerationAction,
  postSelect,
  slugify,
  toggleCommunityVisibility,
  updatePlatformSettings,
  warmCoreOfflineData,
} from "../lib/api";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { useCoinWalletStore } from "../store/coinWalletStore";
import type {
  AccountDeletionRequestWithRelations,
  AdminBucketObjectRow,
  CommunityRow,
  CommentWithAuthor,
  BugFixQuestionRow,
  CoinFeatureSettingRow,
  DiscussionKind,
  MediaAssetWithRelations,
  PlatformSettingsRow,
  PostReportWithRelations,
  PostWithRelations,
  ProfileRow,
  VerificationRequestRow,
} from "../types/database";

interface AdminCommentEntry extends CommentWithAuthor {
  post?: {
    id: string;
    title: string;
    discussion_kind: string;
    visibility_scope: string;
    is_anonymous: boolean;
    community?: {
      slug: string;
      name: string;
    } | null;
  } | null;
}

interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalCommunities: number;
  totalComments: number;
}

type PaginatedAdminTabId = "users" | "posts" | "comments" | "communities" | "media" | "tools";

const ADMIN_PAGE_SIZE = 5;

const paginatedAdminTabs: PaginatedAdminTabId[] = [
  "users",
  "posts",
  "comments",
  "communities",
  "media",
  "tools",
];

function createInitialAdminPages() {
  return {
    users: 1,
    posts: 1,
    comments: 1,
    communities: 1,
    media: 1,
    tools: 1,
  } satisfies Record<PaginatedAdminTabId, number>;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

function summarizeAdminFailures(sections: string[]) {
  const uniqueSections = Array.from(new Set(sections.filter(Boolean)));

  if (uniqueSections.length === 0) {
    return null;
  }

  return `Some admin sections could not be loaded right now: ${uniqueSections.join(", ")}. The rest of the panel is still available.`;
}

function resolveCleanupDays(preset: AdminPostCleanupPreset, customDays: string) {
  if (preset !== "custom") {
    return Number(preset);
  }

  const parsedDays = Number(customDays);

  if (!Number.isFinite(parsedDays) || parsedDays < 1) {
    return null;
  }

  return Math.floor(parsedDays);
}

export function AdminPage() {
  const { user, isAdmin, signOut } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalCommunities: 0,
    totalComments: 0,
  });
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [comments, setComments] = useState<AdminCommentEntry[]>([]);
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetWithRelations[]>([]);
  const [bucketObjects, setBucketObjects] = useState<AdminBucketObjectRow[]>([]);
  const [bugFixQuestions, setBugFixQuestions] = useState<BugFixQuestionRow[]>([]);
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);
  const [bucketLoadError, setBucketLoadError] = useState<string | null>(null);
  const [bugFixLoadError, setBugFixLoadError] = useState<string | null>(null);
  const [bucketLoading, setBucketLoading] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const [adminLoadWarning, setAdminLoadWarning] = useState<string | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsRow>(defaultPlatformSettings);
  const [coinFeatureSettings, setCoinFeatureSettings] = useState<CoinFeatureSettingRow[]>([]);
  const [walletBalanceByUserId, setWalletBalanceByUserId] = useState<Record<string, number>>({});
  const [verificationRequestsByUserId, setVerificationRequestsByUserId] = useState<
    Partial<Record<string, VerificationRequestRow | null>>
  >({});
  const [accountDeletionRequests, setAccountDeletionRequests] = useState<AccountDeletionRequestWithRelations[]>([]);
  const [postReports, setPostReports] = useState<PostReportWithRelations[]>([]);
  const [cacheEntries, setCacheEntries] = useState<number | null>(null);
  const [deviceCacheSummary, setDeviceCacheSummary] = useState<OfflineCacheSummary | null>(null);
  const [runtimeCacheSummary, setRuntimeCacheSummary] = useState<RuntimeCacheSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [platformPanelView, setPlatformPanelView] = useState<
    "general" | "coins" | "walletRecharge" | "aiRouting"
  >("general");
  const [pageByTab, setPageByTab] = useState<Record<PaginatedAdminTabId, number>>(createInitialAdminPages);
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityDescription, setNewCommunityDescription] = useState("");
  const [newCommunityColor, setNewCommunityColor] = useState("#2563eb");
  const [postingModes, setPostingModes] = useState<DiscussionKind[]>(["study", "job", "anonymous"]);
  const [postAgeFilter, setPostAgeFilter] = useState<AdminPostAgeFilter>("all");
  const [cleanupPreset, setCleanupPreset] = useState<AdminPostCleanupPreset>("30");
  const [cleanupCustomDays, setCleanupCustomDays] = useState("120");
  const [cleanupMatchingCount, setCleanupMatchingCount] = useState<number | null>(null);
  const [cleanupCounting, setCleanupCounting] = useState(false);
  const [cleanupDeleting, setCleanupDeleting] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);

  const clearCacheNamespaces = useCallback(async (namespaces: string[]) => {
    if (!isBackendCacheConfigured()) {
      return;
    }

    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    if (!accessToken) {
      return;
    }

    const uniqueNamespaces = Array.from(new Set(namespaces.filter(Boolean)));

    await Promise.all(
      uniqueNamespaces.map(async (namespace) => {
        try {
          await clearBackendCache(accessToken, namespace);
        } catch (error) {
          console.warn(`Cache clear failed for namespace ${namespace}.`, error);
        }
      })
    );
  }, []);

  const loadAdminData = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);

    try {
      const searchTerm = deferredSearch.trim().replace(/[%]/g, "");
      const searchPattern = searchTerm ? `%${searchTerm}%` : null;
      const usersOffset = (pageByTab.users - 1) * ADMIN_PAGE_SIZE;
      const postsOffset = (pageByTab.posts - 1) * ADMIN_PAGE_SIZE;
      const commentsOffset = (pageByTab.comments - 1) * ADMIN_PAGE_SIZE;
      const communitiesOffset = (pageByTab.communities - 1) * ADMIN_PAGE_SIZE;
      const mediaOffset = (pageByTab.media - 1) * ADMIN_PAGE_SIZE;
      const toolsOffset = (pageByTab.tools - 1) * ADMIN_PAGE_SIZE;
      const postsCutoffIso =
        postAgeFilter === "all"
          ? null
          : (() => {
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - Number(postAgeFilter));
              return cutoff.toISOString();
            })();

      let usersPageQuery = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .range(usersOffset, usersOffset + ADMIN_PAGE_SIZE - 1);
      let postsPageQuery = supabase
        .from("posts")
        .select(postSelect)
        .order("created_at", { ascending: false })
        .range(postsOffset, postsOffset + ADMIN_PAGE_SIZE - 1);

      let commentsPageQuery = supabase
        .from("comments")
        .select(
          `
            *,
            author:profiles!comments_author_id_fkey(*),
            post:posts(id,title,discussion_kind,visibility_scope,is_anonymous,community:communities(slug,name))
          `
        )
        .order("created_at", { ascending: false })
        .range(commentsOffset, commentsOffset + ADMIN_PAGE_SIZE - 1);

      let communitiesPageQuery = supabase
        .from("communities")
        .select("*")
        .order("created_at", { ascending: false })
        .range(communitiesOffset, communitiesOffset + ADMIN_PAGE_SIZE - 1);

      if (searchPattern) {
        usersPageQuery = usersPageQuery.or(
          `username.ilike.${searchPattern},full_name.ilike.${searchPattern},course.ilike.${searchPattern}`
        );

        postsPageQuery = postsPageQuery.or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`);

        commentsPageQuery = commentsPageQuery.ilike("content", searchPattern);

        communitiesPageQuery = communitiesPageQuery.or(
          `name.ilike.${searchPattern},slug.ilike.${searchPattern},description.ilike.${searchPattern}`
        );
      }

      if (postsCutoffIso) {
        postsPageQuery = postsPageQuery.gte("created_at", postsCutoffIso);
      }

      const [
        usersResult,
        postsResult,
        commentsResult,
        communitiesResult,
        mediaResult,
        bugFixQuestionsResult,
        sessionResult,
        settingsResult,
        coinFeatureSettingsResult,
        accountDeletionRequestsResult,
        postReportsResult,
      ] = await Promise.allSettled([
        usersPageQuery,
        postsPageQuery,
        commentsPageQuery,
        communitiesPageQuery,
        loadAdminMediaAssetsPage({
          limit: ADMIN_PAGE_SIZE,
          offset: mediaOffset,
          search: searchTerm || undefined,
        })
          .then((result) => ({
            items: result.items,
            totalCount: result.totalCount,
            error: null,
          }))
          .catch((error) => ({
            items: [] as MediaAssetWithRelations[],
            totalCount: null as number | null,
            error: error instanceof Error ? error.message : "Could not load media library.",
          })),
        listBugFixQuestions({
          includeAll: true,
          limit: ADMIN_PAGE_SIZE,
          offset: toolsOffset,
          search: searchTerm || undefined,
        }),
        supabase.auth.getSession(),
        loadPlatformSettings(),
        loadCoinFeatureSettings(),
        loadAdminAccountDeletionRequests(),
        loadAdminPostReports(),
      ]);

      const failedSections: string[] = [];
      let accessToken: string | undefined;
      let loadedUsersCount = 0;
      let loadedPostsCount = 0;
      let loadedCommunitiesCount = 0;
      let loadedCommentsCount = 0;

      if (usersResult.status === "fulfilled") {
        if (usersResult.value.error) {
          failedSections.push("users");
        } else {
          const nextUsers = (usersResult.value.data || []) as ProfileRow[];
          loadedUsersCount = nextUsers.length;
          setUsers(nextUsers);
        }
      } else {
        failedSections.push("users");
      }

      if (postsResult.status === "fulfilled") {
        if (postsResult.value.error) {
          failedSections.push("posts");
        } else {
          const nextPosts = (postsResult.value.data || []) as PostWithRelations[];
          loadedPostsCount = nextPosts.length;
          setPosts(nextPosts);
        }
      } else {
        failedSections.push("posts");
      }

      if (commentsResult.status === "fulfilled") {
        if (commentsResult.value.error) {
          failedSections.push("comments");
        } else {
          const nextComments = (commentsResult.value.data || []) as AdminCommentEntry[];
          loadedCommentsCount = nextComments.length;
          setComments(nextComments);
        }
      } else {
        failedSections.push("comments");
      }

      if (communitiesResult.status === "fulfilled") {
        if (communitiesResult.value.error) {
          failedSections.push("communities");
        } else {
          const nextCommunities = (communitiesResult.value.data || []) as CommunityRow[];
          loadedCommunitiesCount = nextCommunities.length;
          setCommunities(nextCommunities);
        }
      } else {
        failedSections.push("communities");
      }

      if (mediaResult.status === "fulfilled") {
        setMediaAssets(mediaResult.value.items);
        setMediaLoadError(mediaResult.value.error);
        if (mediaResult.value.error) {
          failedSections.push("media");
        }
      } else {
        setMediaLoadError(getErrorMessage(mediaResult.reason, "Could not load media library."));
        failedSections.push("media");
      }

      if (bugFixQuestionsResult.status === "fulfilled") {
        setBugFixQuestions(bugFixQuestionsResult.value);
        setBugFixLoadError(null);
      } else {
        setBugFixQuestions([]);
        setBugFixLoadError(getErrorMessage(bugFixQuestionsResult.reason, "Could not load BugFix questions."));
        failedSections.push("bugfix tools");
      }

      if (settingsResult.status === "fulfilled") {
        setPlatformSettings(settingsResult.value);
      } else {
        failedSections.push("platform settings");
      }

      const loadedUsers =
        usersResult.status === "fulfilled" && !usersResult.value.error
          ? ((usersResult.value.data || []) as ProfileRow[])
          : [];

      if (loadedUsers.length > 0) {
        const [walletResult, verificationResult] = await Promise.all([
          supabase
            .from("coin_wallets")
            .select("user_id,balance")
            .in(
              "user_id",
              loadedUsers.map((entry) => entry.id)
            ),
          loadVerificationRequestsForUsers(
            loadedUsers.map((entry) => entry.id)
          ).catch((error) => {
            failedSections.push("verification requests");
            console.warn("Failed to load verification requests.", error);
            return [] as VerificationRequestRow[];
          }),
        ]);

        if (walletResult.error) {
          failedSections.push("wallets");
          setWalletBalanceByUserId({});
        } else {
          const walletRows = (walletResult.data || []) as Array<{ user_id: string; balance: number }>;
          setWalletBalanceByUserId(Object.fromEntries(walletRows.map((entry) => [entry.user_id, entry.balance])));
        }

        const nextVerificationRequests = verificationResult.reduce<
          Partial<Record<string, VerificationRequestRow | null>>
        >((accumulator, request) => {
          if (!accumulator[request.user_id]) {
            accumulator[request.user_id] = request;
            return accumulator;
          }

          if (
            accumulator[request.user_id]?.status !== "pending" &&
            request.status === "pending"
          ) {
            accumulator[request.user_id] = request;
          }

          return accumulator;
        }, {});

        setVerificationRequestsByUserId(nextVerificationRequests);
      } else {
        setWalletBalanceByUserId({});
        setVerificationRequestsByUserId({});
      }

      if (coinFeatureSettingsResult.status === "fulfilled") {
        setCoinFeatureSettings(coinFeatureSettingsResult.value);
      } else {
        failedSections.push("coin pricing");
      }

      if (accountDeletionRequestsResult.status === "fulfilled") {
        setAccountDeletionRequests(accountDeletionRequestsResult.value);
      } else {
        setAccountDeletionRequests([]);
        failedSections.push("profile deletion requests");
      }

      if (postReportsResult.status === "fulfilled") {
        setPostReports(postReportsResult.value);
      } else {
        setPostReports([]);
        failedSections.push("reported content");
      }

      if (sessionResult.status === "fulfilled") {
        accessToken = sessionResult.value.data.session?.access_token;
      }

      setStats({
        totalUsers: loadedUsersCount,
        totalPosts: loadedPostsCount,
        totalCommunities: loadedCommunitiesCount,
        totalComments: loadedCommentsCount,
      });
      setAdminLoadWarning(summarizeAdminFailures(failedSections));

      if (accessToken && isBackendCacheConfigured()) {
        try {
          const health = await getCacheHealth(accessToken);
          setCacheEntries(health?.entries ?? null);
        } catch (error) {
          console.warn("Failed to load backend cache health.", error);
          setCacheEntries(null);
        }
      } else {
        setCacheEntries(null);
      }

      try {
        const [nextDeviceCacheSummary, nextRuntimeCacheSummary] = await Promise.all([
          getDeviceCacheSummary(),
          getRuntimeCacheSummary(),
        ]);
        setDeviceCacheSummary(nextDeviceCacheSummary);
        setRuntimeCacheSummary(nextRuntimeCacheSummary);
      } catch (error) {
        console.warn("Failed to load device cache summary.", error);
        setDeviceCacheSummary(null);
        setRuntimeCacheSummary(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, pageByTab, postAgeFilter, user]);

  const loadBucketObjects = useCallback(async () => {
    if (!user) {
      return;
    }

    setBucketLoading(true);

    try {
      const result = await loadAdminR2BucketObjects({
        search: deferredSearch.trim() || undefined,
      });
      setBucketObjects(result.items);
      setBucketName(result.bucket);
      setBucketLoadError(null);
    } catch (error) {
      setBucketObjects([]);
      setBucketLoadError(error instanceof Error ? error.message : "Could not load Cloudflare R2 files.");
    } finally {
      setBucketLoading(false);
    }
  }, [deferredSearch, user]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (activeTab !== "media") {
      return;
    }

    void loadBucketObjects();
  }, [activeTab, loadBucketObjects]);

  useEffect(() => {
    setPageByTab((current) => {
      if (paginatedAdminTabs.every((tab) => current[tab] === 1)) {
        return current;
      }

      return createInitialAdminPages();
    });
  }, [deferredSearch]);

  useEffect(() => {
    setPageByTab((current) => {
      if (current.posts === 1) {
        return current;
      }

      return {
        ...current,
        posts: 1,
      };
    });
  }, [postAgeFilter]);

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }

    const cleanupDays = resolveCleanupDays(cleanupPreset, cleanupCustomDays);

    if (!cleanupDays) {
      setCleanupCounting(false);
      setCleanupMatchingCount(0);
      return;
    }

    let active = true;
    setCleanupCounting(true);

    void countPostsOlderThan(cleanupDays).then(
      (count) => {
        if (active) {
          setCleanupMatchingCount(count);
        }
      },
      (error) => {
        if (active) {
          setCleanupMatchingCount(0);
          toast.error(error instanceof Error ? error.message : "Failed to count older posts.");
        }
      }
    ).finally(() => {
      if (active) {
        setCleanupCounting(false);
      }
    });

    return () => {
      active = false;
    };
  }, [cleanupCustomDays, cleanupPreset, isAdmin, user]);

  const importBugFixQuestions = useCallback(
    async (
      inputs: ImportableBugFixQuestionInput[],
      onProgress?: (completed: number, total: number, currentTitle: string) => void
    ): Promise<BugFixImportExecutionResult> => {
      if (!user) {
        throw new Error("Sign in as an admin to import BugFix questions.");
      }

      const failures: BugFixImportExecutionResult["failures"] = [];
      let importedCount = 0;

      for (let index = 0; index < inputs.length; index += 1) {
        const entry = inputs[index];
        onProgress?.(index, inputs.length, entry.title);

        try {
          await saveBugFixQuestion(entry);
          importedCount += 1;
        } catch (error) {
          failures.push({
            label: entry.title,
            message: getErrorMessage(error, `Could not save ${entry.title}.`),
          });
        } finally {
          onProgress?.(index + 1, inputs.length, entry.title);
        }
      }

      if (importedCount > 0) {
        await logModerationAction({
          adminId: user.id,
          actionType: "bulk_import_bugfix_questions",
          actionNote: `imported:${importedCount};failed:${failures.length};languages:${Array.from(
            new Set(inputs.map((entry) => entry.language))
          ).join(",")}`,
        });
      }

      await loadAdminData();

      return {
        importedCount,
        failures,
      };
    },
    [loadAdminData, user]
  );

  const handleClearDeviceCache = useCallback(async () => {
    await clearCurrentUserDeviceDataCache(user?.id);
    toast.success("Device data cache cleared.");
    await loadAdminData();
  }, [loadAdminData, user?.id]);

  const handleClearDeviceNamespace = useCallback(
    async (namespace: DeviceCacheNamespace) => {
      await clearDeviceCache(namespace);
      toast.success(`${namespace} device cache cleared.`);
      await loadAdminData();
    },
    [loadAdminData]
  );

  const handleClearRuntimeBundle = useCallback(async () => {
    await clearRuntimeCachesFromDevice();
    await clearRuntimeLocalState();
    await refreshOfflineWorkerRegistration().catch(() => undefined);
    toast.success("Offline bundle cache cleared.");
    await loadAdminData();
  }, [loadAdminData]);

  const handlePersistDeviceStorage = useCallback(async () => {
    const persisted = await requestPersistentDeviceStorage();

    if (persisted) {
      toast.success("Persistent storage enabled for offline cache.");
    } else {
      toast("This browser did not grant persistent storage.");
    }

    await loadAdminData();
  }, [loadAdminData]);

  const handleWarmDeviceCache = useCallback(async () => {
    const warmed = await warmCoreOfflineData(user?.id);
    await refreshOfflineWorkerRegistration().catch(() => undefined);
    toast.success(
      `Offline cache refreshed: ${warmed.discussionFeeds} discussion feeds, ${warmed.communityFeeds} community feeds.`
    );
    await loadAdminData();
  }, [loadAdminData, user?.id]);

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-app px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-app-border bg-app-card p-10 text-center">
          <ShieldOff className="mx-auto h-12 w-12 text-rose-500" />
          <p className="mt-5 font-display text-3xl font-semibold">Admin access required</p>
          <p className="mt-3 text-sm leading-7 text-app-muted">
            This area is reserved for Student Society admins. Sign in with an authorized account to continue.
          </p>
        </div>
      </div>
    );
  }

  const activePaginatedTab = paginatedAdminTabs.includes(activeTab as PaginatedAdminTabId)
    ? (activeTab as PaginatedAdminTabId)
    : null;
  const activePage = activePaginatedTab ? pageByTab[activePaginatedTab] : 1;
  const activePageTotalCount = null;
  const activePageItemCount = activePaginatedTab
    ? ({
        users: users.length,
        posts: posts.length,
        comments: comments.length,
        communities: communities.length,
        media: mediaAssets.length,
        tools: bugFixQuestions.length,
      } satisfies Record<PaginatedAdminTabId, number>)[activePaginatedTab]
    : 0;
  const activePageCanGoNext = activePaginatedTab
    ? activePageTotalCount === null
      ? activePageItemCount === ADMIN_PAGE_SIZE
      : activePage * ADMIN_PAGE_SIZE < activePageTotalCount
    : false;
  const filteredCoinFeatureSettings = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return coinFeatureSettings;
    }

    return coinFeatureSettings.filter((item) =>
      [item.feature_key, item.feature_name, item.description, item.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [coinFeatureSettings, deferredSearch]);

  const tabCounts: Partial<Record<AdminTabId, number | null>> = {};
  const activeTabMeta = getAdminTabDefinition(activeTab);

  const activePanel = (() => {
    switch (activeTab) {
      case "overview":
        return <AdminOverviewSection stats={stats} onOpenTab={setActiveTab} />;

      case "users":
        return (
          <UserModerationSection
            loading={loading}
            users={users}
            walletBalances={walletBalanceByUserId}
            verificationRequestsByUserId={verificationRequestsByUserId}
            onToggleVerification={async (entry) => {
              const { error } = await supabase
                .from("profiles")
                .update({ is_verified: !entry.is_verified })
                .eq("id", entry.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: entry.is_verified ? "unverify_user" : "verify_user",
                targetUserId: entry.id,
              });
              await clearCacheNamespaces(["search", "discussions", "community-feed", "notifications"]);
              toast.success("Verification updated.");
              await loadAdminData();
            }}
            onReviewVerificationRequest={async (entry, request, input) => {
              await reviewVerificationRequest({
                requestId: request.id,
                nextStatus: input.nextStatus,
                reviewNote: input.reviewNote,
              });
              await logModerationAction({
                adminId: user.id,
                actionType:
                  input.nextStatus === "approved"
                    ? "approve_verification_request"
                    : "reject_verification_request",
                targetUserId: entry.id,
                actionNote: input.reviewNote || request.id,
              });
              await clearCacheNamespaces(["search", "discussions", "community-feed", "notifications"]);
              toast.success(
                input.nextStatus === "approved"
                  ? "Blue tick request approved."
                  : "Blue tick request rejected."
              );
              await loadAdminData();
            }}
            onTogglePosting={async (entry) => {
              const { error } = await supabase
                .from("profiles")
                .update({ can_post: !entry.can_post })
                .eq("id", entry.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: entry.can_post ? "restrict_posting" : "restore_posting",
                targetUserId: entry.id,
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search"]);
              toast.success("Posting permission updated.");
              await loadAdminData();
            }}
            onToggleBan={async (entry) => {
              const { error } = await supabase
                .from("profiles")
                .update({ is_banned: !entry.is_banned, can_post: entry.is_banned })
                .eq("id", entry.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: entry.is_banned ? "unban_user" : "ban_user",
                targetUserId: entry.id,
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search", "notifications"]);
              toast.success("Ban status updated.");
              await loadAdminData();
            }}
            onSaveControls={async (entry, updates) => {
              const { error } = await supabase.from("profiles").update(updates).eq("id", entry.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: "update_user_controls",
                targetUserId: entry.id,
                actionNote: updates.moderation_note || updates.posting_restricted_until || "controls updated",
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search"]);
              toast.success("User controls updated.");
              await loadAdminData();
            }}
            onAdjustCoins={async (entry, input) => {
              await adminAdjustUserCoins({
                userId: entry.id,
                amountDelta: input.amountDelta,
                note: input.note,
                metadata: {
                  source: "admin_panel",
                  username: entry.username,
                },
              });
              await logModerationAction({
                adminId: user.id,
                actionType: input.amountDelta > 0 ? "credit_user_coins" : "debit_user_coins",
                targetUserId: entry.id,
                actionNote: `${input.amountDelta} coins${input.note ? `: ${input.note}` : ""}`,
              });
              toast.success(input.amountDelta > 0 ? "Coins credited." : "Coins debited.");
              await loadAdminData();
            }}
          />
        );

      case "posts":
        return (
          <ContentModerationSection
            posts={posts}
            ageFilter={postAgeFilter}
            onAgeFilterChange={setPostAgeFilter}
            cleanupPreset={cleanupPreset}
            onCleanupPresetChange={setCleanupPreset}
            cleanupCustomDays={cleanupCustomDays}
            onCleanupCustomDaysChange={setCleanupCustomDays}
            cleanupMatchingCount={cleanupMatchingCount}
            cleanupCounting={cleanupCounting}
            cleanupDeleting={cleanupDeleting}
            onDeleteOlderPosts={async () => {
              const cleanupDays = resolveCleanupDays(cleanupPreset, cleanupCustomDays);

              if (!cleanupDays) {
                toast.error("Enter a valid custom day count.");
                return;
              }

              const confirmed = window.confirm(
                `Delete all posts older than ${cleanupDays} days? This also removes related comments, replies, likes, shares, poll votes, notifications, and managed post media.`
              );

              if (!confirmed) {
                return;
              }

              setCleanupDeleting(true);

              try {
                const deletedCount = await deletePostsOlderThan(cleanupDays);
                await logModerationAction({
                  adminId: user.id,
                  actionType: "bulk_delete_posts",
                  actionNote: `older_than_days:${cleanupDays};deleted:${deletedCount}`,
                });
                await clearCacheNamespaces(["discussions", "community-feed", "search", "notifications"]);
                toast.success(
                  deletedCount === 0
                    ? "No posts matched this cleanup window."
                    : `Deleted ${deletedCount} old post${deletedCount === 1 ? "" : "s"}.`
                );
                await loadAdminData();
              } finally {
                setCleanupDeleting(false);
              }
            }}
            onToggleVisibility={async (entry) => {
              const { error } = await supabase
                .from("posts")
                .update({
                  moderation_state:
                    entry.moderation_state === "hidden" ? "published" : "hidden",
                })
                .eq("id", entry.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: entry.moderation_state === "hidden" ? "restore_post" : "hide_post",
                targetPostId: entry.id,
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search", "notifications"]);
              toast.success("Post moderation state updated.");
              await loadAdminData();
            }}
            onDeletePost={async (entry) => {
              await deletePost(entry.id);
              await logModerationAction({
                adminId: user.id,
                actionType: "delete_post",
                targetPostId: entry.id,
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search", "notifications"]);
              toast.success("Post deleted.");
              await loadAdminData();
            }}
            onToggleAuthorVerification={async (author) => {
              const { error } = await supabase
                .from("profiles")
                .update({ is_verified: !author.is_verified })
                .eq("id", author.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: author.is_verified ? "unverify_user" : "verify_user",
                targetUserId: author.id,
              });
              await clearCacheNamespaces(["search", "discussions", "community-feed", "notifications"]);
              toast.success("Author verification updated.");
              await loadAdminData();
            }}
            onToggleAuthorPosting={async (author) => {
              const { error } = await supabase
                .from("profiles")
                .update({ can_post: !author.can_post })
                .eq("id", author.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: author.can_post ? "restrict_posting" : "restore_posting",
                targetUserId: author.id,
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search"]);
              toast.success("Author posting access updated.");
              await loadAdminData();
            }}
            onToggleAuthorBan={async (author) => {
              const { error } = await supabase
                .from("profiles")
                .update({ is_banned: !author.is_banned, can_post: author.is_banned })
                .eq("id", author.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: author.is_banned ? "unban_user" : "ban_user",
                targetUserId: author.id,
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search", "notifications"]);
              toast.success("Author ban state updated.");
              await loadAdminData();
            }}
          />
        );

      case "comments":
        return (
          <CommentModerationSection
            loading={loading}
            comments={comments}
            onDeleteComment={async (entry) => {
              const { error } = await supabase.from("comments").delete().eq("id", entry.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: "delete_comment",
                targetPostId: entry.post_id,
                targetCommentId: entry.id,
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search", "notifications"]);
              toast.success("Comment deleted.");
              await loadAdminData();
            }}
            onToggleAuthorVerification={async (author) => {
              const { error } = await supabase
                .from("profiles")
                .update({ is_verified: !author.is_verified })
                .eq("id", author.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: author.is_verified ? "unverify_user" : "verify_user",
                targetUserId: author.id,
              });
              await clearCacheNamespaces(["search", "discussions", "community-feed", "notifications"]);
              toast.success("Author verification updated.");
              await loadAdminData();
            }}
            onToggleAuthorPosting={async (author) => {
              const { error } = await supabase
                .from("profiles")
                .update({ can_post: !author.can_post })
                .eq("id", author.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: author.can_post ? "restrict_posting" : "restore_posting",
                targetUserId: author.id,
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search"]);
              toast.success("Author posting access updated.");
              await loadAdminData();
            }}
            onToggleAuthorBan={async (author) => {
              const { error } = await supabase
                .from("profiles")
                .update({ is_banned: !author.is_banned, can_post: author.is_banned })
                .eq("id", author.id);
              if (error) {
                throw error;
              }
              await logModerationAction({
                adminId: user.id,
                actionType: author.is_banned ? "unban_user" : "ban_user",
                targetUserId: author.id,
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search", "notifications"]);
              toast.success("Author ban state updated.");
              await loadAdminData();
            }}
          />
        );

      case "trust":
        return (
          <AdminTrustAndReportsSection
            loading={loading}
            searchTerm={deferredSearch}
            deletionRequests={accountDeletionRequests}
            postReports={postReports}
            onReviewDeletionRequest={async (request, input) => {
              await reviewAccountDeletionRequest({
                requestId: request.id,
                adminUserId: user.id,
                nextStatus: input.nextStatus,
                reviewNote: input.reviewNote,
              });
              await logModerationAction({
                adminId: user.id,
                actionType: `account_deletion_request_${input.nextStatus}`,
                targetUserId: request.user_id,
                actionNote: input.reviewNote || request.id,
              });
              toast.success(`Profile deletion request ${input.nextStatus}.`);
              await loadAdminData();
            }}
            onResolveReportedPost={async (postId, input) => {
              await reviewPostReportsForPost({
                postId,
                adminUserId: user.id,
                nextStatus: input.nextStatus,
                adminNote: input.adminNote,
              });
              await logModerationAction({
                adminId: user.id,
                actionType:
                  input.nextStatus === "actioned"
                    ? "action_reported_post"
                    : "dismiss_reported_post",
                targetPostId: postId,
                actionNote: input.adminNote || null,
              });
              toast.success(`Reported content marked ${getPostReportStatusLabel(input.nextStatus).toLowerCase()}.`);
              await loadAdminData();
            }}
            onToggleReportedPostVisibility={async (postId) => {
              const reportedPost = postReports.find((entry) => entry.post_id === postId)?.post;

              if (!reportedPost) {
                throw new Error("This reported post is no longer available.");
              }

              const nextModerationState =
                reportedPost.moderation_state === "hidden" ? "published" : "hidden";
              const { error } = await supabase
                .from("posts")
                .update({ moderation_state: nextModerationState })
                .eq("id", postId);

              if (error) {
                throw error;
              }

              if (nextModerationState === "hidden") {
                await reviewPostReportsForPost({
                  postId,
                  adminUserId: user.id,
                  nextStatus: "actioned",
                  adminNote: "Post hidden from the reported-content queue.",
                });
              }

              await logModerationAction({
                adminId: user.id,
                actionType: nextModerationState === "hidden" ? "hide_post" : "restore_post",
                targetPostId: postId,
                actionNote: "Updated from reported-content queue",
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search", "notifications"]);
              toast.success(nextModerationState === "hidden" ? "Reported post hidden." : "Reported post republished.");
              await loadAdminData();
            }}
            onDeleteReportedPost={async (postId) => {
              await deletePost(postId);
              await logModerationAction({
                adminId: user.id,
                actionType: "delete_post",
                targetPostId: postId,
                actionNote: "Deleted from reported-content queue",
              });
              await clearCacheNamespaces(["discussions", "community-feed", "search", "notifications"]);
              toast.success("Reported post deleted.");
              await loadAdminData();
            }}
          />
        );

      case "communities":
        return (
          <CommunityManagementSection
            communities={communities}
            newCommunityName={newCommunityName}
            newCommunityDescription={newCommunityDescription}
            newCommunityColor={newCommunityColor}
            postingModes={postingModes}
            onNameChange={setNewCommunityName}
            onDescriptionChange={setNewCommunityDescription}
            onColorChange={setNewCommunityColor}
            onPostingModesChange={setPostingModes}
            onCreateCommunity={async () => {
              if (!newCommunityName.trim() || postingModes.length === 0) {
                toast.error("Add a community name and at least one posting mode.");
                return;
              }

              await createCommunity({
                name: newCommunityName,
                slug: slugify(newCommunityName),
                description: newCommunityDescription,
                heroColor: newCommunityColor,
                postingModes,
                joinPolicy: "open",
                requiresPassword: false,
                feedVisibility: "community_only",
              });
              await logModerationAction({
                adminId: user.id,
                actionType: "create_community",
                actionNote: slugify(newCommunityName),
              });
              setNewCommunityName("");
              setNewCommunityDescription("");
              setPostingModes(["study", "job", "anonymous"]);
              await clearCacheNamespaces(["communities", "community-feed", "discussions", "search"]);
              toast.success("Community created.");
              await loadAdminData();
            }}
            onToggleVisibility={async (entry) => {
              await toggleCommunityVisibility(entry.id, !entry.is_visible);
              await logModerationAction({
                adminId: user.id,
                actionType: entry.is_visible ? "hide_community" : "show_community",
                targetCommunityId: entry.id,
              });
              await clearCacheNamespaces(["communities", "community-feed", "discussions"]);
              toast.success("Community visibility updated.");
              await loadAdminData();
            }}
          />
        );

      case "media":
        return (
          <MediaManagementSection
            items={mediaAssets}
            bucketName={bucketName}
            bucketObjects={bucketObjects}
            bucketLoading={bucketLoading}
            bucketLoadError={bucketLoadError}
            loadError={mediaLoadError}
            deletingMediaId={deletingMediaId}
            onRefreshBucket={loadBucketObjects}
            onDeleteMedia={async (item) => {
              const confirmed = window.confirm(
                `Delete ${item.original_name}? Any post or profile using this file will be updated to remove the media reference.`
              );

              if (!confirmed) {
                return;
              }

              setDeletingMediaId(item.id);

              try {
                await deleteManagedMediaAsset({
                  storagePath: item.storage_path,
                  publicUrl: item.public_url,
                });
                await logModerationAction({
                  adminId: user.id,
                  actionType: "delete_media",
                  actionNote: item.original_name,
                  targetUserId: item.owner_id,
                  targetPostId: item.attached_post_id,
                });
                await clearCacheNamespaces(["discussions", "community-feed", "search"]);
                toast.success("Media deleted.");
                await Promise.all([loadAdminData(), loadBucketObjects()]);
              } finally {
                setDeletingMediaId((current) => (current === item.id ? null : current));
              }
            }}
          />
        );

      case "tools":
        return (
          <BugFixManagementSection
            loading={loading}
            items={bugFixQuestions}
            loadError={bugFixLoadError}
            onRefresh={loadAdminData}
            onSaveQuestion={async (input) => {
              const saved = await saveBugFixQuestion(input);
              await logModerationAction({
                adminId: user.id,
                actionType: input.id ? "update_bugfix_question" : "create_bugfix_question",
                actionNote: `${saved.title} (${saved.language}/${saved.difficulty}/${saved.status})`,
              });
              toast.success(input.id ? "BugFix question updated." : "BugFix question created.");
              await loadAdminData();
              return saved;
            }}
            onDeleteQuestion={async (question) => {
              await deleteBugFixQuestion(question.id);
              await logModerationAction({
                adminId: user.id,
                actionType: "delete_bugfix_question",
                actionNote: question.title,
              });
              toast.success("BugFix question deleted.");
              await loadAdminData();
            }}
            onImportQuestions={importBugFixQuestions}
          />
        );

      case "bulkMailer":
        return <BulkMailerAdminSection searchTerm={deferredSearch} />;

      case "emailServices":
        return <EmailServicesAdminSection searchTerm={deferredSearch} />;

      case "platform":
        return (
          <div className="space-y-3">
            <section className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]">
              <AdminPillTabs
                tabs={[
                  {
                    id: "general",
                    label: "General rules",
                    description: "Limits, bonuses, notifications",
                    icon: Settings2,
                    activeClassName: "bg-gradient-to-r from-sky-500 to-cyan-500",
                  },
                  {
                    id: "coins",
                    label: "Coin pricing",
                    description: "Feature costs and passes",
                    icon: Coins,
                    activeClassName: "bg-gradient-to-r from-indigo-500 to-blue-500",
                  },
                  {
                    id: "walletRecharge",
                    label: "Wallet recharge",
                    description: "UPI QR, approvals, and requests",
                    icon: Wallet2,
                    activeClassName: "bg-gradient-to-r from-emerald-500 to-teal-500",
                  },
                  {
                    id: "aiRouting",
                    label: "AI routing",
                    description: "Provider keys, model routes, and AI Teacher pricing",
                    icon: Coins,
                    activeClassName: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
                  },
                ]}
                activeId={platformPanelView}
                onChange={(value) =>
                  setPlatformPanelView(value as "general" | "coins" | "walletRecharge" | "aiRouting")
                }
                size="lg"
              />
            </section>

            {platformPanelView === "general" ? (
              <PlatformSettingsSection
                settings={platformSettings}
                appVersion={APP_VERSION}
                onSettingsChange={(updates) =>
                  setPlatformSettings((current) => ({ ...current, ...updates }))
                }
                onSave={async () => {
                  await updatePlatformSettings({
                    max_images_per_post: platformSettings.max_images_per_post,
                    max_pdf_size_mb: platformSettings.max_pdf_size_mb,
                    max_resumes_per_user: platformSettings.max_resumes_per_user,
                    max_portfolios_per_user: platformSettings.max_portfolios_per_user,
                    signup_bonus_coins: platformSettings.signup_bonus_coins,
                    referral_reward_coins: platformSettings.referral_reward_coins,
                    enable_profile_view_notifications: platformSettings.enable_profile_view_notifications,
                    ai_mention_reply_profile_id: platformSettings.ai_mention_reply_profile_id,
                    ai_mention_reply_max_tokens: platformSettings.ai_mention_reply_max_tokens,
                  });
                  await logModerationAction({
                    adminId: user.id,
                    actionType: "update_platform_settings",
                    actionNote: `images:${platformSettings.max_images_per_post}, pdf:${platformSettings.max_pdf_size_mb}, resumes:${platformSettings.max_resumes_per_user}, portfolios:${platformSettings.max_portfolios_per_user}, signup_bonus:${platformSettings.signup_bonus_coins}, referral_reward:${platformSettings.referral_reward_coins}, ai_bot:${platformSettings.ai_mention_reply_profile_id || "none"}, ai_max_tokens:${platformSettings.ai_mention_reply_max_tokens}`,
                  });
                  await clearCacheNamespaces(["notifications"]);
                  toast.success("Platform settings saved.");
                  await loadAdminData();
                }}
              />
            ) : platformPanelView === "coins" ? (
              <CoinEconomySection
                items={filteredCoinFeatureSettings}
                onSave={async (items) => {
                  await saveCoinFeatureSettings(items);
                  await logModerationAction({
                    adminId: user.id,
                    actionType: "update_coin_feature_settings",
                    actionNote: `features:${items.length}`,
                  });
                  await useCoinWalletStore.getState().refreshFeatureSettings().catch(() => undefined);
                  toast.success("Coin pricing saved.");
                  await loadAdminData();
                }}
              />
            ) : platformPanelView === "aiRouting" ? (
              <AiTeacherRoutingAdminSection
                searchTerm={deferredSearch}
                coinSettings={coinFeatureSettings}
                onSaveCoinSettings={async (items) => {
                  await saveCoinFeatureSettings(items);
                  await logModerationAction({
                    adminId: user.id,
                    actionType: "update_ai_teacher_coin_pricing",
                    actionNote: `features:${items.length}`,
                  });
                  await useCoinWalletStore.getState().refreshFeatureSettings().catch(() => undefined);
                  await loadAdminData();
                }}
              />
            ) : (
              <WalletRechargeAdminSection searchTerm={deferredSearch} />
            )}
          </div>
        );

      case "cache":
        return (
          <CacheManagementSection
            cacheConfigured={isBackendCacheConfigured()}
            cacheEntries={cacheEntries}
            deviceCacheSummary={deviceCacheSummary}
            runtimeCacheSummary={runtimeCacheSummary}
            onClearCache={async () => {
              const session = await supabase.auth.getSession();
              const accessToken = session.data.session?.access_token;

              if (!accessToken) {
                toast.error("No active admin session found.");
                return;
              }

              const cleared = await clearBackendCache(accessToken);
              if (cleared) {
                toast.success("Cache cleared.");
                await loadAdminData();
              } else {
                toast.error("Cache clear failed.");
              }
            }}
            onClearNamespace={async (namespace) => {
              const session = await supabase.auth.getSession();
              const accessToken = session.data.session?.access_token;

              if (!accessToken) {
                toast.error("No active admin session found.");
                return;
              }

              const cleared = await clearBackendCache(accessToken, namespace);
              if (cleared) {
                toast.success(`${namespace} cache cleared.`);
                await loadAdminData();
              } else {
                toast.error("Namespace clear failed.");
              }
            }}
            onClearDeviceCache={handleClearDeviceCache}
            onClearDeviceNamespace={handleClearDeviceNamespace}
            onClearRuntimeCache={handleClearRuntimeBundle}
            onWarmDeviceCache={handleWarmDeviceCache}
            onPersistDeviceStorage={handlePersistDeviceStorage}
            onRefresh={loadAdminData}
          />
        );

      default:
        return <AdminOverviewSection stats={stats} onOpenTab={setActiveTab} />;
    }
  })();

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#eef4ff_0%,#f8fafc_42%,#f8fafc_100%)] px-2 py-2.5 sm:px-3 lg:px-4 xl:h-[100dvh] xl:overflow-hidden xl:px-5">
      <div className="mx-auto w-full max-w-[1600px] rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_28px_58px_-48px_rgba(15,23,42,0.28)] sm:p-2.5 xl:flex xl:h-full xl:flex-col xl:overflow-hidden">
        <div className="w-full space-y-2.5 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
          <div className="shrink-0">
            <AdminHeader search={search} onSearchChange={setSearch} onSignOut={signOut} />
          </div>
          {adminLoadWarning ? (
            <section className="shrink-0 rounded-[14px] border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700">
              {adminLoadWarning}
            </section>
          ) : null}
          <div className="grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[280px_minmax(0,1fr)] xl:overflow-hidden xl:items-stretch">
            <AdminTabsSidebar activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

            <div className="min-w-0 space-y-3 rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#f7faff_18%,#ffffff_52%)] p-2.5 xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden">
              <section className="xl:shrink-0">
                <div className="rounded-[16px] border border-slate-200 bg-white p-2.5 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.18)]">
                  <label className="relative block min-w-0">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="admin-search-input h-9.5"
                      placeholder={`Search ${activeTabMeta.label.toLowerCase()}`}
                    />
                  </label>
                </div>
              </section>

              <div className="min-w-0 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
                <div className="space-y-3">
                  <div className="min-w-0">{activePanel}</div>

                  {activePaginatedTab ? (
                    <AdminPagination
                      page={activePage}
                      pageSize={ADMIN_PAGE_SIZE}
                      totalCount={activePageTotalCount}
                      canGoNext={activePageCanGoNext}
                      onPageChange={(page) =>
                        setPageByTab((current) => ({
                          ...current,
                          [activePaginatedTab]: Math.max(1, page),
                        }))
                      }
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
