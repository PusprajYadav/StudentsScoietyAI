import { Link } from "react-router-dom";

type ProfileViewMode = "profile" | "settings";

export function ProfileViewToggle({
  username,
  activeMode,
  className = "",
  compact = false,
}: {
  username: string;
  activeMode: ProfileViewMode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${className} overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
    >
      <div
        className={`inline-flex items-center rounded-full border border-app-border bg-app-card shadow-[0_16px_30px_-24px_rgba(15,23,42,0.22)] ${
          compact ? "gap-[3px] p-[3px]" : "gap-1 p-1"
        }`}
      >
        {[
          {
            id: "profile" as const,
            label: "Profile",
            to: `/profile/${username}`,
          },
          {
            id: "settings" as const,
            label: "Settings",
            to: `/profile/${username}/settings`,
          },
        ].map((item) => {
          const active = activeMode === item.id;

          return (
            <Link
              key={item.id}
              to={item.to}
              className={`rounded-full font-semibold transition ${
                compact ? "px-3.5 py-2 text-xs sm:px-4 sm:text-sm" : "px-4 py-2 text-sm"
              } ${
                active
                  ? "bg-brand text-white shadow-[0_16px_28px_-18px_rgba(37,99,235,0.72)]"
                  : "text-app-muted hover:bg-app-secondary hover:text-app-text"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
