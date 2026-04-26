import { LogOut, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AccountSettingsSection({
  onLogout,
}: {
  onLogout: () => void | Promise<void>;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <p className="font-display text-xl font-semibold sm:text-2xl">
          Account
        </p>
        <p className="mt-1 text-sm text-app-muted">Session actions.</p>
      </div>

      <div className="rounded-[24px] border border-app-border bg-app-card p-4 sm:p-5">
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => navigate("/delete")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-500/15 dark:text-amber-300"
          >
            <Trash2 className="h-4 w-4" />
            Open delete request page
          </button>

          <button
            type="button"
            onClick={() => void onLogout()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/15 dark:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
