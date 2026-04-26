import { FileText, MessageSquareText, Users, UsersRound } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalCommunities: number;
  totalComments: number;
}

interface AdminStatsGridProps {
  stats: DashboardStats;
}

export function AdminStatsGrid({ stats }: AdminStatsGridProps) {
  const cards = [
    {
      label: "Users loaded",
      value: stats.totalUsers,
      icon: UsersRound,
      accentClass: "bg-sky-50 text-sky-700",
    },
    {
      label: "Posts loaded",
      value: stats.totalPosts,
      icon: FileText,
      accentClass: "bg-orange-50 text-orange-700",
    },
    {
      label: "Communities loaded",
      value: stats.totalCommunities,
      icon: Users,
      accentClass: "bg-violet-50 text-violet-700",
    },
    {
      label: "Comments loaded",
      value: stats.totalComments,
      icon: MessageSquareText,
      accentClass: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((item) => (
        <article
          key={item.label}
          className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {item.label}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-slate-900">{item.value}</p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${item.accentClass}`}>
              <item.icon className="h-4 w-4" />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
