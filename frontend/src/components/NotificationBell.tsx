import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ExternalLink,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  deleteNotificationFromDevice,
  loadNotificationPushPreferences,
  loadNotifications,
  markNotificationsAsRead,
  updateNotificationPushPreferences,
} from "../lib/api";
import { buildAvatarSeed, resolveAvatarUrl } from "../lib/avatar";
import {
  getLatestPushToken,
  getNotificationPermissionStatus,
  getPlatform,
  isNativePlatform,
  requestNotificationPermission,
  showLocalNotification,
  type NotificationPermissionStatus,
} from "../lib/capacitorNotifications";
import {
  createDefaultNotificationPushPreferences,
  isNativePushEnabledForNotificationType,
  notificationPushPreferenceItems,
  type NotificationPushPreferenceField,
} from "../lib/notificationPushPreferences";
import { formatCompactCount, formatRelativeTime } from "../lib/formatting";
import { openNativeNotificationSettings } from "../lib/nativeNotificationSettings";
import { getPostCommentPath, getPostPath } from "../lib/postLinks";
import { cancelDeferredTask, scheduleDeferredTask } from "../lib/browserTasks";
import type {
  NotificationPushPreferencesRow,
  NotificationWithRelations,
} from "../types/database";
import { VerifiedBadge } from "./VerifiedBadge";

interface NotificationBellProps {
  userId: string;
}

type NotificationPanelView = "list" | "settings";
type NotificationFilterTab = "all" | "mentions" | "requests";

const emptyStateMessage =
  "Your follow, tag, like, comment, reply, profile-view, and chat notifications will show here.";

function hidesNotificationActor(notification: NotificationWithRelations) {
  return (
    (notification.type === "post_comment" || notification.type === "comment_reply") &&
    Boolean(notification.post?.is_anonymous || notification.post?.discussion_kind === "anonymous")
  );
}

function getNotificationActorLabel(notification: NotificationWithRelations) {
  if (hidesNotificationActor(notification)) {
    return "Someone";
  }

  if (notification.actor) {
    return notification.actor.full_name || notification.actor.username || "A student";
  }

  return (
    notification.type === "email_mailbox"
      ? "Student Email"
      : notification.type === "chat_message"
        ? "New message"
        : notification.type === "chat_request"
          ? "New chat request"
          : "Student Society"
  );
}

function getNotificationLink(notification: NotificationWithRelations) {
  if (notification.type === "chat_request" || notification.type === "chat_message") {
    return "/app/messages";
  }

  if (notification.type === "email_mailbox") {
    return "/app/emails";
  }

  if (notification.post) {
    if (notification.comment?.id) {
      return getPostCommentPath(notification.post.id, notification.comment.id);
    }

    return getPostPath({
      ...notification.post,
      community: notification.post.community || null,
    });
  }

  if (notification.actor?.username) {
    return `/profile/${notification.actor.username}`;
  }

  return "/profile";
}

function describePermissionStatus(status: NotificationPermissionStatus | null) {
  if (!status) {
    return "Checking device notification permission.";
  }

  if (status.canNotify) {
    return "Device notifications are allowed. These toggles control only native alerts, not the in-app notification list.";
  }

  if (status.push === "denied" || status.local === "denied") {
    return "Device notifications are blocked right now. You can allow them again below.";
  }

  return "Device notifications have not been allowed yet. Use the button below to enable them.";
}

function matchesNotificationFilter(
  notification: NotificationWithRelations,
  filter: NotificationFilterTab
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "mentions") {
    return (
      notification.type.includes("mention") ||
      notification.message.toLowerCase().includes("mentioned you")
    );
  }

  return (
    notification.type.includes("request") ||
    notification.type === "chat_request" ||
    notification.message.toLowerCase().includes("requested")
  );
}

function areNotificationsEquivalent(
  current: NotificationWithRelations[],
  next: NotificationWithRelations[]
) {
  if (current.length !== next.length) {
    return false;
  }

  return current.every((item, index) => {
    const nextItem = next[index];
    return (
      item.id === nextItem?.id &&
      item.is_read === nextItem.is_read &&
      item.type === nextItem.type &&
      item.message === nextItem.message &&
      item.created_at === nextItem.created_at &&
      item.actor?.id === nextItem.actor?.id &&
      item.post?.id === nextItem.post?.id &&
      item.comment?.id === nextItem.comment?.id
    );
  });
}

function NotificationListItem({
  compact,
  notification,
  onClose,
  onDelete,
}: {
  compact: boolean;
  notification: NotificationWithRelations;
  onClose: () => void;
  onDelete: (notificationId: string) => void;
}) {
  const actorHidden = hidesNotificationActor(notification);
  const actorLabel = getNotificationActorLabel(notification);
  const actorAvatarUrl = resolveAvatarUrl(
    actorHidden ? null : notification.actor?.avatar_url || null,
    actorHidden ? "anonymous-notification" : buildAvatarSeed(notification.actor),
    actorHidden ? null : notification.actor?.updated_at || null
  );

  return (
    <div
      className={`relative overflow-hidden rounded-[22px] border shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] transition ${
        notification.is_read
          ? "border-app-border bg-app-card"
          : "border-brand/20 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(239,246,255,0.9))]"
      }`}
    >
      <Link
        to={getNotificationLink(notification)}
        onClick={onClose}
        className={`block ${compact ? "px-4 py-4 pr-12" : "px-4 py-3 pr-14"}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex items-center justify-center overflow-hidden bg-app-card ${
              compact ? "h-10 w-10 rounded-full" : "h-10 w-10 rounded-2xl"
            }`}
          >
            <img
              src={actorAvatarUrl}
              alt={actorLabel}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={
                compact
                  ? "break-words text-[15px] leading-[1.55] text-app-text"
                  : "break-words text-sm text-app-text"
              }
            >
              <span
                className={`inline-flex max-w-full flex-wrap items-center ${
                  compact ? "gap-1" : "gap-1.5"
                } font-semibold`}
              >
                <span>{actorLabel}</span>
                {!actorHidden && notification.actor?.is_verified ? (
                  <VerifiedBadge className={compact ? "h-3.5 w-3.5" : undefined} />
                ) : null}
              </span>{" "}
              {notification.message}
            </p>
            {notification.post?.title ? (
              <p
                className={`mt-1 break-words ${
                  compact ? "line-clamp-2 text-xs leading-5" : "truncate text-sm"
                } text-app-muted`}
              >
                {notification.post.title}
              </p>
            ) : null}
            <p className={`mt-1 ${compact ? "text-[13px]" : "text-xs"} text-app-muted`}>
              {formatRelativeTime(notification.created_at)}
            </p>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => onDelete(notification.id)}
        className={`absolute right-3 top-3 inline-flex items-center justify-center rounded-full border text-app-muted transition hover:text-app-text ${
          compact
            ? "h-8 w-8 border-white/80 bg-white/90 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.5)]"
            : "h-9 w-9 border-app-border bg-app-card"
        }`}
        aria-label="Delete notification from this device"
        title="Delete from this device"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function NotificationSettingsPanel({
  permissionBusy,
  permissionStatus,
  preferences,
  savingField,
  settingsLoading,
  onOpenNativeSettings,
  onRequestPermission,
  onTogglePreference,
}: {
  permissionBusy: boolean;
  permissionStatus: NotificationPermissionStatus | null;
  preferences: NotificationPushPreferencesRow | null;
  savingField: NotificationPushPreferenceField | null;
  settingsLoading: boolean;
  onOpenNativeSettings: () => Promise<void>;
  onRequestPermission: () => Promise<void>;
  onTogglePreference: (
    field: NotificationPushPreferenceField,
    checked: boolean
  ) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-app-border bg-app-secondary/45 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl bg-brand/10 p-2 text-brand">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-app-text">Native notification control</p>
            <p className="mt-1 text-xs leading-5 text-app-muted">
              {describePermissionStatus(permissionStatus)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onRequestPermission()}
            disabled={permissionBusy}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            <Bell className="h-3.5 w-3.5" />
            {permissionBusy ? "Checking..." : "Allow device notifications"}
          </button>

          {isNativePlatform() && getPlatform() === "android" ? (
            <button
              type="button"
              onClick={() => void onOpenNativeSettings()}
              className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-2 text-xs font-semibold text-app-text transition hover:border-brand/30 hover:text-brand"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Android settings
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {settingsLoading && !preferences ? (
          <div className="rounded-[24px] border border-app-border bg-app-secondary/35 px-4 py-6 text-sm text-app-muted">
            Loading native notification settings...
          </div>
        ) : (
          notificationPushPreferenceItems.map((item) => {
            const checked = preferences ? preferences[item.field] : true;
            const busy = savingField === item.field;

            return (
              <label
                key={item.field}
                className="flex items-start justify-between gap-3 rounded-[24px] border border-app-border bg-app-secondary/35 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-app-text">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-app-muted">{item.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busy}
                  onChange={(event) =>
                    void onTogglePreference(item.field, event.target.checked)
                  }
                  className="mt-1 h-4 w-4 shrink-0 rounded border-app-border text-brand focus:ring-brand disabled:opacity-60"
                />
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState<NotificationPanelView>("list");
  const [activeFilter, setActiveFilter] = useState<NotificationFilterTab>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [notifications, setNotifications] = useState<NotificationWithRelations[]>([]);
  const [nativePreferences, setNativePreferences] =
    useState<NotificationPushPreferencesRow | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingField, setSavingField] =
    useState<NotificationPushPreferenceField | null>(null);
  const [permissionBusy, setPermissionBusy] = useState(false);

  const sentNativeIds = useRef<Set<string>>(new Set());

  const closePanel = useCallback(() => {
    setOpen(false);
    setActiveView("list");
    setShowFilters(false);
  }, []);

  const loadSettingsData = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) {
        setSettingsLoading(true);
      }

      try {
        const [preferences, nextPermissionStatus] = await Promise.all([
          loadNotificationPushPreferences(userId),
          getNotificationPermissionStatus(),
        ]);

        setNativePreferences(preferences);
        setPermissionStatus(nextPermissionStatus);
      } catch (error) {
        console.error("Failed to load notification settings.", error);
        if (!options.silent) {
          toast.error("Could not load notification settings.");
        }
      } finally {
        if (!options.silent) {
          setSettingsLoading(false);
        }
      }
    },
    [userId]
  );

  const handleSettingsButton = useCallback(() => {
    if (activeView === "settings") {
      setActiveView("list");
      setShowFilters(true);
      return;
    }

    setShowFilters(false);
    setActiveView("settings");
    void loadSettingsData();
  }, [activeView, loadSettingsData]);

  const refreshNotifications = useCallback(
    async (fresh = false, markSeen = false) => {
      try {
        const payload = await loadNotifications(userId, { fresh, limit: 24 });

        if (markSeen && payload.some((notification) => !notification.is_read)) {
          await markNotificationsAsRead(userId);
          const markedRead = payload.map((notification) => ({ ...notification, is_read: true }));
          setNotifications((current) =>
            areNotificationsEquivalent(current, markedRead) ? current : markedRead
          );
          return;
        }

        if (
          isNativePlatform() &&
          !markSeen &&
          !getLatestPushToken() &&
          nativePreferences
        ) {
          for (const notification of payload) {
            if (
              !notification.is_read &&
              !sentNativeIds.current.has(notification.id) &&
              isNativePushEnabledForNotificationType(notification.type, nativePreferences)
            ) {
              sentNativeIds.current.add(notification.id);
              void showLocalNotification({
                title: getNotificationActorLabel(notification),
                body: notification.message,
                data: {
                  path: getNotificationLink(notification),
                },
              });
            }
          }
        }

        setNotifications((current) =>
          areNotificationsEquivalent(current, payload) ? current : payload
        );
      } catch (error) {
        console.error("Failed to refresh notifications.", error);
      }
    },
    [nativePreferences, userId]
  );

  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await deleteNotificationFromDevice(userId, notificationId);
        setNotifications((current) =>
          current.filter((notification) => notification.id !== notificationId)
        );
      } catch (error) {
        console.error("Failed to delete notification locally.", error);
      }
    },
    [userId]
  );

  const handleTogglePreference = useCallback(
    async (field: NotificationPushPreferenceField, checked: boolean) => {
      let previousPreferences: NotificationPushPreferencesRow | null = null;

      setNativePreferences((current) => {
        previousPreferences =
          current || createDefaultNotificationPushPreferences(userId);

        return {
          ...previousPreferences,
          [field]: checked,
        };
      });

      setSavingField(field);

      try {
        const updated = await updateNotificationPushPreferences(userId, {
          [field]: checked,
        } as Partial<NotificationPushPreferencesRow>);
        setNativePreferences(updated);
      } catch {
        if (previousPreferences) {
          setNativePreferences(previousPreferences);
        }
        toast.error("Could not update that notification setting.");
      } finally {
        setSavingField(null);
      }
    },
    [userId]
  );

  const handleRequestPermission = useCallback(async () => {
    setPermissionBusy(true);

    try {
      const granted = await requestNotificationPermission();
      const nextStatus = await getNotificationPermissionStatus();
      setPermissionStatus(nextStatus);

      if (granted) {
        toast.success("Device notifications are enabled.");
      } else {
        toast.error("Notification permission is still blocked on this device.");
      }
    } catch (error) {
      console.error("Failed to request device notification permission.", error);
      toast.error("Could not request device notification permission.");
    } finally {
      setPermissionBusy(false);
    }
  }, []);

  const handleOpenNativeSettings = useCallback(async () => {
    try {
      const opened = await openNativeNotificationSettings();

      if (!opened) {
        toast.error("Android notification settings are not available here.");
        return;
      }

      toast.success("Opening Android notification settings.");
    } catch (error) {
      console.error("Failed to open Android notification settings.", error);
      toast.error("Could not open Android notification settings.");
    }
  }, []);

  const handleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (!nextOpen) {
      setActiveView("list");
      setActiveFilter("all");
      setShowFilters(false);
      return;
    }

    await refreshNotifications(true, true);
  };

  useEffect(() => {
    let disposed = false;
    let refreshTimer: number | null = null;
    const refreshIntervalMs = open ? 12000 : 45000;
    const isDocumentVisible = () =>
      typeof document === "undefined" || document.visibilityState !== "hidden";

    const clearRefreshTimer = () => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    };

    const scheduleRefresh = (delay = refreshIntervalMs) => {
      clearRefreshTimer();
      if (disposed) {
        return;
      }

      refreshTimer = window.setTimeout(() => {
        void tick();
      }, delay);
    };

    const tick = async () => {
      if (disposed) {
        return;
      }

      if (!isDocumentVisible()) {
        clearRefreshTimer();
        return;
      }

      await refreshNotifications(false, open);
      scheduleRefresh(refreshIntervalMs);
    };

    const deferredRefresh = scheduleDeferredTask(() => {
      if (!isDocumentVisible()) {
        scheduleRefresh(refreshIntervalMs);
        return;
      }

      void tick();
    }, { timeout: 1000 });
    const handleVisibility = () => {
      if (!isDocumentVisible()) {
        clearRefreshTimer();
        return;
      }

      scheduleRefresh(refreshIntervalMs);
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      cancelDeferredTask(deferredRefresh);
      clearRefreshTimer();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [open, refreshNotifications]);

  useEffect(() => {
    if (isMobile && open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [closePanel, isMobile, open]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile || !open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, open]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );
  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => matchesNotificationFilter(notification, activeFilter)),
    [activeFilter, notifications]
  );

  const listViewContent = (
    <div className="space-y-3">
      {filteredNotifications.length === 0 ? (
        <p className="rounded-2xl bg-app-secondary/60 px-4 py-6 text-sm text-app-muted">
          {emptyStateMessage}
        </p>
      ) : (
        filteredNotifications.map((notification) => (
          <NotificationListItem
            key={notification.id}
            compact={isMobile}
            notification={notification}
            onClose={closePanel}
            onDelete={(notificationId) => void handleDeleteNotification(notificationId)}
          />
        ))
      )}
    </div>
  );

  const settingsViewContent = (
    <NotificationSettingsPanel
      permissionBusy={permissionBusy}
      permissionStatus={permissionStatus}
      preferences={nativePreferences}
      savingField={savingField}
      settingsLoading={settingsLoading}
      onOpenNativeSettings={handleOpenNativeSettings}
      onRequestPermission={handleRequestPermission}
      onTogglePreference={handleTogglePreference}
    />
  );

  const desktopPanel = open ? (
    <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(92vw,24rem)] rounded-[28px] border border-app-border bg-app-card p-4 shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {activeView === "settings" ? (
            <button
              type="button"
              onClick={() => setActiveView("list")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-app-secondary text-app-text"
              aria-label="Back to notifications"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          <p className="font-display text-xl font-semibold">
            {activeView === "settings" ? "Notification settings" : "Notifications"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeView === "settings" ? null : (
            <button
              type="button"
              onClick={() => void refreshNotifications(true, true)}
              className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-3 py-2 text-xs font-semibold text-app-text"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Refresh
            </button>
          )}
          <button
            type="button"
            onClick={handleSettingsButton}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-app-secondary text-app-text transition hover:text-brand"
            aria-label={
              activeView === "settings"
                ? "Show notification filters"
                : "Open notification settings"
            }
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 max-h-[26rem] overflow-y-auto pr-1">
        {activeView === "settings" ? settingsViewContent : listViewContent}
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => void handleOpen()}
        className="native-icon-button relative"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {formatCompactCount(unreadCount)}
          </span>
        ) : null}
      </button>

      {open && isMobile && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-50 bg-slate-950/25 md:hidden"
                onClick={closePanel}
                aria-label="Close notifications"
              />
              <aside className="fixed inset-0 z-[60] flex flex-col bg-app px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-safe md:hidden">
                <div className="-mx-3 border-b border-app-border/70 bg-app/95 px-3 pb-3 pt-3 backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-2">
                      {activeView === "settings" ? (
                        <button
                          type="button"
                          onClick={() => setActiveView("list")}
                          className="native-icon-button mt-0.5 h-10 w-10 shrink-0"
                          aria-label="Back to notifications"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-display text-[1.45rem] font-bold tracking-tight text-app-text">
                          Notifications
                        </p>
                        <p className="mt-1 text-xs leading-5 text-app-muted">
                          {activeView === "settings"
                            ? "Choose which alerts reach your device."
                            : "Mentions, requests, chats, and wallet updates in one place."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closePanel}
                      className="native-icon-button h-10 w-10 shrink-0"
                      aria-label="Close notifications"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {activeView === "settings" ? null : (
                      <button
                        type="button"
                        onClick={() => void refreshNotifications(true, true)}
                        className="native-pill inline-flex items-center gap-1.5 px-3 py-2 text-[11px]"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Refresh
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSettingsButton}
                      className="native-pill inline-flex items-center gap-1.5 px-3 py-2 text-[11px]"
                      aria-label={
                        activeView === "settings"
                          ? "Show notification filters"
                          : "Open notification settings"
                      }
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      {activeView === "settings" ? "Filters" : "Settings"}
                    </button>
                  </div>
                </div>

                <div className="pt-3">
                  {activeView === "settings" || !showFilters ? null : (
                    <div className="native-segmented mb-3">
                      <div className="grid grid-cols-3 gap-1">
                        {([
                          ["all", "All"],
                          ["mentions", "Mentions"],
                          ["requests", "Requests"],
                        ] as Array<[NotificationFilterTab, string]>).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setActiveFilter(value)}
                            className={`rounded-[14px] px-3 py-2.5 text-sm font-semibold transition ${
                              activeFilter === value
                                ? "bg-white text-app-text shadow-sm"
                                : "text-app-text/70"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pb-2">
                  {activeView === "settings" ? settingsViewContent : listViewContent}
                </div>
              </aside>
            </>,
            document.body
          )
        : desktopPanel}
    </div>
  );
}
