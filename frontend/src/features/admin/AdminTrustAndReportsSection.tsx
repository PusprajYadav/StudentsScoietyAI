import { Flag, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminPanelCard, AdminPillTabs, AdminSectionHeading } from "./AdminUi";
import { ProfileDeletionRequestsSection } from "./ProfileDeletionRequestsSection";
import { ReportedContentSection } from "./ReportedContentSection";
import type {
  AccountDeletionRequestStatus,
  AccountDeletionRequestWithRelations,
  PostReportStatus,
  PostReportWithRelations,
} from "../../types/database";

type AdminTrustAndReportsView = "profileDeletion" | "reportedContent";

interface AdminTrustAndReportsSectionProps {
  loading: boolean;
  searchTerm: string;
  deletionRequests: AccountDeletionRequestWithRelations[];
  postReports: PostReportWithRelations[];
  onReviewDeletionRequest: (
    request: AccountDeletionRequestWithRelations,
    input: {
      nextStatus: AccountDeletionRequestStatus;
      reviewNote?: string | null;
    }
  ) => Promise<void>;
  onResolveReportedPost: (
    postId: string,
    input: {
      nextStatus: PostReportStatus;
      adminNote?: string | null;
    }
  ) => Promise<void>;
  onToggleReportedPostVisibility: (postId: string) => Promise<void>;
  onDeleteReportedPost: (postId: string) => Promise<void>;
}

export function AdminTrustAndReportsSection({
  loading,
  searchTerm,
  deletionRequests,
  postReports,
  onReviewDeletionRequest,
  onResolveReportedPost,
  onToggleReportedPostVisibility,
  onDeleteReportedPost,
}: AdminTrustAndReportsSectionProps) {
  const [activeView, setActiveView] = useState<AdminTrustAndReportsView>("profileDeletion");
  const pendingDeletionCount = useMemo(
    () => deletionRequests.filter((request) => request.status === "pending").length,
    [deletionRequests]
  );
  const openReportedPostCount = useMemo(() => {
    const openPostIds = new Set(
      postReports
        .filter((report) => report.status === "open")
        .map((report) => report.post_id)
    );

    return openPostIds.size;
  }, [postReports]);

  const views = [
    {
      id: "profileDeletion" as const,
      label: "Profile deletion",
      description: "Review account removal requests",
      icon: ShieldAlert,
      count: pendingDeletionCount,
      activeClass: "from-amber-500 to-orange-500",
    },
    {
      id: "reportedContent" as const,
      label: "Reported content",
      description: "Inspect flagged posts and reasons",
      icon: Flag,
      count: openReportedPostCount,
      activeClass: "from-rose-500 to-pink-500",
    },
  ];

  return (
    <div className="space-y-3">
      <AdminPanelCard className="space-y-3">
        <AdminSectionHeading
          icon={ShieldAlert}
          title="Trust queue"
          description="Deletion requests and reported posts in one cleaner review flow."
          iconClassName="from-rose-500 to-pink-500"
        />

        <AdminPillTabs
          tabs={views.map((view) => ({
            ...view,
            count: view.count,
            activeClassName: `bg-gradient-to-r ${view.activeClass}`,
          }))}
          activeId={activeView}
          onChange={(value) => setActiveView(value as AdminTrustAndReportsView)}
          size="lg"
        />
      </AdminPanelCard>

      {activeView === "profileDeletion" ? (
        <ProfileDeletionRequestsSection
          loading={loading}
          searchTerm={searchTerm}
          requests={deletionRequests}
          onReviewRequest={onReviewDeletionRequest}
        />
      ) : (
        <ReportedContentSection
          loading={loading}
          searchTerm={searchTerm}
          reports={postReports}
          onResolveReports={onResolveReportedPost}
          onToggleVisibility={onToggleReportedPostVisibility}
          onDeletePost={onDeleteReportedPost}
        />
      )}
    </div>
  );
}
