import type { WhitebookSharedPostPreview } from "../../features/my-room/whitebook/types";
import type { PlayAreaDocument } from "../../features/ai-teacher-play-area/types";
import type { PostWithRelations } from "../../types/database";
import type { BugFixResultShareRecord } from "../tools/bugfix-lab/types";
import type { StudyNotesSharedPostPreview } from "../tools/study-notes/types";
import { BugFixResultShareCard } from "./BugFixResultShareCard";
import { PlayAreaShareCard } from "./PlayAreaShareCard";
import { PlannerPostContent } from "./PlannerPostContent";
import { ResumePortfolioShareCard } from "./ResumePortfolioShareCard";
import { StudyNotesShareCard } from "./StudyNotesShareCard";
import { WhitebookShareCard } from "./WhitebookShareCard";
import { RichPostContent } from "../RichPostContent";

interface PostCardSharedContentProps {
  activeWhitebookPage: WhitebookSharedPostPreview["pages"][number] | null;
  bugfixResultPreview: BugFixResultShareRecord | null;
  bugfixResultPreviewLoading: boolean;
  importingKind: "resume" | "portfolio" | "whitebook" | "study-notes" | "playarea" | null;
  isAiTeacherPlayAreaShare: boolean;
  isBugFixResultShare: boolean;
  isPortfolioShare: boolean;
  isResumeShare: boolean;
  isStudyNotesShare: boolean;
  isWhitebookShare: boolean;
  plannerLockedPost: boolean;
  playAreaPreview: PlayAreaDocument | null;
  playAreaPreviewLoading: boolean;
  post: PostWithRelations;
  previewLines?: number | null;
  studyNotesPreview: StudyNotesSharedPostPreview | null;
  studyNotesPreviewLoading: boolean;
  whitebookPreview: WhitebookSharedPostPreview | null;
  whitebookPreviewLoading: boolean;
  onPortfolioImport: () => void;
  onPlayAreaImport: () => void;
  onResumeImport: () => void;
  onSelectWhitebookPage: (pageId: string) => void;
  onStudyNotesImport: () => void;
  onWhitebookImport: () => void;
}

export function PostCardSharedContent({
  activeWhitebookPage,
  bugfixResultPreview,
  bugfixResultPreviewLoading,
  importingKind,
  isAiTeacherPlayAreaShare,
  isBugFixResultShare,
  isPortfolioShare,
  isResumeShare,
  isStudyNotesShare,
  isWhitebookShare,
  plannerLockedPost,
  playAreaPreview,
  playAreaPreviewLoading,
  post,
  previewLines,
  studyNotesPreview,
  studyNotesPreviewLoading,
  whitebookPreview,
  whitebookPreviewLoading,
  onPortfolioImport,
  onPlayAreaImport,
  onResumeImport,
  onSelectWhitebookPage,
  onStudyNotesImport,
  onWhitebookImport,
}: PostCardSharedContentProps) {
  if (isAiTeacherPlayAreaShare && post.link_url) {
    return (
      <PlayAreaShareCard
        importBusy={importingKind === "playarea"}
        linkUrl={post.link_url}
        postContent={post.content}
        postTitle={post.title}
        preview={playAreaPreview}
        previewLoading={playAreaPreviewLoading}
        onImport={onPlayAreaImport}
      />
    );
  }

  if (isBugFixResultShare && post.link_url) {
    return (
      <BugFixResultShareCard
        linkUrl={post.link_url}
        postContent={post.content}
        postTitle={post.title}
        preview={bugfixResultPreview}
        previewLoading={bugfixResultPreviewLoading}
      />
    );
  }

  if (isStudyNotesShare && post.link_url) {
    return (
      <StudyNotesShareCard
        postContent={post.content}
        postTitle={post.title}
        preview={studyNotesPreview}
        previewLoading={studyNotesPreviewLoading}
        importBusy={importingKind === "study-notes"}
        onImport={onStudyNotesImport}
      />
    );
  }

  if (isWhitebookShare && post.link_url) {
    return (
      <WhitebookShareCard
        activePage={activeWhitebookPage}
        importBusy={importingKind === "whitebook"}
        linkUrl={post.link_url}
        postContent={post.content}
        preview={whitebookPreview}
        previewLoading={whitebookPreviewLoading}
        onImport={onWhitebookImport}
        onSelectPage={onSelectWhitebookPage}
      />
    );
  }

  if ((isResumeShare || isPortfolioShare) && post.link_url) {
    return (
      <ResumePortfolioShareCard
        importBusy={importingKind === (isResumeShare ? "resume" : "portfolio")}
        isResumeShare={isResumeShare}
        linkUrl={post.link_url}
        postContent={post.content}
        onImport={isResumeShare ? onResumeImport : onPortfolioImport}
      />
    );
  }

  if (plannerLockedPost) {
    return <PlannerPostContent content={post.content} linkUrl={post.link_url} />;
  }

  return <RichPostContent content={post.content} linkUrl={post.link_url} previewLines={previewLines} />;
}
