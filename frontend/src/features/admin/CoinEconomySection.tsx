import {
  BadgeCheck,
  Clock3,
  Coins,
  FileText,
  Globe,
  Mail,
  MessageCircleMore,
  PenSquare,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminPagination } from "./AdminPagination";
import { AdminMiniStatGrid, AdminPanelCard, AdminSectionHeading } from "./AdminUi";
import type { CoinFeatureSettingRow } from "../../types/database";

interface CoinEconomySectionProps {
  items: CoinFeatureSettingRow[];
  onSave: (items: CoinFeatureSettingRow[]) => Promise<void>;
}

const COIN_PAGE_SIZE = 5;

function describeBilling(setting: CoinFeatureSettingRow) {
  if (setting.billing_model === "time_pass") {
    return `${setting.duration_days || 0} day pass`;
  }

  return "Per use";
}

function getFeatureVisual(setting: CoinFeatureSettingRow): {
  icon: LucideIcon;
  accentClass: string;
  softClass: string;
} {
  const featureKey = setting.feature_key;

  if (featureKey.includes("community")) {
    return {
      icon: Users,
      accentClass: "from-indigo-500 to-sky-500",
      softClass: "bg-indigo-50 text-indigo-700",
    };
  }

  if (featureKey.includes("post")) {
    return {
      icon: PenSquare,
      accentClass: "from-sky-500 to-cyan-500",
      softClass: "bg-sky-50 text-sky-700",
    };
  }

  if (featureKey.includes("verification")) {
    return {
      icon: BadgeCheck,
      accentClass: "from-blue-500 to-indigo-500",
      softClass: "bg-blue-50 text-blue-700",
    };
  }

  if (featureKey.includes("chat")) {
    return {
      icon: MessageCircleMore,
      accentClass: "from-violet-500 to-indigo-500",
      softClass: "bg-violet-50 text-violet-700",
    };
  }

  if (featureKey.includes("resume")) {
    return {
      icon: FileText,
      accentClass: "from-emerald-500 to-teal-500",
      softClass: "bg-emerald-50 text-emerald-700",
    };
  }

  if (featureKey.includes("portfolio")) {
    return {
      icon: Globe,
      accentClass: "from-fuchsia-500 to-pink-500",
      softClass: "bg-fuchsia-50 text-fuchsia-700",
    };
  }

  if (featureKey.includes("email") || featureKey.includes("mailer")) {
    return {
      icon: Mail,
      accentClass: "from-amber-500 to-orange-500",
      softClass: "bg-amber-50 text-amber-700",
    };
  }

  if (setting.billing_model === "time_pass") {
    return {
      icon: Clock3,
      accentClass: "from-blue-500 to-indigo-500",
      softClass: "bg-indigo-50 text-indigo-700",
    };
  }

  return {
    icon: Sparkles,
    accentClass: "from-brand to-brand-dark",
    softClass: "bg-brand/10 text-brand",
  };
}

export function CoinEconomySection({ items, onSave }: CoinEconomySectionProps) {
  const [drafts, setDrafts] = useState<Record<string, { coinsRequired: string; isEnabled: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        items.map((entry) => [
          entry.feature_key,
          {
            coinsRequired: String(entry.coins_required),
            isEnabled: entry.is_enabled,
          },
        ])
      )
    );
  }, [items]);

  useEffect(() => {
    setPage(1);
  }, [items]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * COIN_PAGE_SIZE;
    return items.slice(start, start + COIN_PAGE_SIZE);
  }, [items, page]);

  return (
    <AdminPanelCard className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <AdminSectionHeading
          icon={Coins}
          title="Coin economy"
          description="Search filters the list and pricing loads 5 at a time."
          iconClassName="from-amber-500 to-orange-500"
          badge={
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
              1 coin = Rs 1
            </span>
          }
        />

        <AdminMiniStatGrid
          items={[
            {
              label: "Rate",
              value: "1 coin = Rs 1",
              icon: Coins,
              toneClassName: "bg-amber-100 text-amber-700",
            },
            {
              label: "Features",
              value: items.length,
              icon: Sparkles,
              toneClassName: "bg-sky-100 text-sky-700",
            },
            {
              label: "Page",
              value: page,
              icon: Clock3,
              toneClassName: "bg-violet-100 text-violet-700",
            },
          ]}
        />
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
        {pagedItems.map((entry) => {
          const draft = drafts[entry.feature_key] || {
            coinsRequired: String(entry.coins_required),
            isEnabled: entry.is_enabled,
          };
          const visual = getFeatureVisual(entry);
          const costPreview = Number.parseInt(draft.coinsRequired, 10);
          const normalizedPreview = Number.isFinite(costPreview)
            ? Math.max(0, costPreview)
            : entry.coins_required;

          return (
            <article
              key={entry.feature_key}
              className="rounded-[16px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-2.5 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.16)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br ${visual.accentClass} text-white shadow-[0_14px_24px_-18px_rgba(37,99,235,0.75)]`}
                  >
                    <visual.icon className="h-3.5 w-3.5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-slate-900">{entry.feature_name}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        {describeBilling(entry)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{entry.description}</p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Live</span>
                  <input
                    type="checkbox"
                    checked={draft.isEnabled}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [entry.feature_key]: {
                          ...draft,
                          isEnabled: event.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_120px]">
                <div className={`rounded-[12px] px-2.5 py-2 ${visual.softClass}`}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-75">Preview</p>
                  <p className="mt-1 text-[12px] font-semibold">
                    {normalizedPreview === 0 ? "Free" : `${normalizedPreview} coin${normalizedPreview === 1 ? "" : "s"}`}
                  </p>
                  <p className="mt-1 text-[10px] opacity-75">{entry.category}</p>
                </div>

                <label className="grid gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Coins</span>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    value={draft.coinsRequired}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [entry.feature_key]: {
                          ...draft,
                          coinsRequired: event.target.value,
                        },
                      }))
                    }
                    className="input-shell h-8.5 rounded-xl text-[12px]"
                  />
                </label>
              </div>

              <p className="mt-2 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {entry.feature_key}
              </p>
            </article>
          );
        })}
      </div>

      {items.length > COIN_PAGE_SIZE ? (
        <div className="mt-3">
          <AdminPagination
            page={page}
            pageSize={COIN_PAGE_SIZE}
            totalCount={items.length}
            canGoNext={page * COIN_PAGE_SIZE < items.length}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => {
          const nextItems = items.map((entry) => {
            const draft = drafts[entry.feature_key];
            const parsedCoins = Number.parseInt(draft?.coinsRequired || String(entry.coins_required), 10);

            return {
              ...entry,
              coins_required: Number.isFinite(parsedCoins) ? Math.max(0, parsedCoins) : entry.coins_required,
              is_enabled: draft?.isEnabled ?? entry.is_enabled,
            };
          });

          setSaving(true);
          void onSave(nextItems).finally(() => setSaving(false));
        }}
        className="mt-3 rounded-full bg-brand px-3.5 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving pricing..." : "Save coin pricing"}
      </button>
    </AdminPanelCard>
  );
}
