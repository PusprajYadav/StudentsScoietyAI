import {
  ArrowRight,
  BadgeCheck,
  Copy,
  Eye,
  FileImage,
  FileJson,
  FilePlus2,
  LayoutTemplate,
  Link2,
  PencilLine,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { ProfileRow } from "../../../types/database";
import { buildAuthRedirectPath } from "../../../lib/authRedirect";
import { resumeTemplateOptions } from "./constants";
import type { ResumeRecord } from "./types";
import { buildPublicResumeUrl, resolveTemplateLabel } from "./utils";

interface ResumeManagerProps {
  profile: ProfileRow | null;
  resumes: ResumeRecord[];
  resumeLimit: number;
  createCoinCostLabel: string;
  loading: boolean;
  creatingTemplateKey: string | null;
  importing: boolean;
  onCreate: (templateKey: ResumeRecord["template_key"]) => Promise<void>;
  onDelete: (resume: ResumeRecord) => Promise<void>;
  onImport: (file: File) => Promise<void>;
}

const templateShowcase: Record<
  ResumeRecord["template_key"],
  {
    chips: string[];
    previewClassName: string;
  }
> = {
  ats_classic: {
    chips: ["ATS", "1-col", "Guided"],
    previewClassName: "from-slate-900 via-slate-800 to-slate-600",
  },
  sidebar_professional: {
    chips: ["Sidebar", "Photo", "Guided"],
    previewClassName: "from-stone-400 via-slate-400 to-slate-600",
  },
  executive_dark: {
    chips: ["Bold", "2-col", "Guided"],
    previewClassName: "from-slate-900 via-slate-800 to-emerald-700",
  },
};

function formatCompactUpdatedAt(dateValue: string) {
  const now = Date.now();
  const timestamp = new Date(dateValue).getTime();
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));

  if (minutes < 1) {
    return "now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDistanceToNow(new Date(dateValue), { addSuffix: true });
}

export function ResumeManager({
  profile,
  resumes,
  resumeLimit,
  createCoinCostLabel,
  loading,
  creatingTemplateKey,
  importing,
  onCreate,
  onDelete,
  onImport,
}: ResumeManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isLoggedIn = Boolean(profile);
  const remainingSlots = Math.max(0, resumeLimit - resumes.length);
  const authRedirectPath = buildAuthRedirectPath({ pathname: "/app/myroom/ats-resume-maker" });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-app-border bg-gradient-to-br from-brand/10 via-app-card to-app-secondary/70 p-4 shadow-[0_22px_64px_-36px_rgba(37,99,235,0.38)] dark:from-brand/20 dark:to-app-secondary/45 sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(30,64,175,0.14),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.26),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.2),transparent_38%)]" />

        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
              <LayoutTemplate className="h-4 w-4" />
              ATS Resume Maker
            </div>

            <h1 className="mt-3 max-w-[9ch] font-display text-[1.9rem] font-bold leading-[0.98] tracking-tight text-app-text sm:text-[2.6rem]">
              Build. Share. Export.
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-app-muted">
              Pick a layout, tune the resume, and ship a polished live link fast.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-app-border bg-app-card/85 px-3 py-1.5 text-xs font-semibold text-app-text">
                3 templates
              </span>
              <span className="rounded-full border border-app-border bg-app-card/85 px-3 py-1.5 text-xs font-semibold text-app-text">
                Cost: {createCoinCostLabel}
              </span>
              <span className="rounded-full border border-app-border bg-app-card/85 px-3 py-1.5 text-xs font-semibold text-app-text">
                Live URL
              </span>
              <span className="rounded-full border border-app-border bg-app-card/85 px-3 py-1.5 text-xs font-semibold text-app-text">
                PNG + PDF + JSON
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {isLoggedIn ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">
                    <BadgeCheck className="h-4 w-4" />
                    {resumes.length} / {resumeLimit} used
                  </div>
                  <div className="rounded-full bg-app-secondary px-4 py-2 text-sm font-semibold text-app-text">
                    {remainingSlots > 0 ? `${remainingSlots} slots left` : "Limit reached"}
                  </div>
                </>
              ) : (
                <Link
                  to={authRedirectPath}
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  Sign in to save
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-app-border bg-app-card/85 p-3.5 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app-muted">Quick tools</p>
              <Sparkles className="h-4 w-4 text-brand" />
            </div>

            <div className="mt-3 grid gap-2.5">
              {[
                { label: "Layouts", value: "3 ready", icon: LayoutTemplate },
                { label: "Coin cost", value: createCoinCostLabel, icon: FilePlus2 },
                { label: "Public", value: "Live links", icon: Link2 },
                { label: "Export", value: "PNG, PDF, JSON", icon: FileImage },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[20px] border border-app-border bg-app-secondary/55 px-3.5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-app-text">{item.value}</p>
                    </div>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full bg-brand/40" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card rounded-[32px] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Templates</p>
            <h2 className="mt-1.5 font-display text-[1.35rem] font-semibold tracking-tight text-app-text sm:text-[1.65rem]">
              Pick a starting style
            </h2>
          </div>
          <span className="rounded-full bg-app-secondary px-3 py-1.5 text-[11px] font-semibold text-app-text">
            Costs {createCoinCostLabel}
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {resumeTemplateOptions.map((template) => {
            const showcase = templateShowcase[template.key];

            return (
              <article
                key={template.key}
                className="group overflow-hidden rounded-[24px] border border-app-border bg-app-card/80 p-3.5 shadow-[0_14px_40px_-34px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-34px_rgba(37,99,235,0.35)]"
              >
                <div className={`rounded-[20px] bg-gradient-to-br ${showcase.previewClassName} p-3.5`}>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/16 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                      {template.badge}
                    </span>
                    <LayoutTemplate className="h-4 w-4 text-white/82" />
                  </div>

                  <div className="mt-3 rounded-[18px] bg-white/12 p-3">
                    <div className="h-2 w-16 rounded-full bg-white/45" />
                    <div className="mt-2.5 grid grid-cols-[64px_minmax(0,1fr)] gap-2.5">
                      <div className="rounded-[14px] bg-white/16" />
                      <div className="space-y-1.5">
                        <div className="h-2 rounded-full bg-white/28" />
                        <div className="h-2 w-4/5 rounded-full bg-white/20" />
                        <div className="h-8 rounded-[12px] bg-white/12" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-display text-[1.08rem] font-semibold text-app-text">{template.label}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {showcase.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-app-border bg-app-secondary/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-app-muted"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                {isLoggedIn ? (
                  <button
                    type="button"
                    disabled={remainingSlots <= 0 || creatingTemplateKey === template.key}
                    onClick={() => void onCreate(template.key)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FilePlus2 className="h-4 w-4" />
                    {creatingTemplateKey === template.key
                      ? "Creating..."
                      : createCoinCostLabel === "Free"
                        ? "Use"
                        : `Create for ${createCoinCostLabel}`}
                  </button>
                ) : (
                  <Link
                    to={authRedirectPath}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-app-border bg-app-card px-4 py-2.5 text-[13px] font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Sign in
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="surface-card rounded-[32px] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[1.35rem] font-semibold text-app-text sm:text-[1.65rem]">
              Resume Library
            </h2>
            <p className="mt-1 text-sm text-app-muted">Saved resumes in one place.</p>
          </div>

          {isLoggedIn ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-app-secondary px-3 py-1.5 text-[11px] font-semibold text-app-text">
                {resumes.length} saved
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (nextFile) {
                    void onImport(nextFile);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || remainingSlots <= 0}
                className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3.5 py-2 text-sm font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileJson className="h-4 w-4 text-brand" />
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          ) : null}
        </div>

        {!isLoggedIn ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-app-border bg-app-secondary/35 px-5 py-10 text-center">
            <p className="font-display text-xl font-semibold text-app-text">Sign in to save resumes.</p>
            <p className="mt-2 text-sm leading-7 text-app-muted">
              Public resume pages stay shareable, but editing lives inside your account.
            </p>
            <Link
              to={authRedirectPath}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Go to login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : loading ? (
          <div className="mt-6 rounded-[28px] border border-app-border bg-app-secondary/35 px-5 py-10 text-center text-sm text-app-muted">
            Loading your resumes...
          </div>
        ) : resumes.length ? (
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {resumes.map((resume) => {
              const showcase = templateShowcase[resume.template_key];

              return (
                <article
                  key={resume.id}
                  className="group overflow-hidden rounded-[24px] border border-app-border bg-app-card/78 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-34px_rgba(37,99,235,0.28)]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 hidden h-12 w-12 shrink-0 rounded-[18px] bg-gradient-to-br ${showcase.previewClassName} shadow-inner sm:block`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-display text-[1.05rem] font-semibold text-app-text sm:text-[1.12rem]">
                              {resume.title}
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                resume.is_live ? "bg-emerald-500/15 text-emerald-700" : "bg-app-secondary text-app-muted"
                              }`}
                            >
                              {resume.is_live ? "Live" : "Draft"}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                            <span className="rounded-full bg-app-secondary px-2.5 py-1 text-app-text">
                              {resolveTemplateLabel(resume.template_key)}
                            </span>
                            <span className="rounded-full bg-app-secondary px-2.5 py-1 text-app-muted">
                              {resume.page_count} page{resume.page_count === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>

                        <p className="rounded-full bg-app-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                          {formatCompactUpdatedAt(resume.updated_at)}
                        </p>
                      </div>

                      <div
                        className={`mt-4 grid gap-2 sm:grid-cols-2 ${
                          resume.is_live ? "md:grid-cols-4" : "md:grid-cols-3"
                        }`}
                      >
                        <Link
                          to={`/app/myroom/ats-resume-maker/edit/${resume.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark"
                        >
                          <PencilLine className="h-4 w-4" />
                          Edit
                        </Link>

                        {resume.is_live ? (
                          <a
                            href={buildPublicResumeUrl(resume)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-app-border bg-app-secondary/55 px-4 py-2.5 text-[13px] font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                          >
                            <Eye className="h-4 w-4 text-brand" />
                            Live
                          </a>
                        ) : (
                          <div className="rounded-[16px] border border-dashed border-app-border bg-app-secondary/35 px-4 py-2.5 text-center text-[13px] font-semibold text-app-muted">
                            Draft only
                          </div>
                        )}

                        {resume.is_live ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(buildPublicResumeUrl(resume));
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-app-border bg-app-card px-4 py-2.5 text-[13px] font-semibold text-app-text transition hover:border-brand/30 hover:bg-brand/5"
                          >
                            <Copy className="h-4 w-4 text-brand" />
                            Copy link
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void onDelete(resume)}
                          className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-500/15"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-[28px] border border-dashed border-app-border bg-app-secondary/35 px-5 py-10 text-center">
            <p className="font-display text-xl font-semibold text-app-text">No resumes yet.</p>
            <p className="mt-2 text-sm leading-7 text-app-muted">
              Pick a layout above or import a JSON backup to start.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
