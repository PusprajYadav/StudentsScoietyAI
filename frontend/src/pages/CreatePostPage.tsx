import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ComposerPayload, PostComposer, type ComposerInitialValues } from "../components/PostComposer";
import { discussionModes, isDiscussionKind } from "../data/discussions";
import {
  createPost,
  defaultPlatformSettings,
  loadCommunityMemberships,
  loadOwnedPostForEdit,
  loadPlatformSettings,
  loadVisibleCommunities,
  updatePost,
} from "../lib/api";
import { parseBugFixResultShareSlug } from "../components/tools/bugfix-lab/helpers";
import { COIN_FEATURE_KEYS, getCoinCostLabel } from "../lib/coins";
import { isPlannerLockedPost } from "../lib/plannerPost";
import { getPostPath } from "../lib/postLinks";
import { isSystemShareTag } from "../lib/shareSystem";
import { useAuthStore } from "../store/authStore";
import { useCoinWalletStore } from "../store/coinWalletStore";
import type { CommunityRow, DiscussionKind, PlatformSettingsRow, PostWithRelations } from "../types/database";

function getPostingRestrictionReason() {
  return "Posting is restricted on your account right now.";
}

function getPreferredDefaultKind(kinds: DiscussionKind[] | undefined, fallbackKind: DiscussionKind) {
  if (!kinds || kinds.length === 0) {
    return fallbackKind;
  }

  if (kinds.includes(fallbackKind)) {
    return fallbackKind;
  }

  return kinds.find((kind) => kind !== "anonymous") || kinds[0] || fallbackKind;
}

export function CreatePostPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuthStore();
  const editPostId = searchParams.get("edit");
  const returnTo = searchParams.get("returnTo");
  const isEditMode = Boolean(editPostId);
  const requestedDestination = searchParams.get("destination") === "community" ? "community" : "discussion";
  const requestedCommunitySlug = (searchParams.get("community") || "").toLowerCase();
  const requestedKind = searchParams.get("kind");
  const fallbackKind: DiscussionKind = isDiscussionKind(requestedKind) ? requestedKind : "study";

  const [destination, setDestination] = useState<"discussion" | "community">(requestedDestination);
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [visibleCommunities, setVisibleCommunities] = useState<CommunityRow[]>([]);
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<Set<string>>(new Set());
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsRow>(defaultPlatformSettings);
  const [editingPost, setEditingPost] = useState<PostWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const coinFeatureSettings = useCoinWalletStore((state) => state.featureSettings);
  const postCreateCostLabel = getCoinCostLabel(coinFeatureSettings, COIN_FEATURE_KEYS.postCreate);
  const postEditCostLabel = getCoinCostLabel(coinFeatureSettings, COIN_FEATURE_KEYS.postEdit);

  const loadPageData = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      const [settings, communities, memberships, editablePost] = await Promise.all([
        loadPlatformSettings(),
        loadVisibleCommunities(),
        loadCommunityMemberships(user.id),
        isEditMode && editPostId ? loadOwnedPostForEdit(editPostId, user.id) : Promise.resolve(null),
      ]);

      if (isEditMode && editPostId && !editablePost) {
        throw new Error("This post is not available for editing.");
      }

      const nextCommunities = [...communities];
      if (editablePost?.community && !nextCommunities.some((entry) => entry.id === editablePost.community?.id)) {
        nextCommunities.unshift(editablePost.community);
      }

      setPlatformSettings(settings);
      setVisibleCommunities(nextCommunities);
      setJoinedCommunityIds(memberships);
      setEditingPost(editablePost);

      const candidateCommunities = nextCommunities.filter(
        (entry) => memberships.has(entry.id) || entry.id === editablePost?.community_id
      );
      const nextDestination = editablePost?.visibility_scope || requestedDestination;
      setDestination(nextDestination);

      if (!candidateCommunities.length) {
        setSelectedCommunityId("");
        return;
      }

      const requestedCommunity = editablePost?.community_id
        ? candidateCommunities.find((entry) => entry.id === editablePost.community_id)
        : requestedCommunitySlug
          ? candidateCommunities.find((entry) => entry.slug.toLowerCase() === requestedCommunitySlug)
          : null;

      setSelectedCommunityId(requestedCommunity?.id || candidateCommunities[0].id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load posting options.");
    } finally {
      setLoading(false);
    }
  }, [editPostId, isEditMode, requestedCommunitySlug, requestedDestination, user]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  const joinedCommunities = useMemo(
    () =>
      visibleCommunities.filter(
        (entry) => joinedCommunityIds.has(entry.id) || entry.id === editingPost?.community_id
      ),
    [editingPost?.community_id, joinedCommunityIds, visibleCommunities]
  );
  const selectedCommunity =
    joinedCommunities.find((entry) => entry.id === selectedCommunityId) || joinedCommunities[0] || null;

  useEffect(() => {
    if (destination !== "community") {
      return;
    }

    if (!joinedCommunities.length) {
      setSelectedCommunityId("");
      return;
    }

    if (!joinedCommunities.some((entry) => entry.id === selectedCommunityId)) {
      setSelectedCommunityId(joinedCommunities[0].id);
    }
  }, [destination, joinedCommunities, selectedCommunityId]);

  const composerKindsBase =
    destination === "community" ? selectedCommunity?.posting_modes || discussionModes : discussionModes;
  const composerKinds = useMemo(() => {
    if (!editingPost || composerKindsBase.includes(editingPost.discussion_kind)) {
      return composerKindsBase;
    }

    return [...composerKindsBase, editingPost.discussion_kind];
  }, [composerKindsBase, editingPost]);
  const composerDefaultKind =
    isEditMode && editingPost
      ? composerKinds.includes(editingPost.discussion_kind)
        ? editingPost.discussion_kind
        : getPreferredDefaultKind(composerKinds, fallbackKind)
      : destination === "community"
        ? getPreferredDefaultKind(selectedCommunity?.posting_modes, fallbackKind)
        : fallbackKind;
  const composerInitialValues = useMemo<ComposerInitialValues | undefined>(
    () =>
      editingPost
        ? {
            title: editingPost.title,
            content: editingPost.content,
            tags: editingPost.tags,
            discussionKind: editingPost.discussion_kind,
            existingImageUrls: editingPost.image_urls,
            existingPdf: editingPost.pdf_url
              ? {
                  url: editingPost.pdf_url,
                  name: editingPost.pdf_name,
                  sizeBytes: editingPost.pdf_size_bytes,
                  pageCount: editingPost.pdf_page_count,
                }
              : null,
            isAnonymous: editingPost.is_anonymous,
            linkUrl: editingPost.link_url,
            postType: editingPost.post_type,
            pollQuestion: editingPost.poll_question,
            pollOptions: editingPost.poll_options,
          }
        : undefined,
    [editingPost]
  );

  if (!user || !profile) {
    return null;
  }

  const canPost = Boolean(
    !profile.is_banned &&
      profile.can_post &&
      (!profile.posting_restricted_until || new Date(profile.posting_restricted_until) < new Date())
  );

  const postingDisabledReason = !canPost
    ? getPostingRestrictionReason()
    : destination === "community" && !selectedCommunity
      ? "Join a community first."
      : null;
  const plannerEditLocked = Boolean(isEditMode && editingPost && isPlannerLockedPost(editingPost.tags));
  const systemEditLocked = Boolean(
    isEditMode &&
      editingPost &&
      (editingPost.tags.some(isSystemShareTag) || Boolean(parseBugFixResultShareSlug(editingPost.link_url)))
  );

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <section className="surface-card rounded-[22px] p-3.5 sm:rounded-[24px] sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              if (returnTo) {
                navigate(returnTo);
                return;
              }

              navigate(-1);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-app-secondary px-3 py-1.5 text-sm font-semibold text-app-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <button
            type="button"
            onClick={() => setDestination("discussion")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              destination === "discussion" ? "bg-brand text-white" : "bg-app-secondary text-app-text"
            }`}
          >
            Discussion
          </button>
          <button
            type="button"
            onClick={() => setDestination("community")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              destination === "community" ? "bg-brand text-white" : "bg-app-secondary text-app-text"
            }`}
          >
            Community
          </button>
        </div>

        {destination === "community" ? (
          <label className="mt-3 grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Community</span>
            <select
              value={selectedCommunity?.id || ""}
              onChange={(event) => setSelectedCommunityId(event.target.value)}
              className="input-shell h-11 text-sm"
              disabled={!joinedCommunities.length}
            >
              {joinedCommunities.length === 0 ? (
                <option value="">Join a community first</option>
              ) : (
                joinedCommunities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))
              )}
            </select>
          </label>
        ) : null}
      </section>

      {loading ? (
        <div className="surface-card h-64 animate-pulse rounded-[24px]" />
      ) : isEditMode && !editingPost ? (
        <div className="surface-card rounded-[22px] p-5 text-sm text-app-muted">
          This post could not be loaded for editing.
        </div>
      ) : plannerEditLocked ? (
        <div className="surface-card rounded-[22px] p-5 text-sm text-app-muted">
          This planner report is a fixed snapshot and cannot be edited after sharing.
        </div>
      ) : systemEditLocked ? (
        <div className="surface-card rounded-[22px] p-5 text-sm text-app-muted">
          This shared system post is locked after publishing and cannot be edited.
        </div>
      ) : (
        <PostComposer
          id="create-post-composer"
          title={
            isEditMode
              ? destination === "community"
                ? "Community post"
                : "Edit discussion post"
              : destination === "community"
                ? "Community post"
                : "Discussion post"
          }
          description={isEditMode ? "Edit and share." : "Quick post composer"}
          submitHint={
            isEditMode
              ? postEditCostLabel
              : postCreateCostLabel
          }
          availableKinds={composerKinds}
          defaultKind={composerDefaultKind}
          limits={platformSettings}
          disabledReason={postingDisabledReason}
          initialValues={composerInitialValues}
          submitLabel={isEditMode ? "Save changes" : "Publish post"}
          submittingLabel={isEditMode ? "Saving changes..." : "Publishing..."}
          disablePostTypeSwitch={isEditMode}
          disablePollOptionEditing={Boolean(isEditMode && editingPost?.post_type === "poll")}
          onSubmit={async (payload: ComposerPayload) => {
            if (isEditMode && editingPost) {
              const updatedPost = await updatePost({
                post: editingPost,
                editorId: user.id,
                visibilityScope: destination === "community" ? "community" : "discussion",
                communityId: destination === "community" ? selectedCommunity?.id : null,
                discussionKind: payload.discussionKind,
                title: payload.title,
                content: payload.content,
                tags: payload.tags,
                imageFiles: payload.imageFiles,
                retainedImageUrls: payload.retainedImageUrls,
                pdfFile: payload.pdfFile,
                pdfPageCount: payload.pdfPageCount,
                retainExistingPdf: payload.retainExistingPdf,
                isAnonymous: payload.isAnonymous,
                linkUrl: payload.linkUrl,
                postType: editingPost.post_type,
                pollQuestion: payload.pollQuestion,
                pollOptions: editingPost.poll_options,
                settings: platformSettings,
              });

              toast.success("Post updated.");
              const keptOriginalPlacement =
                updatedPost.visibility_scope === editingPost.visibility_scope &&
                updatedPost.discussion_kind === editingPost.discussion_kind &&
                updatedPost.community_id === editingPost.community_id;
              const canReturnToProfile = Boolean(returnTo?.startsWith("/profile/") && !updatedPost.is_anonymous);
              navigate(
                returnTo && (keptOriginalPlacement || canReturnToProfile)
                  ? returnTo
                  : getPostPath(updatedPost),
                { replace: true }
              );
              return;
            }

            await createPost({
              authorId: user.id,
              visibilityScope: destination === "community" ? "community" : "discussion",
              communityId: destination === "community" ? selectedCommunity?.id : undefined,
              discussionKind: payload.discussionKind,
              title: payload.title,
              content: payload.content,
              tags: payload.tags,
              imageFiles: payload.imageFiles,
              pdfFile: payload.pdfFile,
              pdfPageCount: payload.pdfPageCount,
              linkUrl: payload.linkUrl,
              postType: payload.postType,
              pollQuestion: payload.pollQuestion,
              pollOptions: payload.pollOptions,
              isAnonymous: payload.isAnonymous,
              settings: platformSettings,
            });

            toast.success("Post published.");

            if (destination === "community" && selectedCommunity) {
              navigate(`/app/communities/${selectedCommunity.slug}`);
              return;
            }

            navigate(`/app/discussions/${payload.discussionKind}`);
          }}
        />
      )}
    </div>
  );
}
