import { ArrowRight, DatabaseZap, FileText, Inbox, Mail, MessageSquareText, Settings2, ShieldAlert, UsersRound } from "lucide-react";
import { AdminStatsGrid } from "./AdminStatsGrid";
import type { AdminTabId } from "./AdminTabsSidebar";

interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalCommunities: number;
  totalComments: number;
}

interface AdminOverviewSectionProps {
  stats: DashboardStats;
  onOpenTab: (tab: AdminTabId) => void;
}

export function AdminOverviewSection({ stats, onOpenTab }: AdminOverviewSectionProps) {
  const quickActions = [
    {
      id: "users" as AdminTabId,
      label: "Users",
      description: "Wallets and verification",
      icon: UsersRound,
      accentClass: "from-emerald-500 to-teal-500",
    },
    {
      id: "posts" as AdminTabId,
      label: "Posts",
      description: "Feed moderation",
      icon: FileText,
      accentClass: "from-orange-500 to-amber-500",
    },
    {
      id: "comments" as AdminTabId,
      label: "Comments",
      description: "Thread cleanup",
      icon: MessageSquareText,
      accentClass: "from-pink-500 to-rose-500",
    },
    {
      id: "trust" as AdminTabId,
      label: "Trust",
      description: "Reports and delete requests",
      icon: ShieldAlert,
      accentClass: "from-rose-500 to-pink-500",
    },
    {
      id: "platform" as AdminTabId,
      label: "Platform",
      description: "Limits and rewards",
      icon: Settings2,
      accentClass: "from-blue-500 to-indigo-500",
    },
    {
      id: "emailServices" as AdminTabId,
      label: "Emails",
      description: "Mailbox plans and setup",
      icon: Inbox,
      accentClass: "from-sky-500 to-cyan-500",
    },
    {
      id: "bulkMailer" as AdminTabId,
      label: "Mailer",
      description: "Campaign controls",
      icon: Mail,
      accentClass: "from-cyan-500 to-blue-500",
    },
    {
      id: "cache" as AdminTabId,
      label: "Cache",
      description: "Refresh namespaces",
      icon: DatabaseZap,
      accentClass: "from-teal-500 to-emerald-500",
    },
  ];

  const coinCoverage = [
    "Post publish + edit",
    "Chat requests",
    "Resume + portfolio",
    "Student email passes",
    "Bulk mailer sends",
    "Instagram passes",
    "Blue tick review",
  ];

  return (
    <div className="space-y-3">
      <AdminStatsGrid stats={stats} />

      <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_280px]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-base font-semibold text-slate-900 sm:text-lg">Dashboard overview</p>
                <p className="mt-1 text-xs text-slate-500">Quick entry points for moderation, pricing, and wallet operations.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                {quickActions.length} shortcuts
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {quickActions.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onOpenTab(entry.id)}
                  className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-brand/20 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-[14px] bg-gradient-to-br ${entry.accentClass} text-white shadow-[0_14px_24px_-18px_rgba(37,99,235,0.7)]`}
                    >
                      <entry.icon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </div>

                  <div className="mt-2 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{entry.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(56,189,248,0.04))] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">Coin coverage</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Pricing is enforced from Supabase logic, not just labels in the UI.
            </p>
            <div className="mt-3 space-y-1.5">
              {coinCoverage.map((item) => (
                <div
                  key={item}
                  className="rounded-[14px] border border-white/80 bg-white/85 px-3 py-2 text-xs font-medium text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
