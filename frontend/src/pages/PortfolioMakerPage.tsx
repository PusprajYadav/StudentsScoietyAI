import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { PortfolioEditor } from "../features/my-room/portfolio-maker/PortfolioEditor";
import { PortfolioManager } from "../features/my-room/portfolio-maker/PortfolioManager";
import {
  createStudentPortfolio,
  deleteStudentPortfolio,
  listStudentPortfolios,
  loadStudentPortfolioForOwner,
  saveStudentPortfolio,
} from "../features/my-room/portfolio-maker/api";
import { clearLocalPortfolioDraft } from "../features/my-room/portfolio-maker/localDraftStore";
import { parsePortfolioImportPayload } from "../features/my-room/portfolio-maker/schema";
import type { PortfolioRecord } from "../features/my-room/portfolio-maker/types";
import { normalizePortfolioDocument } from "../features/my-room/portfolio-maker/utils";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import { COIN_FEATURE_KEYS, getCoinCostLabel } from "../lib/coins";
import { defaultPlatformSettings, loadPlatformSettings } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useCoinWalletStore } from "../store/coinWalletStore";
import type { PortfolioTemplateKey } from "../types/database";

export function PortfolioMakerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { portfolioId } = useParams();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const profileId = profile?.id || null;
  const [portfolios, setPortfolios] = useState<PortfolioRecord[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTemplateKey, setCreatingTemplateKey] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [activePortfolio, setActivePortfolio] = useState<PortfolioRecord | null>(null);
  const [portfolioLimit, setPortfolioLimit] = useState(defaultPlatformSettings.max_portfolios_per_user);
  const authRedirectPath = buildAuthRedirectPath(location);
  const latestProfileRef = useRef(profile);
  const coinFeatureSettings = useCoinWalletStore((state) => state.featureSettings);
  const portfolioCreateCostLabel = getCoinCostLabel(
    coinFeatureSettings,
    COIN_FEATURE_KEYS.studentPortfolioCreate
  );

  latestProfileRef.current = profile;

  useEffect(() => {
    if (portfolioId) {
      return;
    }

    void loadPlatformSettings().then(
      (settings) => {
        setPortfolioLimit(settings.max_portfolios_per_user);
      },
      () => undefined
    );
  }, [portfolioId]);

  useEffect(() => {
    if (!profileId || portfolioId) {
      return;
    }

    setLoadingLibrary(true);
    void listStudentPortfolios(profileId).then(
      (items) => {
        setPortfolios(items);
        setLoadingLibrary(false);
      },
      (error: unknown) => {
        setLoadingLibrary(false);
        toast.error(error instanceof Error ? error.message : "Could not load your portfolios.");
      }
    );
  }, [portfolioId, profileId]);

  useEffect(() => {
    const currentProfile = latestProfileRef.current;

    if (!currentProfile || !portfolioId) {
      setActivePortfolio(null);
      return;
    }

    setLoadingPortfolio(true);
    void loadStudentPortfolioForOwner({
      portfolioId,
      ownerId: currentProfile.id,
      profile: currentProfile,
    }).then(
      (item) => {
        setActivePortfolio(item);
        setLoadingPortfolio(false);
      },
      (error: unknown) => {
        setLoadingPortfolio(false);
        toast.error(error instanceof Error ? error.message : "Could not load that portfolio.");
        navigate("/app/myroom/portfolio-maker", { replace: true });
      }
    );
  }, [navigate, portfolioId, profileId]);

  const handleCreate = async (templateKey: PortfolioTemplateKey) => {
    if (!profile) {
      navigate(authRedirectPath);
      return;
    }

    setCreatingTemplateKey(templateKey);

    try {
      const created = await createStudentPortfolio({
        ownerId: profile.id,
        profile,
        templateKey,
      });
      toast.success("Portfolio created.");
      navigate(`/app/myroom/portfolio-maker/edit/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the portfolio.");
    } finally {
      setCreatingTemplateKey(null);
    }
  };

  const handleDelete = async (portfolio: PortfolioRecord) => {
    if (!profile) {
      navigate(authRedirectPath);
      return;
    }

    if (!window.confirm(`Delete "${portfolio.title}" permanently?`)) {
      return;
    }

    await deleteStudentPortfolio({
      portfolioId: portfolio.id,
      ownerId: profile.id,
      shareSlug: portfolio.share_slug,
    });
    await clearLocalPortfolioDraft(profile.id, portfolio.id).catch(() => undefined);

    setPortfolios((current) => current.filter((item) => item.id !== portfolio.id));
    toast.success("Portfolio deleted.");
  };

  const handleImport = async (file: File) => {
    if (!profile) {
      navigate(authRedirectPath);
      return;
    }

    setImporting(true);

    try {
      const raw = await file.text();
      const parsed = parsePortfolioImportPayload(JSON.parse(raw));
      const imported = await createStudentPortfolio({
        ownerId: profile.id,
        profile,
        title: parsed.title,
        templateKey: parsed.templateKey ?? "minimal_hero",
        importedContent: normalizePortfolioDocument(parsed.content ?? {}, profile),
        importedTheme: parsed.theme,
      });

      setPortfolios((current) => [imported, ...current]);
      toast.success("Portfolio imported.");
      navigate(`/app/myroom/portfolio-maker/edit/${imported.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import that portfolio file.");
    } finally {
      setImporting(false);
    }
  };

  if (portfolioId && !user) {
    return <Navigate to={authRedirectPath} replace />;
  }

  if (portfolioId) {
    if (loadingPortfolio || !activePortfolio || !profile) {
      return (
        <div className="rounded-[30px] border border-app-border bg-app-card px-5 py-12 text-center text-sm text-app-muted">
          Loading your portfolio editor...
        </div>
      );
    }

    return (
      <PortfolioEditor
        portfolio={activePortfolio}
        profile={profile}
        saving={saving}
        onBack={() => navigate("/app/myroom/portfolio-maker")}
        onSave={async (nextPortfolio) => {
          setSaving(true);
          try {
            const persisted = await saveStudentPortfolio({
              portfolioId: nextPortfolio.id,
              ownerId: profile.id,
              title: nextPortfolio.title,
              templateKey: nextPortfolio.template_key,
              content: nextPortfolio.content,
              theme: nextPortfolio.theme,
              isLive: nextPortfolio.is_live,
            });
            setActivePortfolio(persisted);
            return persisted;
          } finally {
            setSaving(false);
          }
        }}
        onDelete={async (portfolio) => {
          await deleteStudentPortfolio({
            portfolioId: portfolio.id,
            ownerId: profile.id,
            shareSlug: portfolio.share_slug,
          });
        }}
      />
    );
  }

  return (
    <PortfolioManager
      profile={profile}
      portfolios={portfolios}
      portfolioLimit={portfolioLimit}
      createCoinCostLabel={portfolioCreateCostLabel}
      loading={loadingLibrary}
      creatingTemplateKey={creatingTemplateKey}
      importing={importing}
      onCreate={handleCreate}
      onDelete={handleDelete}
      onImport={handleImport}
    />
  );
}
