import {
  ExternalLink,
  Flag,
  Heart,
  MessageSquare,
  MoreHorizontal,
  PencilLine,
  Share2,
  UserCheck2,
  UserPlus2,
  Vote,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getDiscussionKindLabel } from "../data/discussions";
import {
  normalizeCommunityColor,
  withAppThemeAlpha,
  withCommunityAlpha,
} from "../features/communities/communityTheme";
import { buildAvatarSeed, resolveAvatarUrl } from "../lib/avatar";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import { formatCompactCount, formatDateTime, formatRelativeTime } from "../lib/formatting";
import { getPlannerShareLabel, getVisiblePostTags, isPlannerLockedPost } from "../lib/plannerPost";
import { copyTextToClipboard, getAbsolutePostUrl, getPostPath } from "../lib/postLinks";
import { createPostReport } from "../lib/postReports";
import {
  loadBugFixResultPreviewFromSharedPost,
  importPortfolioFromSharedPost,
  importPlayAreaFromSharedPost,
  importResumeFromSharedPost,
  importStudyNotesFromSharedPost,
  importWhitebookFromSharedPost,
  isPlayAreaSharedPostLink,
  loadStudyNotesPreviewFromSharedPost,
  loadPlayAreaPreviewFromSharedPost,
  loadWhitebookSharedPostPreviewFromSharedPost,
} from "../lib/postShareImports";
import { parseBugFixResultShareSlug } from "./tools/bugfix-lab/helpers";
import { parseStudyNotesShareSlug } from "./tools/study-notes/helpers";
import type { CommentWithAuthor, PostWithRelations } from "../types/database";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { PostMediaLightbox, type PostMediaLightboxItem } from "./PostMediaLightbox";
import { PdfInlineViewer } from "./PdfInlineViewer";
import { PostMediaCarousel } from "./PostMediaCarousel";
import { VerifiedBadge } from "./VerifiedBadge";
import type { WhitebookSharedPostPreview } from "../features/my-room/whitebook/types";
import type { BugFixResultShareRecord } from "./tools/bugfix-lab/types";
import {
  isBugFixResultSharePost,
  isAiTeacherPlayAreaSharePost,
  isPortfolioSharePost,
  isResumeSharePost,
  isStudyNotesSharePost,
  isSystemShareTag,
  isWhitebookSharePost,
} from "../lib/shareSystem";
import type { StudyNotesSharedPostPreview } from "../components/tools/study-notes/types";
import type { PlayAreaDocument } from "../features/ai-teacher-play-area/types";
import { CommentThread } from "./post-card/CommentThread";
import { PostReportSheet } from "./post-card/PostReportSheet";
import { PostCardSharedContent } from "./post-card/PostCardSharedContent";
import { renderInteractiveText } from "./InteractiveText";
import type { PostReportReason } from "../types/database";

interface PostCardProps {
  post: PostWithRelations;
  currentUserId: string;
  followingIds?: Set<string>;
  onToggleLike: (post: PostWithRelations, alreadyLiked: boolean) => Promise<void>;
  onShare?: (post: PostWithRelations, alreadyShared: boolean) => Promise<void>;
  onVotePoll?: (post: PostWithRelations, optionIndex: number) => Promise<void>;
  onAddComment: (postId: string, content: string, parentCommentId?: string | null) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onToggleFollow?: (targetUserId: string, alreadyFollowing: boolean) => Promise<void>;
  highlighted?: boolean;
  initialShowComments?: boolean;
  highlightedCommentId?: string | null;
  detailMode?: boolean;
  variant?: "default" | "community";
  accentColor?: string;
  hideCommunityChip?: boolean;
  hideFollowButton?: boolean;
}

function countComments(comments: CommentWithAuthor[]): number {
  return comments.reduce(
    (total, comment) => total + 1 + countComments(comment.replies || []),
    0
  );
}

function formatVoteSummary(votes: number) {
  return `${formatCompactCount(votes)} vote${votes === 1 ? "" : "s"}`;
}

export function PostCard({
  post,
  currentUserId,
  followingIds,
  onToggleLike,
  onShare,
  onVotePoll,
  onAddComment,
  onDeletePost,
  onDeleteComment,
  onToggleFollow,
  highlighted = false,
  initialShowComments = false,
  highlightedCommentId,
  detailMode = false,
  variant = "default",
  accentColor,
  hideCommunityChip = false,
  hideFollowButton = false,
}: PostCardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const { resolvedTheme } = useThemeStore();
  const [commentDraft, setCommentDraft] = useState("");
  const [showComments, setShowComments] = useState(initialShowComments || Boolean(highlightedCommentId));
  const [commentBusy, setCommentBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportReason, setReportReason] = useState<PostReportReason>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [editedInfoOpen, setEditedInfoOpen] = useState(false);
  const [mediaReady, setMediaReady] = useState(post.image_urls.length === 0 && !post.pdf_url);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [importingKind, setImportingKind] = useState<"resume" | "portfolio" | "whitebook" | "study-notes" | "playarea" | null>(null);
  const [bugfixResultPreview, setBugfixResultPreview] = useState<BugFixResultShareRecord | null>(null);
  const [bugfixResultPreviewLoading, setBugfixResultPreviewLoading] = useState(false);
  const [whitebookPreview, setWhitebookPreview] = useState<WhitebookSharedPostPreview | null>(null);
  const [whitebookPreviewLoading, setWhitebookPreviewLoading] = useState(false);
  const [activeWhitebookPageId, setActiveWhitebookPageId] = useState("");
  const [studyNotesPreview, setStudyNotesPreview] = useState<StudyNotesSharedPostPreview | null>(null);
  const [studyNotesPreviewLoading, setStudyNotesPreviewLoading] = useState(false);
  const [playAreaPreview, setPlayAreaPreview] = useState<PlayAreaDocument | null>(null);
  const [playAreaPreviewLoading, setPlayAreaPreviewLoading] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const comments = post.comments || [];
  const likes = post.likes || [];
  const shares = post.shares || [];
  const pollVotes = useMemo(() => post.poll_votes || [], [post.poll_votes]);
  const authorHidden = post.is_anonymous;
  const alreadyLiked = likes.some((like) => like.user_id === currentUserId);
  const alreadyShared = shares.some((share) => share.user_id === currentUserId);
  const isAuthor = post.author_id === currentUserId;
  const isFollowingAuthor = post.author ? followingIds?.has(post.author.id) : false;
  const totalCommentCount = countComments(comments);
  const postPath = useMemo(() => getPostPath(post), [post]);
  const mediaItems = useMemo<PostMediaLightboxItem[]>(
    () => [
      ...post.image_urls.map((imageUrl, imageIndex) => ({
        id: `${post.id}-image-${imageIndex}`,
        type: "image" as const,
        url: imageUrl,
        alt: `${post.title} image ${imageIndex + 1}`,
        name: `${post.title} image ${imageIndex + 1}`,
      })),
      ...(post.pdf_url
        ? [
          {
            id: `${post.id}-pdf`,
            type: "pdf" as const,
            url: post.pdf_url,
            alt: post.pdf_name || `${post.title} PDF`,
            name: post.pdf_name || `${post.title} PDF`,
            pageCount: post.pdf_page_count,
          },
        ]
        : []),
    ],
    [post.id, post.image_urls, post.pdf_name, post.pdf_page_count, post.pdf_url, post.title]
  );

  const currentVote = pollVotes.find((vote) => vote.user_id === currentUserId)?.option_index ?? null;
  const pollTotals = useMemo(
    () =>
      post.poll_options.map(
        (_, index) => pollVotes.filter((vote) => vote.option_index === index).length
      ),
    [pollVotes, post.poll_options]
  );
  const totalPollVotes = pollVotes.length;

  const authorDisplay = authorHidden
    ? post.visibility_scope === "community"
      ? "Anonymous member"
      : "Anonymous student"
    : `@${post.author?.username || "student"}`;
  const authorHandle = authorHidden ? null : post.author?.username || null;
  const postAuthorSeed = buildAvatarSeed(post.author);
  const visibleTags = useMemo(
    () => getVisiblePostTags(post.tags).filter((tag) => !isSystemShareTag(tag)),
    [post.tags]
  );
  const plannerShareLabel = useMemo(() => getPlannerShareLabel(post.tags), [post.tags]);
  const plannerLockedPost = useMemo(() => isPlannerLockedPost(post.tags), [post.tags]);
  const systemShareLocked = useMemo(() => post.tags.some(isSystemShareTag), [post.tags]);
  const isResumeShare = useMemo(() => isResumeSharePost(post.tags), [post.tags]);
  const isPortfolioShare = useMemo(() => isPortfolioSharePost(post.tags), [post.tags]);
  const isWhitebookShare = useMemo(() => isWhitebookSharePost(post.tags), [post.tags]);
  const hasBugFixResultShareLink = useMemo(() => Boolean(parseBugFixResultShareSlug(post.link_url)), [post.link_url]);
  const isBugFixResultShare = useMemo(
    () => isBugFixResultSharePost(post.tags) || hasBugFixResultShareLink,
    [hasBugFixResultShareLink, post.tags]
  );
  const postEditLocked = plannerLockedPost || systemShareLocked || isBugFixResultShare;
  const hasStudyNotesShareLink = useMemo(() => Boolean(parseStudyNotesShareSlug(post.link_url)), [post.link_url]);
  const isStudyNotesShare = useMemo(
    () => isStudyNotesSharePost(post.tags) || hasStudyNotesShareLink,
    [hasStudyNotesShareLink, post.tags]
  );
  const isAiTeacherPlayAreaShare = useMemo(
    () => isAiTeacherPlayAreaSharePost(post.tags) || isPlayAreaSharedPostLink(post.link_url),
    [post.link_url, post.tags]
  );
  const activeWhitebookPage = useMemo(() => {
    if (!whitebookPreview) {
      return null;
    }

    return (
      whitebookPreview.pages.find((page) => page.id === activeWhitebookPageId) ||
      whitebookPreview.pages.find((page) => page.id === whitebookPreview.activePageId) ||
      whitebookPreview.pages[0] ||
      null
    );
  }, [activeWhitebookPageId, whitebookPreview]);
  const isEdited = Boolean(post.edited_at);
  const editedTimestamp = post.edited_at || post.updated_at;
  const authRedirectPath = useMemo(() => buildAuthRedirectPath(location), [location]);
  const isCommunityCard = variant === "community";
  const communityAccent = useMemo(
    () => normalizeCommunityColor(accentColor || post.community?.hero_color),
    [accentColor, post.community?.hero_color]
  );
  const communityCardStyles = useMemo(() => {
    if (!isCommunityCard) {
      return null;
    }

    const isDark = resolvedTheme === "dark";
    const neutralBorder = isDark ? withCommunityAlpha(communityAccent, 0.2) : "rgba(226, 232, 240, 0.95)";
    const neutralText = isDark ? withAppThemeAlpha("app-text", 0.76) : "#738096";
    const neutralSurface = isDark ? withAppThemeAlpha("app-secondary", 0.92) : "rgba(248, 250, 252, 0.94)";

    return {
      article: {
        borderColor: withCommunityAlpha(communityAccent, isDark ? 0.22 : 0.14),
        backgroundColor: isDark ? withAppThemeAlpha("app-card", 0.98) : "rgba(255,255,255,0.96)",
        boxShadow: `0 26px 54px -42px ${withCommunityAlpha(communityAccent, isDark ? 0.36 : 0.28)}`,
      } satisfies CSSProperties,
      avatar: {
        backgroundColor: withCommunityAlpha(communityAccent, 0.12),
        color: communityAccent,
        boxShadow: `0 14px 28px -18px ${withCommunityAlpha(communityAccent, 0.42)}`,
      } satisfies CSSProperties,
      primaryChip: {
        backgroundColor: withCommunityAlpha(communityAccent, 0.12),
        color: communityAccent,
      } satisfies CSSProperties,
      accentChip: {
        backgroundColor: withCommunityAlpha(communityAccent, 0.1),
        color: communityAccent,
      } satisfies CSSProperties,
      followActive: {
        backgroundColor: withCommunityAlpha(communityAccent, 0.12),
        color: communityAccent,
      } satisfies CSSProperties,
      menuButton: {
        backgroundColor: isDark ? withAppThemeAlpha("app-secondary", 0.86) : withCommunityAlpha(communityAccent, 0.08),
        color: isDark ? withAppThemeAlpha("app-text", 0.86) : "#1f2937",
      } satisfies CSSProperties,
      divider: {
        borderColor: withCommunityAlpha(communityAccent, isDark ? 0.2 : 0.12),
      } satisfies CSSProperties,
      neutralAction: {
        backgroundColor: neutralSurface,
        borderColor: neutralBorder,
        color: neutralText,
      } satisfies CSSProperties,
      activeAction: {
        backgroundColor: withCommunityAlpha(communityAccent, isDark ? 0.18 : 0.12),
        borderColor: withCommunityAlpha(communityAccent, isDark ? 0.3 : 0.22),
        color: communityAccent,
      } satisfies CSSProperties,
      title: {
        color: isDark ? withAppThemeAlpha("app-text", 0.92) : "#1f2432",
      } satisfies CSSProperties,
      pollSelected: {
        backgroundColor: withCommunityAlpha(communityAccent, isDark ? 0.16 : 0.1),
        borderColor: withCommunityAlpha(communityAccent, isDark ? 0.32 : 0.26),
      } satisfies CSSProperties,
      pollSelectedBadge: {
        backgroundColor: withCommunityAlpha(communityAccent, 0.12),
        color: communityAccent,
      } satisfies CSSProperties,
      pollProgress: {
        backgroundColor: withCommunityAlpha(communityAccent, isDark ? 0.18 : 0.12),
      } satisfies CSSProperties,
    };
  }, [communityAccent, isCommunityCard, resolvedTheme]);
  const editHref = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.set("post", post.id);
    const returnTo = `${location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    const editParams = new URLSearchParams({
      edit: post.id,
      returnTo,
    });

    return `/app/create?${editParams.toString()}`;
  }, [location.pathname, location.search, post.id]);

  const shareChipTarget = useMemo(() => {
    if (plannerLockedPost) {
      return { label: "Planner report", href: "/app/myroom/daily-planner", kind: "planner" as const };
    }

    if (isResumeShare) {
      return { label: "ATS Resume", href: "/app/myroom/ats-resume-maker", kind: "internal" as const };
    }

    if (isPortfolioShare) {
      return { label: "Portfolio", href: "/app/myroom/portfolio-maker", kind: "internal" as const };
    }

    if (isWhitebookShare) {
      return { label: "WhiteBook", href: "/app/myroom/whitebook-notebook", kind: "internal" as const };
    }

    if (isStudyNotesShare) {
      return { label: "Video Notes", href: "/app/myroom/video-notes-maker", kind: "internal" as const };
    }

    if (isBugFixResultShare) {
      return { label: "BugFix Lab", href: "/app/tools/bugfix-lab", kind: "internal" as const };
    }

    if (isAiTeacherPlayAreaShare) {
      return { label: "AI PlayArea", href: "/app/myroom/tools/ai-teacher-play-area", kind: "internal" as const };
    }

    return null;
  }, [
    isAiTeacherPlayAreaShare,
    isBugFixResultShare,
    isPortfolioShare,
    isResumeShare,
    isStudyNotesShare,
    isWhitebookShare,
    plannerLockedPost,
  ]);

  const handleShareChipClick = useCallback(() => {
    if (!shareChipTarget) {
      return;
    }

    if (shareChipTarget.kind === "planner") {
      navigate(shareChipTarget.href, {
        state: {
          initialTab: "tasks",
          smoothEntry: true,
        },
      });
      return;
    }

    if (shareChipTarget.kind === "internal" || shareChipTarget.href.startsWith("/")) {
      navigate(shareChipTarget.href);
      return;
    }

    window.open(shareChipTarget.href, "_blank", "noopener,noreferrer");
  }, [navigate, shareChipTarget]);

  useEffect(() => {
    const hasDeferredMedia = post.image_urls.length > 0 || Boolean(post.pdf_url);

    if (!hasDeferredMedia) {
      setMediaReady(true);
      return;
    }

    setMediaReady(false);
    const timer = window.setTimeout(() => {
      setMediaReady(true);
    }, 140);

    return () => {
      window.clearTimeout(timer);
    };
  }, [post.id, post.image_urls.length, post.pdf_url]);

  useEffect(() => {
    setLightboxOpen(false);
    setLightboxIndex(0);
    setShareMenuOpen(false);
    setActionMenuOpen(false);
    setReportSheetOpen(false);
    setReportReason("spam");
    setReportDetails("");
    setImportingKind(null);
    setActiveWhitebookPageId("");
    setBugfixResultPreview(null);
    setStudyNotesPreview(null);
    setPlayAreaPreview(null);
  }, [post.id]);

  useEffect(() => {
    setShowComments(initialShowComments || Boolean(highlightedCommentId));
  }, [highlightedCommentId, initialShowComments, post.id]);

  useEffect(() => {
    if (!isWhitebookShare || !post.link_url) {
      setWhitebookPreview(null);
      setWhitebookPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setWhitebookPreviewLoading(true);

    void loadWhitebookSharedPostPreviewFromSharedPost(post.link_url)
      .then((preview) => {
        if (cancelled) {
          return;
        }

        setWhitebookPreview(preview);
        setActiveWhitebookPageId(preview.activePageId || preview.pages[0]?.id || "");
        setWhitebookPreviewLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setWhitebookPreview(null);
        setActiveWhitebookPageId("");
        setWhitebookPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isWhitebookShare, post.link_url]);

  useEffect(() => {
    if (!isBugFixResultShare || !post.link_url) {
      setBugfixResultPreview(null);
      setBugfixResultPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setBugfixResultPreviewLoading(true);

    void loadBugFixResultPreviewFromSharedPost(post.link_url)
      .then((preview) => {
        if (cancelled) {
          return;
        }

        setBugfixResultPreview(preview);
        setBugfixResultPreviewLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setBugfixResultPreview(null);
        setBugfixResultPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isBugFixResultShare, post.link_url]);

  useEffect(() => {
    if (!isStudyNotesShare || !post.link_url) {
      setStudyNotesPreview(null);
      setStudyNotesPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setStudyNotesPreviewLoading(true);

    void loadStudyNotesPreviewFromSharedPost(post.link_url)
      .then((preview) => {
        if (cancelled) {
          return;
        }

        setStudyNotesPreview(preview);
        setStudyNotesPreviewLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setStudyNotesPreview(null);
        setStudyNotesPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isStudyNotesShare, post.link_url]);

  useEffect(() => {
    if (!isAiTeacherPlayAreaShare || !post.link_url) {
      setPlayAreaPreview(null);
      setPlayAreaPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPlayAreaPreviewLoading(true);

    void loadPlayAreaPreviewFromSharedPost(post.link_url)
      .then((preview) => {
        if (cancelled) {
          return;
        }

        setPlayAreaPreview(preview);
        setPlayAreaPreviewLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setPlayAreaPreview(null);
        setPlayAreaPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAiTeacherPlayAreaShare, post.link_url]);

  useEffect(() => {
    if (!shareMenuOpen && !actionMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      const insideShareMenu = shareMenuRef.current?.contains(event.target) || false;
      const insideActionMenu = actionMenuRef.current?.contains(event.target) || false;

      if (!insideShareMenu && !insideActionMenu) {
        setShareMenuOpen(false);
        setActionMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShareMenuOpen(false);
        setActionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionMenuOpen, shareMenuOpen]);

  useEffect(() => {
    if (!showComments || !highlightedCommentId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`comment-${highlightedCommentId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [highlightedCommentId, showComments, post.comments]);

  const handleShareAction = async (channel: "native" | "copy" | "whatsapp" | "sms") => {
    const url = getAbsolutePostUrl(post);
    const message = `${post.title}\n${url}`;
    setShareBusy(true);

    try {
      if (channel === "native" && typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: post.title,
          text: post.content.slice(0, 180) || post.title,
          url,
        });
      }

      if (channel === "copy") {
        await copyTextToClipboard(url);
      }

      if (channel === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      }

      if (channel === "sms") {
        window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
      }

      if (onShare) {
        await onShare(post, alreadyShared);
      }

      toast.success(
        channel === "copy"
          ? "Post link copied."
          : channel === "sms"
            ? "Opening SMS share."
            : channel === "whatsapp"
              ? "Opening WhatsApp share."
              : "Post shared."
      );
      setShareMenuOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      toast.error("Could not share this post right now.");
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopyPostLink = async () => {
    try {
      await copyTextToClipboard(getAbsolutePostUrl(post));
      toast.success("Post link copied.");
      setActionMenuOpen(false);
    } catch {
      toast.error("Could not copy this post link.");
    }
  };

  const handleSubmitReport = async () => {
    if (!user) {
      toast("Sign in to report posts.");
      navigate(authRedirectPath);
      return;
    }

    if (isAuthor) {
      toast.error("You cannot report your own post.");
      return;
    }

    setReportSubmitting(true);

    try {
      await createPostReport({
        reporterUserId: user.id,
        postId: post.id,
        reason: reportReason,
        details: reportDetails,
      });
      toast.success("Post reported. Our team will review it.");
      setReportSheetOpen(false);
      setActionMenuOpen(false);
      setReportReason("spam");
      setReportDetails("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit this report.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleResumeImport = async () => {
    if (!profile || !user) {
      navigate(authRedirectPath);
      return;
    }

    setImportingKind("resume");

    try {
      const imported = await importResumeFromSharedPost(post.link_url, profile);
      toast.success("Resume imported to ATS Resume.");
      navigate(`/app/myroom/ats-resume-maker/edit/${imported.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import this resume.");
    } finally {
      setImportingKind(null);
    }
  };

  const handlePortfolioImport = async () => {
    if (!profile || !user) {
      navigate(authRedirectPath);
      return;
    }

    setImportingKind("portfolio");

    try {
      const imported = await importPortfolioFromSharedPost(post.link_url, profile);
      toast.success("Portfolio imported to My Room.");
      navigate(`/app/myroom/portfolio-maker/edit/${imported.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import this portfolio.");
    } finally {
      setImportingKind(null);
    }
  };

  const handleWhitebookImport = async () => {
    setImportingKind("whitebook");

    try {
      const imported = await importWhitebookFromSharedPost(post.link_url);
      toast.success("WhiteBook imported to My Room.");
      navigate(`/app/myroom/whitebook-notebook?notebook=${imported.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import this WhiteBook.");
    } finally {
      setImportingKind(null);
    }
  };

  const handleStudyNotesImport = async () => {
    setImportingKind("study-notes");

    try {
      const imported = await importStudyNotesFromSharedPost(post.link_url);
      toast.success("Video Notes Maker folder imported locally.");
      navigate(`/app/myroom/video-notes-maker?folder=${imported.folder.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import this Video Notes Maker folder.");
    } finally {
      setImportingKind(null);
    }
  };

  const handlePlayAreaImport = async () => {
    setImportingKind("playarea");

    try {
      const imported = await importPlayAreaFromSharedPost(post.link_url);
      toast.success("PlayArea imported locally.");
      navigate(`/app/myroom/tools/ai-teacher-play-area?doc=${encodeURIComponent(imported.id)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import this PlayArea.");
    } finally {
      setImportingKind(null);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const openPostDetail = useCallback(() => {
    if (!detailMode) {
      navigate(postPath);
    }
  }, [detailMode, navigate, postPath]);

  const handleArticleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (detailMode) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const interactiveElement = target.closest(
        "a,button,input,textarea,select,label,form,[role='button'],[data-disable-post-open='true']"
      );

      if (interactiveElement) {
        return;
      }

      navigate(postPath);
    },
    [detailMode, navigate, postPath]
  );

  return (
    <>
      <article
        id={`post-${post.id}`}
        onClick={handleArticleClick}
        className={`${isCommunityCard ? "border border-app-border bg-app-card/96 shadow-[0_26px_54px_-42px_rgba(15,23,42,0.26)]" : "native-card"} w-full min-w-0 overflow-hidden rounded-[22px] p-3 transition sm:rounded-[24px] sm:p-3.5 xl:p-4 ${
          detailMode ? "" : "cursor-pointer"
        } ${highlighted ? "ring-2 ring-brand/60 ring-offset-2 ring-offset-app" : ""
          }`}
        style={communityCardStyles?.article}
      >
        <div className={`flex flex-col ${isCommunityCard ? "gap-3" : "gap-3 sm:gap-4"}`}>
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
              <div
                className={`flex shrink-0 items-center justify-center overflow-hidden bg-brand/10 text-brand ${isCommunityCard ? "h-10 w-10 rounded-full shadow-[0_12px_24px_-18px_rgba(59,130,246,0.5)] sm:h-11 sm:w-11" : "h-10 w-10 rounded-full sm:h-12 sm:w-12 sm:rounded-2xl"}`}
                style={communityCardStyles?.avatar}
              >
                {authorHandle ? (
                  <Link to={`/profile/${authorHandle}`} aria-label={`Open ${authorDisplay}'s profile`} className="h-full w-full">
                    <img
                      src={resolveAvatarUrl(
                        post.author?.avatar_url || null,
                        postAuthorSeed,
                        post.author?.updated_at || null
                      )}
                      alt={authorDisplay}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                ) : (
                  <span className="text-sm font-semibold">AN</span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {authorHandle ? (
                    <Link to={`/profile/${authorHandle}`} className={`font-display font-semibold text-app-text hover:text-brand ${isCommunityCard ? "text-[0.95rem] sm:text-[1rem]" : "text-[13px] sm:text-[17px]"}`}>
                      {authorDisplay}
                    </Link>
                  ) : (
                    <p className={`font-display font-semibold ${isCommunityCard ? "text-[0.95rem] sm:text-[1rem]" : "text-[13px] sm:text-[17px]"}`}>{authorDisplay}</p>
                  )}

                  {post.author?.is_verified && !authorHidden ? (
                    <VerifiedBadge className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : null}
                </div>

                <div className={`text-app-muted ${isCommunityCard ? "mt-0.5 text-[11px] sm:text-[12px]" : "mt-0.5 text-[10px] sm:mt-1 sm:text-sm"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{formatRelativeTime(post.created_at)}</span>
                    {isEdited ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setEditedInfoOpen((current) => !current)}
                          className="inline-flex items-center gap-1 rounded-full bg-app-secondary px-1.5 py-0.5 text-[9px] font-medium text-app-text sm:px-1.5 sm:text-[10px]"
                          aria-label="Show edited time"
                        >
                          <PencilLine className="h-2.5 w-2.5 text-brand sm:h-3 sm:w-3" />
                          Edited
                        </button>

                        {editedInfoOpen ? (
                          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-44 rounded-2xl border border-app-border bg-app-card px-3 py-2 text-[10px] leading-5 text-app-muted shadow-xl sm:w-48 sm:text-[11px]">
                            Post edited on {formatDateTime(editedTimestamp)}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="scrollbar-none mt-1 w-full overflow-x-auto pb-0.5 [touch-action:pan-x] sm:mt-1 sm:overflow-visible sm:pb-0">
                  <div className={`flex w-max min-w-full items-center pr-3 text-app-muted sm:min-w-0 sm:flex-wrap sm:pr-0 ${isCommunityCard ? "gap-1.5 text-[10px]" : "gap-1 text-[10px] sm:gap-2 sm:text-sm"}`}>
                    <span
                      className={`whitespace-nowrap rounded-full ${isCommunityCard ? "bg-app-secondary px-2 py-0.5 text-[10px] font-medium text-app-muted" : "bg-app-secondary px-1.5 py-0.5 text-[8px] sm:px-2.5 sm:py-1 sm:text-[11px]"}`}
                      style={communityCardStyles?.primaryChip}
                    >
                      {plannerShareLabel || getDiscussionKindLabel(post.discussion_kind)}
                    </span>
                    {shareChipTarget ? (
                      <button
                        type="button"
                        onClick={handleShareChipClick}
                        className="inline-flex items-center whitespace-nowrap rounded-full bg-brand/10 px-2 py-0.5 text-[10px] text-brand"
                        style={communityCardStyles?.accentChip}
                      >
                        <span>{shareChipTarget.label}</span>
                        <ExternalLink className="ml-0.5 hidden h-2.5 w-2.5 sm:ml-1 sm:block sm:h-3 sm:w-3" />
                      </button>
                    ) : (systemShareLocked || isBugFixResultShare) && !plannerLockedPost ? (
                      <span
                        className="whitespace-nowrap rounded-full bg-brand/10 px-2 py-0.5 text-[10px] text-brand"
                        style={communityCardStyles?.accentChip}
                      >
                        Locked share
                      </span>
                    ) : null}
                    {authorHidden ? (
                      <span
                        className="whitespace-nowrap rounded-full bg-brand/10 px-2 py-0.5 text-[10px] text-brand"
                        style={communityCardStyles?.accentChip}
                      >
                        Anonymous
                      </span>
                    ) : null}
                    {post.post_type === "poll" ? (
                      <span
                        className="whitespace-nowrap rounded-full bg-brand/10 px-2 py-0.5 text-[10px] text-brand"
                        style={communityCardStyles?.accentChip}
                      >
                        Poll
                      </span>
                    ) : null}
                    {post.community && !hideCommunityChip ? (
                      <Link
                        to={`/app/communities/${post.community.slug}?post=${post.id}`}
                        className={`whitespace-nowrap rounded-full font-semibold hover:opacity-90 ${isCommunityCard ? "bg-brand/10 px-2 py-0.5 text-[10px] text-brand" : "bg-[#f4eef9] px-1.5 py-0.5 text-[8px] text-[#855c8f] sm:px-2.5 sm:py-1 sm:text-[11px]"}`}
                        style={communityCardStyles?.accentChip}
                      >
                        {post.community.name}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {!hideFollowButton && !authorHidden && post.author && post.author.id !== currentUserId && onToggleFollow ? (
                <button
                  type="button"
                  onClick={() => void onToggleFollow(post.author!.id, Boolean(isFollowingAuthor))}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[12px] ${isFollowingAuthor ? "bg-brand/10 text-brand" : "bg-app-secondary text-app-muted"
                    }`}
                  style={isFollowingAuthor ? communityCardStyles?.followActive : undefined}
                >
                  {isFollowingAuthor ? <UserCheck2 className="h-3 w-3 sm:h-4 sm:w-4" /> : <UserPlus2 className="h-3 w-3 sm:h-4 sm:w-4" />}
                  {isFollowingAuthor ? "Following" : "Follow"}
                </button>
              ) : null}

              <div ref={actionMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setActionMenuOpen((current) => !current)}
                  className={`rounded-full text-app-text transition hover:text-brand ${isCommunityCard ? "bg-app-secondary p-2" : "bg-app-secondary p-1.5 sm:p-2.5"}`}
                  style={communityCardStyles?.menuButton}
                  aria-label="Post actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>

                {actionMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.65rem)] z-30 w-56 rounded-2xl border border-app-border bg-app-card p-2 shadow-xl">
                    <button
                      type="button"
                      onClick={() => void handleCopyPostLink()}
                      className="w-full rounded-xl px-3 py-3 text-left text-sm text-app-text transition hover:bg-app-secondary"
                    >
                      Copy link
                    </button>

                    {isAuthor && !postEditLocked ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActionMenuOpen(false);
                          navigate(editHref);
                        }}
                        className="w-full rounded-xl px-3 py-3 text-left text-sm text-app-text transition hover:bg-app-secondary"
                      >
                        Edit post
                      </button>
                    ) : null}

                    {!isAuthor ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActionMenuOpen(false);
                          setReportSheetOpen(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                      >
                        <Flag className="h-4 w-4" />
                        Report post
                      </button>
                    ) : null}

                    {isAuthor ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActionMenuOpen(false);
                          void onDeletePost(post.id);
                        }}
                        className="w-full rounded-xl px-3 py-3 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                      >
                        Delete post
                      </button>
                    ) : null}

                    {isAuthor && postEditLocked ? (
                      <div className="rounded-xl px-3 py-3 text-xs text-app-muted">
                        This shared post is locked and cannot be edited.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <h3
              className={`font-display font-bold ${
                isCommunityCard ? "text-[1.08rem] leading-[1.3] text-[#1f2432] sm:text-[1.18rem]" : "text-[13px] leading-5 sm:text-[14px] sm:leading-6"
              } ${
                detailMode || isCommunityCard ? "" : "line-clamp-1"
              } ${
                detailMode ? "" : "transition hover:text-brand"
              }`}
              style={communityCardStyles?.title}
            >
              {renderInteractiveText(post.title)}
            </h3>

            <PostCardSharedContent
              activeWhitebookPage={activeWhitebookPage}
              bugfixResultPreview={bugfixResultPreview}
              bugfixResultPreviewLoading={bugfixResultPreviewLoading}
              importingKind={importingKind}
              isAiTeacherPlayAreaShare={isAiTeacherPlayAreaShare}
              isBugFixResultShare={isBugFixResultShare}
              isPortfolioShare={isPortfolioShare}
              isResumeShare={isResumeShare}
              isStudyNotesShare={isStudyNotesShare}
              isWhitebookShare={isWhitebookShare}
              plannerLockedPost={plannerLockedPost}
              playAreaPreview={playAreaPreview}
              playAreaPreviewLoading={playAreaPreviewLoading}
              post={post}
              previewLines={detailMode ? null : isCommunityCard ? 3 : 3}
              studyNotesPreview={studyNotesPreview}
              studyNotesPreviewLoading={studyNotesPreviewLoading}
              whitebookPreview={whitebookPreview}
              whitebookPreviewLoading={whitebookPreviewLoading}
              onPortfolioImport={() => void handlePortfolioImport()}
              onPlayAreaImport={() => void handlePlayAreaImport()}
              onResumeImport={() => void handleResumeImport()}
              onSelectWhitebookPage={setActiveWhitebookPageId}
              onStudyNotesImport={() => void handleStudyNotesImport()}
              onWhitebookImport={() => void handleWhitebookImport()}
            />
          </div>

          {visibleTags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {visibleTags.map((tag) => (
                <span key={tag} className="rounded-full bg-app-secondary px-1.5 py-0.5 text-[9px] text-app-muted">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          {post.image_urls.length > 0 ? (
            mediaReady ? (
              <PostMediaCarousel
                images={post.image_urls}
                alt={post.title}
                onOpen={(index) => openLightbox(index)}
              />
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-app-border bg-app-secondary/45">
                <div className="h-[180px] animate-pulse bg-app-secondary/80 sm:h-[250px] xl:h-[270px]" />
              </div>
            )
          ) : null}

          {post.pdf_url ? (
            mediaReady ? (
              <PdfInlineViewer
                url={post.pdf_url}
                name={post.pdf_name}
                pageCount={post.pdf_page_count}
                onOpen={() => openLightbox(post.image_urls.length)}
              />
            ) : (
              <section className="overflow-hidden rounded-[24px] border border-app-border bg-app-card">
                <div className="flex items-center justify-between gap-3 border-b border-app-border px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-text sm:text-base">
                      {post.pdf_name || "PDF attachment"}
                    </p>
                    <p className="text-xs text-app-muted">Loading PDF preview after post content.</p>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  <div className="h-28 animate-pulse rounded-2xl bg-app-secondary/70 sm:h-36" />
                </div>
              </section>
            )
          ) : null}

          {post.post_type === "poll" && post.poll_options.length > 0 ? (
            <section className="min-w-0 overflow-hidden rounded-[18px] border border-app-border bg-app-secondary/50 p-2.5 sm:rounded-[22px] sm:p-3.5">
              <div className="mb-2.5 flex min-w-0 items-center gap-1.5 sm:mb-3 sm:gap-2">
                <Vote className="h-3.5 w-3.5 text-brand sm:h-4 sm:w-4" />
                <p className="min-w-0 break-words text-[13px] font-semibold text-app-text sm:text-[15px]">
                  {renderInteractiveText(post.poll_question || "Vote in this poll")}
                </p>
              </div>

              <div className="space-y-2.5 sm:space-y-2.5">
                {post.poll_options.map((option, optionIndex) => {
                  const votes = pollTotals[optionIndex] || 0;
                  const ratio = totalPollVotes > 0 ? (votes / totalPollVotes) * 100 : 0;
                  const roundedRatio = Math.round(ratio);
                  const selected = currentVote === optionIndex;

                  return (
                    <button
                      key={`${post.id}-${optionIndex}`}
                      type="button"
                      onClick={() => void onVotePoll?.(post, optionIndex)}
                      className={`relative min-w-0 w-full max-w-full overflow-hidden rounded-[18px] border px-2.5 py-2 text-left transition sm:rounded-[18px] sm:px-3 sm:py-2.5 ${selected ? "border-brand/40 bg-brand/10" : "border-app-border bg-app-card"
                        }`}
                      style={selected ? communityCardStyles?.pollSelected : undefined}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-[18px] bg-brand/10"
                        style={{ ...communityCardStyles?.pollProgress, width: `${ratio}%` }}
                      />
                      <div className="relative min-w-0">
                        <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-2 sm:items-center">
                              <span className="block min-w-0 break-words text-[13px] font-medium leading-5 text-app-text sm:text-[14px]">
                                {option}
                              </span>
                              <span className="shrink-0 rounded-full bg-app-secondary px-1.5 py-0.5 text-[11px] font-semibold text-app-text sm:px-2 sm:text-[13px]">
                                {roundedRatio}%
                              </span>
                            </div>
                            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1 text-[11px] text-app-muted sm:hidden">
                              <span>{formatVoteSummary(votes)}</span>
                              {selected ? (
                                <span
                                  className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand"
                                  style={communityCardStyles?.pollSelectedBadge}
                                >
                                  You
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="hidden shrink-0 items-center gap-2 text-[13px] text-app-muted sm:flex">
                            <span>{formatVoteSummary(votes)}</span>
                            {selected ? (
                              <span
                                className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand"
                                style={communityCardStyles?.pollSelectedBadge}
                              >
                                You
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-[11px] text-app-muted sm:mt-2.5 sm:text-[13px]">
                {totalPollVotes === 0 ? "No votes yet." : `${formatCompactCount(totalPollVotes)} votes`}
              </p>
            </section>
          ) : null}

          <div
            className={`${isCommunityCard ? "grid grid-cols-3 gap-1.5 border-t border-app-border pt-3" : "flex flex-wrap items-center gap-2 border-t border-app-border pt-3 sm:gap-2.5 sm:pt-3.5"}`}
            style={communityCardStyles?.divider}
          >
            <button
              type="button"
              onClick={() => void onToggleLike(post, alreadyLiked)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium ${
                isCommunityCard
                  ? `min-w-0 w-full flex-nowrap justify-center border px-2 py-1.5 text-[9px] font-semibold leading-none sm:text-[10px]`
                  : `sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[13px] ${alreadyLiked ? "bg-rose-500/10 text-rose-500" : "bg-app-secondary text-app-muted"}`
              }`}
              style={isCommunityCard ? (alreadyLiked ? communityCardStyles?.activeAction : communityCardStyles?.neutralAction) : undefined}
            >
              <Heart className={`h-3 w-3 shrink-0 sm:h-4 sm:w-4 ${alreadyLiked ? "fill-current" : ""}`} />
              <span className="truncate whitespace-nowrap">{formatCompactCount(likes.length)} likes</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (detailMode) {
                  setShowComments((current) => !current);
                  return;
                }

                openPostDetail();
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium ${
                isCommunityCard
                  ? "min-w-0 w-full flex-nowrap justify-center border px-2 py-1.5 text-[9px] font-semibold leading-none sm:text-[10px]"
                  : "bg-app-secondary text-app-muted sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[13px]"
              }`}
              style={isCommunityCard ? communityCardStyles?.neutralAction : undefined}
            >
              <MessageSquare className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate whitespace-nowrap">{formatCompactCount(totalCommentCount)} comments</span>
            </button>

            <div ref={shareMenuRef} className={`${isCommunityCard ? "relative w-full" : "relative"}`}>
              <button
                type="button"
                disabled={shareBusy}
                onClick={() => setShareMenuOpen((current) => !current)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium ${
                  isCommunityCard
                    ? `min-w-0 w-full flex-nowrap justify-center border px-2 py-1.5 text-[9px] font-semibold leading-none sm:text-[10px]`
                    : `sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[13px] ${alreadyShared ? "bg-brand/10 text-brand" : "bg-app-secondary text-app-muted"}`
                }`}
                style={isCommunityCard ? (alreadyShared ? communityCardStyles?.activeAction : communityCardStyles?.neutralAction) : undefined}
              >
                <Share2 className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                <span className="truncate whitespace-nowrap">{formatCompactCount(shares.length)} shares</span>
              </button>

              {shareMenuOpen ? (
                <div className="absolute bottom-[calc(100%+0.75rem)] right-0 z-30 w-56 rounded-2xl border border-app-border bg-app-card p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => void handleShareAction("copy")}
                    className="w-full rounded-xl px-3 py-3 text-left text-sm text-app-text transition hover:bg-app-secondary"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShareAction("whatsapp")}
                    className="w-full rounded-xl px-3 py-3 text-left text-sm text-app-text transition hover:bg-app-secondary"
                  >
                    Share on WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShareAction("sms")}
                    className="w-full rounded-xl px-3 py-3 text-left text-sm text-app-text transition hover:bg-app-secondary"
                  >
                    Share by SMS
                  </button>
                  {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                    <button
                      type="button"
                      onClick={() => void handleShareAction("native")}
                      className="w-full rounded-xl px-3 py-3 text-left text-sm text-app-text transition hover:bg-app-secondary"
                    >
                      Open device share
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

        </div>
      </article>

      <PostReportSheet
        open={reportSheetOpen}
        reason={reportReason}
        details={reportDetails}
        submitting={reportSubmitting}
        onClose={() => {
          if (reportSubmitting) {
            return;
          }

          setReportSheetOpen(false);
        }}
        onReasonChange={setReportReason}
        onDetailsChange={setReportDetails}
        onSubmit={() => void handleSubmitReport()}
      />

      {showComments ? (
        <section className="mt-3 rounded-[22px] border border-app-border/75 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.92))] p-3 shadow-[0_22px_50px_-40px_rgba(15,23,42,0.28)] dark:bg-[linear-gradient(180deg,rgba(11,17,31,0.98),rgba(8,13,25,0.96))] sm:mt-4 sm:rounded-[24px] sm:p-4">
          <div className="grid gap-3">
            {comments.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-brand/20 bg-white/80 px-4 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:bg-slate-950/45 dark:shadow-none">
                <p className="text-[12px] leading-5 text-app-muted sm:text-sm">No comments yet.</p>
              </div>
            ) : (
              comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  authorHidden={authorHidden}
                  onReply={async (parentCommentId, content) => onAddComment(post.id, content, parentCommentId)}
                  onDeleteComment={onDeleteComment}
                  highlightedCommentId={highlightedCommentId}
                />
              ))
            )}
          </div>

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!commentDraft.trim()) return;
              setCommentBusy(true);
              try {
                await onAddComment(post.id, commentDraft.trim(), null);
                setCommentDraft("");
              } finally {
                setCommentBusy(false);
              }
            }}
            className="mt-3 rounded-[20px] border border-white/80 bg-white/95 p-2.5 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_24px_50px_-38px_rgba(2,6,23,0.85)]"
          >
            <div className="flex items-end gap-2.5">
              <textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                className="min-h-[44px] w-full resize-none border-0 bg-transparent px-1 py-1.5 text-[14px] leading-6 text-app-text outline-none placeholder:text-app-muted/90 sm:min-h-[52px]"
                placeholder="Write a thoughtful comment..."
              />
              <button
                type="submit"
                disabled={commentBusy}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold text-white shadow-[0_16px_30px_-20px_rgba(37,99,235,0.85)] transition disabled:cursor-not-allowed disabled:shadow-none sm:px-4 ${
                  commentDraft.trim()
                    ? "bg-brand hover:brightness-105"
                    : "bg-sky-200/90 text-white/90 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {commentBusy ? "Posting..." : "Post"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <PostMediaLightbox
        open={lightboxOpen}
        items={mediaItems}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
