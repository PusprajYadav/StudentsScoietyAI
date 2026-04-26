import { LogOut, Search, Shield, Sparkles } from "lucide-react";

interface AdminHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSignOut: () => Promise<void>;
}

export function AdminHeader({ search, onSearchChange, onSignOut }: AdminHeaderProps) {
  return (
    <section className="rounded-[16px] border border-slate-200 bg-white shadow-[0_16px_34px_-32px_rgba(15,23,42,0.2)]">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-3 py-2 sm:px-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#2563eb,#38bdf8)] text-white shadow-[0_16px_28px_-18px_rgba(37,99,235,0.8)]">
            <Shield className="h-3.5 w-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                Admin Panel
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                <Sparkles className="h-3 w-3" />
                Supabase live
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500">Compact admin workflow with one shared search.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1 sm:min-w-[220px] lg:min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="admin-search-input h-8.5 pl-8.5 text-[11px]"
              placeholder="Search admin panels"
            />
          </label>

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="inline-flex h-8.5 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold text-slate-700 transition hover:border-brand/20 hover:bg-white"
          >
            <LogOut className="h-3 w-3" />
            Exit
          </button>
        </div>
      </div>
    </section>
  );
}
