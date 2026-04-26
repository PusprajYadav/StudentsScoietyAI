export function ColorSwatchPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  }) {
  return (
    <div className="min-w-0 w-full">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">{label}</p>
      <div className="mt-2 -mx-1 flex w-full snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 sm:gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium transition sm:gap-2 sm:px-2.5 sm:py-1.5 sm:text-[11px] ${
              option.value === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/10 sm:h-4 sm:w-4"
              style={{ background: option.value }}
            />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
