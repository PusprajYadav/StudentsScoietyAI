import type { ProfileRow } from "../../types/database";

interface DiscussionSidebarProps {
  canPost: boolean;
  profile: ProfileRow;
}

export function DiscussionSidebar({ canPost, profile }: DiscussionSidebarProps) {
  return (
    <aside className="space-y-6">
      <section className="surface-card rounded-[28px] p-5">
        <p className="font-display text-xl font-semibold">Safe posting rules</p>
        <div className="mt-4 space-y-3 text-sm leading-6 text-app-muted">
          <p>Study Zone is best for notes, exams, assignments, and subject-specific problem solving.</p>
          <p>Job Zone keeps internships, fresher roles, portfolio reviews, and career guidance together.</p>
          <p>Anonymous mode hides your identity in the feed while still keeping moderation controls behind the scenes.</p>
        </div>
      </section>

      <section className="surface-card rounded-[28px] p-5">
        <p className="font-display text-xl font-semibold">Your status</p>
        <div className="mt-4 grid gap-3 text-sm">
          <div className="rounded-2xl bg-app-secondary px-4 py-3">
            <p className="text-app-muted">Posting access</p>
            <p className="mt-1 font-semibold text-app-text">{canPost ? "Active" : "Restricted"}</p>
          </div>
          <div className="rounded-2xl bg-app-secondary px-4 py-3">
            <p className="text-app-muted">Account trust</p>
            <p className="mt-1 font-semibold text-app-text">
              {profile.is_verified ? "Verified by admin" : "Standard student profile"}
            </p>
          </div>
        </div>
      </section>
    </aside>
  );
}
