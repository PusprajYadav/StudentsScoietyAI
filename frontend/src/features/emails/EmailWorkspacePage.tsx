import {
  ArrowLeft,
  Bell,
  Code2,
  Eye,
  HardDrive,
  Inbox,
  Loader2,
  Mail,
  MessageSquareText,
  Paperclip,
  PenSquare,
  RefreshCcw,
  Reply,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { buildAuthRedirectPath } from "../../lib/authRedirect";
import { findCoinFeatureSetting, formatCoinAmount, purchaseFeatureAccess } from "../../lib/coins";
import { useAuthStore } from "../../store/authStore";
import { useCoinWalletStore } from "../../store/coinWalletStore";
import { getBulkMailerAttachmentTotalSize, readBulkMailerAttachmentFile } from "../bulk-mailer/helpers";
import {
  createEmailRequest,
  deleteEmailConnection,
  deleteEmailMessage,
  listEmailMessages,
  loadEmailMessage,
  loadEmailOverview,
  saveEmailConnection,
  sendEmailMessage,
  syncEmailMailbox,
  testEmailConnection,
} from "./api";
import {
  EMAIL_FOLDER_CACHE_MAX_AGE_MS,
  EMAIL_MESSAGE_CACHE_MAX_AGE_MS,
  EMAIL_OVERVIEW_CACHE_MAX_AGE_MS,
  getCachedEmailFolder,
  getCachedEmailMessage,
  getCachedEmailOverview,
  isEmailCacheStale,
  removeCachedEmailMessage,
  saveCachedEmailFolder,
  saveCachedEmailMessage,
  saveCachedEmailOverview,
} from "./localCache";
import {
  EMAIL_PLAN_DEFINITIONS,
  findEmailPlanSetting,
  formatMailboxStatus,
  formatStorageSize,
  type EmailConnectionRow,
  type EmailMailboxOverview,
  type EmailMessageDetail,
  type EmailMessageListResponse,
  type EmailMessageSummaryRow,
  type EmailPlanDefinition,
} from "./types";

type EmailSurfaceTab = "overview" | "inbox" | "sent" | "compose" | "bulk" | "settings";
type ComposeEditorMode = "plain" | "html";
type EmailMessageViewMode = "html" | "text";
type EmailFolder = "inbox" | "sent";
type EmailPageView = EmailSurfaceTab | "message";

const EMAIL_SURFACE_TABS: Array<{ id: EmailSurfaceTab; label: string; blurb: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", blurb: "Mailbox summary and access.", icon: Sparkles },
  { id: "inbox", label: "Inbox", blurb: "Read received emails.", icon: Inbox },
  { id: "sent", label: "Sent", blurb: "See sent history and opens.", icon: Send },
  { id: "compose", label: "Compose", blurb: "Write and send email.", icon: PenSquare },
  { id: "bulk", label: "Bulk", blurb: "Open the campaign tool.", icon: SlidersHorizontal },
  { id: "settings", label: "Settings", blurb: "Manage SMTP and IMAP.", icon: Settings2 },
];

interface FolderState {
  loading: boolean;
  data: EmailMessageListResponse;
}

interface ComposeAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBase64: string;
}

interface ComposeDraft {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  editorMode: ComposeEditorMode;
  trackOpens: boolean;
  attachments: ComposeAttachment[];
}

interface ConnectionDraft {
  name: string;
  email_address: string;
  username: string;
  password: string;
  smtp_host: string;
  smtp_port: string;
  smtp_encryption: "ssl" | "tls" | "none";
  imap_host: string;
  imap_port: string;
  imap_encryption: "ssl" | "tls" | "none";
  outbound_enabled: boolean;
  inbound_enabled: boolean;
  is_active: boolean;
  is_default: boolean;
}

interface EmailRouteState {
  view: EmailPageView;
  activeSection: EmailSurfaceTab;
  folder: EmailFolder | null;
  messageId: string | null;
}

const EMPTY_FOLDER_STATE: EmailMessageListResponse = {
  items: [],
  total_count: 0,
  has_more: false,
  next_offset: 0,
};

const EMPTY_COMPOSE_DRAFT: ComposeDraft = {
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  bodyText: "",
  bodyHtml: "",
  editorMode: "plain",
  trackOpens: true,
  attachments: [],
};

function getEmailTabPath(tab: EmailSurfaceTab) {
  return `/app/emails/${tab}`;
}

function getEmailMessagePath(folder: EmailFolder, messageId: string) {
  return `/app/emails/${folder}/${encodeURIComponent(messageId)}`;
}

function resolveEmailRoute(pathname: string): EmailRouteState {
  const marker = "/app/emails";
  const rest = pathname.includes(marker) ? pathname.slice(pathname.indexOf(marker) + marker.length) : "";
  const segments = rest.split("/").filter(Boolean);
  const first = segments[0];

  if (!first || first === "overview") {
    return {
      view: "overview",
      activeSection: "overview",
      folder: null,
      messageId: null,
    };
  }

  if (first === "compose" || first === "bulk" || first === "settings") {
    return {
      view: first,
      activeSection: first,
      folder: null,
      messageId: null,
    };
  }

  if (first === "inbox" || first === "sent") {
    return {
      view: segments[1] ? "message" : first,
      activeSection: first,
      folder: first,
      messageId: segments[1] ? decodeURIComponent(segments[1]) : null,
    };
  }

  return {
    view: "overview",
    activeSection: "overview",
    folder: null,
    messageId: null,
  };
}

function parseRecipients(value: string) {
  const matches = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return Array.from(new Set(matches.map((email) => email.trim().toLowerCase()))).map((email) => ({ email }));
}

function quoteText(value: string) {
  return value
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainTextToHtml(value: string) {
  return `<div style="font-family:Arial,sans-serif;white-space:normal">${escapeHtml(value || "").replaceAll("\n", "<br />")}</div>`;
}

function htmlToPlainText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(trimmed, "text/html");
    return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  return trimmed
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildEmailFrameDocument(rawHtml: string) {
  const trimmed = rawHtml.trim();
  const headMatch = trimmed.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const head = headMatch?.[1] || "";
  const body =
    bodyMatch?.[1] ||
    trimmed
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<\/?(html|head|body)[^>]*>/gi, "") ||
    "<p>No HTML content available.</p>";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: Arial, sans-serif;
        line-height: 1.65;
      }
      body {
        overflow-wrap: anywhere;
      }
      .mail-shell {
        padding: 20px;
      }
      img, video {
        max-width: 100%;
        height: auto;
      }
      table {
        max-width: 100% !important;
      }
      pre, code {
        white-space: pre-wrap;
        word-break: break-word;
      }
      blockquote {
        margin: 1rem 0;
        padding-left: 0.9rem;
        border-left: 3px solid #cbd5e1;
        color: #475569;
      }
      a {
        color: #2563eb;
      }
    </style>
    ${head}
  </head>
  <body>
    <div class="mail-shell">${body}</div>
  </body>
</html>`;
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatThreadTime(value?: string | null) {
  if (!value) {
    return "Now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function getAvatarTone(seed: string) {
  const tones = [
    "bg-emerald-500/12 text-emerald-700 dark:text-emerald-200",
    "bg-sky-500/12 text-sky-700 dark:text-sky-200",
    "bg-amber-500/12 text-amber-700 dark:text-amber-200",
    "bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-200",
    "bg-rose-500/12 text-rose-700 dark:text-rose-200",
    "bg-indigo-500/12 text-indigo-700 dark:text-indigo-200",
  ];
  const hash = Array.from(seed || "mail").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}

function getAvatarLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "M";
  }

  if (trimmed.includes("@")) {
    return trimmed[0]?.toUpperCase() || "M";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getMessageTitle(item: EmailMessageSummaryRow) {
  return item.direction === "incoming"
    ? item.from_name || item.from_email || "Unknown sender"
    : item.to_recipients.map((recipient) => recipient.email).join(", ") || "Recipients";
}

function getMessageMetaChip(item: EmailMessageSummaryRow) {
  if (item.folder === "sent" && item.tracking_enabled) {
    const trackedCount = item.tracked_recipient_count || item.to_recipients.length || 0;
    return trackedCount > 0 ? `${item.opened_recipient_count}/${trackedCount} opened` : "Tracking on";
  }

  if (item.has_attachments) {
    return `${item.attachment_count} file${item.attachment_count === 1 ? "" : "s"}`;
  }

  return "";
}

function matchesMailSearch(item: EmailMessageSummaryRow, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    getMessageTitle(item),
    item.subject,
    item.snippet,
    item.from_email,
    item.from_name,
    item.to_recipients.map((recipient) => recipient.email).join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function mergeFolderItems(existing: EmailMessageSummaryRow[], incoming: EmailMessageSummaryRow[]) {
  const ordered = [...incoming, ...existing];
  const seen = new Set<string>();

  return ordered.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function createConnectionDraft(emailAddress = ""): ConnectionDraft {
  return {
    name: "My Mailbox",
    email_address: emailAddress,
    username: emailAddress,
    password: "",
    smtp_host: "",
    smtp_port: "587",
    smtp_encryption: "tls",
    imap_host: "",
    imap_port: "993",
    imap_encryption: "ssl",
    outbound_enabled: true,
    inbound_enabled: true,
    is_active: true,
    is_default: false,
  };
}

function EmailHtmlFrame({
  html,
  title,
  minHeight = 320,
}: {
  html: string;
  title: string;
  minHeight?: number;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [frameHeight, setFrameHeight] = useState(minHeight);
  const frameDocument = useMemo(() => buildEmailFrameDocument(html), [html]);

  useEffect(() => {
    setFrameHeight(minHeight);
  }, [frameDocument, minHeight]);

  function resizeFrame() {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;

    if (!frame || !doc) {
      return;
    }

    const nextHeight = Math.max(
      minHeight,
      doc.documentElement?.scrollHeight || 0,
      doc.body?.scrollHeight || 0
    );

    if (Number.isFinite(nextHeight) && nextHeight > 0) {
      setFrameHeight(nextHeight);
    }
  }

  function handleLoad() {
    resizeFrame();

    const doc = frameRef.current?.contentDocument;
    if (doc) {
      Array.from(doc.images).forEach((image) => {
        image.addEventListener("load", resizeFrame, { once: true });
      });
    }

    window.setTimeout(resizeFrame, 120);
    window.setTimeout(resizeFrame, 600);
  }

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={frameDocument}
      sandbox="allow-same-origin"
      onLoad={handleLoad}
      style={{ height: `${frameHeight}px` }}
      className="block w-full border-0 bg-white"
      referrerPolicy="no-referrer"
    />
  );
}

function EmailPlanCard({
  plan,
  loading,
  owned,
  onBuy,
  coinCostLabel,
}: {
  plan: EmailPlanDefinition;
  loading: boolean;
  owned: boolean;
  onBuy: () => void;
  coinCostLabel: string;
}) {
  return (
    <article className="rounded-[20px] border border-app-border bg-app-secondary/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">{plan.durationLabel}</p>
          <h3 className="mt-1 text-base font-semibold text-app-text">{plan.label}</h3>
        </div>
        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">{coinCostLabel}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-app-muted">Mailbox access, sync, sending, and tracking in one pass.</p>
      <button
        type="button"
        onClick={onBuy}
        disabled={loading || owned}
        className={`mt-4 inline-flex min-h-[38px] w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
          owned
            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "bg-brand text-white hover:bg-brand-dark disabled:opacity-60"
        }`}
      >
        {owned ? "Active" : loading ? "Buying..." : "Buy plan"}
      </button>
    </article>
  );
}

function MessageRow({
  item,
  onOpen,
}: {
  item: EmailMessageSummaryRow;
  onOpen: () => void;
}) {
  const senderLabel = getMessageTitle(item);
  const metaChip = getMessageMetaChip(item);
  const timeLabel = formatThreadTime(item.sent_at || item.received_at || item.created_at);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-[16px] border px-3 py-2.5 text-left transition ${
        item.is_read ? "border-app-border bg-app-card" : "border-brand/20 bg-brand/5"
      } hover:border-brand/30 hover:bg-brand/5`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${getAvatarTone(senderLabel)}`}>
          {getAvatarLabel(senderLabel)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`truncate text-[13px] ${item.is_read ? "font-medium text-app-text" : "font-semibold text-app-text"}`}>
                {senderLabel}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-app-text">{item.subject || "(No subject)"}</p>
            </div>
            <p className="shrink-0 text-[11px] text-app-muted">{timeLabel}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-app-muted">{item.snippet || "Open to read the email."}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {!item.is_read ? <span className="h-2 w-2 rounded-full bg-brand" /> : null}
            {metaChip ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-secondary px-2.5 py-1 text-[10px] font-semibold text-app-muted">
                {item.has_attachments ? <Paperclip className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {metaChip}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function ConnectionCard({
  connection,
  onDelete,
  onTest,
}: {
  connection: EmailConnectionRow;
  onDelete: () => void;
  onTest: () => void;
}) {
  return (
    <article className="rounded-[18px] border border-app-border bg-app-secondary/45 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold ${getAvatarTone(connection.email_address)}`}>
            {getAvatarLabel(connection.email_address)}
          </div>
          <div>
            <p className="text-sm font-semibold text-app-text">{connection.name}</p>
            <p className="mt-0.5 text-xs text-app-muted">
              {connection.email_address} • {connection.scope === "assigned" ? "Admin assigned" : "Your profile"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-app-border bg-app-card px-2.5 py-1 text-[10px] font-semibold text-app-muted">
            {connection.is_default ? "Default" : "Secondary"}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-app-muted sm:grid-cols-2">
        <div className="rounded-[16px] border border-app-border bg-app-card px-3 py-2">
          SMTP {connection.smtp_host}:{connection.smtp_port}
        </div>
        <div className="rounded-[16px] border border-app-border bg-app-card px-3 py-2">
          IMAP {connection.imap_host ? `${connection.imap_host}:${connection.imap_port}` : "Not set"}
        </div>
        <div className="rounded-[16px] border border-app-border bg-app-card px-3 py-2 sm:col-span-2">
          User {connection.username}
        </div>
      </div>

      {connection.last_sync_error ? (
        <p className="mt-3 rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300">
          {connection.last_sync_error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onTest} className="btn-secondary rounded-full px-3 py-2 text-xs">
          Test
        </button>
        {connection.scope === "user_owned" ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/15 dark:text-rose-300"
          >
            Remove
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ComposeFieldRow({
  label,
  children,
  trailing,
}: {
  label: string;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2.5 px-4 py-3">
      <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </label>
  );
}

export function EmailWorkspacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const route = useMemo(() => resolveEmailRoute(location.pathname), [location.pathname]);
  const { user } = useAuthStore();
  const {
    featureSettings,
    activeAccess,
    wallet,
    refreshAccess,
    refreshFeatureSettings,
    refreshWallet,
  } = useCoinWalletStore();

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overview, setOverview] = useState<EmailMailboxOverview | null>(null);
  const [requestEmailAddress, setRequestEmailAddress] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [requestPlanKey, setRequestPlanKey] = useState<string>(EMAIL_PLAN_DEFINITIONS[0].featureKey);
  const [buyingPlanKey, setBuyingPlanKey] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [folderStateById, setFolderStateById] = useState<Record<EmailFolder, FolderState>>({
    inbox: { loading: false, data: EMPTY_FOLDER_STATE },
    sent: { loading: false, data: EMPTY_FOLDER_STATE },
  });
  const [selectedMessage, setSelectedMessage] = useState<EmailMessageDetail | null>(null);
  const [selectedMessageLoading, setSelectedMessageLoading] = useState(false);
  const [syncingMailbox, setSyncingMailbox] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [composeDraft, setComposeDraft] = useState<ComposeDraft>(EMPTY_COMPOSE_DRAFT);
  const [savingConnection, setSavingConnection] = useState(false);
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft>(createConnectionDraft());
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [mailSearchQuery, setMailSearchQuery] = useState("");
  const [showSecondaryRecipients, setShowSecondaryRecipients] = useState(false);
  const [selectedMessageView, setSelectedMessageView] = useState<EmailMessageViewMode>("html");

  const activeAccessExpiresAt =
    overview?.active_access?.expires_at ||
    activeAccess.find((entry) => entry.access_key === "student_email_access")?.expires_at ||
    null;
  const loginHref = buildAuthRedirectPath(location);
  const requestStatus = overview?.requests?.[0] || null;
  const activeMailbox = overview?.mailbox || null;
  const connectionProfiles = overview?.connection_profiles || [];
  const visibleConnectionProfiles = connectionProfiles.filter((connection) => connection.is_active);
  const outboundConnections = visibleConnectionProfiles.filter((connection) => connection.outbound_enabled);
  const selectedOutboundConnection =
    outboundConnections.find((connection) => connection.id === selectedConnectionId) ||
    outboundConnections.find((connection) => connection.is_default) ||
    outboundConnections[0] ||
    null;
  const activeFolder = route.folder;
  const activeFolderState = activeFolder ? folderStateById[activeFolder] : null;
  const filteredMessages = useMemo(
    () => (activeFolderState?.data.items || []).filter((item) => matchesMailSearch(item, mailSearchQuery)),
    [activeFolderState?.data.items, mailSearchQuery]
  );
  const composeRecipientCount =
    parseRecipients(composeDraft.to).length +
    parseRecipients(composeDraft.cc).length +
    parseRecipients(composeDraft.bcc).length;
  const composeAttachmentBytes = getBulkMailerAttachmentTotalSize(composeDraft.attachments);
  const storageUsagePercent = activeMailbox
    ? Math.min(100, Math.round((activeMailbox.used_bytes / Math.max(activeMailbox.quota_bytes, 1)) * 100))
    : 0;
  const activeConnectionCount = visibleConnectionProfiles.length;
  const activePlan = useMemo(
    () => EMAIL_PLAN_DEFINITIONS.find((entry) => entry.featureKey === overview?.active_access?.granted_by_feature_key) || null,
    [overview?.active_access?.granted_by_feature_key]
  );
  const compactSearchHeader = route.view === "inbox" || route.view === "sent";

  function persistFolderSnapshot(folder: EmailFolder, data: EmailMessageListResponse) {
    if (!user?.id || !activeMailbox?.id) {
      return;
    }

    saveCachedEmailFolder(user.id, activeMailbox.id, folder, data);
  }

  function applyFolderSnapshot(folder: EmailFolder, data: EmailMessageListResponse, loading = false) {
    setFolderStateById((current) => ({
      ...current,
      [folder]: {
        loading,
        data,
      },
    }));
    persistFolderSnapshot(folder, data);
  }

  function updateFolderSnapshot(
    folder: EmailFolder,
    updater: (current: EmailMessageListResponse) => EmailMessageListResponse,
    loading = false
  ) {
    let nextData: EmailMessageListResponse | null = null;

    setFolderStateById((current) => {
      nextData = updater(current[folder].data);
      return {
        ...current,
        [folder]: {
          loading,
          data: nextData,
        },
      };
    });

    if (nextData) {
      persistFolderSnapshot(folder, nextData);
    }
  }

  function applyOverviewSnapshot(nextOverview: EmailMailboxOverview, options: { persist?: boolean } = {}) {
    setOverview(nextOverview);

    if (options.persist !== false && user?.id) {
      saveCachedEmailOverview(user.id, nextOverview);
    }

    setConnectionDraft((current) => ({
      ...current,
      email_address: current.email_address || nextOverview.mailbox?.email_address || "",
      username: current.username || nextOverview.mailbox?.email_address || "",
    }));
    setSelectedConnectionId((current) => {
      const outbound = (nextOverview.connection_profiles || []).filter(
        (connection) => connection.is_active && connection.outbound_enabled
      );
      if (current && outbound.some((connection) => connection.id === current)) {
        return current;
      }
      return outbound.find((connection) => connection.is_default)?.id || outbound[0]?.id || "";
    });
  }

  function applyMessageDetail(detail: EmailMessageDetail, options: { persist?: boolean } = {}) {
    setSelectedMessage(detail);
    setSelectedMessageView(detail.payload.html.trim() ? "html" : "text");

    if (options.persist !== false && user?.id && activeMailbox?.id) {
      saveCachedEmailMessage(user.id, activeMailbox.id, detail.message.id, detail);
    }
  }

  function goToTab(tab: EmailSurfaceTab) {
    navigate(getEmailTabPath(tab));
  }

  function goToFolderMessage(folder: EmailFolder, messageId: string) {
    navigate(getEmailMessagePath(folder, messageId));
  }

  async function refreshOverview(options: { showLoading?: boolean } = {}) {
    if (!user) {
      setOverview(null);
      setLoadingOverview(false);
      return;
    }

    const shouldShowLoading = options.showLoading ?? true;
    if (shouldShowLoading) {
      setLoadingOverview(true);
    }

    try {
      const nextOverview = await loadEmailOverview();
      applyOverviewSnapshot(nextOverview);
    } catch (error) {
      if (!overview) {
        toast.error(error instanceof Error ? error.message : "Could not load Student Email.");
      }
    } finally {
      setLoadingOverview(false);
    }
  }

  async function loadFolder(
    folder: EmailFolder,
    options: {
      offset?: number;
      append?: boolean;
      force?: boolean;
    } = {}
  ) {
    if (!activeMailbox) {
      return;
    }

    const offset = options.offset || 0;
    const append = options.append || false;
    const force = options.force || false;
    let usedCachedFolder = false;

    if (!append && offset === 0 && user?.id) {
      const cached = getCachedEmailFolder(user.id, activeMailbox.id, folder);
      if (cached) {
        usedCachedFolder = true;
        applyFolderSnapshot(folder, cached.value, force || isEmailCacheStale(cached.cachedAt, EMAIL_FOLDER_CACHE_MAX_AGE_MS));
        if (!force && !isEmailCacheStale(cached.cachedAt, EMAIL_FOLDER_CACHE_MAX_AGE_MS)) {
          return;
        }
      } else {
        setFolderStateById((current) => ({
          ...current,
          [folder]: {
            ...current[folder],
            loading: true,
          },
        }));
      }
    } else {
      setFolderStateById((current) => ({
        ...current,
        [folder]: {
          ...current[folder],
          loading: true,
        },
      }));
    }

    try {
      const response = await listEmailMessages({
        folder,
        offset,
        limit: 10,
        mailboxId: activeMailbox.id,
      });
      if (append) {
        updateFolderSnapshot(
          folder,
          (current) => ({
            ...response,
            items: mergeFolderItems(current.items, response.items),
          }),
          false
        );
      } else {
        applyFolderSnapshot(folder, response, false);
      }
    } catch (error) {
      setFolderStateById((current) => ({
        ...current,
        [folder]: {
          ...current[folder],
          loading: false,
        },
      }));
      if (!usedCachedFolder) {
        toast.error(error instanceof Error ? error.message : "Could not load emails.");
      }
    }
  }

  async function loadMessage(messageId: string, options: { force?: boolean } = {}) {
    const force = options.force || false;
    let usedCachedMessage = false;

    if (user?.id && activeMailbox?.id) {
      const cached = getCachedEmailMessage(user.id, activeMailbox.id, messageId);
      if (cached) {
        usedCachedMessage = true;
        applyMessageDetail(cached.value, { persist: false });
        if (!force && !isEmailCacheStale(cached.cachedAt, EMAIL_MESSAGE_CACHE_MAX_AGE_MS)) {
          setSelectedMessageLoading(false);
          return;
        }
      }
    }

    setSelectedMessageLoading(true);
    try {
      const detail = await loadEmailMessage(messageId);
      applyMessageDetail(detail);
    } catch (error) {
      if (!usedCachedMessage) {
        toast.error(error instanceof Error ? error.message : "Could not load this email.");
        navigate(getEmailTabPath(route.folder || "inbox"));
      }
    } finally {
      setSelectedMessageLoading(false);
    }
  }

  function switchComposeEditorMode(mode: ComposeEditorMode) {
    setComposeDraft((current) => {
      if (mode === "html" && !current.bodyHtml.trim() && current.bodyText.trim()) {
        return {
          ...current,
          editorMode: mode,
          bodyHtml: plainTextToHtml(current.bodyText),
        };
      }

      if (mode === "plain" && !current.bodyText.trim() && current.bodyHtml.trim()) {
        return {
          ...current,
          editorMode: mode,
          bodyText: htmlToPlainText(current.bodyHtml),
        };
      }

      return {
        ...current,
        editorMode: mode,
      };
    });
  }

  async function handleBuyPlan(featureKey: string) {
    setBuyingPlanKey(featureKey);
    try {
      await purchaseFeatureAccess(featureKey);
      await Promise.allSettled([refreshAccess(), refreshWallet(), refreshFeatureSettings()]);
      await refreshOverview();
      toast.success("Email plan activated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not activate this email plan.");
    } finally {
      setBuyingPlanKey(null);
    }
  }

  async function handleSubmitRequest() {
    if (!requestEmailAddress.trim()) {
      toast.error("Enter the mailbox email you want.");
      return;
    }

    setSubmittingRequest(true);
    try {
      await createEmailRequest({
        preferred_email_address: requestEmailAddress.trim(),
        plan_feature_key: requestPlanKey,
        request_note: requestNote.trim() || undefined,
      });
      toast.success("Mailbox request sent to admin.");
      setRequestNote("");
      await refreshOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send mailbox request.");
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleSyncMailbox() {
    if (!activeMailbox) {
      return;
    }

    setSyncingMailbox(true);
    try {
      const result = await syncEmailMailbox({ mailboxId: activeMailbox.id, limit: 20 });
      toast.success(result.imported_count > 0 ? `${result.imported_count} new emails synced.` : "Mailbox is up to date.");
      await Promise.all([refreshOverview({ showLoading: false }), loadFolder("inbox", { force: true })]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sync mailbox.");
    } finally {
      setSyncingMailbox(false);
    }
  }

  async function handleSendMessage() {
    if (!activeMailbox) {
      toast.error("Your mailbox is not ready yet.");
      return;
    }
    if (!selectedOutboundConnection) {
      toast.error("Add or fix an SMTP connection before sending.");
      return;
    }

    setSendingMessage(true);
    try {
      const draftSnapshot = composeDraft;
      const outboundProfile = selectedOutboundConnection;
      const result = await sendEmailMessage({
        mailbox_id: activeMailbox.id,
        selected_connection_id: outboundProfile.id,
        to: parseRecipients(draftSnapshot.to),
        cc: parseRecipients(draftSnapshot.cc),
        bcc: parseRecipients(draftSnapshot.bcc),
        subject: draftSnapshot.subject.trim(),
        body_text: draftSnapshot.editorMode === "html" && draftSnapshot.bodyHtml.trim() ? "" : draftSnapshot.bodyText,
        body_html: draftSnapshot.editorMode === "html" ? draftSnapshot.bodyHtml.trim() : undefined,
        track_opens: draftSnapshot.trackOpens,
        attachments: draftSnapshot.attachments.map((attachment) => ({
          name: attachment.name,
          content_type: attachment.contentType,
          content_base64: attachment.contentBase64,
          size: attachment.size,
        })),
      });
      const sentDetail: EmailMessageDetail = {
        message: result.message,
        payload: {
          text:
            draftSnapshot.editorMode === "html"
              ? htmlToPlainText(draftSnapshot.bodyHtml) || draftSnapshot.bodyText
              : draftSnapshot.bodyText,
          html: draftSnapshot.editorMode === "html" ? draftSnapshot.bodyHtml : "",
          attachments: draftSnapshot.attachments.map((attachment) => ({
            name: attachment.name,
            content_type: attachment.contentType,
            size: attachment.size,
          })),
          failed_recipients: result.failed_recipients,
          connection_profile: outboundProfile
            ? {
                id: outboundProfile.id,
                name: outboundProfile.name,
                email_address: outboundProfile.email_address,
              }
            : undefined,
        },
        receipts: result.tracking_rows,
      };

      if (user?.id) {
        saveCachedEmailMessage(user.id, activeMailbox.id, result.message.id, sentDetail);
      }

      updateFolderSnapshot("sent", (current) => {
        const nextItems = mergeFolderItems(current.items, [result.message]).slice(0, Math.max(current.items.length, 10));
        const nextTotal = current.total_count + 1;

        return {
          ...current,
          items: nextItems,
          total_count: nextTotal,
          has_more: current.has_more || nextTotal > nextItems.length,
          next_offset: nextItems.length,
        };
      });

      if (overview) {
        applyOverviewSnapshot(
          {
            ...overview,
            sent_count: overview.sent_count + 1,
          },
          { persist: true }
        );
      }

      setComposeDraft(EMPTY_COMPOSE_DRAFT);
      setShowSecondaryRecipients(false);
      navigate(getEmailTabPath("sent"));
      toast.success(
        result.failed_recipients.length > 0
          ? `Email sent to ${result.successful_recipients.length} recipient(s), some failed.`
          : "Email sent."
      );
      void refreshOverview({ showLoading: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send email.");
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleAddAttachments(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    try {
      const attachments = await Promise.all(Array.from(files).map((file) => readBulkMailerAttachmentFile(file)));
      const normalized = attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        contentType: attachment.contentType,
        size: attachment.size,
        contentBase64: attachment.contentBase64,
      }));
      const nextAttachments = [...composeDraft.attachments, ...normalized];
      const totalSize = getBulkMailerAttachmentTotalSize(nextAttachments);

      if (totalSize > 5 * 1024 * 1024) {
        toast.error("Attachments must stay within 5 MB total.");
        return;
      }

      setComposeDraft((current) => ({
        ...current,
        attachments: nextAttachments,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the attachment.");
    }
  }

  async function handleDeleteMessage(messageId: string, folder: EmailFolder) {
    try {
      await deleteEmailMessage(messageId);
      const removedMessage =
        selectedMessage?.message.id === messageId
          ? selectedMessage.message
          : folderStateById[folder].data.items.find((item) => item.id === messageId) || null;

      updateFolderSnapshot(folder, (current) => {
        const nextItems = current.items.filter((item) => item.id !== messageId);
        const nextTotal = Math.max(0, current.total_count - (removedMessage ? 1 : 0));

        return {
          ...current,
          items: nextItems,
          total_count: nextTotal,
          has_more: current.has_more && nextTotal > nextItems.length,
          next_offset: nextItems.length,
        };
      });

      if (user?.id && activeMailbox?.id) {
        removeCachedEmailMessage(user.id, activeMailbox.id, messageId);
      }

      if (overview) {
        applyOverviewSnapshot(
          {
            ...overview,
            unread_inbox_count:
              folder === "inbox" && removedMessage && !removedMessage.is_read
                ? Math.max(0, overview.unread_inbox_count - 1)
                : overview.unread_inbox_count,
            sent_count: folder === "sent" ? Math.max(0, overview.sent_count - 1) : overview.sent_count,
          },
          { persist: true }
        );
      }

      toast.success("Email deleted.");
      setSelectedMessage(null);
      navigate(getEmailTabPath(folder));
      void refreshOverview({ showLoading: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the email.");
    }
  }

  async function handleSaveConnection() {
    if (!activeMailbox) {
      toast.error("Wait until your mailbox is assigned.");
      return;
    }

    setSavingConnection(true);
    try {
      await saveEmailConnection({
        mailbox_id: activeMailbox.id,
        scope: "user_owned",
        name: connectionDraft.name.trim(),
        email_address: connectionDraft.email_address.trim() || activeMailbox.email_address,
        username: connectionDraft.username.trim() || activeMailbox.email_address,
        password: connectionDraft.password.trim(),
        smtp_host: connectionDraft.smtp_host.trim(),
        smtp_port: Number(connectionDraft.smtp_port || 587),
        smtp_encryption: connectionDraft.smtp_encryption,
        imap_host: connectionDraft.imap_host.trim() || undefined,
        imap_port: connectionDraft.imap_host.trim() ? Number(connectionDraft.imap_port || 993) : undefined,
        imap_encryption: connectionDraft.imap_host.trim() ? connectionDraft.imap_encryption : undefined,
        outbound_enabled: connectionDraft.outbound_enabled,
        inbound_enabled: connectionDraft.inbound_enabled,
        is_active: connectionDraft.is_active,
        is_default: connectionDraft.is_default,
      });
      toast.success("Connection saved.");
      setConnectionDraft(createConnectionDraft(activeMailbox.email_address));
      await refreshOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the connection.");
    } finally {
      setSavingConnection(false);
    }
  }

  async function handleTestConnection(connectionId: string) {
    try {
      await testEmailConnection({ connectionId });
      toast.success("Connection test passed.");
      await refreshOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection test failed.");
    }
  }

  async function handleDeleteConnection(connectionId: string) {
    try {
      await deleteEmailConnection(connectionId);
      toast.success("Connection removed.");
      await refreshOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the connection.");
    }
  }

  function prefillCompose(mode: "reply" | "forward", detail: EmailMessageDetail) {
    const subjectPrefix = mode === "reply" ? "Re:" : "Fwd:";
    const subject = detail.message.subject.startsWith(subjectPrefix)
      ? detail.message.subject
      : `${subjectPrefix} ${detail.message.subject || "(No subject)"}`;
    const sourceText = detail.payload.text || detail.message.snippet || "";
    setComposeDraft({
      to: mode === "reply" ? detail.message.from_email : "",
      cc: "",
      bcc: "",
      subject,
      bodyText:
        mode === "reply"
          ? `\n\nOn ${formatTimestamp(detail.message.received_at || detail.message.sent_at || detail.message.created_at)}, ${
              detail.message.from_name || detail.message.from_email
            } wrote:\n${quoteText(sourceText)}`
          : `\n\nForwarded message\nFrom: ${detail.message.from_name || detail.message.from_email}\nSubject: ${
              detail.message.subject || "(No subject)"
            }\n\n${sourceText}`,
      bodyHtml: "",
      editorMode: "plain",
      trackOpens: true,
      attachments: [],
    });
    navigate(getEmailTabPath("compose"));
  }

  useEffect(() => {
    if (!user?.id) {
      setOverview(null);
      setLoadingOverview(false);
      setFolderStateById({
        inbox: { loading: false, data: EMPTY_FOLDER_STATE },
        sent: { loading: false, data: EMPTY_FOLDER_STATE },
      });
      setSelectedMessage(null);
      return;
    }

    const cachedOverview = getCachedEmailOverview(user.id);
    if (cachedOverview) {
      applyOverviewSnapshot(cachedOverview.value, { persist: false });
      setLoadingOverview(false);
    } else {
      setLoadingOverview(true);
    }

    if (!cachedOverview || isEmailCacheStale(cachedOverview.cachedAt, EMAIL_OVERVIEW_CACHE_MAX_AGE_MS)) {
      void refreshOverview({ showLoading: !cachedOverview });
    }
  }, [user?.id]);

  useEffect(() => {
    setFolderStateById({
      inbox: { loading: false, data: EMPTY_FOLDER_STATE },
      sent: { loading: false, data: EMPTY_FOLDER_STATE },
    });
    setSelectedMessage(null);
  }, [activeMailbox?.id]);

  useEffect(() => {
    if (!activeMailbox || !activeFolder) {
      return;
    }

    void loadFolder(activeFolder);
  }, [user?.id, activeMailbox?.id, activeFolder]);

  useEffect(() => {
    if (composeDraft.cc || composeDraft.bcc) {
      setShowSecondaryRecipients(true);
    }
  }, [composeDraft.cc, composeDraft.bcc]);

  useEffect(() => {
    if (route.view === "message" && route.messageId) {
      void loadMessage(route.messageId);
      return;
    }

    setSelectedMessage(null);
  }, [route.view, route.messageId, user?.id, activeMailbox?.id]);

  const currentPlanCards = EMAIL_PLAN_DEFINITIONS.map((plan) => {
    const planSetting = findEmailPlanSetting(featureSettings, plan.featureKey) || findCoinFeatureSetting(featureSettings, plan.featureKey);
    return {
      plan,
      coinCostLabel: planSetting?.is_enabled ? formatCoinAmount(planSetting.coins_required) : "Disabled",
      owned: activePlan?.featureKey === plan.featureKey,
    };
  });

  function renderOverviewContent() {
    if (activeMailbox) {
      return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="surface-card rounded-[24px] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-app-text">Mailbox dashboard</p>
                <p className="mt-1 text-sm text-app-muted">Compact view, smaller cards, and cleaner routing.</p>
              </div>
              <button
                type="button"
                onClick={handleSyncMailbox}
                disabled={syncingMailbox}
                className="btn-secondary shrink-0 self-start rounded-full px-4 py-2 text-xs"
              >
                <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${syncingMailbox ? "animate-spin" : ""}`} />
                {syncingMailbox ? "Syncing..." : "Sync inbox"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                { title: "Unread", value: `${overview?.unread_inbox_count || 0}`, note: "Inbox", icon: Inbox },
                { title: "Sent", value: `${overview?.sent_count || 0}`, note: "Tracked history", icon: Bell },
                { title: "Storage", value: `${storageUsagePercent}%`, note: `${formatStorageSize(activeMailbox.used_bytes)} used`, icon: HardDrive },
                { title: "Connections", value: `${activeConnectionCount}`, note: "SMTP/IMAP profiles", icon: Settings2 },
              ].map((entry) => (
                <article key={entry.title} className="rounded-[18px] border border-app-border bg-app-secondary/55 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">{entry.title}</p>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <entry.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xl font-semibold text-app-text">{entry.value}</p>
                  <p className="mt-1 text-xs text-app-muted">{entry.note}</p>
                </article>
              ))}
            </div>

          </section>

          <aside className="surface-card rounded-[24px] p-4">
            <p className="text-sm font-semibold text-app-text">Mailbox info</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[18px] border border-app-border bg-app-secondary/55 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Address</p>
                <p className="mt-2 text-sm font-semibold text-app-text">{activeMailbox.email_address}</p>
              </div>
              <div className="rounded-[18px] border border-app-border bg-app-secondary/55 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Status</p>
                <p className="mt-2 text-sm font-semibold capitalize text-app-text">{formatMailboxStatus(activeMailbox.status)}</p>
              </div>
              <div className="rounded-[18px] border border-app-border bg-app-secondary/55 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Plan</p>
                <p className="mt-2 text-sm font-semibold text-app-text">{activePlan ? activePlan.label : "No active plan"}</p>
                <p className="mt-1 text-xs text-app-muted">
                  {activePlan ? `Until ${formatTimestamp(activeAccessExpiresAt)}` : "Activate access to keep sending"}
                </p>
              </div>
              <div className="rounded-[18px] border border-app-border bg-app-secondary/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Storage</p>
                  <span className="text-xs font-semibold text-app-text">{storageUsagePercent}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-app-card">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${storageUsagePercent}%` }} />
                </div>
                <p className="mt-2 text-xs text-app-muted">
                  {formatStorageSize(activeMailbox.used_bytes)} of {formatStorageSize(activeMailbox.quota_bytes)}
                </p>
              </div>
            </div>
          </aside>
        </div>
      );
    }

    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="surface-card rounded-[24px] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-app-text">Activate your mailbox</p>
              <p className="mt-1 text-sm text-app-muted">Smaller, cleaner setup flow with dedicated pages after activation.</p>
            </div>
            <span className="rounded-full border border-app-border bg-app-secondary px-3 py-1.5 text-xs font-semibold text-app-text">
              Wallet {wallet ? formatCoinAmount(wallet.balance) : "..."}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {currentPlanCards.map(({ plan, coinCostLabel, owned }) => (
              <EmailPlanCard
                key={plan.featureKey}
                plan={plan}
                loading={buyingPlanKey === plan.featureKey}
                owned={owned}
                coinCostLabel={coinCostLabel}
                onBuy={() => handleBuyPlan(plan.featureKey)}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-[20px] border border-app-border bg-app-secondary/55 p-4">
              <p className="text-sm font-semibold text-app-text">Request mailbox</p>
              <p className="mt-1 text-xs text-app-muted">Choose the email you want. Admin can assign the final domain and credentials.</p>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Preferred email</span>
                  <input
                    value={requestEmailAddress}
                    onChange={(event) => setRequestEmailAddress(event.target.value)}
                    className="input-shell h-11 rounded-[18px] text-sm"
                    placeholder="your.name@domain.com"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Plan</span>
                  <select
                    value={requestPlanKey}
                    onChange={(event) => setRequestPlanKey(event.target.value)}
                    className="input-shell h-11 rounded-[18px] text-sm"
                  >
                    {EMAIL_PLAN_DEFINITIONS.map((plan) => (
                      <option key={plan.featureKey} value={plan.featureKey}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Note</span>
                  <textarea
                    value={requestNote}
                    onChange={(event) => setRequestNote(event.target.value)}
                    className="input-shell min-h-[110px] rounded-[20px] text-sm"
                    placeholder="Preferred aliases, course, or mailbox purpose."
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={submittingRequest || !overview?.active_access}
                  className="btn-primary min-h-[42px] rounded-2xl"
                >
                  {submittingRequest ? "Sending..." : "Request mailbox"}
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-app-border bg-app-secondary/55 p-4">
              <p className="text-sm font-semibold text-app-text">Current request</p>
              {requestStatus ? (
                <>
                  <p className="mt-3 text-sm font-semibold text-app-text">{requestStatus.preferred_email_address}</p>
                  <p className="mt-1 text-xs capitalize text-app-muted">{formatMailboxStatus(requestStatus.status)}</p>
                  <p className="mt-3 text-xs text-app-muted">Requested {formatTimestamp(requestStatus.created_at)}</p>
                  {requestStatus.admin_note ? (
                    <p className="mt-3 rounded-[16px] border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-app-text">
                      {requestStatus.admin_note}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-3 text-sm text-app-muted">No mailbox request yet.</p>
              )}
              {!overview?.active_access ? (
                <p className="mt-4 rounded-[16px] border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Buy a plan first, then send the request.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="surface-card rounded-[24px] p-4">
          <p className="text-sm font-semibold text-app-text">Included</p>
          <div className="mt-4 space-y-3">
            {[
              { icon: ShieldCheck, title: "Flexible domains", body: "Admin can assign the final mailbox domain." },
              { icon: Send, title: "Tracked sending", body: "Reply, forward, and open tracking stay built in." },
              { icon: RefreshCcw, title: "Fast sync", body: "Inbox sync pulls messages into lightweight batches." },
              { icon: Settings2, title: "Custom connections", body: "Keep assigned setup or add your own SMTP/IMAP." },
            ].map((entry) => (
              <div key={entry.title} className="rounded-[18px] border border-app-border bg-app-secondary/55 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <entry.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-app-text">{entry.title}</p>
                    <p className="mt-1 text-xs leading-5 text-app-muted">{entry.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    );
  }

  function renderFolderContent(folder: EmailFolder) {
    if (!activeMailbox) {
      return (
        <section className="surface-card rounded-[24px] p-8 text-center">
          <p className="text-base font-semibold text-app-text">Mailbox not ready</p>
          <p className="mt-2 text-sm text-app-muted">Open Overview, activate a plan, and request the mailbox first.</p>
          <button type="button" onClick={() => goToTab("overview")} className="btn-secondary mt-4 rounded-2xl">
            Go to overview
          </button>
        </section>
      );
    }

    return (
      <section className="surface-card rounded-[24px] p-3.5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-app-text">{folder === "inbox" ? "Inbox" : "Sent"}</p>
              {activeFolderState?.loading ? (
                <span className="rounded-full border border-app-border bg-app-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Refreshing
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-app-muted">
              {mailSearchQuery.trim()
                ? `${filteredMessages.length} match${filteredMessages.length === 1 ? "" : "es"}`
                : `${activeFolderState?.data.total_count || 0} email${(activeFolderState?.data.total_count || 0) === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {folder === "inbox" ? (
              <button
                type="button"
                onClick={handleSyncMailbox}
                disabled={syncingMailbox}
                className="btn-secondary rounded-full px-3 py-2 text-xs"
              >
                <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${syncingMailbox ? "animate-spin" : ""}`} />
                {syncingMailbox ? "Syncing..." : "Sync"}
              </button>
            ) : null}
            <button type="button" onClick={() => goToTab("compose")} className="btn-primary rounded-full px-4 py-2 text-xs">
              <PenSquare className="mr-2 h-3.5 w-3.5" />
              Compose
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {filteredMessages.map((item) => (
            <MessageRow key={item.id} item={item} onOpen={() => goToFolderMessage(folder, item.id)} />
          ))}
          {activeFolderState?.loading && filteredMessages.length === 0 ? (
            <div className="rounded-[18px] border border-app-border bg-app-secondary/55 px-4 py-8 text-center text-sm text-app-muted">
              Loading emails...
            </div>
          ) : null}
          {!activeFolderState?.loading && filteredMessages.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-app-border bg-app-secondary/40 px-4 py-8 text-center text-sm text-app-muted">
              {mailSearchQuery.trim() ? "No emails match your search." : "No emails here yet."}
            </div>
          ) : null}
        </div>

        {activeFolderState?.data.has_more ? (
          <button
            type="button"
            onClick={() => void loadFolder(folder, { offset: activeFolderState.data.next_offset, append: true })}
            className="btn-secondary mt-4 rounded-full px-4 py-2 text-xs"
          >
            Load next 10
          </button>
        ) : null}
      </section>
    );
  }

  function renderMessageContent(folder: EmailFolder) {
    if (!activeMailbox) {
      return (
        <section className="surface-card rounded-[24px] p-8 text-center">
          <p className="text-base font-semibold text-app-text">Mailbox not ready</p>
          <p className="mt-2 text-sm text-app-muted">Open Overview, activate a plan, and request the mailbox first.</p>
        </section>
      );
    }

    if (selectedMessageLoading && !selectedMessage) {
      return (
        <section className="surface-card rounded-[24px] p-6 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" />
          <p className="mt-3 text-sm text-app-muted">Loading email...</p>
        </section>
      );
    }

    if (!selectedMessage) {
      return (
        <section className="surface-card rounded-[24px] p-8 text-center">
          <p className="text-base font-semibold text-app-text">Email not found</p>
          <p className="mt-2 text-sm text-app-muted">Go back to the {folder} list and open another email.</p>
          <button type="button" onClick={() => navigate(getEmailTabPath(folder))} className="btn-secondary mt-4 rounded-2xl">
            Back to {folder}
          </button>
        </section>
      );
    }

    return (
      <section className="surface-card rounded-[24px] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-app-border pb-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate(getEmailTabPath(folder))}
              className="inline-flex items-center gap-2 text-xs font-semibold text-app-muted transition hover:text-app-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {folder}
            </button>
            <p className="mt-3 text-lg font-semibold text-app-text">{selectedMessage.message.subject || "(No subject)"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-app-muted">
              <span>
                {formatTimestamp(selectedMessage.message.sent_at || selectedMessage.message.received_at || selectedMessage.message.created_at)}
              </span>
              {selectedMessageLoading ? (
                <span className="rounded-full border border-app-border bg-app-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Refreshing
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => prefillCompose("reply", selectedMessage)} className="btn-secondary rounded-full px-3 py-2 text-xs">
              <Reply className="mr-2 h-3.5 w-3.5" />
              Reply
            </button>
            <button type="button" onClick={() => prefillCompose("forward", selectedMessage)} className="btn-secondary rounded-full px-3 py-2 text-xs">
              <Send className="mr-2 h-3.5 w-3.5" />
              Forward
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteMessage(selectedMessage.message.id, folder)}
              className="inline-flex items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/15 dark:text-rose-300"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${getAvatarTone(selectedMessage.message.from_name || selectedMessage.message.from_email || "mail")}`}>
            {getAvatarLabel(selectedMessage.message.from_name || selectedMessage.message.from_email || "M")}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-app-text">
              {selectedMessage.message.from_name || selectedMessage.message.from_email}
            </p>
            <p className="mt-1 text-xs text-app-muted">
              {selectedMessage.message.direction === "incoming"
                ? `to ${activeMailbox.email_address}`
                : `to ${selectedMessage.message.to_recipients.map((entry) => entry.email).join(", ")}`}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMessageView("html")}
            disabled={!selectedMessage.payload.html.trim()}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              selectedMessageView === "html" && selectedMessage.payload.html.trim()
                ? "bg-brand text-white"
                : "border border-app-border bg-app-card text-app-text disabled:opacity-40"
            }`}
          >
            HTML
          </button>
          <button
            type="button"
            onClick={() => setSelectedMessageView("text")}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              selectedMessageView === "text" ? "bg-brand text-white" : "border border-app-border bg-app-card text-app-text"
            }`}
          >
            Text
          </button>
          {selectedMessage.payload.html.trim() ? (
            <span className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
              Gmail-style HTML
            </span>
          ) : null}
        </div>

        <div className="mt-4 space-y-4">
          {selectedMessageView === "html" && selectedMessage.payload.html.trim() ? (
            <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.55)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Rendered message</span>
                <span>HTML email</span>
              </div>
              <EmailHtmlFrame html={selectedMessage.payload.html} title={`Email ${selectedMessage.message.id}`} minHeight={360} />
            </div>
          ) : (
            <div className="rounded-[20px] border border-app-border bg-app-secondary/55 px-4 py-4">
              <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-app-text">
                {selectedMessage.payload.text || selectedMessage.message.snippet || "No text preview available."}
              </pre>
            </div>
          )}

          {selectedMessage.payload.attachments.length > 0 ? (
            <div className="rounded-[20px] border border-app-border bg-app-secondary/55 p-4">
              <p className="text-sm font-semibold text-app-text">Attachments</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedMessage.payload.attachments.map((attachment) => (
                  <div
                    key={`${attachment.object_key || attachment.name}-${attachment.size}`}
                    className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-2 text-xs text-app-text"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-brand" />
                    <span className="max-w-[12rem] truncate">{attachment.name}</span>
                    <span className="text-app-muted">{formatStorageSize(attachment.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {selectedMessage.receipts.length > 0 ? (
            <div className="rounded-[20px] border border-app-border bg-app-secondary/55 p-4">
              <p className="text-sm font-semibold text-app-text">Tracking</p>
              <div className="mt-3 grid gap-2">
                {selectedMessage.receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between gap-3 rounded-[16px] border border-app-border bg-app-card px-3 py-2.5 text-xs text-app-text"
                  >
                    <span className="truncate">{receipt.recipient_email}</span>
                    <span className="text-app-muted">{receipt.open_count > 0 ? `${receipt.open_count} opens` : "Not opened yet"}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  function renderComposeContent() {
    if (!activeMailbox) {
      return (
        <section className="surface-card rounded-[24px] p-8 text-center">
          <p className="text-base font-semibold text-app-text">Mailbox not ready</p>
          <p className="mt-2 text-sm text-app-muted">Complete mailbox assignment first, then compose from here.</p>
          <button type="button" onClick={() => goToTab("overview")} className="btn-secondary mt-4 rounded-2xl">
            Go to overview
          </button>
        </section>
      );
    }

    return (
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_292px]">
        <div className="overflow-hidden rounded-[28px] border border-app-border/80 bg-app-card shadow-[0_22px_56px_-36px_rgba(15,23,42,0.32)] dark:shadow-[0_26px_62px_-36px_rgba(2,6,23,0.9)]">
          <div className="border-b border-app-border bg-app-secondary/45 px-4 py-3 sm:px-5">
            <div className="grid w-full grid-cols-[minmax(0,1fr)_4.15rem_4.85rem] items-center gap-1.5">
              <select
                value={selectedOutboundConnection?.id || ""}
                onChange={(event) => setSelectedConnectionId(event.target.value)}
                className="h-8 min-w-0 rounded-full border border-app-border bg-app-card px-2.5 text-[10px] font-semibold text-app-text outline-none"
              >
                {outboundConnections.length > 0 ? (
                  outboundConnections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.name} {connection.is_default ? "• Default" : ""}
                    </option>
                  ))
                ) : (
                  <option value="">No outbound connection</option>
                )}
              </select>
              <button
                type="button"
                onClick={() => switchComposeEditorMode("plain")}
                className={`inline-flex h-8 items-center justify-center rounded-full px-2.5 text-[10px] font-semibold transition ${
                  composeDraft.editorMode === "plain"
                    ? "bg-brand text-white shadow-[0_16px_28px_-18px_rgba(37,99,235,0.72)]"
                    : "border border-app-border bg-app-card text-app-text"
                }`}
              >
                Plain
              </button>
              <button
                type="button"
                onClick={() => switchComposeEditorMode("html")}
                className={`inline-flex h-8 items-center justify-center gap-1 rounded-full px-2.5 text-[10px] font-semibold transition ${
                  composeDraft.editorMode === "html"
                    ? "bg-brand text-white shadow-[0_16px_28px_-18px_rgba(37,99,235,0.72)]"
                    : "border border-app-border bg-app-card text-app-text"
                }`}
              >
                <Code2 className="h-3 w-3" />
                HTML
              </button>
            </div>
          </div>

          <div className="bg-app-card">
            <div className="divide-y divide-app-border">
              <ComposeFieldRow
                label="To"
                trailing={
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowSecondaryRecipients(true)}
                      className="rounded-full border border-app-border bg-app-secondary/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted transition hover:border-brand/20 hover:text-app-text"
                    >
                      Cc
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSecondaryRecipients(true)}
                      className="rounded-full border border-app-border bg-app-secondary/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted transition hover:border-brand/20 hover:text-app-text"
                    >
                      Bcc
                    </button>
                  </div>
                }
              >
                <input
                  value={composeDraft.to}
                  onChange={(event) => setComposeDraft((current) => ({ ...current, to: event.target.value }))}
                  className="w-full bg-transparent text-sm text-app-text outline-none placeholder:text-app-muted"
                  placeholder="Add recipients"
                />
              </ComposeFieldRow>

              {showSecondaryRecipients ? (
                <>
                  <ComposeFieldRow label="Cc">
                    <input
                      value={composeDraft.cc}
                      onChange={(event) => setComposeDraft((current) => ({ ...current, cc: event.target.value }))}
                      className="w-full bg-transparent text-sm text-app-text outline-none placeholder:text-app-muted"
                      placeholder="Copy recipients"
                    />
                  </ComposeFieldRow>
                  <ComposeFieldRow label="Bcc">
                    <input
                      value={composeDraft.bcc}
                      onChange={(event) => setComposeDraft((current) => ({ ...current, bcc: event.target.value }))}
                      className="w-full bg-transparent text-sm text-app-text outline-none placeholder:text-app-muted"
                      placeholder="Hidden recipients"
                    />
                  </ComposeFieldRow>
                </>
              ) : null}

              <ComposeFieldRow label="From">
                <div className="flex min-w-0 items-start gap-2">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${getAvatarTone(
                      selectedOutboundConnection?.email_address || activeMailbox.email_address
                    )}`}
                  >
                    {getAvatarLabel(selectedOutboundConnection?.email_address || activeMailbox.email_address)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-app-text">
                      {selectedOutboundConnection
                        ? `${selectedOutboundConnection.name}${selectedOutboundConnection.is_default ? " • Default" : ""}`
                        : "No outbound connection"}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-app-muted">
                      {selectedOutboundConnection?.email_address || activeMailbox.email_address}
                    </p>
                  </div>
                </div>
              </ComposeFieldRow>

              <ComposeFieldRow label="Subj">
                <input
                  value={composeDraft.subject}
                  onChange={(event) => setComposeDraft((current) => ({ ...current, subject: event.target.value }))}
                  className="w-full bg-transparent text-sm text-app-text outline-none placeholder:text-app-muted"
                  placeholder="Subject"
                />
              </ComposeFieldRow>
            </div>

            <div className="border-t border-app-border bg-[linear-gradient(180deg,rgba(248,250,252,0.55),rgba(255,255,255,0))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.46),rgba(2,6,23,0))]">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-app-muted">
                  <span className="rounded-full border border-app-border bg-app-card px-2.5 py-1">
                    {composeRecipientCount} recipients
                  </span>
                  <span className="rounded-full border border-app-border bg-app-card px-2.5 py-1">
                    {formatStorageSize(composeAttachmentBytes)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setComposeDraft((current) => ({ ...current, trackOpens: !current.trackOpens }))}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      composeDraft.trackOpens
                        ? "bg-brand text-white shadow-[0_16px_28px_-18px_rgba(37,99,235,0.72)]"
                        : "border border-app-border bg-app-card text-app-text"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Track opens
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-[11px] font-semibold text-app-text transition hover:border-brand/20 hover:bg-brand/5">
                    <Paperclip className="h-3.5 w-3.5 text-brand" />
                    Attach
                    <input type="file" multiple onChange={(event) => void handleAddAttachments(event.target.files)} className="hidden" />
                  </label>
                </div>
              </div>

              {composeDraft.editorMode === "plain" ? (
                <textarea
                  value={composeDraft.bodyText}
                  onChange={(event) => setComposeDraft((current) => ({ ...current, bodyText: event.target.value }))}
                  className="min-h-[24rem] w-full resize-none bg-transparent px-4 pb-5 pt-1 text-[15px] leading-8 text-app-text outline-none placeholder:text-app-muted sm:px-5"
                  placeholder="Write your email..."
                />
              ) : (
                <div className="grid gap-0 border-t border-app-border xl:grid-cols-[minmax(0,0.94fr)_minmax(280px,0.86fr)]">
                  <textarea
                    value={composeDraft.bodyHtml}
                    onChange={(event) => setComposeDraft((current) => ({ ...current, bodyHtml: event.target.value }))}
                    className="min-h-[24rem] w-full resize-none border-b border-app-border bg-transparent px-4 py-4 font-mono text-[13px] leading-6 text-app-text outline-none placeholder:text-app-muted xl:border-b-0 xl:border-r sm:px-5"
                    placeholder="<div><strong>Hello</strong> from Student Society Mail.</div>"
                  />
                  <div className="overflow-hidden bg-white">
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <span>Preview</span>
                      <span>HTML email</span>
                    </div>
                    <EmailHtmlFrame html={composeDraft.bodyHtml.trim() || plainTextToHtml("No HTML yet.")} title="Compose email preview" minHeight={390} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="surface-card rounded-[24px] p-3.5">
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={sendingMessage || !selectedOutboundConnection}
              className="btn-primary min-h-[44px] w-full rounded-2xl"
            >
              <Send className="mr-2 h-4 w-4" />
              {sendingMessage ? "Sending..." : "Send email"}
            </button>
          </div>

          <div className="surface-card rounded-[24px] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">Delivery</p>
            <div className="mt-3 space-y-3">
              <div className="rounded-[18px] border border-app-border bg-app-secondary/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">From profile</p>
                <p className="mt-2 text-sm font-semibold text-app-text">
                  {selectedOutboundConnection?.name || "No outbound connection"}
                </p>
                <p className="mt-1 text-xs text-app-muted">
                  {selectedOutboundConnection?.email_address || activeMailbox.email_address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[18px] border border-app-border bg-app-secondary/50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Recipients</p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{composeRecipientCount}</p>
                </div>
                <div className="rounded-[18px] border border-app-border bg-app-secondary/50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Attachments</p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{composeDraft.attachments.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[18px] border border-app-border bg-app-secondary/50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">File size</p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{formatStorageSize(composeAttachmentBytes)}</p>
                </div>
                <div className="rounded-[18px] border border-app-border bg-app-secondary/50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Mode</p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{composeDraft.editorMode === "html" ? "HTML" : "Plain"}</p>
                </div>
              </div>

              {composeDraft.attachments.length > 0 ? (
                <div className="rounded-[18px] border border-app-border bg-app-secondary/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Files</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {composeDraft.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-2 text-xs text-app-text"
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="truncate">{attachment.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setComposeDraft((current) => ({
                              ...current,
                              attachments: current.attachments.filter((item) => item.id !== attachment.id),
                            }))
                          }
                          className="shrink-0 text-rose-700 dark:text-rose-300"
                          aria-label={`Remove ${attachment.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-app-border bg-app-secondary/35 px-4 py-6 text-center text-xs text-app-muted">
                  No files added yet
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    );
  }

  function renderSettingsContent() {
    if (!activeMailbox) {
      return (
        <section className="surface-card rounded-[24px] p-8 text-center">
          <p className="text-base font-semibold text-app-text">Mailbox not ready</p>
          <p className="mt-2 text-sm text-app-muted">Wait for the mailbox assignment before managing connections.</p>
        </section>
      );
    }

    return (
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="surface-card rounded-[22px] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-app-text">Connections</p>
              <p className="mt-1 text-sm text-app-muted">Compact connection cards. Passwords are never shown to users.</p>
            </div>
            <span className="rounded-full border border-app-border bg-app-secondary px-3 py-1.5 text-xs font-semibold text-app-text">
              {activeMailbox.email_address}
            </span>
          </div>

            <div className="mt-4 space-y-3">
            {visibleConnectionProfiles.length > 0 ? (
              visibleConnectionProfiles.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onDelete={() => void handleDeleteConnection(connection.id)}
                  onTest={() => void handleTestConnection(connection.id)}
                />
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-app-border bg-app-secondary/40 px-4 py-6 text-sm text-app-muted">
                No connections yet. Admin will usually assign the first one when your mailbox is approved.
              </div>
            )}
          </div>
        </div>

        <aside className="surface-card rounded-[22px] p-3.5">
          <p className="text-sm font-semibold text-app-text">Add your own connection</p>
          <p className="mt-1 text-xs text-app-muted">You can enter a password here to save a personal SMTP or IMAP profile, but it will stay hidden after save.</p>
          <div className="mt-3 grid gap-3">
            {[
              ["Name", "name", "My Mailbox"],
              ["Email address", "email_address", activeMailbox.email_address || "name@example.com"],
              ["Username", "username", activeMailbox.email_address || "name@example.com"],
              ["Password", "password", "App password or mailbox password"],
              ["SMTP host", "smtp_host", "smtp.example.com"],
              ["SMTP port", "smtp_port", "587"],
              ["IMAP host", "imap_host", "imap.example.com"],
              ["IMAP port", "imap_port", "993"],
            ].map(([label, key, placeholder]) => (
              <label key={key} className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">{label}</span>
                <input
                  value={(connectionDraft as Record<string, string | boolean>)[key] as string}
                  onChange={(event) =>
                    setConnectionDraft((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  type={key === "password" ? "password" : "text"}
                  className="input-shell h-10 rounded-[16px] text-sm"
                  placeholder={placeholder}
                />
              </label>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">SMTP security</span>
                <select
                  value={connectionDraft.smtp_encryption}
                  onChange={(event) =>
                    setConnectionDraft((current) => ({
                      ...current,
                      smtp_encryption: event.target.value as ConnectionDraft["smtp_encryption"],
                    }))
                  }
                  className="input-shell h-10 rounded-[16px] text-sm"
                >
                  <option value="ssl">SSL</option>
                  <option value="tls">TLS</option>
                  <option value="none">None</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">IMAP security</span>
                <select
                  value={connectionDraft.imap_encryption}
                  onChange={(event) =>
                    setConnectionDraft((current) => ({
                      ...current,
                      imap_encryption: event.target.value as ConnectionDraft["imap_encryption"],
                    }))
                  }
                  className="input-shell h-10 rounded-[16px] text-sm"
                >
                  <option value="ssl">SSL</option>
                  <option value="tls">TLS</option>
                  <option value="none">None</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={handleSaveConnection}
              disabled={savingConnection || !activeMailbox}
              className="btn-primary min-h-[42px] rounded-2xl"
            >
              {savingConnection ? "Saving..." : "Save connection"}
            </button>
          </div>
        </aside>
      </section>
    );
  }

  function renderBulkContent() {
    return (
      <section className="surface-card rounded-[24px] p-5">
        <p className="text-base font-semibold text-app-text">Bulk campaigns</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted">
          Variable-based bulk sending, SMTP selection, and CSV audience tools already live in the dedicated Bulk Mailer workspace.
          This mail area links out to that system instead of duplicating it.
        </p>
        <Link to="/app/tools/bulk-mailer" className="btn-primary mt-5 rounded-2xl">
          Open Bulk Mailer
        </Link>
      </section>
    );
  }

  function renderPageContent() {
    if (loadingOverview) {
      return (
        <section className="surface-card rounded-[24px] p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" />
          <p className="mt-3 text-sm text-app-muted">Loading Student Email...</p>
        </section>
      );
    }

    switch (route.view) {
      case "overview":
        return renderOverviewContent();
      case "inbox":
        return renderFolderContent("inbox");
      case "sent":
        return renderFolderContent("sent");
      case "message":
        return renderMessageContent(route.folder || "inbox");
      case "compose":
        return renderComposeContent();
      case "settings":
        return renderSettingsContent();
      case "bulk":
        return renderBulkContent();
      default:
        return renderOverviewContent();
    }
  }

  if (!user) {
    return (
      <div className="native-page pb-28">
        <div className="flex min-h-[calc(100vh-13.5rem)] items-center justify-center">
          <section className="surface-card mx-auto w-full max-w-md rounded-[28px] px-6 py-7 text-center shadow-[0_24px_60px_-38px_rgba(15,23,42,0.3)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-brand/10 text-brand shadow-[0_18px_34px_-24px_rgba(37,99,235,0.38)]">
              <Mail className="h-6 w-6" />
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-app-muted">
              Student Society Mail
            </p>
            <h1 className="mt-2 font-display text-[1.9rem] font-semibold tracking-tight text-app-text">
              Clear, private student email
            </h1>
            <p className="mx-auto mt-3 max-w-[19rem] text-sm leading-6 text-app-muted">
              Inbox, sent, compose, settings, and full message pages in one cleaner mail workspace.
            </p>

            <div className="mt-5 grid w-full grid-cols-3 gap-1.5">
              <span className="flex min-w-0 items-center justify-center rounded-full border border-app-border bg-app-secondary px-2 py-1.5 text-center text-[10px] font-semibold text-app-text">
                Spam-free
              </span>
              <span className="flex min-w-0 items-center justify-center rounded-full border border-app-border bg-app-secondary px-2 py-1.5 text-center text-[10px] font-semibold text-app-text">
                Private
              </span>
              <span className="flex min-w-0 items-center justify-center rounded-full border border-app-border bg-app-secondary px-2 py-1.5 text-center text-[10px] font-semibold text-app-text">
                Focused
              </span>
            </div>

            <Link to={loginHref} className="btn-primary mx-auto mt-6 inline-flex rounded-2xl px-5">
              Log in to continue
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="native-page pb-24">
      <section className="surface-card rounded-[22px] p-3.5">
        {compactSearchHeader ? (
          <div className="w-full rounded-[16px] border border-app-border bg-app-secondary/55 px-3 py-2">
            <div className="flex items-center gap-2.5">
              <Search className="h-4 w-4 text-app-muted" />
              <input
                value={mailSearchQuery}
                onChange={(event) => setMailSearchQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[13px] text-app-text outline-none placeholder:text-app-muted"
                placeholder={`Search ${route.view}`}
              />
            </div>
          </div>
        ) : null}

        {!compactSearchHeader ? (
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
            Student Society Private Mail
          </p>
        ) : null}

        <div className={`${compactSearchHeader ? "mt-3 " : "mt-2 "}-mx-1 overflow-x-auto pb-1 [scrollbar-width:none]`}>
          <div className="flex min-w-max gap-2 px-1">
            {EMAIL_SURFACE_TABS.map((tab) => {
              const active = route.activeSection === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => goToTab(tab.id)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    active ? "bg-brand text-white" : "border border-app-border bg-app-card text-app-text hover:border-brand/20 hover:bg-brand/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {renderPageContent()}
    </div>
  );
}
