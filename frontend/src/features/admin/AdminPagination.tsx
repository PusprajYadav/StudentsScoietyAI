interface AdminPaginationProps {
  page: number;
  pageSize: number;
  totalCount?: number | null;
  canGoNext: boolean;
  onPageChange: (page: number) => void;
}

export function AdminPagination({
  page,
  pageSize,
  totalCount = null,
  canGoNext,
  onPageChange,
}: AdminPaginationProps) {
  const safePage = Math.max(1, page);
  const start = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end =
    totalCount === null
      ? safePage * pageSize
      : Math.min(totalCount, safePage * pageSize);

  return (
    <div className="flex flex-col gap-1.5 rounded-[16px] border border-slate-200 bg-white px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] text-slate-500">
        {totalCount === null ? `Page ${safePage}` : `Showing ${start}-${end} of ${totalCount}`}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-brand/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev {pageSize}
        </button>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange(safePage + 1)}
          className="rounded-full bg-brand px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next {pageSize}
        </button>
      </div>
    </div>
  );
}
