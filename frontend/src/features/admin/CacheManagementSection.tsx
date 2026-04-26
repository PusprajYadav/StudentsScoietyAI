import { DatabaseZap, DownloadCloud, HardDriveDownload, RefreshCcw, Trash2 } from "lucide-react";
import type { RuntimeCacheSummary } from "../../lib/appRuntime";
import type { DeviceCacheNamespace } from "../../lib/cache";
import type { OfflineCacheSummary } from "../../lib/offlineCache";

interface CacheManagementSectionProps {
  cacheConfigured: boolean;
  cacheEntries: number | null;
  deviceCacheSummary: OfflineCacheSummary | null;
  runtimeCacheSummary: RuntimeCacheSummary | null;
  onClearCache: () => Promise<void>;
  onClearNamespace: (namespace: string) => Promise<void>;
  onClearDeviceCache: () => Promise<void>;
  onClearDeviceNamespace: (namespace: DeviceCacheNamespace) => Promise<void>;
  onClearRuntimeCache: () => Promise<void>;
  onWarmDeviceCache: () => Promise<void>;
  onPersistDeviceStorage: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = value;
  let unitIndex = 0;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  const precision = current >= 100 || unitIndex === 0 ? 0 : current >= 10 ? 1 : 2;
  return `${current.toFixed(precision)} ${units[unitIndex]}`;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function CacheManagementSection({
  cacheConfigured,
  cacheEntries,
  deviceCacheSummary,
  runtimeCacheSummary,
  onClearCache,
  onClearNamespace,
  onClearDeviceCache,
  onClearDeviceNamespace,
  onClearRuntimeCache,
  onWarmDeviceCache,
  onPersistDeviceStorage,
  onRefresh,
}: CacheManagementSectionProps) {
  const deviceNamespaces = deviceCacheSummary?.namespaces || [];

  return (
    <section className="space-y-3.5 rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-brand/10 text-brand">
          <DatabaseZap className="h-4 w-4" />
        </div>
        <div>
          <p className="font-display text-base font-semibold text-slate-900 sm:text-lg">Cache control</p>
          <p className="text-xs text-slate-500">Manage backend cache, device data snapshots, and the offline bundle.</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <section className="rounded-[18px] border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-brand/10 text-brand">
              <DatabaseZap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">backend cache</p>
              <p className="text-[11px] text-slate-500">Server-side namespaces</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <StatCard label="Configured" value={cacheConfigured ? "Yes" : "No"} />
            <StatCard label="Entries" value={cacheEntries ?? "Unavailable"} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onClearCache()}
              className="rounded-full bg-brand px-4 py-2 text-[11px] font-semibold text-white"
            >
              Clear backend cache
            </button>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-700"
            >
              Refresh stats
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {["discussions", "community-feed", "communities", "notifications", "search"].map((namespace) => (
              <button
                key={namespace}
                type="button"
                onClick={() => void onClearNamespace(namespace)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700"
              >
                Clear {namespace}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[18px] border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-emerald-500/10 text-emerald-600">
              <HardDriveDownload className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Device data cache</p>
              <p className="text-[11px] text-slate-500">IndexedDB feed, search, and community snapshots</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <StatCard label="Entries" value={deviceCacheSummary?.entryCount ?? 0} />
            <StatCard label="Stored" value={formatBytes(deviceCacheSummary?.totalBytes)} />
            <StatCard
              label="Persistent"
              value={
                deviceCacheSummary?.storage.supported
                  ? deviceCacheSummary.storage.persisted
                    ? "Enabled"
                    : "Not yet"
                  : "Unavailable"
              }
            />
            <StatCard
              label="Quota"
              value={
                deviceCacheSummary?.storage.quotaBytes
                  ? `${formatBytes(deviceCacheSummary.storage.usageBytes)} / ${formatBytes(deviceCacheSummary.storage.quotaBytes)}`
                  : "Unavailable"
              }
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onWarmDeviceCache()}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-semibold text-white"
            >
              <DownloadCloud className="h-3.5 w-3.5" />
              Download offline cache
            </button>
            <button
              type="button"
              onClick={() => void onPersistDeviceStorage()}
              className="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-700"
            >
              Keep storage
            </button>
            <button
              type="button"
              onClick={() => void onClearDeviceCache()}
              className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-[11px] font-semibold text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear device data
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {deviceNamespaces.length > 0 ? (
              deviceNamespaces.map((entry) => (
                <button
                  key={entry.namespace}
                  type="button"
                  onClick={() => void onClearDeviceNamespace(entry.namespace as DeviceCacheNamespace)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700"
                >
                  Clear {entry.namespace}
                </button>
              ))
            ) : (
              <p className="text-xs text-slate-500">No device cache entries stored yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-[18px] border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-sky-500/10 text-sky-600">
              <RefreshCcw className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Offline bundle</p>
              <p className="text-[11px] text-slate-500">Service worker and CacheStorage assets</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <StatCard
              label="Supported"
              value={runtimeCacheSummary?.supported ? "Yes" : "No"}
            />
            <StatCard label="Caches" value={runtimeCacheSummary?.cacheCount ?? 0} />
            <StatCard label="Requests" value={runtimeCacheSummary?.requestCount ?? 0} />
            <StatCard
              label="Cache names"
              value={runtimeCacheSummary?.cacheNames.length ? runtimeCacheSummary.cacheNames.join(", ") : "None"}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onClearRuntimeCache()}
              className="rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold text-white"
            >
              Clear offline bundle
            </button>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-700"
            >
              Refresh again
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
