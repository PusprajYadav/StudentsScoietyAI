import { Activity, LayoutDashboard, MessageCircle, MessageSquare, Send } from "lucide-react";
import type { InstagramAutomationTab } from "../types";

interface InstagramSidebarProps {
  activeTab: InstagramAutomationTab;
  onChange: (tab: InstagramAutomationTab) => void;
}

const tabItems: Array<{
  id: InstagramAutomationTab;
  label: string;
  hint: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Overview", shortLabel: "Home", hint: "Connection and analytics", icon: LayoutDashboard },
  { id: "comment-replies", label: "Comment Replies", shortLabel: "Comments", hint: "Keyword replies per post", icon: MessageCircle },
  { id: "dm-replies", label: "DM Replies", shortLabel: "DMs", hint: "Inbox auto responses", icon: MessageSquare },
  { id: "comment-to-dm", label: "Comment to DM", shortLabel: "Combo", hint: "Public reply plus DM", icon: Send },
  { id: "activity", label: "Activity", shortLabel: "Logs", hint: "Delivery logs", icon: Activity },
];

export function InstagramSidebar({ activeTab, onChange }: InstagramSidebarProps) {
  return (
    <div className="space-y-3">
      <section className="rounded-[24px] border border-app-border bg-app-card/90 p-3 shadow-[0_22px_48px_-34px_rgba(15,23,42,0.4)] backdrop-blur lg:hidden">
        <div className="flex flex-col gap-2 px-1 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300">Flow</p>
            <h2 className="mt-1 text-sm font-semibold text-app-text">Automation Console</h2>
          </div>
          <span className="w-fit rounded-full border border-app-border bg-app-secondary/70 px-3 py-1 text-[11px] font-semibold text-app-muted">
            {tabItems.length} views
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 min-[430px]:grid-cols-5">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`min-w-0 rounded-[18px] border px-2.5 py-3 text-center transition ${
                  isActive
                    ? "border-fuchsia-200 bg-[linear-gradient(135deg,#fff7fb_0%,#fdf2f8_45%,#fff7ed_100%)] shadow-[0_18px_34px_-24px_rgba(190,24,93,0.45)] dark:border-fuchsia-500/25 dark:bg-[linear-gradient(135deg,rgba(48,18,62,0.95)_0%,rgba(32,18,48,0.94)_48%,rgba(50,28,14,0.92)_100%)]"
                    : "border-transparent bg-app-secondary/80 hover:border-fuchsia-100 hover:bg-app-card dark:hover:border-fuchsia-500/20"
                }`}
              >
                <div
                  className={`mx-auto inline-flex rounded-[14px] p-2.5 ${
                    isActive ? "bg-fuchsia-600 text-white" : "bg-app-card text-fuchsia-600 dark:text-fuchsia-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-[10px] font-semibold text-app-text min-[430px]:text-[11px]">
                  {item.shortLabel}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="hidden rounded-[28px] border border-app-border bg-app-card/90 p-3 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur lg:block">
        <div className="mb-4 px-2 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-fuchsia-600 dark:text-fuchsia-300">Business Flow</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-app-text">Automation Console</h2>
        </div>

        <div className="grid gap-2">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`rounded-[22px] border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-fuchsia-200 bg-[linear-gradient(135deg,#fff7fb_0%,#fdf2f8_45%,#fff7ed_100%)] shadow-[0_20px_40px_-28px_rgba(190,24,93,0.45)] dark:border-fuchsia-500/25 dark:bg-[linear-gradient(135deg,rgba(48,18,62,0.95)_0%,rgba(32,18,48,0.94)_48%,rgba(50,28,14,0.92)_100%)]"
                    : "border-transparent bg-app-secondary/80 hover:border-fuchsia-100 hover:bg-app-card dark:hover:border-fuchsia-500/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-[16px] p-2.5 ${
                      isActive ? "bg-fuchsia-600 text-white" : "bg-app-card text-fuchsia-600 dark:text-fuchsia-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-app-text">{item.label}</p>
                    <p className="mt-1 text-sm text-app-muted">{item.hint}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
