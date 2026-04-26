import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import {
  COIN_ACCESS_KEYS,
  COIN_FEATURE_KEYS,
  findCoinFeatureSetting,
  formatCoinAmount,
  getActiveCoinAccess,
  purchaseFeatureAccess,
} from "../../lib/coins";
import {
  completeInstagramConnection,
  deleteInstagramCommentDmRule,
  deleteInstagramCommentRule,
  deleteInstagramDmRule,
  disconnectInstagramAccount,
  getInstagramConnectUrl,
  loadInstagramAutomationDashboard,
  saveInstagramCommentDmRule,
  saveInstagramCommentRule,
  saveInstagramDmRule,
  setInstagramAutomationEnabled,
} from "./api";
import { useAuthStore } from "../../store/authStore";
import { useCoinWalletStore } from "../../store/coinWalletStore";
import type {
  InstagramAutomationTab,
  InstagramCommentDmRuleDraft,
  InstagramCommentRuleDraft,
  InstagramDashboardData,
  InstagramDmRuleDraft,
} from "./types";
import { InstagramAnalyticsPanel } from "./components/InstagramAnalyticsPanel";
import { InstagramCommentDmRulesPanel } from "./components/InstagramCommentDmRulesPanel";
import { InstagramCommentRulesPanel } from "./components/InstagramCommentRulesPanel";
import { InstagramConnectionPanel } from "./components/InstagramConnectionPanel";
import { InstagramDmRulesPanel } from "./components/InstagramDmRulesPanel";
import { InstagramLogsPanel } from "./components/InstagramLogsPanel";
import { InstagramSidebar } from "./components/InstagramSidebar";

const emptyDashboard: InstagramDashboardData = {
  account: null,
  comment_rules: [],
  dm_rules: [],
  comment_dm_rules: [],
  logs: [],
  analytics: {
    total_actions: 0,
    successful_actions: 0,
    failed_actions: 0,
    skipped_actions: 0,
    partial_actions: 0,
    comment_replies: 0,
    dm_replies: 0,
    comment_to_dm: 0,
    success_rate: 0,
    daily_actions: [],
  },
  media: [],
  recent_comments: [],
  media_error: null,
};

function formatInstagramAccessExpiry(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function InstagramAutomationTool() {
  const { user } = useAuthStore();
  const wallet = useCoinWalletStore((state) => state.wallet);
  const featureSettings = useCoinWalletStore((state) => state.featureSettings);
  const activeAccess = useCoinWalletStore((state) => state.activeAccess);
  const walletLoading = useCoinWalletStore((state) => state.loading);
  const refreshWallet = useCoinWalletStore((state) => state.refreshWallet);
  const refreshAccess = useCoinWalletStore((state) => state.refreshAccess);
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<InstagramAutomationTab>("overview");
  const [dashboard, setDashboard] = useState<InstagramDashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [accountBusy, setAccountBusy] = useState<"connect" | "disconnect" | "toggle" | null>(null);
  const [savingKind, setSavingKind] = useState<"comment" | "dm" | "comment-dm" | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [refreshingMedia, setRefreshingMedia] = useState(false);
  const [purchasingFeatureKey, setPurchasingFeatureKey] = useState<string | null>(null);
  const [optimisticAccessExpiry, setOptimisticAccessExpiry] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const oauthCode = searchParams.get("code");
  const oauthState = searchParams.get("state");
  const hasOauthCallback = Boolean(oauthCode && oauthState);
  const activePass = useMemo(
    () => getActiveCoinAccess(activeAccess, COIN_ACCESS_KEYS.instagramAutomation),
    [activeAccess]
  );
  const effectiveAccessExpiry = activePass?.expires_at || optimisticAccessExpiry;
  const hasInstagramAccess = Boolean(
    effectiveAccessExpiry && new Date(effectiveAccessExpiry).getTime() > Date.now()
  );
  const instagramPassPlans = useMemo(
    () =>
      [
        { featureKey: COIN_FEATURE_KEYS.instagramAutomationDayPass, fallbackName: "1 day access" },
        { featureKey: COIN_FEATURE_KEYS.instagramAutomationWeekPass, fallbackName: "7 day access" },
        { featureKey: COIN_FEATURE_KEYS.instagramAutomationMonthPass, fallbackName: "30 day access" },
        { featureKey: COIN_FEATURE_KEYS.instagramAutomationYearPass, fallbackName: "365 day access" },
      ].map((plan) => {
        const setting = findCoinFeatureSetting(featureSettings, plan.featureKey);
        const coinsRequired = Math.max(0, setting?.coins_required || 0);

        return {
          ...plan,
          setting,
          coinsRequired,
          title: setting?.feature_name || plan.fallbackName,
          description:
            setting?.description ||
            "Unlock Instagram account connection, rule management, media sync, and live automations until expiry.",
          enabled: Boolean(setting?.is_enabled),
          costLabel: coinsRequired > 0 ? formatCoinAmount(coinsRequired) : "Free",
        };
      }),
    [featureSettings]
  );

  useEffect(() => {
    if (activePass?.expires_at) {
      setOptimisticAccessExpiry(null);
    }
  }, [activePass?.expires_at]);

  async function hydrateMediaCatalog(cancelled: () => boolean) {
    setRefreshingMedia(true);
    try {
      const nextDashboard = await loadInstagramAutomationDashboard(true);
      if (!cancelled()) {
        setDashboard(nextDashboard);
      }
    } catch (error) {
      if (!cancelled()) {
        setDashboard((current) => ({
          ...current,
          media_error: error instanceof Error ? error.message : "Could not refresh media catalog.",
        }));
      }
    } finally {
      if (!cancelled()) {
        setRefreshingMedia(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    if (!user) {
      setDashboard(emptyDashboard);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!hasInstagramAccess) {
      setDashboard(emptyDashboard);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (hasOauthCallback) {
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    void (async () => {
      try {
        const nextDashboard = await loadInstagramAutomationDashboard(false);
        if (!cancelled) {
          setDashboard(nextDashboard);
        }

        if (!cancelled && nextDashboard.account) {
          void hydrateMediaCatalog(isCancelled);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load Instagram Automation.");
          setDashboard(emptyDashboard);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasInstagramAccess, hasOauthCallback, user]);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    if (!user || !oauthCode || !oauthState || !hasInstagramAccess) {
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setAccountBusy("connect");

    void (async () => {
      try {
        await completeInstagramConnection({ code: oauthCode, state: oauthState });
        toast.success("Instagram account connected.");
        const nextDashboard = await loadInstagramAutomationDashboard(false);
        if (!cancelled) {
          setDashboard(nextDashboard);
        }
        if (!cancelled && nextDashboard.account) {
          void hydrateMediaCatalog(isCancelled);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Instagram connection failed.");
        }
      } finally {
        if (!cancelled) {
          setAccountBusy(null);
          setLoading(false);
          navigate(location.pathname, { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasInstagramAccess, location.pathname, navigate, oauthCode, oauthState, user]);

  async function refreshDashboard(includeMedia: boolean) {
    const nextDashboard = await loadInstagramAutomationDashboard(includeMedia);
    setDashboard((current) => {
      if (!includeMedia && current.account && nextDashboard.account) {
        return {
          ...nextDashboard,
          media: current.media,
          media_error: current.media_error,
        };
      }

      return nextDashboard;
    });
  }

  async function handleConnect() {
    try {
      setAccountBusy("connect");
      const { auth_url } = await getInstagramConnectUrl();
      window.location.href = auth_url;
    } catch (error) {
      setAccountBusy(null);
      toast.error(error instanceof Error ? error.message : "Could not start Instagram OAuth.");
      throw error;
    }
  }

  async function handleDisconnect() {
    try {
      setAccountBusy("disconnect");
      await disconnectInstagramAccount();
      await refreshDashboard(false);
      toast.success("Instagram account disconnected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect Instagram.");
      throw error;
    } finally {
      setAccountBusy(null);
    }
  }

  async function handleToggleAutomation(enabled: boolean) {
    try {
      setAccountBusy("toggle");
      await setInstagramAutomationEnabled(enabled);
      await refreshDashboard(false);
      toast.success(enabled ? "Automations enabled." : "Automations paused.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update automation status.");
      throw error;
    } finally {
      setAccountBusy(null);
    }
  }

  async function handleRefreshMedia() {
    try {
      setRefreshingMedia(true);
      await refreshDashboard(true);
      toast.success("Media catalog refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh media.");
    } finally {
      setRefreshingMedia(false);
    }
  }

  async function handlePurchasePass(featureKey: string) {
    try {
      setPurchasingFeatureKey(featureKey);
      const result = await purchaseFeatureAccess(featureKey);
      if (result?.expires_at) {
        setOptimisticAccessExpiry(result.expires_at);
      }
      await Promise.allSettled([refreshWallet(), refreshAccess()]);
      toast.success(
        result?.expires_at
          ? `Instagram Automation unlocked until ${formatInstagramAccessExpiry(result.expires_at)}.`
          : "Instagram Automation unlocked."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not activate the Instagram pass.");
    } finally {
      setPurchasingFeatureKey(null);
    }
  }

  async function handleSaveCommentRule(draft: InstagramCommentRuleDraft) {
    try {
      setSavingKind("comment");
      await saveInstagramCommentRule(draft);
      await refreshDashboard(false);
      toast.success(draft.id ? "Comment reply rule updated." : "Comment reply rule created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save comment rule.");
      throw error;
    } finally {
      setSavingKind(null);
    }
  }

  async function handleDeleteCommentRule(ruleId: string) {
    try {
      setDeletingRuleId(ruleId);
      await deleteInstagramCommentRule(ruleId);
      await refreshDashboard(false);
      toast.success("Comment reply rule deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete comment rule.");
      throw error;
    } finally {
      setDeletingRuleId(null);
    }
  }

  async function handleSaveDmRule(draft: InstagramDmRuleDraft) {
    try {
      setSavingKind("dm");
      await saveInstagramDmRule(draft);
      await refreshDashboard(false);
      toast.success(draft.id ? "DM rule updated." : "DM rule created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save DM rule.");
      throw error;
    } finally {
      setSavingKind(null);
    }
  }

  async function handleDeleteDmRule(ruleId: string) {
    try {
      setDeletingRuleId(ruleId);
      await deleteInstagramDmRule(ruleId);
      await refreshDashboard(false);
      toast.success("DM rule deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete DM rule.");
      throw error;
    } finally {
      setDeletingRuleId(null);
    }
  }

  async function handleSaveCommentDmRule(draft: InstagramCommentDmRuleDraft) {
    try {
      setSavingKind("comment-dm");
      await saveInstagramCommentDmRule(draft);
      await refreshDashboard(false);
      toast.success(draft.id ? "Comment to DM rule updated." : "Comment to DM rule created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save comment to DM rule.");
      throw error;
    } finally {
      setSavingKind(null);
    }
  }

  async function handleDeleteCommentDmRule(ruleId: string) {
    try {
      setDeletingRuleId(ruleId);
      await deleteInstagramCommentDmRule(ruleId);
      await refreshDashboard(false);
      toast.success("Comment to DM rule deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete comment to DM rule.");
      throw error;
    } finally {
      setDeletingRuleId(null);
    }
  }

  if (!user) {
    return (
      <section className="rounded-[28px] border border-app-border bg-app-card/90 p-6 text-center shadow-[0_28px_64px_-42px_rgba(15,23,42,0.38)] backdrop-blur sm:rounded-[30px] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300">Instagram Automation</p>
        <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-tight text-app-text sm:text-3xl">
          Sign in to configure business automations
        </h2>
        <p className="mt-3 text-sm leading-6 text-app-muted">
          Use your Student Society account first, then connect the Instagram Business profile through Meta OAuth.
        </p>
      </section>
    );
  }

  if (!hasInstagramAccess) {
    return (
      <div className="space-y-5">
        <section className="rounded-[28px] border border-app-border bg-app-card/90 p-5 shadow-[0_28px_64px_-42px_rgba(15,23,42,0.38)] backdrop-blur sm:rounded-[30px] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300">
                Instagram Automation
              </p>
              <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-tight text-app-text sm:text-3xl">
                Unlock automation access
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-app-muted">
                Choose a timed pass to connect your Instagram Business account, manage reply rules,
                sync media, and keep the automation engine active until the pass expires.
              </p>
            </div>

            <div className="w-full rounded-[24px] border border-app-border bg-app-secondary/70 px-4 py-3 text-sm text-app-text sm:max-w-[220px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">Wallet balance</p>
              <p className="mt-1 text-2xl font-semibold">
                {walletLoading && !wallet ? "Loading..." : `${wallet?.balance || 0} coins`}
              </p>
              <p className="mt-1 text-xs text-app-muted">
                Pick a pass, activate it once, and the Instagram tool opens right away.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {instagramPassPlans.map((plan) => {
            const insufficientBalance = plan.coinsRequired > 0 && (wallet?.balance || 0) < plan.coinsRequired;

            return (
              <article
                key={plan.featureKey}
                className="flex min-h-[320px] flex-col rounded-[28px] border border-app-border bg-app-card/90 p-5 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.42)] backdrop-blur"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fuchsia-600 dark:text-fuchsia-300">
                      Timed pass
                    </p>
                    <h3 className="mt-2 font-display text-xl font-semibold text-app-text">{plan.title}</h3>
                  </div>
                  <span className="inline-flex w-fit rounded-full border border-app-border bg-app-secondary px-3 py-1 text-xs font-semibold text-app-text">
                    {plan.costLabel}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-app-muted">{plan.description}</p>

                <div className="mt-4 rounded-[20px] border border-app-border bg-app-secondary/70 px-4 py-3 text-xs text-app-muted">
                  <p>Admin controls the duration and price for this plan.</p>
                  <p className="mt-1">If the price is set to 0, activation stays free.</p>
                </div>

                <div className="mt-auto pt-4">
                  {!plan.setting || !plan.enabled ? (
                    <div className="rounded-[18px] border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                      This pass is unavailable right now.
                    </div>
                  ) : insufficientBalance ? (
                    <div className="rounded-[18px] border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                      Not enough coins in your wallet for this plan.
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!plan.setting || !plan.enabled || insufficientBalance || purchasingFeatureKey === plan.featureKey}
                    onClick={() => void handlePurchasePass(plan.featureKey)}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-[18px] bg-gradient-to-r from-fuchsia-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_-20px_rgba(217,70,239,0.65)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
                  >
                    {purchasingFeatureKey === plan.featureKey
                      ? "Activating..."
                      : plan.coinsRequired > 0
                        ? `Activate for ${plan.costLabel}`
                        : "Activate for free"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <section className="rounded-[28px] border border-app-border bg-app-card/90 p-4 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.42)] backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="rounded-[16px] bg-app-secondary/80 p-3 text-fuchsia-600 dark:text-fuchsia-300">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300 sm:text-[11px]">
                Loading
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-app-text sm:text-2xl">Instagram Automation</h2>
              <p className="mt-2 text-sm text-app-muted">
                Account data loads first now. Media sync continues in the background once the screen is visible.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[26px] border border-app-border bg-app-card/90 p-4 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="h-3 w-20 animate-pulse rounded-full bg-fuchsia-500/20" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="rounded-[20px] border border-app-border/50 bg-app-secondary/90 p-3">
                  <div className="h-3 w-16 animate-pulse rounded-full bg-app-card/80" />
                  <div className="mt-3 h-9 animate-pulse rounded-[14px] bg-app-card/70" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-app-border bg-app-card/90 p-4">
              <div className="h-4 w-28 animate-pulse rounded-full bg-fuchsia-500/20" />
              <div className="mt-4 h-24 animate-pulse rounded-[22px] bg-app-secondary/90" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="rounded-[22px] border border-app-border bg-app-card/90 p-4">
                  <div className="h-3 w-16 animate-pulse rounded-full bg-fuchsia-500/20" />
                  <div className="mt-4 h-10 animate-pulse rounded-[16px] bg-app-secondary/90" />
                </div>
              ))}
            </div>
            <div className="rounded-[28px] border border-app-border bg-app-card/90 p-4">
              <div className="h-4 w-24 animate-pulse rounded-full bg-fuchsia-500/20" />
              <div className="mt-4 h-[220px] animate-pulse rounded-[24px] bg-app-secondary/90" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
      <div className="self-start lg:sticky lg:top-3">
        <InstagramSidebar activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="space-y-4">
        {effectiveAccessExpiry ? (
          <section className="rounded-[24px] border border-emerald-200/70 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/70 p-3.5 text-sm shadow-[0_18px_40px_-34px_rgba(16,185,129,0.35)] dark:border-emerald-500/20 dark:bg-emerald-500/10 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              Access active
            </p>
            <p className="mt-1 font-semibold leading-6 text-app-text">
              Instagram Automation stays unlocked through {formatInstagramAccessExpiry(effectiveAccessExpiry)}.
            </p>
          </section>
        ) : null}

        <InstagramConnectionPanel
          account={dashboard.account}
          busyMode={accountBusy}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onToggleAutomation={handleToggleAutomation}
        />

        {activeTab === "overview" ? (
          <InstagramAnalyticsPanel
            account={dashboard.account}
            analytics={dashboard.analytics}
            mediaCount={dashboard.media.length}
            recentComments={dashboard.recent_comments}
            mediaError={dashboard.media_error}
            refreshingMedia={refreshingMedia}
            onRefreshMedia={handleRefreshMedia}
          />
        ) : null}

        {activeTab === "comment-replies" ? (
          <InstagramCommentRulesPanel
            rules={dashboard.comment_rules}
            media={dashboard.media}
            busySaving={savingKind === "comment"}
            deletingRuleId={deletingRuleId}
            onSave={handleSaveCommentRule}
            onDelete={handleDeleteCommentRule}
          />
        ) : null}

        {activeTab === "dm-replies" ? (
          <InstagramDmRulesPanel
            rules={dashboard.dm_rules}
            busySaving={savingKind === "dm"}
            deletingRuleId={deletingRuleId}
            onSave={handleSaveDmRule}
            onDelete={handleDeleteDmRule}
          />
        ) : null}

        {activeTab === "comment-to-dm" ? (
          <InstagramCommentDmRulesPanel
            rules={dashboard.comment_dm_rules}
            media={dashboard.media}
            busySaving={savingKind === "comment-dm"}
            deletingRuleId={deletingRuleId}
            onSave={handleSaveCommentDmRule}
            onDelete={handleDeleteCommentDmRule}
          />
        ) : null}

        {activeTab === "activity" ? <InstagramLogsPanel logs={dashboard.logs} /> : null}
      </div>
    </div>
  );
}
