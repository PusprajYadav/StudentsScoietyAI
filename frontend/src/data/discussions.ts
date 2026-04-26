import type { DiscussionKind } from "../types/database";

export const discussionModes: DiscussionKind[] = ["study", "job", "anonymous"];

export const discussionKindLabels: Record<DiscussionKind, string> = {
  study: "Study Zone",
  job: "Job Zone",
  anonymous: "Anonymous",
};

export function getDiscussionKindLabel(kind?: string) {
  if (kind === "discussion") {
    return discussionKindLabels.job;
  }

  if (kind && discussionModes.includes(kind as DiscussionKind)) {
    return discussionKindLabels[kind as DiscussionKind];
  }

  return kind || "";
}

export function isDiscussionKind(value?: string): value is DiscussionKind {
  return discussionModes.includes((value || "") as DiscussionKind);
}
