import { Loader2 } from "lucide-react";

const PLACEHOLDER_WIDTHS = ["w-24", "w-32", "w-20"] as const;

export function RouteLoadingShell() {
  return (
    <div className="grid gap-3">
      <section className="surface-card rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="h-2.5 w-20 animate-pulse rounded-full bg-brand/12" />
            <div className="mt-3 h-7 w-40 animate-pulse rounded-full bg-app-secondary/80 sm:w-48" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/8 px-3 py-2 text-xs font-medium text-brand">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Opening page</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PLACEHOLDER_WIDTHS.map((widthClass, index) => (
            <div
              key={index}
              className="rounded-[20px] border border-app-border bg-app-card px-3 py-3.5"
            >
              <div className={`h-2.5 animate-pulse rounded-full bg-app-secondary/80 ${widthClass}`} />
              <div className="mt-3 h-5 animate-pulse rounded-full bg-app-secondary/70" />
              <div className="mt-2 h-3 animate-pulse rounded-full bg-app-secondary/55" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
