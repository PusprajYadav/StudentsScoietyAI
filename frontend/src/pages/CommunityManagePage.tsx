import { ArrowLeft, Settings2, Users2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  acceptCommunityMemberRequest,
  loadCommunityMembersForAdmin,
  loadCommunityMembershipDetails,
  loadVisibleCommunities,
  rejectCommunityMemberRequest,
  removeCommunityMember,
  setCommunityMemberAdminState,
  updateCommunitySettings,
  type CommunityMembershipDetails,
} from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type {
  CommunityFeedVisibility,
  CommunityMemberWithProfile,
  CommunityRow,
} from "../types/database";
import { CommunityManagementWorkspace } from "../features/communities/CommunityManagementWorkspace";
import {
  getCommunityContrastColor,
  normalizeCommunityColor,
  withAppThemeAlpha,
  withCommunityAlpha,
} from "../features/communities/communityTheme";

export function CommunityManagePage() {
  const { user, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const { communitySlug = "" } = useParams();
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [membershipDetailsByCommunityId, setMembershipDetailsByCommunityId] = useState<
    Record<string, CommunityMembershipDetails>
  >({});
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [communityMembers, setCommunityMembers] = useState<CommunityMemberWithProfile[]>([]);
  const [communityMembersLoading, setCommunityMembersLoading] = useState(false);
  const [memberActionUserId, setMemberActionUserId] = useState<string | null>(null);

  const loadDirectory = useCallback(async (options: { fresh?: boolean } = {}) => {
    if (!user) {
      setCommunities([]);
      setMembershipDetailsByCommunityId({});
      setDirectoryLoading(false);
      return;
    }

    setDirectoryLoading(true);

    try {
      const [directory, membershipDetails] = await Promise.all([
        loadVisibleCommunities(options),
        loadCommunityMembershipDetails(user.id),
      ]);

      setCommunities(directory);
      setMembershipDetailsByCommunityId(
        Object.fromEntries(membershipDetails.map((entry) => [entry.community_id, entry]))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load this community.");
    } finally {
      setDirectoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  const activeCommunity =
    communities.find((community) => community.slug.toLowerCase() === communitySlug.toLowerCase()) || null;
  const activeMembership = activeCommunity ? membershipDetailsByCommunityId[activeCommunity.id] || null : null;
  const canManageActiveCommunity = Boolean(
    activeCommunity &&
      user &&
      (isAdmin ||
        (activeMembership?.status === "active" &&
          (activeMembership.role === "owner" || activeMembership.role === "admin")))
  );
  const canAssignCommunityAdmins = Boolean(isAdmin || activeMembership?.role === "owner");
  const communityAccent = useMemo(
    () => normalizeCommunityColor(activeCommunity?.hero_color),
    [activeCommunity?.hero_color]
  );
  const communityAccentText = useMemo(() => getCommunityContrastColor(communityAccent), [communityAccent]);
  const accessLabel =
    isAdmin ? "Platform admin" : activeMembership?.role === "owner" ? "Owner" : "Admin";

  const refreshCommunityMembers = useCallback(async () => {
    if (!activeCommunity || !canManageActiveCommunity) {
      setCommunityMembers([]);
      return;
    }

    setCommunityMembersLoading(true);

    try {
      const members = await loadCommunityMembersForAdmin(activeCommunity.id);
      setCommunityMembers(members);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load community members.");
    } finally {
      setCommunityMembersLoading(false);
    }
  }, [activeCommunity, canManageActiveCommunity]);

  useEffect(() => {
    if (!activeCommunity || !canManageActiveCommunity) {
      setCommunityMembers([]);
      return;
    }

    void refreshCommunityMembers();
  }, [activeCommunity, canManageActiveCommunity, refreshCommunityMembers]);

  const handleSaveCommunitySettings = useCallback(
    async (payload: {
      name: string;
      description: string;
      heroColor: string;
      postingModes: ("study" | "job" | "anonymous")[];
      joinPolicy: "open" | "approval_required";
      requiresPassword: boolean;
      password: string;
      passwordHint: string;
      feedVisibility: CommunityFeedVisibility;
    }) => {
      if (!activeCommunity) {
        return;
      }

      await updateCommunitySettings({
        communityId: activeCommunity.id,
        name: payload.name,
        description: payload.description,
        heroColor: payload.heroColor,
        postingModes: payload.postingModes,
        joinPolicy: payload.joinPolicy,
        requiresPassword: payload.requiresPassword,
        password: payload.password || undefined,
        passwordHint: payload.passwordHint || null,
        feedVisibility: payload.feedVisibility,
      });

      toast.success("Community settings updated.");
      await loadDirectory({ fresh: true });
      await refreshCommunityMembers();
    },
    [activeCommunity, loadDirectory, refreshCommunityMembers]
  );

  const runMemberAction = useCallback(
    async (targetUserId: string, runner: () => Promise<void>, successMessage: string) => {
      setMemberActionUserId(targetUserId);
      try {
        await runner();
        toast.success(successMessage);
        await Promise.all([loadDirectory({ fresh: true }), refreshCommunityMembers()]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update this member.");
      } finally {
        setMemberActionUserId(null);
      }
    },
    [loadDirectory, refreshCommunityMembers]
  );

  if (directoryLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="surface-card h-40 animate-pulse rounded-[30px]" />
        <section className="surface-card h-[32rem] animate-pulse rounded-[30px]" />
      </div>
    );
  }

  if (!activeCommunity) {
    return (
      <div className="mx-auto max-w-3xl">
        <section className="surface-card rounded-[28px] p-8 text-center">
          <p className="font-display text-2xl font-bold tracking-tight text-app-text">Community not found</p>
          <p className="mt-2 text-sm leading-6 text-app-muted">
            This community may have been removed or the link is no longer valid.
          </p>
          <button
            type="button"
            onClick={() => navigate("/app/communities")}
            className="btn-primary mt-5 !rounded-full !px-5 !py-3 text-sm font-semibold"
          >
            Back to communities
          </button>
        </section>
      </div>
    );
  }

  if (!canManageActiveCommunity) {
    return (
      <div className="mx-auto max-w-3xl">
        <section className="surface-card rounded-[28px] p-8 text-center">
          <p className="font-display text-2xl font-bold tracking-tight text-app-text">Manage access unavailable</p>
          <p className="mt-2 text-sm leading-6 text-app-muted">
            Only community owners, community admins, or platform admins can manage this community.
          </p>
          <Link
            to={`/app/communities/${activeCommunity.slug}`}
            className="btn-primary mt-5 inline-flex !rounded-full !px-5 !py-3 text-sm font-semibold"
          >
            Back to community
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <section
        className="relative overflow-hidden rounded-[28px] border border-app-border/80 bg-app-card/95 p-4 shadow-[0_22px_52px_-36px_rgba(15,23,42,0.24)] sm:p-5"
        style={{
          backgroundImage: `linear-gradient(145deg, ${withCommunityAlpha(communityAccent, 0.2)}, ${withAppThemeAlpha("app-card", 0.96)} 55%)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at top right, ${withAppThemeAlpha("app-text", 0.08)}, transparent 26%)`,
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/app/communities/${activeCommunity.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-app-text/80 transition hover:text-app-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-[1.25rem] font-semibold shadow-[0_18px_32px_-24px_rgba(15,23,42,0.35)]"
                style={{ backgroundColor: communityAccent, color: communityAccentText }}
              >
                {activeCommunity.name.trim().charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="font-display text-[1.85rem] font-bold tracking-tight text-app-text sm:text-[2.1rem]">
                  Manage {activeCommunity.name}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-app-border/80 bg-app-card/92 px-3.5 py-2 text-sm font-semibold text-app-text shadow-[0_18px_34px_-26px_rgba(15,23,42,0.2)]">
              <Settings2 className="h-4 w-4" style={{ color: communityAccent }} />
              {accessLabel}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-app-border/80 bg-app-card/92 px-3.5 py-2 text-sm font-semibold text-app-text shadow-[0_18px_34px_-26px_rgba(15,23,42,0.2)]">
              <Users2 className="h-4 w-4" style={{ color: communityAccent }} />
              {activeCommunity.member_count || 0}
            </div>
          </div>
        </div>
      </section>

      <CommunityManagementWorkspace
        community={activeCommunity}
        members={communityMembers}
        loadingMembers={communityMembersLoading}
        actingUserId={memberActionUserId}
        currentUserRole={activeMembership?.role || null}
        canAssignAdmins={canAssignCommunityAdmins}
        onSaveSettings={handleSaveCommunitySettings}
        onAcceptRequest={(targetUserId) =>
          runMemberAction(
            targetUserId,
            async () => {
              if (!activeCommunity) {
                return;
              }

              await acceptCommunityMemberRequest(activeCommunity.id, targetUserId);
            },
            "Join request accepted."
          )
        }
        onRejectRequest={(targetUserId) =>
          runMemberAction(
            targetUserId,
            async () => {
              if (!activeCommunity) {
                return;
              }

              await rejectCommunityMemberRequest(activeCommunity.id, targetUserId);
            },
            "Join request rejected."
          )
        }
        onKickMember={(targetUserId) =>
          runMemberAction(
            targetUserId,
            async () => {
              if (!activeCommunity) {
                return;
              }

              await removeCommunityMember(activeCommunity.id, targetUserId, { ban: false });
            },
            "Member removed."
          )
        }
        onBanMember={(targetUserId) =>
          runMemberAction(
            targetUserId,
            async () => {
              if (!activeCommunity) {
                return;
              }

              await removeCommunityMember(activeCommunity.id, targetUserId, { ban: true });
            },
            "Member banned."
          )
        }
        onToggleAdmin={(targetUserId, makeAdmin) =>
          runMemberAction(
            targetUserId,
            async () => {
              if (!activeCommunity) {
                return;
              }

              await setCommunityMemberAdminState(activeCommunity.id, targetUserId, makeAdmin);
            },
            makeAdmin ? "Community admin assigned." : "Community admin removed."
          )
        }
      />
    </div>
  );
}
