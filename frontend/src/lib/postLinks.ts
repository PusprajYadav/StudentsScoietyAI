import type { PostWithRelations } from "../types/database";

type ShareablePost = Pick<PostWithRelations, "id" | "visibility_scope" | "discussion_kind"> & {
  community?: Pick<NonNullable<PostWithRelations["community"]>, "slug"> | null;
};

export function getPostPath(post: ShareablePost) {
  return `/app/posts/${post.id}`;
}

export function getPostCommentPath(postId: string, commentId?: string | null) {
  if (!commentId) {
    return `/app/posts/${postId}`;
  }

  const params = new URLSearchParams({ comment: commentId });
  return `/app/posts/${postId}?${params.toString()}`;
}

export function getAbsolutePostUrl(post: ShareablePost) {
  const path = getPostPath(post);

  if (typeof window === "undefined") {
    return path;
  }

  const { origin, hostname } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  const base = isLocalHost ? "https://studentsociety.in" : origin;

  try {
    return new URL(path, base).toString();
  } catch {
    return `${base}${path}`;
  }
}

export async function copyTextToClipboard(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard access is not available.");
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.top = "-9999px";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}
