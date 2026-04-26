interface BulkMailerVariableChipsProps {
  variables: string[];
  onInsert?: (variable: string) => void;
}

export function BulkMailerVariableChips({ variables, onInsert }: BulkMailerVariableChipsProps) {
  if (variables.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-app-border bg-app-secondary/40 px-4 py-3 text-sm text-app-muted">
        Add <code>{"{{name}}"}</code>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {variables.map((variable) => {
        const token = `{{${variable}}}`;
        const sharedClassName =
          "rounded-full border border-app-border/80 bg-app-card/90 px-3 py-1.5 text-[11px] font-semibold text-app-text shadow-[0_12px_24px_-22px_rgba(15,23,42,0.45)] transition sm:text-xs";

        if (!onInsert) {
          return (
            <span key={variable} className={sharedClassName}>
              {token}
            </span>
          );
        }

        return (
          <button
            key={variable}
            type="button"
            onClick={() => onInsert(token)}
            className={`${sharedClassName} hover:border-brand/35 hover:bg-brand/10 hover:text-brand`}
          >
            {token}
          </button>
        );
      })}
    </div>
  );
}
