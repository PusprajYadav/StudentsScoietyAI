import { Database, FileImage, FileText, FolderTree, Link2, RefreshCw, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDateTime, formatFileSize } from "../../lib/formatting";
import type { AdminBucketObjectRow, MediaAssetWithRelations } from "../../types/database";

interface MediaManagementSectionProps {
  items: MediaAssetWithRelations[];
  bucketName?: string;
  bucketObjects?: AdminBucketObjectRow[];
  bucketLoading?: boolean;
  bucketLoadError?: string | null;
  loadError?: string | null;
  deletingMediaId?: string | null;
  onRefreshBucket?: () => Promise<void> | void;
  onDeleteMedia: (item: MediaAssetWithRelations) => Promise<void>;
}

function formatUsageLabel(usage: MediaAssetWithRelations["usage"]) {
  switch (usage) {
    case "avatar":
      return "Avatar";
    case "banner":
      return "Banner";
    case "post_pdf":
      return "Post PDF";
    case "verification_proof":
      return "Verification proof";
    default:
      return "Post image";
  }
}

function formatAttachmentLabel(item: MediaAssetWithRelations) {
  if (item.usage === "avatar" || item.usage === "banner" || item.usage === "verification_proof") {
    return item.profile?.username ? `Profile @${item.profile.username}` : "Profile media";
  }

  return item.post?.title ? `Post: ${item.post.title}` : "Post media";
}

function getSavingsPercent(item: MediaAssetWithRelations) {
  if (!item.original_size_bytes || !item.stored_size_bytes || item.original_size_bytes <= 0) {
    return 0;
  }

  return Math.max(0, Math.round((1 - item.stored_size_bytes / item.original_size_bytes) * 100));
}

function getBucketObjectExtension(item: AdminBucketObjectRow) {
  const explicit = item.file_extension?.trim();
  if (explicit) {
    return explicit.startsWith(".") ? explicit : `.${explicit}`;
  }

  const dotIndex = item.name.lastIndexOf(".");
  return dotIndex >= 0 ? item.name.slice(dotIndex).toLowerCase() : "";
}

function groupBucketObjectsByFolder(items: AdminBucketObjectRow[]) {
  const groups = new Map<
    string,
    {
      folder: string;
      items: AdminBucketObjectRow[];
      totalSizeBytes: number;
      trackedCount: number;
    }
  >();

  items.forEach((item) => {
    const folder = item.folder?.trim() || "/";
    const current = groups.get(folder) || {
      folder,
      items: [],
      totalSizeBytes: 0,
      trackedCount: 0,
    };

    current.items.push(item);
    current.totalSizeBytes += Math.max(0, item.size_bytes || 0);
    current.trackedCount += item.is_registered ? 1 : 0;
    groups.set(folder, current);
  });

  return Array.from(groups.values())
    .sort((left, right) => left.folder.localeCompare(right.folder))
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => left.name.localeCompare(right.name)),
    }));
}

export function MediaManagementSection({
  items,
  bucketName = "",
  bucketObjects = [],
  bucketLoading = false,
  bucketLoadError = null,
  loadError = null,
  deletingMediaId = null,
  onRefreshBucket,
  onDeleteMedia,
}: MediaManagementSectionProps) {
  const bucketGroups = groupBucketObjectsByFolder(bucketObjects);
  const trackedBucketObjects = bucketObjects.filter((item) => item.is_registered).length;

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-slate-900 sm:text-lg">Media management</p>
          <p className="mt-1 text-xs text-slate-500">Managed media assets plus the full Cloudflare R2 folder and file listing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {items.length} managed assets
          </p>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {bucketObjects.length} bucket files
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="mt-3 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {loadError}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          {loadError ? "Media files could not be loaded from the PHP host." : "No managed media has been uploaded yet."}
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {items.map((item) => {
            const savingsPercent = getSavingsPercent(item);

            return (
              <article
                key={item.id}
                className="grid gap-3 rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)] lg:grid-cols-[120px_minmax(0,1fr)]"
              >
                <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50">
                  {item.file_kind === "image" ? (
                    <img
                      src={item.public_url}
                      alt={item.original_name}
                      className="aspect-square h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-brand/5 text-brand">
                      <FileText className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.stored_name || item.original_name}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {formatUsageLabel(item.usage)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {item.file_extension}
                    </span>
                  </div>

                  {item.original_name && item.original_name !== item.stored_name ? (
                    <p className="mt-1 truncate text-[11px] text-slate-500">Uploaded as {item.original_name}</p>
                  ) : null}

                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[14px] bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Owner</p>
                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {item.owner?.username ? `@${item.owner.username}` : "Unknown"}
                      </p>
                    </div>

                    <div className="rounded-[14px] bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Size</p>
                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {formatFileSize(item.stored_size_bytes)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Saved {savingsPercent}% from {formatFileSize(item.original_size_bytes)}
                      </p>
                    </div>

                    <div className="rounded-[14px] bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Attached</p>
                      <p className="mt-1 text-xs font-semibold text-slate-700">{formatAttachmentLabel(item)}</p>
                    </div>

                    <div className="rounded-[14px] bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Uploaded</p>
                      <p className="mt-1 text-xs font-semibold text-slate-700">{formatDateTime(item.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <a
                      href={item.public_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand"
                    >
                      {item.file_kind === "image" ? <FileImage className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                      Open
                    </a>

                    {item.profile?.username ? (
                      <Link
                        to={`/profile/${item.profile.username}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Profile
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void onDeleteMedia(item)}
                      disabled={deletingMediaId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingMediaId === item.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  <p className="mt-2 truncate text-[11px] text-slate-500">{item.public_url}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50/80 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-brand" />
              <p className="text-sm font-semibold text-slate-900">R2 bucket browser</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {bucketName ? `Bucket ${bucketName}` : "Configured R2 bucket"} grouped by folder path.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
              {bucketGroups.length} folders
            </p>
            <p className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
              {trackedBucketObjects}/{bucketObjects.length} tracked
            </p>
            <button
              type="button"
              onClick={() => void onRefreshBucket?.()}
              disabled={bucketLoading}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${bucketLoading ? "animate-spin" : ""}`} />
              {bucketLoading ? "Refreshing..." : "Refresh bucket"}
            </button>
          </div>
        </div>

        {bucketLoadError ? (
          <div className="mt-3 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {bucketLoadError}
          </div>
        ) : null}

        {!bucketLoadError && bucketGroups.length === 0 ? (
          <div className="mt-3 rounded-[16px] border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            {bucketLoading ? "Loading Cloudflare R2 files..." : "No files were found in the configured R2 bucket."}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {bucketGroups.map((group) => (
              <article
                key={group.folder}
                className="rounded-[16px] border border-slate-200 bg-white p-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.18)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-brand" />
                      <p className="truncate font-mono text-sm font-semibold text-slate-900">{group.folder}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {group.items.length} file{group.items.length === 1 ? "" : "s"} • {formatFileSize(group.totalSizeBytes)}
                    </p>
                  </div>

                  <p className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {group.trackedCount} tracked
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {group.items.map((item) => {
                    const extension = getBucketObjectExtension(item);

                    return (
                      <div
                        key={item.key}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                            {extension ? (
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                {extension}
                              </span>
                            ) : null}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                                item.is_registered
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {item.is_registered ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                              {item.is_registered ? "Tracked" : "Untracked"}
                            </span>
                            {item.media_usage ? (
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                {item.media_usage}
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{item.key}</p>

                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                            <span>{formatFileSize(item.size_bytes)}</span>
                            {item.owner_username ? <span>@{item.owner_username}</span> : null}
                            {item.last_modified ? <span>{formatDateTime(item.last_modified)}</span> : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <a
                            href={item.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand"
                          >
                            {item.media_usage === "post_pdf" ? <FileText className="h-3.5 w-3.5" /> : <FileImage className="h-3.5 w-3.5" />}
                            Open
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
