import {
  BookOpen,
  Briefcase,
  Check,
  Crown,
  FileText,
  Ghost,
  Hash,
  Lock,
  Paintbrush,
  Settings2,
  Shield,
  ShieldAlert,
  Type,
  UserMinus2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getDiscussionKindLabel } from "../../data/discussions";
import type {
  CommunityFeedVisibility,
  CommunityJoinPolicy,
  CommunityMemberRole,
  CommunityMemberWithProfile,
  CommunityRow,
  DiscussionKind,
} from "../../types/database";
import { CommunityFeedVisibilityPicker } from "./CommunityFeedVisibilityPicker";

interface CommunityManagementWorkspaceProps {
  community: CommunityRow;
  members: CommunityMemberWithProfile[];
  loadingMembers: boolean;
  actingUserId?: string | null;
  currentUserRole?: CommunityMemberRole | null;
  canAssignAdmins: boolean;
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

type CommunityManagementTab = "settings" | "requests" | "members" | "blocked";
const MODE_META: Record<DiscussionKind, { icon: typeof BookOpen }> = {
  study: { icon: BookOpen },
  job: { icon: Briefcase },
  anonymous: { icon: Ghost },
};

export function CommunityManagementWorkspace({
  community,
  members,
  loadingMembers,
  actingUserId = null,
  currentUserRole = null,
  canAssignAdmins,
  onSaveSettings,
  onAcceptRequest,
  onRejectRequest,
  onKickMember,
  onBanMember,
  onToggleAdmin,
}: CommunityManagementWorkspaceProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [heroColor, setHeroColor] = useState("#2563eb");
  const [postingModes, setPostingModes] = useState<DiscussionKind[]>(["study", "job", "anonymous"]);
  const [joinPolicy, setJoinPolicy] = useState<CommunityJoinPolicy>("open");
  const [feedVisibility, setFeedVisibility] = useState<CommunityFeedVisibility>("community_only");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<CommunityManagementTab>("settings");

  useEffect(() => {
    setName(community.name);
    setDescription(community.description);
    setHeroColor(community.hero_color);
    setPostingModes(community.posting_modes);
    setJoinPolicy(community.join_policy);
    setFeedVisibility(community.feed_visibility);
    setRequiresPassword(community.requires_password);
    setPassword("");
    setPasswordHint(community.password_hint || "");
    setSaving(false);
  }, [community]);

  useEffect(() => {
    setActiveTab("settings");
  }, [community.id]);

  const pendingMembers = useMemo(
    () => members.filter((member) => member.status === "pending"),
    [members]
  );
  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members]
  );
  const bannedMembers = useMemo(
    () => members.filter((member) => member.status === "banned"),
    [members]
  );
  const missingPostingModes = postingModes.length === 0;
  const needsNewPassword = requiresPassword && !community.requires_password && !password.trim();
  const trimmedName = name.trim();
  const saveDisabled = saving || !trimmedName || missingPostingModes || needsNewPassword;
  const currentRoleLabel =
    currentUserRole === "owner" ? "Owner" : currentUserRole === "admin" ? "Admin" : "Manager";
  const managementTabs: Array<{
    id: CommunityManagementTab;
    label: string;
    count?: number;
    icon: typeof Settings2;
  }> = [
    { id: "settings", label: "Edit", icon: Settings2 },
    { id: "requests", label: "Join", count: pendingMembers.length, icon: UserPlus },
    { id: "members", label: "Members", count: activeMembers.length, icon: Users },
    { id: "blocked", label: "Blocked", count: bannedMembers.length, icon: ShieldAlert },
  ];

  const togglePostingMode = (mode: DiscussionKind) => {
    setPostingModes((current) =>
      current.includes(mode) ? current.filter((entry) => entry !== mode) : [...current, mode]
    );
  };

  const handleSave = () => {
    if (!trimmedName) {
      toast.error("Community name cannot be empty.");
      return;
    }

    if (missingPostingModes) {
      toast.error("Choose at least one allowed post type.");
      return;
    }

    if (needsNewPassword) {
      toast.error("Set a password before enabling password protection.");
      return;
    }

    setSaving(true);
    void onSaveSettings({
      name: trimmedName,
      description: description.trim(),
      heroColor,
      postingModes,
      joinPolicy,
      requiresPassword,
      password: password.trim(),
      passwordHint: passwordHint.trim(),
      feedVisibility,
    }).finally(() => setSaving(false));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-app-border bg-app-card p-1.5">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {managementTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-[18px] px-3 py-2.5 text-left text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border border-app-border bg-app text-app-text shadow-[0_12px_26px_-20px_rgba(15,23,42,0.35)]"
                  : "text-app-text/70"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </span>
                {typeof tab.count === "number" ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      activeTab === tab.id ? "bg-app-secondary text-app-text" : "bg-app/80 text-app-text/72"
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </section>

      {activeTab === "settings" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
          <section className="space-y-4 rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
            <div className="flex items-center gap-2 text-app-text">
              <Settings2 className="h-4 w-4 text-brand" />
              <p className="text-sm font-semibold text-app-text">Edit</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <label className="grid gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                  <Type className="h-3.5 w-3.5" />
                  Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="input-shell h-11 text-sm"
                  disabled={saving}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                  <Paintbrush className="h-3.5 w-3.5" />
                  Accent
                </span>
                <div className="flex h-11 items-center gap-2 rounded-2xl border border-app-border bg-app-card px-3">
                  <input
                    type="color"
                    value={heroColor}
                    onChange={(event) => setHeroColor(event.target.value)}
                    className="h-7 w-10 rounded-md border-0 bg-transparent p-0"
                    disabled={saving}
                  />
                  <span className="truncate text-sm font-semibold text-app-text">{heroColor}</span>
                </div>
              </label>
            </div>

            <label className="grid gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                <FileText className="h-3.5 w-3.5" />
                About
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="input-shell min-h-[110px] resize-y"
                placeholder="About this community."
                disabled={saving}
              />
            </label>

            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                <Hash className="h-3.5 w-3.5" />
                Posts
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["study", "job", "anonymous"] as DiscussionKind[]).map((mode) => {
                  const selected = postingModes.includes(mode);
                  const Icon = MODE_META[mode].icon;

                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => togglePostingMode(mode)}
                      className={`min-w-0 rounded-[18px] px-2.5 py-2 text-[0.82rem] font-semibold transition ${
                        selected ? "bg-brand text-white" : "bg-app-secondary text-app-text"
                      }`}
                      disabled={saving}
                    >
                      <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{getDiscussionKindLabel(mode)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {missingPostingModes ? (
                <p className="mt-2 text-xs font-medium text-rose-600">Select at least one post mode before saving.</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                  <Users className="h-3.5 w-3.5" />
                  Join
                </span>
                <select
                  value={joinPolicy}
                  onChange={(event) => setJoinPolicy(event.target.value as CommunityJoinPolicy)}
                  className="input-shell h-11 text-sm"
                  disabled={saving}
                >
                  <option value="open">Open join</option>
                  <option value="approval_required">Manual approval</option>
                </select>
              </label>

              <div className="rounded-[22px] border border-app-border bg-app-secondary/70 p-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-app px-3 py-2 text-sm font-semibold text-app-text shadow-[0_10px_18px_-16px_rgba(15,23,42,0.35)]">
                  <Users className="h-3.5 w-3.5 text-brand" />
                  {joinPolicy === "approval_required" ? "Manual review" : "Open join"}
                </div>
              </div>
            </div>

            <CommunityFeedVisibilityPicker
              value={feedVisibility}
              onChange={setFeedVisibility}
              disabled={saving}
              helperText=""
              compact
            />

            <div className="rounded-[22px] border border-app-border bg-app-secondary/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-app-text">
                    <Lock className="h-4 w-4 text-brand" />
                    Password
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-full bg-app-card px-3 py-1.5 text-sm font-semibold text-app-text">
                  <input
                    type="checkbox"
                    checked={requiresPassword}
                    onChange={(event) => setRequiresPassword(event.target.checked)}
                    className="h-4 w-4 rounded border-app-border text-brand focus:ring-brand"
                    disabled={saving}
                  />
                  Lock
                </label>
              </div>

              {requiresPassword ? (
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                      <Lock className="h-3.5 w-3.5" />
                      Password
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="input-shell h-11 text-sm"
                      placeholder={
                        community.requires_password
                          ? "Leave blank to keep the current password"
                          : "Set the password new members must use"
                      }
                      disabled={saving}
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                      <FileText className="h-3.5 w-3.5" />
                      Hint
                    </span>
                    <input
                      value={passwordHint}
                      onChange={(event) => setPasswordHint(event.target.value)}
                      className="input-shell h-11 text-sm"
                      placeholder="Optional password hint"
                      disabled={saving}
                    />
                  </label>

                  {needsNewPassword ? (
                    <p className="text-xs font-medium text-rose-600">Add a password.</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              disabled={saveDisabled}
              onClick={handleSave}
              className="btn-primary w-full !rounded-full !py-3 disabled:!opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </section>

          <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
              <p className="text-sm font-semibold text-app-text">Overview</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[18px] bg-app-secondary px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                    <Shield className="h-3.5 w-3.5" />
                    Role
                  </p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{currentRoleLabel}</p>
                </div>
                <div className="rounded-[18px] bg-app-secondary px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                    <Hash className="h-3.5 w-3.5" />
                    Posts
                  </p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{postingModes.length} enabled</p>
                </div>
                <div className="rounded-[18px] bg-app-secondary px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                    <UserPlus className="h-3.5 w-3.5" />
                    Join
                  </p>
                  <p className="mt-1 text-sm font-semibold text-app-text">
                    {pendingMembers.length} request{pendingMembers.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-[18px] bg-app-secondary px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                    <Users className="h-3.5 w-3.5" />
                    Members
                  </p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{activeMembers.length} active</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === "requests" ? (
        <section className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-app-text">
              <UserPlus className="h-4 w-4 text-brand" />
              Join
            </p>
            <span className="rounded-full bg-app-secondary px-3 py-1 text-[11px] font-semibold text-app-text">
              {pendingMembers.length}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {loadingMembers ? (
              <div className="rounded-[18px] border border-app-border bg-app-secondary px-4 py-5 text-sm text-app-muted">
                Loading...
              </div>
            ) : pendingMembers.length === 0 ? (
              <div className="rounded-[18px] border border-app-border bg-app-secondary px-4 py-5 text-sm text-app-muted">
                No requests.
              </div>
            ) : (
              pendingMembers.map((member) => (
                <article key={member.id} className="rounded-[18px] border border-app-border bg-app-secondary/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-app-text">
                        {member.user?.full_name || member.user?.username || "Student"}
                      </p>
                      <p className="mt-0.5 text-xs text-app-muted">@{member.user?.username || "student"}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actingUserId === member.user_id}
                        onClick={() => void onRejectRequest(member.user_id)}
                        className="rounded-full bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={actingUserId === member.user_id}
                        onClick={() => void onAcceptRequest(member.user_id)}
                        className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "members" ? (
        <section className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-app-text">
              <Users className="h-4 w-4 text-brand" />
              Members
            </p>
            <span className="rounded-full bg-app-secondary px-3 py-1 text-[11px] font-semibold text-app-text">
              {activeMembers.length}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {loadingMembers ? (
              <div className="rounded-[18px] border border-app-border bg-app-secondary px-4 py-5 text-sm text-app-muted">
                Loading...
              </div>
            ) : activeMembers.length === 0 ? (
              <div className="rounded-[18px] border border-app-border bg-app-secondary px-4 py-5 text-sm text-app-muted">
                No members.
              </div>
            ) : (
              activeMembers.map((member) => {
                const roleLabel =
                  member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Member";

                return (
                  <article key={member.id} className="rounded-[18px] border border-app-border bg-app-secondary/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-app-text">
                            {member.user?.full_name || member.user?.username || "Student"}
                          </p>
                          <span className="rounded-full bg-app-card px-2.5 py-1 text-[10px] font-semibold text-app-text">
                            {member.role === "owner" ? <Crown className="mr-1 inline h-3.5 w-3.5 text-amber-500" /> : null}
                            {member.role === "admin" ? <Shield className="mr-1 inline h-3.5 w-3.5 text-brand" /> : null}
                            {roleLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-app-muted">@{member.user?.username || "student"}</p>
                      </div>

                      {member.role === "owner" ? null : (
                        <div className="flex flex-wrap justify-end gap-2">
                          {canAssignAdmins ? (
                            <button
                              type="button"
                              disabled={actingUserId === member.user_id}
                              onClick={() => void onToggleAdmin(member.user_id, member.role !== "admin")}
                              className="rounded-full bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5" />
                                {member.role === "admin" ? "Remove admin" : "Make admin"}
                              </span>
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={actingUserId === member.user_id}
                            onClick={() => void onKickMember(member.user_id)}
                            className="rounded-full bg-app-card px-3 py-1.5 text-xs font-semibold text-app-text"
                          >
                            <UserMinus2 className="mr-1 inline h-3.5 w-3.5" />
                            Kick
                          </button>
                          <button
                            type="button"
                            disabled={actingUserId === member.user_id}
                            onClick={() => void onBanMember(member.user_id)}
                            className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
                            Ban
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "blocked" ? (
        <section className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-app-text">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              Blocked
            </p>
            <span className="rounded-full bg-app-secondary px-3 py-1 text-[11px] font-semibold text-app-text">
              {bannedMembers.length}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {loadingMembers ? (
              <div className="rounded-[18px] border border-app-border bg-app-secondary px-4 py-5 text-sm text-app-muted">
                Loading...
              </div>
            ) : bannedMembers.length === 0 ? (
              <div className="rounded-[18px] border border-app-border bg-app-secondary px-4 py-5 text-sm text-app-muted">
                No blocked.
              </div>
            ) : (
              bannedMembers.map((member) => (
                <article key={member.id} className="rounded-[18px] border border-app-border bg-app-secondary/60 p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-600">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-app-text">
                        {member.user?.full_name || member.user?.username || "Student"}
                      </p>
                      <p className="mt-0.5 text-xs text-app-muted">
                        @{member.user?.username || "student"}
                        {member.banned_reason ? ` • ${member.banned_reason}` : ""}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
