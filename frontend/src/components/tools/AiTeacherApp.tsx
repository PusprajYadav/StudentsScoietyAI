import { Sparkles } from "lucide-react";
import { AiTeacherTool } from "../../features/ai-teacher/AiTeacherTool";

export function AiTeacherApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  return (
    <div className="space-y-4">
      {showTitleBlock ? (
        <section className="relative overflow-hidden rounded-[34px] border border-app-border bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.18),_transparent_26%),linear-gradient(135deg,#fffdf6_0%,#ffffff_40%,#eef6ff_72%,#fffbeb_100%)] p-5 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.38)]">
          <div className="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-amber-200/20 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-sky-700">AI Learning Studio</p>
              <h1 className="mt-1.5 font-display text-[1.9rem] font-semibold tracking-tight text-app-text sm:text-[2.3rem]">
                AI Teacher
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted">
                A cleaner study workspace for notebook-style notes, sharper answers, and interactive quizzes that check
                your choice instantly.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/90 bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                  Notebook notes
                </span>
                <span className="rounded-full border border-white/90 bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                  3-question quiz default
                </span>
                <span className="rounded-full border border-white/90 bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                  Instant answer feedback
                </span>
              </div>
            </div>

            <div className="rounded-[22px] bg-slate-900 p-3 text-white shadow-[0_18px_32px_-18px_rgba(15,23,42,0.48)]">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </section>
      ) : null}

      <AiTeacherTool />
    </div>
  );
}
