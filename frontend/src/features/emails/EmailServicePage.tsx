import {
  Bell,
  ChevronRight,
  Code2,
  Eye,
  HardDrive,
  Inbox,
  Loader2,
  Mail,
  MessageSquareText,
  MoreVertical,
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
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  revealEmailConnection,
  saveEmailConnection,
  sendEmailMessage,
  syncEmailMailbox,
  testEmailConnection,
} from "./api";
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

const EMAIL_SURFACE_TABS: Array<{ id: EmailSurfaceTab; label: string; blurb: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", blurb: "Plans, requests, quota, and mailbox summary.", icon: Sparkles },
  { id: "inbox", label: "Inbox", blurb: "Read received mail 10 emails at a time.", icon: Inbox },
  { id: "sent", label: "Sent", blurb: "See sent emails and open tracking details.", icon: Send },
  { id: "compose", label: "Compose", blurb: "Send private mail with attachments up to 5 MB.", icon: PenSquare },
  { id: "bulk", label: "Bulk", blurb: "Open the bulk sender with tracking and variables.", icon: SlidersHorizontal },
  { id: "settings", label: "Settings", blurb: "Manage assigned or custom SMTP and IMAP.", icon: Settings2 },
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
    "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/20",
    "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/20",
    "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/20",
    "bg-fuchsia-500/20 text-fuchsia-100 ring-1 ring-fuchsia-400/20",
    "bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/20",
    "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-400/20",
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
    <article className="rounded-[24px] border border-[#272a32] bg-[#16181d] p-4 text-slate-100 shadow-[0_26px_44px_-34px_rgba(0,0,0,0.9)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">{plan.durationLabel}</p>
      <h3 className="mt-2 font-display text-xl font-semibold text-white">{plan.label}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-400">
        Mailbox access, inbox sync, tracked sending, and admin assignment in one plan.
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-200">{coinCostLabel}</span>
        <button
          type="button"
          onClick={onBuy}
          disabled={loading || owned}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            owned
              ? "bg-emerald-500/12 text-emerald-200"
              : "bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:opacity-70"
          }`}
        >
          {owned ? "Active" : loading ? "Buying..." : "Buy"}
        </button>
      </div>
    </article>
  );
}

function MessageRow({
  item,
  onOpen,
  selected,
}: {
  item: EmailMessageSummaryRow;
  onOpen: () => void;
  selected: boolean;
}) {
  const senderLabel = getMessageTitle(item);
  const metaChip = getMessageMetaChip(item);
  const timeLabel = formatThreadTime(item.sent_at || item.received_at || item.created_at);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-[20px] border px-3 py-2.5 text-left transition ${
        selected
          ? "border-sky-400/50 bg-sky-500/10 shadow-[0_18px_32px_-28px_rgba(56,189,248,0.65)]"
          : item.is_read
            ? "border-[#242830] bg-[#14161a]"
            : "border-[#334155] bg-[#171a1f]"
      } hover:border-sky-400/30 hover:bg-[#181b20]`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarTone(senderLabel)}`}>
          {getAvatarLabel(senderLabel)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`truncate text-[14px] ${item.is_read ? "font-medium text-slate-200" : "font-semibold text-white"}`}>
                {senderLabel}
              </p>
              <p className={`mt-0.5 truncate text-[13px] ${item.is_read ? "text-slate-200" : "font-semibold text-white"}`}>
                {item.subject || "(No subject)"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <p className={`text-[11px] ${item.is_read ? "text-slate-500" : "text-slate-300"}`}>{timeLabel}</p>
              <Star className={`h-4 w-4 ${selected ? "fill-sky-300 text-sky-300" : "text-slate-500"}`} />
            </div>
          </div>

          <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-400">
            {item.snippet || "Open to read the email."}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {!item.is_read ? <span className="h-2 w-2 rounded-full bg-sky-400" /> : null}
            {metaChip ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-300">
                {item.has_attachments ? <Paperclip className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {metaChip}
              </span>
            ) : null}
            {item.folder === "inbox" && item.has_attachments ? (
              <span className="text-[10px] text-slate-500">Ready to open</span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
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

function MailSurfaceMenuPopover({
  activeTab,
  onSelectTab,
}: {
  activeTab: EmailSurfaceTab;
  onSelectTab: (tab: EmailSurfaceTab) => void;
}) {
  return (
    <div className="absolute bottom-[calc(100%+0.55rem)] right-0 z-30 w-72 max-w-[82vw] rounded-[22px] border border-white/12 bg-[#16191e]/98 p-2.5 shadow-[0_24px_40px_-28px_rgba(0,0,0,0.85)] backdrop-blur">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-200/80">Your Private Mail</p>
      <div className="mt-1 space-y-1.5">
        {EMAIL_SURFACE_TABS.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex w-full items-center gap-3 rounded-[16px] border px-3 py-2.5 text-left transition ${
                active
                  ? "border-sky-400/20 bg-sky-500/10"
                  : "border-white/6 bg-white/5 hover:border-sky-400/20 hover:bg-white/8"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${active ? "bg-sky-500/16 text-sky-200" : "bg-white/8 text-slate-300"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{tab.label}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">{tab.blurb}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConnectionSummary({
  connection,
  revealedPassword,
  onReveal,
  onDelete,
  onTest,
}: {
  connection: EmailConnectionRow;
  revealedPassword?: string | null;
  onReveal: () => void;
  onDelete: () => void;
  onTest: () => void;
}) {
  return (
    <article className="rounded-[24px] border border-[#272a32] bg-[#16181d] p-4 text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${getAvatarTone(connection.email_address)}`}>
            {getAvatarLabel(connection.email_address)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{connection.name}</p>
            <p className="mt-1 text-xs text-slate-400">
              {connection.email_address} • {connection.scope === "assigned" ? "Admin assigned" : "User owned"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/6 px-3 py-1 text-[11px] font-semibold text-slate-300">
            {connection.is_default ? "Default" : "Secondary"}
          </span>
          {!connection.is_active ? (
            <span className="rounded-full bg-rose-500/12 px-3 py-1 text-[11px] font-semibold text-rose-200">Inactive</span>
          ) : null}
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <div className="rounded-[16px] bg-white/4 px-3 py-2">SMTP {connection.smtp_host}:{connection.smtp_port} · {connection.smtp_encryption}</div>
        <div className="rounded-[16px] bg-white/4 px-3 py-2">
          IMAP {connection.imap_host ? `${connection.imap_host}:${connection.imap_port}` : "Not set"}
        </div>
        <div className="rounded-[16px] bg-white/4 px-3 py-2">User {connection.username}</div>
        <div className="rounded-[16px] bg-white/4 px-3 py-2">Pass {revealedPassword ? revealedPassword : "Hidden"}</div>
      </div>
      {connection.last_sync_error ? (
        <p className="mt-3 rounded-[16px] bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{connection.last_sync_error}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onTest}
          className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
        >
          Test
        </button>
        <button
          type="button"
          onClick={onReveal}
          className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
        >
          Reveal password
        </button>
        {connection.scope === "user_owned" ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full bg-rose-500/12 px-3 py-2 text-xs font-semibold text-rose-200"
          >
            Remove
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function EmailServicePage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    featureSettings,
    activeAccess,
    wallet,
    refreshAccess,
    refreshFeatureSettings,
    refreshWallet,
  } = useCoinWalletStore();
  const [activeTab, setActiveTab] = useState<EmailSurfaceTab>("overview");
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overview, setOverview] = useState<EmailMailboxOverview | null>(null);
  const [requestEmailAddress, setRequestEmailAddress] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [requestPlanKey, setRequestPlanKey] = useState<string>(EMAIL_PLAN_DEFINITIONS[0].featureKey);
  const [buyingPlanKey, setBuyingPlanKey] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [folderStateById, setFolderStateById] = useState<Record<"inbox" | "sent", FolderState>>({
    inbox: { loading: false, data: EMPTY_FOLDER_STATE },
    sent: { loading: false, data: EMPTY_FOLDER_STATE },
  });
  const [selectedMessage, setSelectedMessage] = useState<EmailMessageDetail | null>(null);
  const [selectedMessageLoading, setSelectedMessageLoading] = useState(false);
  const [syncingMailbox, setSyncingMailbox] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [composeDraft, setComposeDraft] = useState<ComposeDraft>(EMPTY_COMPOSE_DRAFT);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [savingConnection, setSavingConnection] = useState(false);
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft>(createConnectionDraft());
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [mailSearchQuery, setMailSearchQuery] = useState("");
  const [showSecondaryRecipients, setShowSecondaryRecipients] = useState(false);
  const [selectedMessageView, setSelectedMessageView] = useState<EmailMessageViewMode>("html");

  const activeAccessExpiresAt = overview?.active_access?.expires_at || activeAccess.find((entry) => entry.access_key === "student_email_access")?.expires_at || null;
  const loginHref = buildAuthRedirectPath(location);
  const requestStatus = overview?.requests?.[0] || null;
  const activeMailbox = overview?.mailbox || null;
  const connectionProfiles = overview?.connection_profiles || [];
  const outboundConnections = connectionProfiles.filter((connection) => connection.is_active && connection.outbound_enabled);
  const selectedOutboundConnection =
    outboundConnections.find((connection) => connection.id === selectedConnectionId) ||
    outboundConnections.find((connection) => connection.is_default) ||
    outboundConnections[0] ||
    null;
  const activeTabMeta = EMAIL_SURFACE_TABS.find((entry) => entry.id === activeTab) || EMAIL_SURFACE_TABS[0];
  const ActiveTabIcon = activeTabMeta.icon;
  const composeRecipientCount =
    parseRecipients(composeDraft.to).length +
    parseRecipients(composeDraft.cc).length +
    parseRecipients(composeDraft.bcc).length;
  const composeAttachmentBytes = getBulkMailerAttachmentTotalSize(composeDraft.attachments);
  const activeFolderState = activeTab === "inbox" || activeTab === "sent" ? folderStateById[activeTab] : null;
  const filteredMessages = useMemo(
    () => (activeFolderState?.data.items || []).filter((item) => matchesMailSearch(item, mailSearchQuery)),
    [activeFolderState?.data.items, mailSearchQuery]
  );
  const storageUsagePercent = activeMailbox
    ? Math.min(100, Math.round((activeMailbox.used_bytes / Math.max(activeMailbox.quota_bytes, 1)) * 100))
    : 0;
  const activeConnectionCount = connectionProfiles.filter((connection) => connection.is_active).length;
  const mailboxAvatarSeed = activeMailbox?.email_address || activeMailbox?.display_name || user?.email || user?.id || "mail";
  const activePlan = useMemo(
    () => EMAIL_PLAN_DEFINITIONS.find((entry) => entry.featureKey === overview?.active_access?.granted_by_feature_key) || null,
    [overview?.active_access?.granted_by_feature_key]
  );

  async function refreshOverview() {
    if (!user) {
      setOverview(null);
      setLoadingOverview(false);
      return;
    }

    setLoadingOverview(true);
    try {
      const nextOverview = await loadEmailOverview();
      setOverview(nextOverview);
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load Student Email.");
    } finally {
      setLoadingOverview(false);
    }
  }

  useEffect(() => {
    void refreshOverview();
  }, [user?.id]);

  async function loadFolder(folder: "inbox" | "sent", offset = 0, append = false) {
    if (!activeMailbox) {
      return;
    }

    setFolderStateById((current) => ({
      ...current,
      [folder]: {
        ...current[folder],
        loading: true,
      },
    }));

    try {
      const response = await listEmailMessages({
        folder,
        offset,
        limit: 10,
        mailboxId: activeMailbox.id,
      });
      setFolderStateById((current) => ({
        ...current,
        [folder]: {
          loading: false,
          data: append
            ? {
                ...response,
                items: [...current[folder].data.items, ...response.items],
              }
            : response,
        },
      }));
    } catch (error) {
      setFolderStateById((current) => ({
        ...current,
        [folder]: {
          ...current[folder],
          loading: false,
        },
      }));
      toast.error(error instanceof Error ? error.message : "Could not load emails.");
    }
  }

  useEffect(() => {
    if (!activeMailbox) {
      return;
    }

    if (activeTab === "inbox" && folderStateById.inbox.data.items.length === 0 && !folderStateById.inbox.loading) {
      void loadFolder("inbox");
    }

    if (activeTab === "sent" && folderStateById.sent.data.items.length === 0 && !folderStateById.sent.loading) {
      void loadFolder("sent");
    }
  }, [activeMailbox?.id, activeTab]);

  useEffect(() => {
    setMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (composeDraft.cc || composeDraft.bcc) {
      setShowSecondaryRecipients(true);
    }
  }, [composeDraft.cc, composeDraft.bcc]);

  async function openMessage(messageId: string) {
    setSelectedMessageLoading(true);
    try {
      const detail = await loadEmailMessage(messageId);
      setSelectedMessage(detail);
      setSelectedMessageView(detail.payload.html.trim() ? "html" : "text");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load this email.");
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
      await Promise.allSettled([
        refreshAccess(),
        refreshWallet(),
        refreshFeatureSettings(),
      ]);
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
      await Promise.all([refreshOverview(), loadFolder("inbox")]);
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
      const result = await sendEmailMessage({
        mailbox_id: activeMailbox.id,
        selected_connection_id: selectedOutboundConnection.id,
        to: parseRecipients(composeDraft.to),
        cc: parseRecipients(composeDraft.cc),
        bcc: parseRecipients(composeDraft.bcc),
        subject: composeDraft.subject.trim(),
        body_text: composeDraft.editorMode === "html" && composeDraft.bodyHtml.trim() ? "" : composeDraft.bodyText,
        body_html: composeDraft.editorMode === "html" ? composeDraft.bodyHtml.trim() : undefined,
        track_opens: composeDraft.trackOpens,
        attachments: composeDraft.attachments.map((attachment) => ({
          name: attachment.name,
          content_type: attachment.contentType,
          content_base64: attachment.contentBase64,
          size: attachment.size,
        })),
      });
      setComposeDraft(EMPTY_COMPOSE_DRAFT);
      setShowSecondaryRecipients(false);
      setActiveTab("sent");
      toast.success(
        result.failed_recipients.length > 0
          ? `Email sent to ${result.successful_recipients.length} recipient(s), some failed.`
          : "Email sent."
      );
      await Promise.all([refreshOverview(), loadFolder("sent")]);
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
      const totalSize = getBulkMailerAttachmentTotalSize(
        nextAttachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          contentType: attachment.contentType,
          size: attachment.size,
          contentBase64: attachment.contentBase64,
        }))
      );

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

  async function handleDeleteMessage(messageId: string, folder: "inbox" | "sent") {
    try {
      await deleteEmailMessage(messageId);
      toast.success("Email deleted.");
      setSelectedMessage(null);
      await Promise.all([refreshOverview(), loadFolder(folder)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the email.");
    }
  }

  async function handleRevealConnection(connectionId: string) {
    try {
      const credentials = await revealEmailConnection(connectionId);
      setRevealedPasswords((current) => ({
        ...current,
        [connectionId]: credentials.password,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reveal the password.");
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
    setActiveTab("compose");
  }

  const currentPlanCards = EMAIL_PLAN_DEFINITIONS.map((plan) => {
    const planSetting = findEmailPlanSetting(featureSettings, plan.featureKey) || findCoinFeatureSetting(featureSettings, plan.featureKey);
    return {
      plan,
      coinCostLabel: planSetting?.is_enabled ? formatCoinAmount(planSetting.coins_required) : "Disabled",
      owned: activePlan?.featureKey === plan.featureKey,
    };
  });

  if (!user) {
    return (
      <div className="space-y-4 pb-28">
        <section className="relative overflow-hidden rounded-[30px] border border-[#272b34] bg-[#101215] p-4 text-slate-100 shadow-[0_30px_70px_-48px_rgba(0,0,0,0.95)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_26%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] border border-white/10 bg-white/6 px-3 py-2.5 backdrop-blur">
            <Search className="h-4 w-4 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-400">Search in mail</p>
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-slate-100 transition hover:bg-white/12"
                aria-label={menuOpen ? "Close email menu" : "Open email menu"}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                {menuOpen ? <X className="h-4.5 w-4.5" /> : <MoreVertical className="h-4.5 w-4.5" />}
              </button>
              {menuOpen ? (
                <MailSurfaceMenuPopover
                  activeTab={activeTab}
                  onSelectTab={(tab) => {
                    setActiveTab(tab);
                    setMenuOpen(false);
                  }}
                />
              ) : null}
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/18 text-sm font-semibold text-sky-100 ring-1 ring-sky-300/20">
            M
          </div>
        </div>

          <div className="relative mt-5 flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-500/90 to-cyan-400/80 text-white shadow-[0_18px_28px_-20px_rgba(56,189,248,0.68)]">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-200/80">Your Private Mail</p>
              <h1 className="mt-2 font-display text-[1.8rem] font-semibold tracking-tight text-white">Student Society Mail</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Compact inbox, tracked sending, clean compose, and domain-flexible mailboxes with a professional mail client feel.
              </p>
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-slate-200">All inboxes</span>
            <span className="rounded-full bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold text-sky-200">Clean mobile UI</span>
          </div>

          <Link
            to={loginHref}
            className="relative mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-semibold text-slate-950 shadow-[0_18px_30px_-20px_rgba(56,189,248,0.75)] transition hover:bg-sky-400"
          >
            Log in to continue
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 text-slate-100">
      <section className="relative overflow-hidden rounded-[30px] border border-[#272b34] bg-[#101215] p-4 shadow-[0_30px_70px_-48px_rgba(0,0,0,0.95)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_26%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] border border-white/10 bg-white/6 px-3 py-2.5 backdrop-blur">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={mailSearchQuery}
              onChange={(event) => setMailSearchQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="Search in mail"
            />
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-slate-100 transition hover:bg-white/12"
                aria-label={menuOpen ? "Close email menu" : "Open email menu"}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                {menuOpen ? <X className="h-4.5 w-4.5" /> : <MoreVertical className="h-4.5 w-4.5" />}
              </button>
              {menuOpen ? (
                <MailSurfaceMenuPopover
                  activeTab={activeTab}
                  onSelectTab={(tab) => {
                    setActiveTab(tab);
                    setMenuOpen(false);
                  }}
                />
              ) : null}
            </div>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ${getAvatarTone(mailboxAvatarSeed)}`}>
            {getAvatarLabel(mailboxAvatarSeed)}
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
            {activeMailbox ? "All inboxes" : "Mailbox setup"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold text-sky-200">
            <ActiveTabIcon className="h-3.5 w-3.5" />
            {activeTabMeta.label}
          </span>
          {activeMailbox ? (
            <span className="rounded-full bg-white/6 px-3 py-1.5 text-[11px] font-medium text-slate-300">
              {activeMailbox.email_address}
            </span>
          ) : null}
          {activePlan ? (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200">
              {activePlan.label}
            </span>
          ) : null}
        </div>

        <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
          {activeMailbox ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-left transition hover:bg-white/8"
              >
                <div className="flex items-center justify-between">
                  <Inbox className="h-4.5 w-4.5 text-sky-200" />
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">Unread</p>
                <p className="mt-1 text-2xl font-semibold text-white">{overview?.unread_inbox_count || 0}</p>
                <p className="mt-1 text-xs text-slate-400">Fast 10-email batches</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("sent")}
                className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-left transition hover:bg-white/8"
              >
                <div className="flex items-center justify-between">
                  <Bell className="h-4.5 w-4.5 text-sky-200" />
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">Sent</p>
                <p className="mt-1 text-2xl font-semibold text-white">{overview?.sent_count || 0}</p>
                <p className="mt-1 text-xs text-slate-400">Tracked opens stay visible</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-left transition hover:bg-white/8"
              >
                <div className="flex items-center justify-between">
                  <HardDrive className="h-4.5 w-4.5 text-sky-200" />
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">Storage</p>
                <p className="mt-1 text-xl font-semibold text-white">{storageUsagePercent}%</p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatStorageSize(activeMailbox.used_bytes)} of {formatStorageSize(activeMailbox.quota_bytes)}
                </p>
              </button>
            </>
          ) : (
            <>
              <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Wallet</p>
                <p className="mt-1 text-2xl font-semibold text-white">{wallet ? formatCoinAmount(wallet.balance) : "..."}</p>
                <p className="mt-1 text-xs text-slate-400">Use coins to activate email plans</p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Plan</p>
                <p className="mt-1 text-xl font-semibold text-white">{activePlan ? activePlan.label : "Not active"}</p>
                <p className="mt-1 text-xs text-slate-400">Buy one plan, then request the mailbox you want</p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Request</p>
                <p className="mt-1 text-xl font-semibold text-white">{requestStatus ? formatMailboxStatus(requestStatus.status) : "Not started"}</p>
                <p className="mt-1 text-xs text-slate-400">Any domain can be assigned by admin</p>
              </div>
            </>
          )}
        </div>
      </section>

      {loadingOverview ? (
        <section className="rounded-[28px] border border-[#272b34] bg-[#13151a] p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-300" />
          <p className="mt-3 text-sm text-slate-400">Loading Student Email...</p>
        </section>
      ) : null}

      {!loadingOverview && activeTab === "overview" ? (
        activeMailbox ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_340px]">
            <section className="rounded-[28px] border border-[#272b34] bg-[#13151a] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">Mailbox dashboard</p>
                  <p className="mt-1 text-xs text-slate-400">Smaller, faster, cleaner mail controls.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncMailbox}
                  disabled={syncingMailbox}
                  className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCcw className={`h-3.5 w-3.5 ${syncingMailbox ? "animate-spin" : ""}`} />
                  {syncingMailbox ? "Syncing..." : "Sync inbox"}
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Assigned</p>
                  <p className="mt-2 text-lg font-semibold text-white">{activeMailbox.email_address}</p>
                  <p className="mt-1 text-sm text-slate-400">Status {formatMailboxStatus(activeMailbox.status)}</p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Plan</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {activePlan ? activePlan.label : "No active plan"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {activePlan ? `Until ${formatTimestamp(activeAccessExpiresAt)}` : "Activate access to keep sending"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Storage</p>
                    <span className="text-xs font-semibold text-slate-300">{storageUsagePercent}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/8">
                    <div className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" style={{ width: `${storageUsagePercent}%` }} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">
                    {formatStorageSize(activeMailbox.used_bytes)} / {formatStorageSize(activeMailbox.quota_bytes)}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Connections</p>
                  <p className="mt-2 text-lg font-semibold text-white">{activeConnectionCount}</p>
                  <p className="mt-1 text-sm text-slate-400">Assigned and personal SMTP/IMAP profiles</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { id: "inbox" as const, icon: Inbox, title: "Open inbox", body: "Compact threaded list" },
                  { id: "sent" as const, icon: Send, title: "Open sent", body: "Track opens and retries" },
                  { id: "compose" as const, icon: PenSquare, title: "Compose mail", body: "Clean Gmail-like editor" },
                ].map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setActiveTab(entry.id)}
                    className="rounded-[22px] border border-white/8 bg-[#171a20] p-4 text-left transition hover:border-sky-400/20 hover:bg-[#1a1e24]"
                  >
                    <entry.icon className="h-4.5 w-4.5 text-sky-200" />
                    <p className="mt-3 text-sm font-semibold text-white">{entry.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{entry.body}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#272b34] bg-[#13151a] p-4">
              <p className="text-lg font-semibold text-white">Included</p>
              <div className="mt-4 grid gap-3">
                {[
                  { icon: ShieldCheck, title: "Admin pricing", body: "Monthly, 6 month, and yearly passes stay flexible." },
                  { icon: RefreshCcw, title: "Inbox sync", body: "Pull IMAP mail into fast 10-email R2 batches." },
                  { icon: Send, title: "Tracked send", body: "See who opened, how many times, and what failed." },
                  { icon: Settings2, title: "Own SMTP", body: "Keep the admin setup or add your own connection." },
                ].map((entry) => (
                  <div key={entry.title} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-sky-500/12 text-sky-200">
                        <entry.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{entry.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{entry.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_340px]">
            <section className="space-y-4 rounded-[28px] border border-[#272b34] bg-[#13151a] p-4">
              <div>
                <p className="text-lg font-semibold text-white">Activate your mailbox</p>
                <p className="mt-1 text-xs text-slate-400">Buy a pass, request the email address you want, and let admin assign the final mailbox.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
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

              <div className="rounded-[24px] border border-white/8 bg-[#171a20] p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Request mailbox</p>
                      <p className="mt-1 text-xs text-slate-400">Ask for any mailbox address. Admin can assign any domain and credentials.</p>
                    </div>
                    <label className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Preferred email</span>
                      <input
                        value={requestEmailAddress}
                        onChange={(event) => setRequestEmailAddress(event.target.value)}
                        className="h-12 rounded-[18px] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                        placeholder="your.name@domain.com"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Plan</span>
                      <select
                        value={requestPlanKey}
                        onChange={(event) => setRequestPlanKey(event.target.value)}
                        className="h-12 rounded-[18px] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none"
                      >
                        {EMAIL_PLAN_DEFINITIONS.map((plan) => (
                          <option key={plan.featureKey} value={plan.featureKey} className="bg-slate-900">
                            {plan.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Note</span>
                      <textarea
                        value={requestNote}
                        onChange={(event) => setRequestNote(event.target.value)}
                        className="min-h-[120px] rounded-[20px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                        placeholder="Preferred aliases, course, or mailbox purpose."
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleSubmitRequest}
                      disabled={submittingRequest || !overview?.active_access}
                      className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
                    >
                      {submittingRequest ? "Sending..." : "Request mailbox"}
                    </button>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">Current request</p>
                    {requestStatus ? (
                      <>
                        <p className="mt-3 text-lg font-semibold text-white">{requestStatus.preferred_email_address}</p>
                        <p className="mt-1 text-sm text-slate-400">Status {formatMailboxStatus(requestStatus.status)}</p>
                        <p className="mt-3 text-xs text-slate-500">Requested {formatTimestamp(requestStatus.created_at)}</p>
                        {requestStatus.admin_note ? (
                          <p className="mt-3 rounded-[16px] bg-sky-500/10 px-3 py-2 text-xs text-sky-100">{requestStatus.admin_note}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">No mailbox request yet.</p>
                    )}
                    {!overview?.active_access ? (
                      <p className="mt-4 rounded-[16px] bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        Buy a plan first, then send the request.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#272b34] bg-[#13151a] p-4">
              <p className="text-lg font-semibold text-white">What you get</p>
              <div className="mt-4 grid gap-3">
                {[
                  { icon: ShieldCheck, title: "Flexible domains", body: "Any final mailbox domain can be assigned by admin." },
                  { icon: Send, title: "Tracked sending", body: "Open tracking, sent history, reply, and forward flows." },
                  { icon: RefreshCcw, title: "R2 storage", body: "Mail stays in lightweight 10-message batches." },
                  { icon: Settings2, title: "Own connection", body: "Use assigned SMTP/IMAP or add your own profile." },
                ].map((entry) => (
                  <div key={entry.title} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-sky-500/12 text-sky-200">
                        <entry.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{entry.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{entry.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )
      ) : null}

      {!loadingOverview && (activeTab === "inbox" || activeTab === "sent") ? (
        activeMailbox ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(290px,0.84fr)_minmax(0,1.16fr)]">
            <section className="rounded-[24px] border border-[#272b34] bg-[#13151a] p-2.5">
              <div className="mb-3 flex items-center justify-between gap-3 px-1 pt-1">
                <div>
                  <p className="text-lg font-semibold text-white">{activeTab === "inbox" ? "All inboxes" : "Sent"}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {mailSearchQuery.trim()
                      ? `${filteredMessages.length} match${filteredMessages.length === 1 ? "" : "es"}`
                      : `${activeFolderState?.data.total_count || 0} email${(activeFolderState?.data.total_count || 0) === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeTab === "inbox" ? (
                    <button
                      type="button"
                      onClick={handleSyncMailbox}
                      disabled={syncingMailbox}
                      className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
                    >
                      <RefreshCcw className={`h-3.5 w-3.5 ${syncingMailbox ? "animate-spin" : ""}`} />
                      {syncingMailbox ? "Syncing..." : "Sync"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                {filteredMessages.map((item) => (
                  <MessageRow
                    key={item.id}
                    item={item}
                    selected={selectedMessage?.message.id === item.id}
                    onOpen={() => void openMessage(item.id)}
                  />
                ))}
                {activeFolderState?.loading ? (
                  <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-400">
                    Loading emails...
                  </div>
                ) : null}
                {!activeFolderState?.loading && filteredMessages.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-400">
                    {mailSearchQuery.trim() ? "No emails match your search." : "No emails here yet."}
                  </div>
                ) : null}
              </div>

              {activeFolderState?.data.has_more ? (
                <button
                  type="button"
                  onClick={() => void loadFolder(activeTab, activeFolderState.data.next_offset, true)}
                  className="mt-4 inline-flex min-h-[38px] items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Load next 10
                </button>
              ) : null}
            </section>

            <section className="rounded-[24px] border border-[#272b34] bg-[#13151a] p-3.5">
              {selectedMessageLoading ? (
                <div className="flex min-h-[18rem] items-center justify-center text-sm text-slate-400">Loading email...</div>
              ) : selectedMessage ? (
                <div className="space-y-3.5">
                  <div className="border-b border-white/8 pb-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-white">{selectedMessage.message.subject || "(No subject)"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTimestamp(selectedMessage.message.sent_at || selectedMessage.message.received_at || selectedMessage.message.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => prefillCompose("reply", selectedMessage)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-100 transition hover:bg-white/10"
                          aria-label="Reply"
                        >
                          <Reply className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => prefillCompose("forward", selectedMessage)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-100 transition hover:bg-white/10"
                          aria-label="Forward"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteMessage(selectedMessage.message.id, activeTab)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/12 text-rose-200 transition hover:bg-rose-500/18"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ${getAvatarTone(selectedMessage.message.from_email || selectedMessage.message.from_name || "mail")}`}>
                        {getAvatarLabel(selectedMessage.message.from_name || selectedMessage.message.from_email || "M")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {selectedMessage.message.from_name || selectedMessage.message.from_email}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
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
                            ? "bg-sky-500 text-slate-950"
                            : "border border-white/10 bg-white/6 text-slate-200 disabled:opacity-40"
                        }`}
                      >
                        HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMessageView("text")}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                          selectedMessageView === "text"
                            ? "bg-sky-500 text-slate-950"
                            : "border border-white/10 bg-white/6 text-slate-200"
                        }`}
                      >
                        Text
                      </button>
                      {selectedMessage.payload.html.trim() ? (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                          Gmail-style HTML
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {selectedMessageView === "html" && selectedMessage.payload.html.trim() ? (
                    <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.55)]">
                      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <span>Rendered message</span>
                        <span>HTML email</span>
                      </div>
                      <EmailHtmlFrame
                        html={selectedMessage.payload.html}
                        title={`Email ${selectedMessage.message.id}`}
                        minHeight={360}
                      />
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-white/8 bg-[#171a20] px-4 py-4">
                      <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
                        {selectedMessage.payload.text || selectedMessage.message.snippet || "No text preview available."}
                      </pre>
                    </div>
                  )}

                  {selectedMessage.payload.attachments.length > 0 ? (
                    <div className="rounded-[20px] border border-white/8 bg-[#171a20] p-4">
                      <p className="text-sm font-semibold text-white">Attachments</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedMessage.payload.attachments.map((attachment) => (
                          <div
                            key={`${attachment.object_key || attachment.name}-${attachment.size}`}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-200"
                          >
                            <Paperclip className="h-3.5 w-3.5 text-sky-200" />
                            <span className="max-w-[12rem] truncate">{attachment.name}</span>
                            <span className="text-slate-400">{formatStorageSize(attachment.size)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedMessage.receipts.length > 0 ? (
                    <div className="rounded-[20px] border border-white/8 bg-[#171a20] p-4">
                      <p className="text-sm font-semibold text-white">Tracking</p>
                      <div className="mt-3 grid gap-2">
                        {selectedMessage.receipts.map((receipt) => (
                          <div
                            key={receipt.id}
                            className="flex items-center justify-between gap-3 rounded-[18px] bg-white/5 px-3 py-2.5 text-xs text-slate-300"
                          >
                            <span className="truncate">{receipt.recipient_email}</span>
                            <span>{receipt.open_count > 0 ? `${receipt.open_count} opens` : "Not opened yet"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[24rem] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/5 px-6 text-center text-sm text-slate-400">
                  Pick an email from the list to read it here.
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="rounded-[28px] border border-[#272b34] bg-[#13151a] p-8 text-center">
            <p className="text-lg font-semibold text-white">Mailbox not ready</p>
            <p className="mt-2 text-sm text-slate-400">Open Overview, activate a plan, and request the mailbox first.</p>
          </section>
        )
      ) : null}

      {!loadingOverview && activeTab === "compose" ? (
        activeMailbox ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
            <div className="rounded-[24px] border border-[#272b34] bg-[#13151a] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-sky-500/12 text-sky-200">
                    <PenSquare className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">New message</p>
                    <p className="mt-1 text-xs text-slate-400">{selectedOutboundConnection?.email_address || activeMailbox.email_address}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/6 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                    {composeRecipientCount} to
                  </span>
                  <span className="rounded-full bg-white/6 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                    {formatStorageSize(composeAttachmentBytes)}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">To</span>
                  <input
                    value={composeDraft.to}
                    onChange={(event) => setComposeDraft((current) => ({ ...current, to: event.target.value }))}
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Add recipients"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowSecondaryRecipients(true)}
                      className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300"
                    >
                      Cc
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSecondaryRecipients(true)}
                      className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300"
                    >
                      Bcc
                    </button>
                  </div>
                </label>

                {showSecondaryRecipients ? (
                  <>
                    <label className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Cc</span>
                      <input
                        value={composeDraft.cc}
                        onChange={(event) => setComposeDraft((current) => ({ ...current, cc: event.target.value }))}
                        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                        placeholder="Copy recipients"
                      />
                    </label>
                    <label className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Bcc</span>
                      <input
                        value={composeDraft.bcc}
                        onChange={(event) => setComposeDraft((current) => ({ ...current, bcc: event.target.value }))}
                        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                        placeholder="Hidden recipients"
                      />
                    </label>
                  </>
                ) : null}

                <label className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Subj</span>
                  <input
                    value={composeDraft.subject}
                    onChange={(event) => setComposeDraft((current) => ({ ...current, subject: event.target.value }))}
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Subject"
                  />
                </label>

                <div className="rounded-[24px] border border-white/10 bg-[#171a20] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-sky-500/12 text-sky-200">
                      <MessageSquareText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Message</p>
                      <p className="mt-1 text-xs text-slate-500">Plain text or HTML. Incoming Gmail-style emails will render properly in the reader.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => switchComposeEditorMode("plain")}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                          composeDraft.editorMode === "plain"
                            ? "bg-sky-500 text-slate-950"
                            : "border border-white/10 bg-white/6 text-slate-200"
                        }`}
                      >
                        Plain text
                      </button>
                      <button
                        type="button"
                        onClick={() => switchComposeEditorMode("html")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                          composeDraft.editorMode === "html"
                            ? "bg-sky-500 text-slate-950"
                            : "border border-white/10 bg-white/6 text-slate-200"
                        }`}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        HTML
                      </button>
                    </div>
                  </div>

                  {composeDraft.editorMode === "plain" ? (
                    <textarea
                      value={composeDraft.bodyText}
                      onChange={(event) => setComposeDraft((current) => ({ ...current, bodyText: event.target.value }))}
                      className="mt-4 min-h-[18rem] w-full resize-none bg-transparent text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
                      placeholder="Write your email..."
                    />
                  ) : (
                    <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.94fr)_minmax(280px,0.86fr)]">
                      <textarea
                        value={composeDraft.bodyHtml}
                        onChange={(event) => setComposeDraft((current) => ({ ...current, bodyHtml: event.target.value }))}
                        className="min-h-[18rem] w-full resize-none rounded-[20px] border border-white/10 bg-[#111317] px-4 py-3 font-mono text-[13px] leading-6 text-slate-100 outline-none placeholder:text-slate-500"
                        placeholder="<div><strong>Hello</strong> from Student Society Mail.</div>"
                      />
                      <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.55)]">
                        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <span>Preview</span>
                          <span>HTML email</span>
                        </div>
                        <EmailHtmlFrame
                          html={composeDraft.bodyHtml.trim() || plainTextToHtml("No HTML yet.")}
                          title="Compose email preview"
                          minHeight={320}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[24px] border border-[#272b34] bg-[#13151a] p-4">
              <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">From</p>
                {outboundConnections.length > 0 ? (
                  <select
                    value={selectedOutboundConnection?.id || ""}
                    onChange={(event) => setSelectedConnectionId(event.target.value)}
                    className="mt-2 w-full bg-transparent text-sm font-semibold text-white outline-none"
                  >
                    {outboundConnections.map((connection) => (
                      <option key={connection.id} value={connection.id} className="bg-slate-900">
                        {connection.name} {connection.is_default ? "• Default" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-2 text-xs text-rose-200">No outbound connection</p>
                )}
                {selectedOutboundConnection ? <p className="mt-1 text-[11px] text-slate-400">{selectedOutboundConnection.email_address}</p> : null}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setComposeDraft((current) => ({ ...current, trackOpens: !current.trackOpens }))}
                  className={`rounded-[20px] px-3 py-3 text-center transition ${
                    composeDraft.trackOpens
                      ? "bg-sky-500 text-slate-950 shadow-[0_16px_28px_-18px_rgba(56,189,248,0.75)]"
                      : "border border-white/8 bg-white/5 text-slate-100"
                  }`}
                >
                  <Eye className="mx-auto h-4 w-4" />
                  <p className="mt-1 text-[11px] font-semibold">Track</p>
                </button>

                <label className="cursor-pointer rounded-[20px] border border-white/8 bg-white/5 px-3 py-3 text-center text-slate-100 transition hover:bg-white/8">
                  <Paperclip className="mx-auto h-4 w-4 text-sky-200" />
                  <p className="mt-1 text-[11px] font-semibold">Attach</p>
                  <input type="file" multiple onChange={(event) => void handleAddAttachments(event.target.files)} className="hidden" />
                </label>

                <div className="rounded-[20px] border border-white/8 bg-white/5 px-3 py-3 text-center text-slate-100">
                  <Paperclip className="mx-auto h-4 w-4 text-sky-200" />
                  <p className="mt-1 text-[11px] font-semibold">{composeDraft.attachments.length || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[20px] border border-white/8 bg-white/5 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Files</p>
                  <p className="mt-1 text-sm font-semibold text-white">{formatStorageSize(composeAttachmentBytes)}</p>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/5 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Mode</p>
                  <p className="mt-1 text-sm font-semibold text-white">{composeDraft.editorMode === "html" ? "HTML" : "Plain"}</p>
                </div>
              </div>

              {composeDraft.attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {composeDraft.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-200"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-sky-200" />
                      <span className="truncate">{attachment.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setComposeDraft((current) => ({
                            ...current,
                            attachments: current.attachments.filter((item) => item.id !== attachment.id),
                          }))
                        }
                        className="shrink-0 text-rose-200"
                        aria-label={`Remove ${attachment.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-center text-xs text-slate-400">
                  No files
                </div>
              )}

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={sendingMessage || !selectedOutboundConnection}
                className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_20px_30px_-20px_rgba(56,189,248,0.82)] transition hover:bg-sky-400 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {sendingMessage ? "Sending..." : "Send"}
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-[#272b34] bg-[#13151a] p-8 text-center">
            <p className="text-lg font-semibold text-white">Mailbox not ready</p>
            <p className="mt-2 text-sm text-slate-400">Complete mailbox assignment first, then compose from here.</p>
          </section>
        )
      ) : null}

      {!loadingOverview && activeTab === "bulk" ? (
        <section className="rounded-[28px] border border-[#272b34] bg-[#13151a] p-5">
          <p className="text-lg font-semibold text-white">Bulk campaigns</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Variable-based bulk sending, SMTP selection, and CSV audience tools already live in the dedicated Bulk Mailer workspace.
            This email system connects to that engine instead of copying it.
          </p>
          <Link
            to="/app/tools/bulk-mailer"
            className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Open Bulk Mailer
          </Link>
        </section>
      ) : null}

      {!loadingOverview && activeTab === "settings" ? (
        <section className="space-y-4 rounded-[28px] border border-[#272b34] bg-[#13151a] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">Connections</p>
              <p className="mt-1 text-xs text-slate-400">Keep the assigned connection or add your own SMTP + IMAP profile.</p>
            </div>
            {activeMailbox ? (
              <span className="rounded-full bg-white/6 px-3 py-1.5 text-[11px] font-semibold text-slate-300">{activeMailbox.email_address}</span>
            ) : null}
          </div>

          {activeMailbox ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-3">
                {connectionProfiles.length > 0 ? (
                  connectionProfiles.map((connection) => (
                    <ConnectionSummary
                      key={connection.id}
                      connection={connection}
                      revealedPassword={revealedPasswords[connection.id]}
                      onReveal={() => void handleRevealConnection(connection.id)}
                      onDelete={() => void handleDeleteConnection(connection.id)}
                      onTest={() => void handleTestConnection(connection.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                    No connections yet. Admin will usually assign the first one when your mailbox is approved.
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-white/8 bg-[#171a20] p-4">
                <p className="text-sm font-semibold text-white">Add your own connection</p>
                <div className="mt-3 grid gap-3">
                  {[
                    ["Name", "name", "My Mailbox"],
                    ["Email address", "email_address", activeMailbox.email_address || "name@example.com"],
                    ["Username", "username", activeMailbox.email_address || "name@example.com"],
                    ["Password", "password", "Mailbox password"],
                    ["SMTP host", "smtp_host", "smtp.example.com"],
                    ["SMTP port", "smtp_port", "587"],
                    ["IMAP host", "imap_host", "imap.example.com"],
                    ["IMAP port", "imap_port", "993"],
                  ].map(([label, key, placeholder]) => (
                    <label key={key} className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
                      <input
                        value={(connectionDraft as Record<string, string | boolean>)[key] as string}
                        onChange={(event) =>
                          setConnectionDraft((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        className="h-11 rounded-[18px] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                        placeholder={placeholder}
                      />
                    </label>
                  ))}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">SMTP security</span>
                      <select
                        value={connectionDraft.smtp_encryption}
                        onChange={(event) =>
                          setConnectionDraft((current) => ({
                            ...current,
                            smtp_encryption: event.target.value as ConnectionDraft["smtp_encryption"],
                          }))
                        }
                        className="h-11 rounded-[18px] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none"
                      >
                        <option value="ssl" className="bg-slate-900">SSL</option>
                        <option value="tls" className="bg-slate-900">TLS</option>
                        <option value="none" className="bg-slate-900">None</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">IMAP security</span>
                      <select
                        value={connectionDraft.imap_encryption}
                        onChange={(event) =>
                          setConnectionDraft((current) => ({
                            ...current,
                            imap_encryption: event.target.value as ConnectionDraft["imap_encryption"],
                          }))
                        }
                        className="h-11 rounded-[18px] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none"
                      >
                        <option value="ssl" className="bg-slate-900">SSL</option>
                        <option value="tls" className="bg-slate-900">TLS</option>
                        <option value="none" className="bg-slate-900">None</option>
                      </select>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveConnection}
                    disabled={savingConnection || !activeMailbox}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
                  >
                    {savingConnection ? "Saving..." : "Save connection"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
              Wait for the mailbox assignment before managing connections.
            </div>
          )}
        </section>
      ) : null}

      {activeMailbox && activeTab !== "compose" ? (
        <button
          type="button"
          onClick={() => setActiveTab("compose")}
          className="fixed bottom-[5.9rem] right-4 z-20 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-semibold text-slate-950 shadow-[0_24px_34px_-20px_rgba(56,189,248,0.82)] transition hover:bg-sky-400 md:bottom-8"
        >
          <PenSquare className="h-4 w-4" />
          Compose
        </button>
      ) : null}
    </div>
  );
}
