import { X } from "lucide-react";
import type {
  CommunityFeedVisibility,
  CommunityJoinPolicy,
  CommunityMemberRole,
  CommunityMemberWithProfile,
  CommunityRow,
  DiscussionKind,
} from "../../types/database";
import { CommunityManagementWorkspace } from "./CommunityManagementWorkspace";

interface CommunityManageSheetProps {
  open: boolean;
  community: CommunityRow | null;
  members: CommunityMemberWithProfile[];
  loadingMembers: boolean;
  actingUserId?: string | null;
  currentUserRole?: CommunityMemberRole | null;
  canAssignAdmins: boolean;
  onClose: () => void;
  onSaveSettings: (payload: {
    name: string;
    description: string;
    heroColor: string;
    postingModes: DiscussionKind[];
    joinPolicy: CommunityJoinPolicy;
    requiresPassword: boolean;
    password: string;
    passwordHint: string;
    feedVisibility: CommunityFeedVisibility;
  }) => Promise<void>;
  onAcceptRequest: (userId: string) => Promise<void>;
  onRejectRequest: (userId: string) => Promise<void>;
  onKickMember: (userId: string) => Promise<void>;
  onBanMember: (userId: string) => Promise<void>;
  onToggleAdmin: (userId: string, makeAdmin: boolean) => Promise<void>;
}

export function CommunityManageSheet({
  open,
  community,
  members,
  loadingMembers,
  actingUserId = null,
  currentUserRole = null,
  canAssignAdmins,
  onClose,
  onSaveSettings,
  onAcceptRequest,
  onRejectRequest,
  onKickMember,
  onBanMember,
  onToggleAdmin,
}: CommunityManageSheetProps) {
  if (!open || !community) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex h-full items-end justify-center p-0 sm:p-4">
        <div className="native-sheet flex h-[90dvh] w-full max-w-6xl flex-col p-4 sm:h-auto sm:max-h-[90dvh] sm:rounded-[32px] sm:border sm:shadow-2xl">
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-app-border sm:hidden" />

          <div className="flex items-start justify-between gap-3 pb-4">
            <div>
              <p className="font-display text-[1.5rem] font-bold tracking-tight text-app-text sm:text-[2rem]">
                Manage {community.name}
              </p>
              <p className="mt-1 text-sm text-app-muted">
                Update access rules, review requests, and manage who helps moderate this community.
              </p>
            </div>

            <button type="button" onClick={onClose} className="native-icon-button h-10 w-10" aria-label="Close manage community sheet">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto pb-1">
            <CommunityManagementWorkspace
              community={community}
              members={members}
              loadingMembers={loadingMembers}
              actingUserId={actingUserId}
              currentUserRole={currentUserRole}
              canAssignAdmins={canAssignAdmins}
              onSaveSettings={onSaveSettings}
              onAcceptRequest={onAcceptRequest}
              onRejectRequest={onRejectRequest}
              onKickMember={onKickMember}
              onBanMember={onBanMember}
              onToggleAdmin={onToggleAdmin}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
