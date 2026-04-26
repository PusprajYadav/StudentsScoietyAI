import { ArrowLeft, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { CommunityCreateForm, type CommunityCreateFormPayload } from "../features/communities/CommunityCreateForm";
import { createCommunity } from "../lib/api";
import { COIN_FEATURE_KEYS, getCoinCostLabel } from "../lib/coins";
import { useCoinWalletStore } from "../store/coinWalletStore";

export function CommunityCreatePage() {
  const navigate = useNavigate();
  const coinFeatureSettings = useCoinWalletStore((state) => state.featureSettings);
  const communityCreateCostLabel = getCoinCostLabel(coinFeatureSettings, COIN_FEATURE_KEYS.communityCreate);

  const handleCreateCommunity = useCallback(
    async (payload: CommunityCreateFormPayload) => {
      const createdCommunity = await createCommunity({
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        heroColor: payload.heroColor,
        postingModes: payload.postingModes,
        joinPolicy: payload.joinPolicy,
        requiresPassword: payload.requiresPassword,
        password: payload.password,
        passwordHint: payload.passwordHint,
        feedVisibility: payload.feedVisibility,
      });

      if (!createdCommunity) {
        throw new Error("Community creation did not return a result.");
      }

      toast.success("Community created.");
      navigate(`/app/communities/${createdCommunity.slug}`);
    },
    [navigate]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-app-border/80 bg-app-card/95 p-4 shadow-[0_22px_52px_-36px_rgba(15,23,42,0.24)] sm:p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_22%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_22%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/app/communities"
              className="inline-flex items-center gap-2 text-sm font-semibold text-app-text/80 transition hover:text-app-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-[0_18px_32px_-24px_rgba(37,99,235,0.48)]">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-[1.9rem] font-bold tracking-tight text-app-text sm:text-[2.15rem]">
                  Create community
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-app-border/80 bg-app-card/92 px-3.5 py-2 text-sm font-semibold text-brand shadow-[0_18px_34px_-26px_rgba(15,23,42,0.2)]">
              <Sparkles className="h-4 w-4" />
              {communityCreateCostLabel}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-app-border/80 bg-app-card/92 px-3.5 py-2 text-sm font-semibold text-app-text shadow-[0_18px_34px_-26px_rgba(15,23,42,0.2)]">
              <ShieldCheck className="h-4 w-4 text-brand" />
              Ready
            </div>
          </div>
        </div>
      </section>

      <CommunityCreateForm costLabel={communityCreateCostLabel} onSubmit={handleCreateCommunity} />
    </div>
  );
}
