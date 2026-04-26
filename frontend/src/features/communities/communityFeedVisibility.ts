import type { CommunityFeedVisibility, CommunityRow } from "../../types/database";

export interface CommunityFeedVisibilityOption {
  value: CommunityFeedVisibility;
  label: string;
  shortLabel: string;
  description: string;
}

export const COMMUNITY_FEED_VISIBILITY_OPTIONS: CommunityFeedVisibilityOption[] = [
  {
    value: "members_only",
    label: "Joined members only",
    shortLabel: "Members only",
    description: "Students can discover the community, but posts unlock only after they join. Nothing appears in Discuss.",
  },
  {
    value: "community_only",
    label: "Only on the community page",
    shortLabel: "Community only",
    description: "Posts stay inside the community page and do not appear in Discuss.",
  },
  {
    value: "discussion_and_community",
    label: "Community page and Discuss",
    shortLabel: "Also in Discuss",
    description: "Posts stay on the community page and can also show in Discuss when a viewer allows community posts.",
  },
];

export function getCommunityFeedVisibilityOption(value: CommunityFeedVisibility) {
  return (
    COMMUNITY_FEED_VISIBILITY_OPTIONS.find((option) => option.value === value) ||
    COMMUNITY_FEED_VISIBILITY_OPTIONS[1]
  );
}

export function getCommunityFeedVisibilityLabel(value: CommunityFeedVisibility) {
  return getCommunityFeedVisibilityOption(value).label;
}

export function getCommunityFeedVisibilityShortLabel(value: CommunityFeedVisibility) {
  return getCommunityFeedVisibilityOption(value).shortLabel;
}

export function canCommunityAppearInDiscuss(
  communityOrVisibility: Pick<CommunityRow, "feed_visibility"> | CommunityFeedVisibility
) {
  const visibility =
    typeof communityOrVisibility === "string" ? communityOrVisibility : communityOrVisibility.feed_visibility;

  return visibility === "discussion_and_community";
}

export function doesCommunityFeedRequireMembership(
  community: Pick<CommunityRow, "feed_visibility" | "join_policy" | "requires_password">
) {
  return (
    community.feed_visibility === "members_only" ||
    community.join_policy === "approval_required" ||
    community.requires_password
  );
}
