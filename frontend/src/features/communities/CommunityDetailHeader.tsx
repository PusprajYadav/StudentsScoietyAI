import { ArrowLeft, Copy, LogOut, MoreVertical, Settings2, Share2, Users2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { CommunityMemberStatus, CommunityRow } from "../../types/database";
import {
  getCommunityContrastColor,
  normalizeCommunityColor,
  withAppThemeAlpha,
  withCommunityAlpha,
} from "./communityTheme";

interface CommunityDetailHeaderProps {
  community: CommunityRow;
  memberCount: number;
  membershipStatus?: CommunityMemberStatus | "none";
  onShare: () => void | Promise<void>;
  onCopyLink: () => void | Promise<void>;
  onManage?: () => void;
  onMembershipAction?: () => void;
  onLeave?: () => void;
  membershipActionLabel?: string;
  membershipBusy?: boolean;
}

function getMembershipLabel(status: CommunityMemberStatus | "none") {
  if (status === "active") {
    return "Joined";
  }

  if (status === "pending") {
    return "Pending";
  }

  if (status === "banned") {
    return "Blocked";
  }

  return "Not joined";
}

function getMembershipTone(status: CommunityMemberStatus | "none", accent: string) {
  if (status === "active") {
    return {
      backgroundColor: withAppThemeAlpha("app-card", 0.94),
      borderColor: withCommunityAlpha(accent, 0.16),
      color: accent,
      iconBackgroundColor: withCommunityAlpha(accent, 0.12),
    };
  }

  if (status === "pending") {
    return {
      backgroundColor: "rgba(245, 158, 11, 0.14)",
      borderColor: "rgba(245, 158, 11, 0.24)",
      color: "#b45309",
      iconBackgroundColor: "rgba(245, 158, 11, 0.12)",
    };
  }

  if (status === "banned") {
    return {
      backgroundColor: "rgba(244, 63, 94, 0.12)",
      borderColor: "rgba(244, 63, 94, 0.22)",
      color: "#be123c",
      iconBackgroundColor: "rgba(244, 63, 94, 0.12)",
    };
  }

  return {
    backgroundColor: withAppThemeAlpha("app-secondary", 0.96),
    borderColor: withAppThemeAlpha("app-border", 0.92),
    color: withAppThemeAlpha("app-text", 0.72),
    iconBackgroundColor: withAppThemeAlpha("app-border", 0.86),
  };
}

export function CommunityDetailHeader({
  community,
  memberCount,
  membershipStatus = "none",
  onShare,
  onCopyLink,
  onManage,
  onMembershipAction,
  onLeave,
  membershipActionLabel,
  membershipBusy,
}: CommunityDetailHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const accent = useMemo(() => normalizeCommunityColor(community.hero_color), [community.hero_color]);
  const accentText = useMemo(() => getCommunityContrastColor(accent), [accent]);
  const membershipTone = useMemo(() => getMembershipTone(membershipStatus, accent), [accent, membershipStatus]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const showJoinButton = onMembershipAction && membershipStatus !== "active" && membershipStatus !== "banned";
  const showLeaveInMenu = onLeave && (membershipStatus === "active" || membershipStatus === "pending");

  return (
    <section className="space-y-2 px-0.5 pt-0.5">
      <Link
        to="/app/communities"
        className="inline-flex items-center gap-1.5 px-1 text-[0.82rem] font-semibold text-app-text/82 transition hover:text-app-text"
        aria-label="Back to all communities"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>All communities</span>
      </Link>

      <section className="relative rounded-[22px] border border-app-border/80 bg-app-card/95 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)]">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]"
          style={{
            backgroundImage: `linear-gradient(145deg, ${withCommunityAlpha(accent, 0.17)} 0%, ${withCommunityAlpha(
              accent,
              0.1
            )} 42%, ${withAppThemeAlpha("app-card", 0.965)} 100%)`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at top left, ${withAppThemeAlpha("app-text", 0.08)}, transparent 32%), radial-gradient(circle at bottom right, ${withAppThemeAlpha("app-text", 0.06)}, transparent 28%)`,
            }}
          />
          <div
            className="absolute -right-5 top-[-0.5rem] h-20 w-20 rounded-full blur-3xl"
            style={{ backgroundColor: withCommunityAlpha(accent, 0.11) }}
          />
          <div
            className="absolute bottom-[-1rem] right-[-0.65rem] h-16 w-16 rounded-full border border-app-border/45 bg-app-card/18 backdrop-blur-sm"
            style={{ boxShadow: `0 12px 24px -20px ${withCommunityAlpha(accent, 0.2)}` }}
          />
        </div>

        <div className="relative px-3 py-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1.5">
            <div
              className="row-span-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-app-border/80 text-[1.25rem] font-semibold shadow-[0_12px_22px_-18px_rgba(15,23,42,0.28)]"
              style={{ backgroundColor: accent, color: accentText }}
            >
              {community.name.trim().charAt(0).toUpperCase()}
            </div>

            <div className="flex min-w-0 items-center justify-between gap-2">
              <h1 className="min-w-0 truncate font-display text-[1rem] font-bold leading-none tracking-tight text-app-text sm:text-[1.08rem]">
                {community.name}
              </h1>

              <div className="flex shrink-0 items-center gap-1.5">
                {showJoinButton ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void onMembershipAction();
                    }}
                    disabled={membershipBusy}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-full px-3 text-[0.74rem] font-semibold text-white shadow-[0_10px_18px_-16px_rgba(15,23,42,0.18)] transition hover:translate-y-[-1px] disabled:opacity-60"
                    style={{ backgroundColor: accent, color: accentText }}
                  >
                    {membershipBusy ? "Working..." : membershipActionLabel || "Join"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => void onShare()}
                  className="inline-flex h-8 min-w-[4.75rem] items-center justify-center gap-1 rounded-full border border-app-border/60 px-2.5 text-[0.74rem] font-semibold text-app-text shadow-[0_10px_18px_-16px_rgba(15,23,42,0.18)] transition hover:translate-y-[-1px]"
                  style={{ backgroundColor: withCommunityAlpha(accent, 0.1) }}
                >
                  <Share2 className="h-3.5 w-3.5" style={{ color: accent }} />
                  Share
                </button>

                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((current) => !current)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border/60 text-app-text shadow-[0_10px_18px_-16px_rgba(15,23,42,0.18)] transition hover:translate-y-[-1px]"
                    style={{ backgroundColor: withCommunityAlpha(accent, 0.1) }}
                    aria-label="Open community actions"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>

                  {menuOpen ? (
                    <div
                      className="absolute right-0 top-[calc(100%+0.45rem)] z-40 min-w-[12rem] rounded-[18px] border bg-app-card p-2 shadow-2xl"
                      style={{ borderColor: withCommunityAlpha(accent, 0.18) }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          void onCopyLink();
                        }}
                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-app-text transition hover:bg-app-secondary"
                      >
                        <Copy className="h-4 w-4" style={{ color: accent }} />
                        Copy link
                      </button>
                      {onManage ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onManage();
                          }}
                          className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-app-text transition hover:bg-app-secondary"
                        >
                          <Settings2 className="h-4 w-4" style={{ color: accent }} />
                          Manage community
                        </button>
                      ) : null}
                      {showLeaveInMenu ? (
                        <>
                          <div className="my-1 h-px bg-app-border/50" />
                          <button
                            type="button"
                            disabled={membershipBusy}
                            onClick={() => {
                              setMenuOpen(false);
                              void onLeave();
                            }}
                            className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10"
                          >
                            <LogOut className="h-4 w-4" />
                            {membershipStatus === "pending" ? "Cancel request" : "Leave community"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="col-[2/3] flex flex-wrap items-center gap-2">
              <span
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-app-border/80 bg-app-card/94 px-2.5 text-[0.73rem] font-semibold text-app-text/80 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.16)]"
                style={{
                  borderColor: withCommunityAlpha(accent, 0.1),
                }}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-app-secondary/70 text-app-text/72">
                  <Users2 className="h-2.5 w-2.5" />
                </span>
                {memberCount} member{memberCount === 1 ? "" : "s"}
              </span>
              <span
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[0.73rem] font-semibold shadow-[0_10px_18px_-16px_rgba(15,23,42,0.14)]"
                style={{
                  backgroundColor: membershipTone.backgroundColor,
                  borderColor: membershipTone.borderColor,
                  color: membershipTone.color,
                }}
              >
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: membershipTone.iconBackgroundColor }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: membershipTone.color }}
                  />
                </span>
                {getMembershipLabel(membershipStatus)}
              </span>
            </div>

            {community.description ? (
              <p className="col-[2/3] max-w-[22rem] text-[0.74rem] leading-[1.1rem] text-app-text/66">
                {community.description}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </section>
  );
}
