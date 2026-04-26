import { Copy, ExternalLink, Loader2, QrCode, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { isSupabaseConfigured } from "../lib/supabase";
import { copyText, parseDetectedContent } from "../components/tools/codes/helpers";
import { resolveDynamicQrCode, type ResolvedDynamicQr } from "../components/tools/codes/api";

export function QrRedirectPage() {
  const { shortCode } = useParams<{ shortCode?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedDynamicQr | null>(null);

  useEffect(() => {
    let disposed = false;

    if (!shortCode) {
      setError("This QR link is missing its short code.");
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setError("Dynamic QR links are not configured on this deployment.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    void resolveDynamicQrCode(shortCode)
      .then((nextResolved) => {
        if (disposed) {
          return;
        }

        if (!nextResolved) {
          setError("This QR link could not be found.");
          setLoading(false);
          return;
        }

        setResolved(nextResolved);
        setLoading(false);

        if (nextResolved.type !== "text") {
          const parsed = parseDetectedContent(nextResolved.target_url);

          if (parsed.actionHref) {
            window.location.href = parsed.actionHref;
          }
        }
      })
      .catch((nextError) => {
        console.error("Could not resolve QR link", nextError);
        if (!disposed) {
          setError("This QR link could not be opened right now.");
          setLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [shortCode]);

  const parsedResult = resolved ? parseDetectedContent(resolved.target_url) : null;

  return (
    <div className="min-h-[100dvh] bg-app px-4 py-6 text-app-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="glass-card overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.22),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(13,148,136,0.18),_transparent_36%)]" />
            <div className="relative px-5 py-6 sm:px-7 sm:py-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-app-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                <QrCode className="h-3.5 w-3.5 text-brand" />
                Dynamic QR
              </div>

              {loading ? (
                <div className="mt-6 flex items-center gap-3 text-sm text-app-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening your QR destination...
                </div>
              ) : error ? (
                <div className="mt-6">
                  <p className="font-display text-2xl font-semibold tracking-tight text-app-text">QR destination unavailable</p>
                  <p className="mt-2 text-sm leading-6 text-app-muted">{error}</p>
                </div>
              ) : resolved && parsedResult ? (
                <div className="mt-6">
                  <p className="font-display text-2xl font-semibold tracking-tight text-app-text">{resolved.title}</p>
                  <p className="mt-2 text-sm leading-6 text-app-muted">
                    {resolved.type === "text"
                      ? "This dynamic QR stores text content directly."
                      : "Your destination should open automatically. If it doesn’t, use the action below."}
                  </p>

                  <div className="mt-5 rounded-[26px] border border-app-border bg-app-card p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">{parsedResult.kind}</p>
                    <p className="mt-3 break-words font-display text-[1.18rem] font-semibold tracking-tight text-app-text sm:text-[1.35rem]">
                      {parsedResult.displayValue}
                    </p>
                    <p className="mt-2 text-sm text-app-muted">{resolved.scan_count} total scans</p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {parsedResult.actionHref ? (
                      <a
                        href={parsedResult.actionHref}
                        target={parsedResult.kind === "url" ? "_blank" : undefined}
                        rel="noreferrer"
                        className="btn-primary gap-2 !rounded-full !px-4"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {parsedResult.actionLabel || "Open"}
                      </a>
                    ) : null}

                    <button
                      type="button"
                      className="btn-secondary gap-2 !rounded-full !px-4"
                      onClick={() => {
                        void copyText(parsedResult.raw)
                          .then(() => toast.success("Content copied"))
                          .catch((copyError) => {
                            console.error("Could not copy QR content", copyError);
                            toast.error("Clipboard copy failed.");
                          });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      Copy content
                    </button>

                    <Link to="/app/tools/qr-code-tool" className="btn-secondary gap-2 !rounded-full !px-4">
                      <Undo2 className="h-4 w-4" />
                      Open QR Tool
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
