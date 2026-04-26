import { MessageSquareMore, ShieldCheck, Sparkles, Zap } from "lucide-react";

export function ChatEmptyState() {
  return (
    <div className="flex min-h-[32rem] flex-1 items-center justify-center p-6">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[38px] border border-app-border/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(240,253,244,0.8))] px-8 py-10 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.38)]">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-48 w-48 rounded-full bg-brand/12 blur-3xl" />

        <div className="relative text-center">
          <div className="mx-auto flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-[1.7rem] bg-[linear-gradient(135deg,rgba(34,197,94,0.16),rgba(16,185,129,0.14),rgba(37,99,235,0.12))] text-emerald-600 shadow-[0_24px_50px_-30px_rgba(34,197,94,0.72)] dark:text-emerald-300">
            <MessageSquareMore className="h-8 w-8" />
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600/80 dark:text-emerald-300/80">
            Private Student Chat
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-app-text">
            WhatsApp-style messaging with request approval before the first message
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-app-muted">
            Open a conversation from the left, or visit a student profile to send the first request.
            The first request follows the coin pricing rules, and accepted chats stay free after that.
          </p>

          <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
            <div className="rounded-[26px] border border-app-border bg-app-card/88 p-5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.25)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-app-text">Request before chat</p>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                The first message arrives as a request, so the other student can accept before a full
                chat opens.
              </p>
            </div>

            <div className="rounded-[26px] border border-app-border bg-app-card/88 p-5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.25)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-brand/10 text-brand">
                <Zap className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-app-text">Fast familiar layout</p>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                Chat bubbles, composer, thread spacing, and profile header all follow a clearer
                WhatsApp-inspired flow.
              </p>
            </div>

            <div className="rounded-[26px] border border-app-border bg-app-card/88 p-5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.25)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-app-text">Practical moderation tools</p>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                Delete local messages, delete whole chats, and block or unblock users directly inside
                the conversation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
