import { Mail } from "lucide-react";
import { BulkMailerTool } from "../../features/bulk-mailer/BulkMailerTool";

const bulkMailerHeaderStyle = {
  backgroundImage:
    "radial-gradient(circle at top left, rgb(var(--brand) / 0.2), transparent 34%), radial-gradient(circle at bottom right, rgb(var(--brand) / 0.14), transparent 30%), linear-gradient(135deg, rgb(var(--app-card) / 0.98) 0%, rgb(var(--app-card) / 0.95) 48%, rgb(var(--app-secondary) / 0.8) 100%)",
};

export function BulkMailerApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  return (
    <div className="space-y-4">
      {showTitleBlock ? (
        <section
          className="relative overflow-hidden rounded-[24px] border border-app-border/80 bg-app-card/95 px-4 py-3 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.28)] backdrop-blur-xl"
          style={bulkMailerHeaderStyle}
        >
          <div className="relative flex items-center gap-3">
            <div className="rounded-[14px] bg-gradient-to-br from-[#2563eb] via-[#0f766e] to-[#14b8a6] p-2 text-white shadow-[0_16px_24px_-18px_rgba(37,99,235,0.72)]">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight text-app-text">Bulk Mailer</h1>
              <p className="mt-0.5 text-xs text-app-muted">Compose, queue, templates, SMTP, stats.</p>
            </div>
          </div>
        </section>
      ) : null}

      <BulkMailerTool />
    </div>
  );
}
