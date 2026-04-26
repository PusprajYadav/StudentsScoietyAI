import { Bell, Bot, FileStack, Gift, ImagePlus, MessageSquareText, Search, ShieldCheck, Sparkles, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminMiniStatGrid, AdminPanelCard, AdminSectionHeading } from "./AdminUi";
import { supabase } from "../../lib/supabase";
import type { PlatformSettingsRow, ProfileRow } from "../../types/database";

type AiReplyProfileSummary = Pick<
  ProfileRow,
  "id" | "username" | "full_name" | "avatar_url" | "is_verified" | "updated_at"
>;

interface PlatformSettingsSectionProps {
  settings: PlatformSettingsRow;
  appVersion: string;
  onSettingsChange: (updates: Partial<PlatformSettingsRow>) => void;
  onSave: () => Promise<void>;
}

export function PlatformSettingsSection({
  settings,
  appVersion,
  onSettingsChange,
  onSave,
}: PlatformSettingsSectionProps) {
  const [maxImagesDraft, setMaxImagesDraft] = useState(String(settings.max_images_per_post));
  const [maxPdfDraft, setMaxPdfDraft] = useState(String(settings.max_pdf_size_mb));
  const [maxResumesDraft, setMaxResumesDraft] = useState(String(settings.max_resumes_per_user));
  const [maxPortfoliosDraft, setMaxPortfoliosDraft] = useState(String(settings.max_portfolios_per_user));
  const [signupBonusDraft, setSignupBonusDraft] = useState(String(settings.signup_bonus_coins));
  const [referralRewardDraft, setReferralRewardDraft] = useState(String(settings.referral_reward_coins));
  const [aiReplyMaxTokensDraft, setAiReplyMaxTokensDraft] = useState(String(settings.ai_mention_reply_max_tokens));
  const [aiReplyAccountQuery, setAiReplyAccountQuery] = useState("");
  const [aiReplyAccountResults, setAiReplyAccountResults] = useState<AiReplyProfileSummary[]>([]);
  const [selectedAiReplyAccount, setSelectedAiReplyAccount] = useState<AiReplyProfileSummary | null>(null);
  const [aiReplyAccountLoading, setAiReplyAccountLoading] = useState(false);

  useEffect(() => {
    setMaxImagesDraft(String(settings.max_images_per_post));
    setMaxPdfDraft(String(settings.max_pdf_size_mb));
    setMaxResumesDraft(String(settings.max_resumes_per_user));
    setMaxPortfoliosDraft(String(settings.max_portfolios_per_user));
    setSignupBonusDraft(String(settings.signup_bonus_coins));
    setReferralRewardDraft(String(settings.referral_reward_coins));
    setAiReplyMaxTokensDraft(String(settings.ai_mention_reply_max_tokens));
  }, [
    settings.max_images_per_post,
    settings.max_pdf_size_mb,
    settings.max_resumes_per_user,
    settings.max_portfolios_per_user,
    settings.signup_bonus_coins,
    settings.referral_reward_coins,
    settings.ai_mention_reply_max_tokens,
  ]);

  useEffect(() => {
    let active = true;

    const loadSelectedAccount = async () => {
      if (!settings.ai_mention_reply_profile_id) {
        setSelectedAiReplyAccount(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,is_verified,updated_at")
        .eq("id", settings.ai_mention_reply_profile_id)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error) {
        console.warn("Could not load selected AI reply account.", error);
        setSelectedAiReplyAccount(null);
        return;
      }

      setSelectedAiReplyAccount((data as AiReplyProfileSummary | null) || null);
    };

    void loadSelectedAccount();

    return () => {
      active = false;
    };
  }, [settings.ai_mention_reply_profile_id]);

  useEffect(() => {
    let active = true;
    const query = aiReplyAccountQuery.trim();

    if (query.length < 2) {
      setAiReplyAccountResults([]);
      setAiReplyAccountLoading(false);
      return () => {
        active = false;
      };
    }

    setAiReplyAccountLoading(true);

    const timeoutId = window.setTimeout(async () => {
      const searchPattern = `%${query}%`;
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,is_verified,updated_at")
        .or(`username.ilike.${searchPattern},full_name.ilike.${searchPattern}`)
        .order("updated_at", { ascending: false })
        .limit(8);

      if (!active) {
        return;
      }

      if (error) {
        console.warn("Could not search AI reply accounts.", error);
        setAiReplyAccountResults([]);
        setAiReplyAccountLoading(false);
        return;
      }

      setAiReplyAccountResults((data || []) as AiReplyProfileSummary[]);
      setAiReplyAccountLoading(false);
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [aiReplyAccountQuery]);

  const parseNumberInput = (value: string, fallback: number, min: number, max: number) => {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.max(min, Math.min(max, parsed));
  };

  const commitMaxImages = () => {
    const next = parseNumberInput(maxImagesDraft, settings.max_images_per_post, 1, 10);
    onSettingsChange({ max_images_per_post: next });
    setMaxImagesDraft(String(next));
  };

  const commitMaxPdf = () => {
    const next = parseNumberInput(maxPdfDraft, settings.max_pdf_size_mb, 1, 50);
    onSettingsChange({ max_pdf_size_mb: next });
    setMaxPdfDraft(String(next));
  };

  const commitMaxResumes = () => {
    const next = parseNumberInput(maxResumesDraft, settings.max_resumes_per_user, 1, 50);
    onSettingsChange({ max_resumes_per_user: next });
    setMaxResumesDraft(String(next));
  };

  const commitMaxPortfolios = () => {
    const next = parseNumberInput(maxPortfoliosDraft, settings.max_portfolios_per_user, 1, 50);
    onSettingsChange({ max_portfolios_per_user: next });
    setMaxPortfoliosDraft(String(next));
  };

  const commitSignupBonus = () => {
    const next = parseNumberInput(signupBonusDraft, settings.signup_bonus_coins, 0, 100000);
    onSettingsChange({ signup_bonus_coins: next });
    setSignupBonusDraft(String(next));
  };

  const commitReferralReward = () => {
    const next = parseNumberInput(referralRewardDraft, settings.referral_reward_coins, 0, 100000);
    onSettingsChange({ referral_reward_coins: next });
    setReferralRewardDraft(String(next));
  };

  const commitAiReplyMaxTokens = () => {
    const next = parseNumberInput(aiReplyMaxTokensDraft, settings.ai_mention_reply_max_tokens, 32, 4000);
    onSettingsChange({ ai_mention_reply_max_tokens: next });
    setAiReplyMaxTokensDraft(String(next));
  };

  const settingCards = [
    {
      key: "images",
      label: "Max images",
      helper: "Per post",
      value: maxImagesDraft,
      icon: ImagePlus,
      accentClass: "from-sky-500 to-cyan-500",
      onChange: setMaxImagesDraft,
      onCommit: commitMaxImages,
      min: 1,
      max: 10,
    },
    {
      key: "pdf",
      label: "PDF size",
      helper: "MB limit",
      value: maxPdfDraft,
      icon: FileStack,
      accentClass: "from-violet-500 to-indigo-500",
      onChange: setMaxPdfDraft,
      onCommit: commitMaxPdf,
      min: 1,
      max: 50,
    },
    {
      key: "resumes",
      label: "Resume slots",
      helper: "Per user",
      value: maxResumesDraft,
      icon: ShieldCheck,
      accentClass: "from-emerald-500 to-teal-500",
      onChange: setMaxResumesDraft,
      onCommit: commitMaxResumes,
      min: 1,
      max: 50,
    },
    {
      key: "portfolios",
      label: "Portfolio slots",
      helper: "Per user",
      value: maxPortfoliosDraft,
      icon: Sparkles,
      accentClass: "from-fuchsia-500 to-pink-500",
      onChange: setMaxPortfoliosDraft,
      onCommit: commitMaxPortfolios,
      min: 1,
      max: 50,
    },
    {
      key: "signup",
      label: "Signup bonus",
      helper: "Starter coins",
      value: signupBonusDraft,
      icon: Wallet,
      accentClass: "from-amber-500 to-orange-500",
      onChange: setSignupBonusDraft,
      onCommit: commitSignupBonus,
      min: 0,
      max: 100000,
    },
    {
      key: "referral",
      label: "Referral reward",
      helper: "Per signup",
      value: referralRewardDraft,
      icon: Gift,
      accentClass: "from-blue-500 to-indigo-500",
      onChange: setReferralRewardDraft,
      onCommit: commitReferralReward,
      min: 0,
      max: 100000,
    },
    {
      key: "ai-reply-max-tokens",
      label: "AI reply limit",
      helper: "Max tokens",
      value: aiReplyMaxTokensDraft,
      icon: MessageSquareText,
      accentClass: "from-cyan-500 to-sky-500",
      onChange: setAiReplyMaxTokensDraft,
      onCommit: commitAiReplyMaxTokens,
      min: 32,
      max: 4000,
    },
  ];

  return (
    <AdminPanelCard className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="space-y-3">
          <AdminSectionHeading
            icon={ShieldCheck}
            title="Platform settings"
            description="Clean global rules for uploads, rewards, and visibility."
            iconClassName="from-sky-500 to-cyan-500"
          />

          <AdminMiniStatGrid
            items={[
              {
                label: "Version",
                value: appVersion,
                icon: Sparkles,
                toneClassName: "bg-sky-100 text-sky-700",
              },
              {
                label: "Signup",
                value: `${settings.signup_bonus_coins} coins`,
                icon: Wallet,
                toneClassName: "bg-amber-100 text-amber-700",
              },
              {
                label: "Referral",
                value: `${settings.referral_reward_coins} coins`,
                icon: Gift,
                toneClassName: "bg-violet-100 text-violet-700",
              },
            ]}
          />
        </div>

        <label className="flex items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-slate-50 p-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-white text-brand shadow-[0_14px_24px_-18px_rgba(37,99,235,0.7)]">
              <Bell className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-900">Profile view alerts</p>
              <p className="mt-0.5 text-[11px] leading-5 text-slate-500">Notify users when someone opens their profile.</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.enable_profile_view_notifications}
            onChange={(event) => onSettingsChange({ enable_profile_view_notifications: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
          />
        </label>
      </div>

      <section className="rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff,#ecfeff)] p-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-cyan-500 to-sky-500 text-white shadow-[0_14px_24px_-18px_rgba(14,165,233,0.75)]">
              <Bot className="h-4 w-4" />
            </div>
            <h3 className="mt-3 text-[14px] font-semibold text-slate-900">Social AI reply account</h3>
            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              Pick the existing user account people will tag with <span className="font-semibold text-slate-700">@username</span>.
              That same account will publish the one-time AI comment on tagged posts.
            </p>
          </div>

          <div className="w-full lg:max-w-[360px]">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Search existing account
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={aiReplyAccountQuery}
                onChange={(event) => setAiReplyAccountQuery(event.target.value)}
                placeholder="Search username or name"
                className="input-shell h-10 rounded-xl pl-9 text-[12px]"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[16px] border border-slate-200 bg-white/90 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Selected bot account</p>
            {selectedAiReplyAccount ? (
              <div className="mt-3 flex items-start justify-between gap-3 rounded-[14px] border border-cyan-100 bg-cyan-50/70 p-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-900">@{selectedAiReplyAccount.username}</p>
                  <p className="mt-1 truncate text-[12px] text-slate-500">{selectedAiReplyAccount.full_name || "No name set"}</p>
                  <p className="mt-2 break-all text-[11px] text-slate-400">{selectedAiReplyAccount.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAiReplyAccount(null);
                    setAiReplyAccountQuery("");
                    setAiReplyAccountResults([]);
                    onSettingsChange({ ai_mention_reply_profile_id: null });
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-[0_12px_22px_-18px_rgba(15,23,42,0.28)]"
                  aria-label="Clear AI reply account"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-[12px] text-slate-500">
                AI auto-replies stay off until you choose an existing account here.
              </div>
            )}
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white/90 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Matching accounts</p>
            <div className="mt-3 space-y-2">
              {aiReplyAccountLoading ? (
                <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-4 text-[12px] text-slate-500">
                  Searching accounts...
                </div>
              ) : aiReplyAccountResults.length > 0 ? (
                aiReplyAccountResults.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setSelectedAiReplyAccount(profile);
                      setAiReplyAccountQuery("");
                      setAiReplyAccountResults([]);
                      onSettingsChange({ ai_mention_reply_profile_id: profile.id });
                    }}
                    className="flex w-full items-start justify-between gap-3 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50/70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-900">@{profile.username}</p>
                      <p className="mt-1 truncate text-[12px] text-slate-500">{profile.full_name || "No name set"}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Use
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-[12px] text-slate-500">
                  {aiReplyAccountQuery.trim().length >= 2
                    ? "No matching account found."
                    : "Type at least 2 characters to search users."}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {settingCards.map((card) => (
          <label
            key={card.key}
            className="rounded-[16px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-2.5 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.16)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-[12px] bg-gradient-to-br ${card.accentClass} text-white shadow-[0_14px_24px_-18px_rgba(37,99,235,0.75)]`}
              >
                <card.icon className="h-3.5 w-3.5" />
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {card.helper}
              </span>
            </div>

            <div className="mt-3">
              <p className="text-[13px] font-semibold text-slate-900">{card.label}</p>
              <input
                type="number"
                min={card.min}
                max={card.max}
                value={card.value}
                onChange={(event) => card.onChange(event.target.value)}
                onBlur={card.onCommit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    card.onCommit();
                    event.currentTarget.blur();
                  }
                }}
                className="input-shell mt-2 h-8.5 rounded-xl text-[12px]"
              />
            </div>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void onSave()}
        className="mt-3 rounded-full bg-brand px-3.5 py-2 text-[12px] font-semibold text-white"
      >
        Save platform settings
      </button>
    </AdminPanelCard>
  );
}
