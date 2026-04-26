import { BarChart3, Instagram, Link2, MessageCircle, Send } from "lucide-react";
import { InstagramAutomationTool } from "../../features/instagram-automation/InstagramAutomationTool";

export function InstagramAutomationApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  const highlights = [
    { icon: Link2, label: "OAuth" },
    { icon: MessageCircle, label: "Replies" },
    { icon: Send, label: "DM Flow" },
    { icon: BarChart3, label: "Analytics" },
  ];

  return (
    <div className="space-y-5">
      {showTitleBlock ? (
        <section className="relative overflow-hidden rounded-[30px] border border-app-border bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.16),_transparent_28%),linear-gradient(135deg,#fff7fb_0%,#ffffff_46%,#fff7ed_100%)] p-4 shadow-[0_28px_64px_-42px_rgba(15,23,42,0.38)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.24),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.18),_transparent_28%),linear-gradient(135deg,rgba(18,10,28,0.98)_0%,rgba(7,12,24,0.98)_52%,rgba(28,16,12,0.96)_100%)] sm:rounded-[34px] sm:p-6">
          <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-500/20" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="rounded-[20px] bg-gradient-to-br from-[#c026d3] via-[#db2777] to-[#f97316] p-3 text-white shadow-[0_20px_32px_-20px_rgba(192,38,211,0.58)] sm:rounded-[22px]">
                <Instagram className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-600 dark:text-fuchsia-300 sm:text-[11px]">Business</p>
                <h1 className="mt-1.5 font-display text-[1.7rem] font-semibold tracking-tight text-app-text sm:mt-2 sm:text-3xl">
                  Instagram Automation
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-app-muted sm:leading-6">
                  Compact control for OAuth, comment replies, DMs, and comment-to-DM journeys.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 min-[430px]:grid-cols-4 md:min-w-[320px]">
              {highlights.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-[20px] border border-app-border/70 bg-app-card/70 px-3 py-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.34)] backdrop-blur"
                  >
                    <div className="inline-flex rounded-[14px] bg-app-secondary/80 p-2 text-fuchsia-600 dark:text-fuchsia-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-app-text">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <InstagramAutomationTool />
    </div>
  );
}
