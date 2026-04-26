import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { loadPublicStudentPortfolio } from "../features/my-room/portfolio-maker/api";
import { PortfolioPreview } from "../features/my-room/portfolio-maker/PortfolioPreview";
import type { PortfolioRecord } from "../features/my-room/portfolio-maker/types";
import { buildPublicPortfolioPath } from "../features/my-room/portfolio-maker/utils";

export function PublicPortfolioPage() {
  const { shareSlug, username } = useParams();
  const location = useLocation();
  const isEmbed = new URLSearchParams(location.search).get("embed") === "true";
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<PortfolioRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareSlug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void loadPublicStudentPortfolio(shareSlug, { preferFresh: true }).then(
      (item) => {
        if (username && item.owner?.username && username !== item.owner.username) {
          navigate(buildPublicPortfolioPath(item.share_slug, item.owner.username), { replace: true });
          return;
        }

        setPortfolio(item);
        setLoading(false);
      },
      () => {
        setPortfolio(null);
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
            <p className="text-lg font-semibold text-app-text">Loading portfolio preview...</p>
            <p className="mt-2 text-sm text-app-muted">Fetching the latest live website.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10">
        <div className="mx-auto max-w-[1320px] rounded-[32px] border border-slate-200/80 bg-white/80 px-6 py-16 text-center shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Live Portfolio</p>
          <p className="mt-4 font-display text-2xl font-semibold text-app-text">Loading portfolio...</p>
          <p className="mt-2 text-sm text-app-muted">Preparing the shared website view.</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    if (isEmbed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
          <div>
            <p className="text-lg font-semibold text-app-text">Portfolio preview unavailable.</p>
            <p className="mt-2 text-sm text-app-muted">Open the full page to retry loading the live portfolio.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10">
        <div className="mx-auto max-w-[1320px] rounded-[32px] border border-slate-200/80 bg-white/80 px-6 py-16 text-center shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Live Portfolio</p>
          <p className="mt-4 font-display text-2xl font-semibold text-app-text">
            This live portfolio is not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={isEmbed ? "min-h-screen bg-app" : "min-h-screen bg-app"}>
      <PortfolioPreview portfolio={portfolio} showModeToggle={!isEmbed} />
    </div>
  );
}
