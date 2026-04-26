import { Download, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { loadPublicStudentResume } from "../features/my-room/resume-maker/api";
import { ResumePreview, type ResumePreviewHandle } from "../features/my-room/resume-maker/ResumePreview";
import type { ResumeRecord } from "../features/my-room/resume-maker/types";
import { buildPublicResumePath } from "../features/my-room/resume-maker/utils";

export function PublicResumePage() {
  const { shareSlug, username } = useParams();
  const location = useLocation();
  const isEmbed = new URLSearchParams(location.search).get("embed") === "true";
  const navigate = useNavigate();
  const previewRef = useRef<ResumePreviewHandle | null>(null);
  const [resume, setResume] = useState<ResumeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!shareSlug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void loadPublicStudentResume(shareSlug, { preferFresh: true }).then(
      (item) => {
        if (username && item.owner?.username && username !== item.owner.username) {
          navigate(buildPublicResumePath(item.share_slug, item.owner.username), { replace: true });
          return;
        }

        setResume(item);
        setLoading(false);
      },
      () => {
        setResume(null);
        setLoading(false);
      }
    );
  }, [navigate, shareSlug, username]);

  if (!shareSlug) {
    return <Navigate to="/app/myroom" replace />;
  }

  if (loading) {
    if (isEmbed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
          <div>
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-[3px] border-brand/15 border-t-brand" />
            <p className="text-lg font-semibold text-app-text">Loading resume preview...</p>
            <p className="mt-2 text-sm text-app-muted">Fetching the latest live version.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10">
        <div className="mx-auto max-w-[1120px] rounded-[32px] border border-slate-200/80 bg-white/80 px-6 py-16 text-center shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Live Resume</p>
          <p className="mt-4 font-display text-2xl font-semibold text-app-text">Loading resume...</p>
          <p className="mt-2 text-sm text-app-muted">Preparing the shared paper view.</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    if (isEmbed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
          <div>
            <p className="text-lg font-semibold text-app-text">Resume preview unavailable.</p>
            <p className="mt-2 text-sm text-app-muted">Open the full page to retry loading the live resume.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10">
        <div className="mx-auto max-w-[1120px] rounded-[32px] border border-slate-200/80 bg-white/80 px-6 py-16 text-center shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Live Resume</p>
          <p className="mt-4 font-display text-2xl font-semibold text-app-text">This live resume is not available.</p>
        </div>
      </div>
    );
  }

  const ownerLabel =
    resume.owner?.full_name?.trim() ||
    resume.owner?.username?.trim() ||
    resume.content.contact.fullName ||
    "Student";
  const title = resume.title?.trim() || `${ownerLabel} Resume`;

  return (
    <div className={isEmbed ? "min-h-screen bg-white" : "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-3 sm:px-5 sm:py-6"}>
      <div className={isEmbed ? "w-full" : "mx-auto max-w-[1400px]"}>
        <div className={isEmbed ? "bg-white" : "overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/86 shadow-[0_34px_100px_-42px_rgba(15,23,42,0.38)] backdrop-blur"}>
          {!isEmbed && (
            <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Live Resume
                  </p>
                  <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-app-text sm:text-3xl">
                    {title}
                  </h1>
                  <p className="mt-2 text-sm text-app-muted">
                    Shared by {ownerLabel}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    <FileText className="h-4 w-4 text-brand" />
                    {resume.page_count} page{resume.page_count === 1 ? "" : "s"}
                  </span>

                  <button
                    type="button"
                    disabled={downloadingPdf}
                    onClick={() => {
                      setDownloadingPdf(true);
                      void previewRef.current?.exportPdfPages().then(
                        () => {
                          toast.success("PDF downloaded.");
                          setDownloadingPdf(false);
                        },
                        (error: unknown) => {
                          toast.error(error instanceof Error ? error.message : "PDF export failed.");
                          setDownloadingPdf(false);
                        }
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {downloadingPdf ? "Preparing PDF..." : "Download PDF"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={isEmbed ? "bg-white" : "bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(239,246,255,0.9))] p-3 sm:p-5 lg:p-6"}>
            <ResumePreview
              ref={previewRef}
              resume={resume}
              showPreviewChrome={false}
              showPageFrame={!isEmbed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
