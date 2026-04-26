import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ResumeEditor } from "../features/my-room/resume-maker/ResumeEditor";
import { ResumeManager } from "../features/my-room/resume-maker/ResumeManager";
import {
  createStudentResume,
  deleteStudentResume,
  listStudentResumes,
  loadStudentResumeForOwner,
  saveStudentResume,
} from "../features/my-room/resume-maker/api";
import { clearLocalResumeDraft } from "../features/my-room/resume-maker/localDraftStore";
import type { ResumeRecord } from "../features/my-room/resume-maker/types";
import { normalizeResumeDocument } from "../features/my-room/resume-maker/utils";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import { COIN_FEATURE_KEYS, getCoinCostLabel } from "../lib/coins";
import { defaultPlatformSettings, loadPlatformSettings } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useCoinWalletStore } from "../store/coinWalletStore";
import type { ResumeTemplateKey } from "../types/database";

export function AtsResumeMakerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resumeId } = useParams();
  const { user, profile } = useAuthStore();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [loadingResume, setLoadingResume] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTemplateKey, setCreatingTemplateKey] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [activeResume, setActiveResume] = useState<ResumeRecord | null>(null);
  const [resumeLimit, setResumeLimit] = useState(defaultPlatformSettings.max_resumes_per_user);
  const authRedirectPath = buildAuthRedirectPath(location);
  const coinFeatureSettings = useCoinWalletStore((state) => state.featureSettings);
  const resumeCreateCostLabel = getCoinCostLabel(
    coinFeatureSettings,
    COIN_FEATURE_KEYS.studentResumeCreate
  );

  useEffect(() => {
    if (resumeId) {
      return;
    }

    void loadPlatformSettings().then(
      (settings) => {
        setResumeLimit(settings.max_resumes_per_user);
      },
      () => undefined
    );
  }, [resumeId]);

  useEffect(() => {
    if (!profile || resumeId) {
      return;
    }

    setLoadingLibrary(true);
    void listStudentResumes(profile.id).then(
      (items) => {
        setResumes(items);
        setLoadingLibrary(false);
      },
      (error: unknown) => {
        setLoadingLibrary(false);
        toast.error(error instanceof Error ? error.message : "Could not load your resumes.");
      }
    );
  }, [profile, resumeId]);

  useEffect(() => {
    if (!profile || !resumeId) {
      setActiveResume(null);
      return;
    }

    setLoadingResume(true);
    void loadStudentResumeForOwner({
      resumeId,
      ownerId: profile.id,
      profile,
    }).then(
      (item) => {
        setActiveResume(item);
        setLoadingResume(false);
      },
      (error: unknown) => {
        setLoadingResume(false);
        toast.error(error instanceof Error ? error.message : "Could not load that resume.");
        navigate("/app/myroom/ats-resume-maker", { replace: true });
      }
    );
  }, [navigate, profile, resumeId]);

  const handleCreate = async (templateKey: ResumeTemplateKey) => {
    if (!profile) {
      navigate(authRedirectPath);
      return;
    }

    setCreatingTemplateKey(templateKey);

    try {
      const created = await createStudentResume({
        ownerId: profile.id,
        profile,
        templateKey,
      });
      toast.success("Resume created.");
      navigate(`/app/myroom/ats-resume-maker/edit/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the resume.");
    } finally {
      setCreatingTemplateKey(null);
    }
  };

  const handleDelete = async (resume: ResumeRecord) => {
    if (!profile) {
      navigate(authRedirectPath);
      return;
    }

    if (!window.confirm(`Delete "${resume.title}" permanently?`)) {
      return;
    }

    await deleteStudentResume({
      resumeId: resume.id,
      ownerId: profile.id,
      shareSlug: resume.share_slug,
    });
    await clearLocalResumeDraft(profile.id, resume.id).catch(() => undefined);

    setResumes((current) => current.filter((item) => item.id !== resume.id));
    toast.success("Resume deleted.");
  };

  const handleImport = async (file: File) => {
    if (!profile) {
      navigate(authRedirectPath);
      return;
    }

    setImporting(true);

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const imported = await createStudentResume({
        ownerId: profile.id,
        profile,
        title: typeof parsed.title === "string" ? parsed.title : undefined,
        templateKey:
          parsed.template_key === "sidebar_professional" ||
            parsed.template_key === "executive_dark" ||
            parsed.template_key === "ats_classic"
            ? parsed.template_key
            : "ats_classic",
        importedContent: normalizeResumeDocument(parsed.content ?? parsed, profile),
      });

      setResumes((current) => [imported, ...current]);
      toast.success("Resume imported.");
      navigate(`/app/myroom/ats-resume-maker/edit/${imported.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import that resume file.");
    } finally {
      setImporting(false);
    }
  };

  if (resumeId && !user) {
    return <Navigate to={authRedirectPath} replace />;
  }

  if (resumeId) {
    if (loadingResume || !activeResume || !profile) {
      return (
        <div className="rounded-[30px] border border-app-border bg-app-card px-5 py-12 text-center text-sm text-app-muted">
          Loading your resume editor...
        </div>
      );
    }

    return (
      <ResumeEditor
        resume={activeResume}
        profile={profile}
        saving={saving}
        onBack={() => navigate("/app/myroom/ats-resume-maker")}
        onSave={async (nextResume, pageCount) => {
          setSaving(true);
          try {
            const persisted = await saveStudentResume({
              resumeId: nextResume.id,
              ownerId: profile.id,
              title: nextResume.title,
              templateKey: nextResume.template_key,
              content: nextResume.content,
              isLive: nextResume.is_live,
              pageCount,
            });
            setActiveResume(persisted);
            return persisted;
          } finally {
            setSaving(false);
          }
        }}
        onDelete={async (resume) => {
          await deleteStudentResume({
            resumeId: resume.id,
            ownerId: profile.id,
            shareSlug: resume.share_slug,
          });
        }}
      />
    );
  }

  return (
    <ResumeManager
      profile={profile}
      resumes={resumes}
      resumeLimit={resumeLimit}
      createCoinCostLabel={resumeCreateCostLabel}
      loading={loadingLibrary}
      creatingTemplateKey={creatingTemplateKey}
      importing={importing}
      onCreate={handleCreate}
      onDelete={handleDelete}
      onImport={handleImport}
    />
  );
}
