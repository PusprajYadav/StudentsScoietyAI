import {
  BarChart3,
  DatabaseZap,
  FileText,
  HardDrive,
  Inbox,
  Mail,
  MessageSquareText,
  Settings2,
  ShieldAlert,
  UsersRound,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCompactCount } from "../../lib/formatting";

export type AdminTabId =
  | "overview"
  | "users"
  | "posts"
  | "comments"
  | "communities"
  | "trust"
  | "media"
  | "tools"
  | "emailServices"
  | "bulkMailer"
  | "platform"
  | "cache";

interface AdminTabDefinition {
  id: AdminTabId;
  label: string;
  description: string;
  groupLabel: string;
  icon: LucideIcon;
  gradientClass: string;
  iconClass: string;
  softClass: string;
}

export const ADMIN_TAB_DEFINITIONS: AdminTabDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Quick actions and loaded views",
    groupLabel: "Workspace",
    icon: BarChart3,
    gradientClass: "from-sky-500 to-cyan-500",
    iconClass: "from-sky-100 to-cyan-50 text-sky-700",
    softClass: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    id: "users",
    label: "Users",
    description: "Ban, restrict, verify profiles",
    groupLabel: "Moderation",
    icon: UsersRound,
    gradientClass: "from-emerald-500 to-teal-500",
    iconClass: "from-emerald-100 to-teal-50 text-emerald-700",
    softClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    id: "posts",
    label: "Posts",
    description: "Hide, delete, and moderate feeds",
    groupLabel: "Moderation",
    icon: FileText,
    gradientClass: "from-orange-500 to-amber-500",
    iconClass: "from-orange-100 to-amber-50 text-orange-700",
    softClass: "bg-orange-50 text-orange-700 border-orange-100",
  },
  {
    id: "comments",
    label: "Comments",
    description: "Moderate comments and replies",
    groupLabel: "Moderation",
    icon: MessageSquareText,
    gradientClass: "from-pink-500 to-rose-500",
    iconClass: "from-pink-100 to-rose-50 text-pink-700",
    softClass: "bg-pink-50 text-pink-700 border-pink-100",
  },
  {
    id: "communities",
    label: "Communities",
    description: "Create and manage visibility",
    groupLabel: "Moderation",
    icon: Users,
    gradientClass: "from-violet-500 to-indigo-500",
    iconClass: "from-violet-100 to-indigo-50 text-violet-700",
    softClass: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    id: "trust",
    label: "Trust",
    description: "Deletion requests and reports",
    groupLabel: "Moderation",
    icon: ShieldAlert,
    gradientClass: "from-rose-500 to-pink-500",
    iconClass: "from-rose-100 to-pink-50 text-rose-700",
    softClass: "bg-rose-50 text-rose-700 border-rose-100",
  },
  {
    id: "media",
    label: "Media",
    description: "Review PHP-hosted uploads",
    groupLabel: "Content & Media",
    icon: HardDrive,
    gradientClass: "from-slate-500 to-slate-700",
    iconClass: "from-slate-100 to-slate-50 text-slate-700",
    softClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    id: "tools",
    label: "Tools",
    description: "Manage BugFix questions and PDFs",
    groupLabel: "Content & Media",
    icon: Wrench,
    gradientClass: "from-fuchsia-500 to-purple-500",
    iconClass: "from-fuchsia-100 to-purple-50 text-fuchsia-700",
    softClass: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100",
  },
  {
    id: "emailServices",
    label: "Email Services",
    description: "Mailbox pricing, requests, SMTP and IMAP",
    groupLabel: "Growth & Coins",
    icon: Inbox,
    gradientClass: "from-sky-500 to-cyan-500",
    iconClass: "from-sky-100 to-cyan-50 text-sky-700",
    softClass: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    id: "bulkMailer",
    label: "Bulk Mailer",
    description: "SMTP, templates, campaigns, limits",
    groupLabel: "Growth & Coins",
    icon: Mail,
    gradientClass: "from-cyan-500 to-blue-500",
    iconClass: "from-cyan-100 to-blue-50 text-cyan-700",
    softClass: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
  {
    id: "platform",
    label: "Platform",
    description: "Upload limits and global rules",
    groupLabel: "Growth & Coins",
    icon: Settings2,
    gradientClass: "from-blue-500 to-indigo-500",
    iconClass: "from-blue-100 to-indigo-50 text-blue-700",
    softClass: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    id: "cache",
    label: "Cache",
    description: "Manage PHP, device, and offline bundle cache",
    groupLabel: "Growth & Coins",
    icon: DatabaseZap,
    gradientClass: "from-teal-500 to-emerald-500",
    iconClass: "from-teal-100 to-emerald-50 text-teal-700",
    softClass: "bg-teal-50 text-teal-700 border-teal-100",
  },
];

export function getAdminTabDefinition(tabId: AdminTabId) {
  return ADMIN_TAB_DEFINITIONS.find((entry) => entry.id === tabId) || ADMIN_TAB_DEFINITIONS[0];
}

interface AdminTabsSidebarProps {
  activeTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
  counts: Partial<Record<AdminTabId, number | null>>;
}

interface AdminSidebarTabButtonProps {
  tab: AdminTabDefinition;
  selected: boolean;
  value: number | null | undefined;
  onSelect: (tab: AdminTabId) => void;
}

function AdminSidebarTabButton({
  tab,
  selected,
  value,
  onSelect,
}: AdminSidebarTabButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      className={`flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition ${
        selected
          ? "border-transparent bg-[linear-gradient(135deg,#2563eb,#38bdf8)] text-white shadow-[0_18px_30px_-18px_rgba(37,99,235,0.75)]"
          : `${tab.softClass} hover:translate-x-0.5`
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
          selected ? "bg-white/18 text-white" : "bg-white/85 text-current"
        }`}
      >
        <tab.icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{tab.label}</p>
        <p className={`mt-0.5 truncate text-[11px] ${selected ? "text-white/80" : "text-current/75"}`}>
          {tab.description}
        </p>
      </div>

      {typeof value === "number" ? (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            selected ? "bg-white/18 text-white" : "bg-white/90 text-slate-600"
          }`}
        >
          {formatCompactCount(value)}
        </span>
      ) : null}
    </button>
  );
}

export function AdminTabsSidebar({ activeTab, onTabChange, counts }: AdminTabsSidebarProps) {
  const groupedTabs = ADMIN_TAB_DEFINITIONS.reduce<Record<string, AdminTabDefinition[]>>((accumulator, tab) => {
    if (!accumulator[tab.groupLabel]) {
      accumulator[tab.groupLabel] = [];
    }

    accumulator[tab.groupLabel].push(tab);
    return accumulator;
  }, {});

  return (
    <aside className="rounded-[18px] border border-slate-200 bg-white p-2.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)] xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden">
      <div className="shrink-0 rounded-[14px] border border-slate-200 bg-slate-50 p-2.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">Admin sections</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">Compact switcher for each workflow.</p>
        </div>
      </div>

      <div className="mt-2.5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
        <div className="space-y-2.5">
          {Object.entries(groupedTabs).map(([groupLabel, tabs]) => (
            <div key={groupLabel}>
              <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {groupLabel}
              </p>
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const selected = tab.id === activeTab;
                  const value = counts[tab.id];

                  return (
                    <AdminSidebarTabButton
                      key={tab.id}
                      tab={tab}
                      selected={selected}
                      value={value}
                      onSelect={onTabChange}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
