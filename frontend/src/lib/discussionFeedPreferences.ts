export type DiscussionCommunityFeedMode = "all" | "joined-only";

const discussionCommunityFeedModeKey = "student-society-discussion-community-feed-mode";

export function loadDiscussionCommunityFeedMode(): DiscussionCommunityFeedMode {
  if (typeof window === "undefined") {
    return "all";
  }

  const storedValue = window.localStorage.getItem(discussionCommunityFeedModeKey);
  return storedValue === "joined-only" ? "joined-only" : "all";
}

export function saveDiscussionCommunityFeedMode(
  mode: DiscussionCommunityFeedMode
): DiscussionCommunityFeedMode {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(discussionCommunityFeedModeKey, mode);
  }

  return mode;
}
