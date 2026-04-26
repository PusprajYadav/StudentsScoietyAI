import { NavLink } from "react-router-dom";
import type { PrimaryNavigationItem } from "../lib/primaryNavigation";

export type PrimaryMobileNavTab = PrimaryNavigationItem;

type PrimaryMobileNavProps = {
  pathname: string;
  tabs: PrimaryMobileNavTab[];
  className?: string;
};

function isTabActive(pathname: string, matchPrefixes: string[]) {
  return matchPrefixes.some((matchPrefix) => pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`));
}

export function PrimaryMobileNav({ pathname, tabs, className = "" }: PrimaryMobileNavProps) {
  const shouldScroll = tabs.length > 5;
  const scrollItemWidth = "calc((min(36rem, 100vw - 2rem) - 1rem - 0.5rem) / 5)";

  return (
    <nav className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-2 md:hidden ${className}`}>
      <div className="mx-auto max-w-xl rounded-[28px] border border-app-border bg-app-card px-2 py-1.5 shadow-[0_24px_64px_-36px_rgba(15,23,42,0.24)] dark:shadow-[0_24px_64px_-36px_rgba(0,0,0,0.72)]">
        <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div
            className={`grid gap-0.5 ${shouldScroll ? "w-max" : "w-full"}`}
            style={{
              gridTemplateColumns: shouldScroll
                ? `repeat(${tabs.length}, minmax(${scrollItemWidth}, ${scrollItemWidth}))`
                : `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))`,
            }}
          >
          {tabs.map((tab) => {
            const active = isTabActive(pathname, tab.matchPrefixes);

            return (
              <NavLink
                key={`${tab.to}-${tab.mobileLabel}`}
                to={tab.to}
                className="group relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 py-1 text-center text-[9px] font-semibold leading-none transition"
              >
                <span
                  className={`flex h-[34px] w-[34px] items-center justify-center rounded-[14px] transition ${
                    active
                      ? "bg-brand text-white shadow-[0_16px_28px_-18px_rgba(37,99,235,0.65)]"
                      : "text-app-muted group-hover:bg-app-secondary/70 group-hover:text-app-text"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                </span>
                <span className={`truncate ${active ? "text-brand" : "text-app-muted"}`}>
                  {tab.mobileLabel}
                </span>
              </NavLink>
            );
          })}
          </div>
        </div>
      </div>
    </nav>
  );
}
