import { Globe2, LockKeyhole, MailCheck, Sparkles } from "lucide-react";

const features = [
  {
    label: "OTP Signup",
    hint: "6-digit email verification",
    icon: MailCheck,
  },
  {
    label: "Guest Access",
    hint: "Read discussions and profiles",
    icon: Globe2,
  },
  {
    label: "Protected Actions",
    hint: "Posts, chat, follows, edits",
    icon: LockKeyhole,
  },
];

export function AuthHighlights() {
  return (
    <section className="relative overflow-hidden rounded-[42px] border border-app-border/80 bg-app-card/88 p-10 shadow-[0_30px_80px_-34px_rgba(15,23,42,0.32)] backdrop-blur-xl xl:p-12">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, rgb(var(--brand) / 0.24), transparent 48%), radial-gradient(circle at bottom right, rgb(var(--brand) / 0.14), transparent 40%)",
        }}
      />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/10 px-3.5 py-2 text-xs font-semibold text-brand">
          <Sparkles className="h-4 w-4" />
          Private by default
        </div>

        <h1 className="mt-6 max-w-[13ch] font-display text-[2.9rem] font-bold tracking-tight text-app-text xl:text-[3.55rem]">
          Secure access for Student Society.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-app-muted xl:text-[15px]">
          OTP signup, public browsing, and account-locked actions in one clean flow.
        </p>

        <div className="mt-10 grid gap-4 xl:grid-cols-3">
          {features.map((item) => (
            <article
              key={item.label}
              className="rounded-[30px] border border-app-border/80 bg-app-card/72 p-5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.36)] backdrop-blur-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-brand/15 bg-brand/10 text-brand">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-5 font-display text-[1.05rem] font-semibold text-app-text">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-app-muted">{item.hint}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
