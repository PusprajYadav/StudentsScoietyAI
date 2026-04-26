import { NavLink } from "react-router-dom";
import { discussionModes, getDiscussionKindLabel } from "../../data/discussions";
import type { DiscussionKind } from "../../types/database";

interface DiscussionHeroProps {
  activeKind: DiscussionKind;
}

export function DiscussionHero({ activeKind }: DiscussionHeroProps) {
  return (
    <section className="max-w-full">
      <p className="hidden text-[10px] uppercase tracking-[0.2em] text-brand sm:block sm:text-[12px] sm:tracking-[0.22em]">
        Discussion hub
      </p>

      <div className="flex flex-col gap-2 sm:mt-3 sm:gap-4 xl:grid xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] xl:items-center xl:gap-7">
        <div className="hidden min-w-0 sm:block">
          <h1 className="max-w-[22ch] font-display text-[1.05rem] font-bold leading-[1.08] tracking-tight text-app-text sm:max-w-[20ch] sm:text-[1.25rem] lg:max-w-[20ch] lg:text-[1.45rem] xl:max-w-[18ch] xl:text-[1.58rem]">
            Ask, share, and solve with the right audience.
          </h1>
          <p className="mt-2.5 max-w-[44rem] text-[13px] leading-5.5 text-app-muted sm:text-[14px] sm:leading-6 lg:text-[15px] lg:leading-6.5">
            Switch between Study, Job, and Anonymous posts in one moderated student space.
          </p>
        </div>

        <div className="w-full xl:ml-auto xl:max-w-[620px]">
          <div className="rounded-[24px] border border-app-border bg-app-card/85 p-1.5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.18)] sm:rounded-[28px] sm:p-2">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {discussionModes.map((mode) => (
                <NavLink
                  key={mode}
                  to={`/app/discussions/${mode}`}
                  className={`flex min-h-[2.65rem] items-center justify-center rounded-[16px] px-2 py-2 text-center text-[9.25px] font-semibold leading-tight transition sm:min-h-[3.15rem] sm:rounded-[20px] sm:px-4 sm:text-[13px] lg:text-[14px] ${
                    activeKind === mode
                      ? "bg-brand text-white shadow-[0_18px_34px_-22px_rgba(37,99,235,0.7)]"
                      : "bg-app-card text-app-muted hover:text-app-text"
                  }`}
                >
                  {getDiscussionKindLabel(mode)}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
