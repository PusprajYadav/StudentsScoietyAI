import {
  ArrowLeft,
  AtSign,
  Gift,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import { type FormEvent, type ReactNode } from "react";
import { normalizeUsername } from "../../lib/usernames";

export type AuthMode =
  | "login"
  | "signup"
  | "verify-signup"
  | "forgot-password"
  | "reset-password";

interface AuthPanelProps {
  mode: AuthMode;
  busy: boolean;
  configured: boolean;
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  fullName: string;
  referralCode: string;
  otp: string;
  redirectTarget: string;
  onModeChange: (mode: AuthMode) => void;
  onPrimaryModeChange: (mode: "login" | "signup") => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onReferralCodeChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onResendCode: () => Promise<void>;
  agreedToTerms: boolean;
  onAgreedToTermsChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

function maskEmail(value: string) {
  const trimmed = value.trim();
  const [localPart, domainPart] = trimmed.split("@");

  if (!localPart || !domainPart) {
    return trimmed || "your email";
  }

  const visibleStart = localPart.slice(0, 2);
  return `${visibleStart}${"*".repeat(Math.max(localPart.length - visibleStart.length, 1))}@${domainPart}`;
}

function InputRow({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: ReactNode;
}) {
  return (
    <div className="flex h-[54px] items-center gap-3 rounded-[20px] border border-app-border bg-app-secondary/75 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_34px_-30px_rgba(15,23,42,0.26)] transition focus-within:border-brand/35 focus-within:bg-app-card focus-within:shadow-[0_22px_40px_-28px_rgba(37,99,235,0.34)]">
      <Icon className="h-4 w-4 shrink-0 text-brand" />
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="pl-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-app-muted">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-app-muted">{hint}</span> : null}
    </label>
  );
}

export function AuthPanel({
  mode,
  busy,
  configured,
  email,
  password,
  confirmPassword,
  username,
  fullName,
  referralCode,
  otp,
  redirectTarget,
  onModeChange,
  onPrimaryModeChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onUsernameChange,
  onFullNameChange,
  onReferralCodeChange,
  onOtpChange,
  onResendCode,
  agreedToTerms,
  onAgreedToTermsChange,
  onSubmit,
}: AuthPanelProps) {
  const primaryMode = mode === "signup" || mode === "verify-signup" ? "signup" : "login";
  const isVerificationMode = mode === "verify-signup" || mode === "reset-password";
  const title =
    mode === "signup"
      ? "Create account"
      : mode === "verify-signup"
        ? "Verify email"
        : mode === "forgot-password"
          ? "Reset password"
          : mode === "reset-password"
            ? "Create new password"
            : "Welcome back";
  const subtitle =
    mode === "signup"
      ? "OTP-secured signup for students."
      : mode === "verify-signup"
        ? `Enter the 6-digit code sent to ${maskEmail(email)}.`
        : mode === "forgot-password"
          ? "We will send a 6-digit reset code to your email."
          : mode === "reset-password"
          ? `Use the code from ${maskEmail(email)} and set your new password.`
            : "Log in with your email and password.";
  const submitLabel =
    mode === "signup"
      ? "Send email code"
      : mode === "verify-signup"
        ? "Verify and continue"
        : mode === "forgot-password"
          ? "Send reset code"
          : mode === "reset-password"
            ? "Change password"
            : "Log in";
  const ActionIcon =
    mode === "login"
      ? LogIn
      : mode === "forgot-password" || mode === "reset-password"
        ? KeyRound
        : MailCheck;
  const showRedirectNote = redirectTarget !== "/app/discussions/study";

  return (
    <section className="overflow-hidden rounded-[28px] border border-app-border/80 bg-app-card/94 p-4 shadow-[0_26px_70px_-34px_rgba(15,23,42,0.34)] backdrop-blur-2xl sm:rounded-[34px] sm:p-6">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <img
            src="/logo.png"
            alt="Student Society"
            className="h-12 w-12 rounded-[18px] object-cover shadow-[0_18px_32px_-20px_rgba(37,99,235,0.52)] ring-1 ring-app-border"
          />
        </div>
        <div className="min-w-0">
          <p className="font-display text-[1.2rem] font-bold tracking-tight text-app-text sm:text-[1.34rem]">
            Student Society
          </p>
          <p className="text-[13px] text-app-muted">Private campus access with a cleaner native flow</p>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-app-border/80 bg-app-secondary/85 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "signup", label: "Create account" },
            { key: "login", label: "Log in" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onPrimaryModeChange(tab.key as "login" | "signup")}
              className={`min-h-[52px] rounded-[16px] px-3 py-2 text-[11px] font-semibold leading-[1.1] transition sm:py-2.5 sm:text-[13px] ${
                primaryMode === tab.key
                  ? "bg-gradient-to-br from-[#4c71f0] to-[#315fe3] text-white shadow-[0_16px_30px_-18px_rgba(49,95,227,0.74)]"
                  : "text-app-muted hover:bg-app-card/80 hover:text-app-text"
              }`}
            >
              <span className="block whitespace-nowrap text-center">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!configured ? (
        <div className="mt-4 rounded-[22px] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before authentication can work.
        </div>
      ) : null}

      <div className="mt-5">
        <p className="font-display text-[1.6rem] font-bold tracking-tight text-app-text sm:text-[1.95rem]">
          {title}
        </p>
        <p className="mt-1 text-[14px] leading-6 text-app-muted">{subtitle}</p>
        {showRedirectNote ? (
          <p className="mt-2 rounded-2xl border border-brand/15 bg-brand/[0.08] px-3 py-2 text-xs text-app-muted">
            You will return to {redirectTarget} after login.
          </p>
        ) : null}
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="mt-5 space-y-3">
        {mode === "signup" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <InputRow icon={User}>
                <input
                  value={fullName}
                  onChange={(event) => onFullNameChange(event.target.value)}
                  className="w-full bg-transparent text-[15px] text-app-text outline-none placeholder:text-app-muted"
                  placeholder="Ariana Joseph"
                  autoComplete="name"
                  required
                />
              </InputRow>
            </Field>

            <Field label="Username">
              <InputRow icon={AtSign}>
                <input
                  value={username}
                  onChange={(event) => onUsernameChange(normalizeUsername(event.target.value))}
                  className="w-full bg-transparent text-[15px] text-app-text outline-none placeholder:text-app-muted"
                  placeholder="ariana_j"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  minLength={3}
                  maxLength={24}
                  required
                />
              </InputRow>
            </Field>

            <Field
              label="Referral code"
              hint="Optional. Enter a friend's code to link the signup reward."
            >
              <InputRow icon={Gift}>
                <input
                  value={referralCode}
                  onChange={(event) => onReferralCodeChange(event.target.value)}
                  className="w-full bg-transparent text-[15px] uppercase text-app-text outline-none placeholder:text-app-muted"
                  placeholder="AB12CD34"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={16}
                />
              </InputRow>
            </Field>
          </div>
        ) : null}

        <Field label="Email">
          <InputRow icon={Mail}>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="w-full bg-transparent text-[15px] text-app-text outline-none placeholder:text-app-muted"
              placeholder="student@example.com"
              autoComplete="email"
              required
            />
          </InputRow>
        </Field>

        {isVerificationMode ? (
          <Field label="6-digit code">
            <div className="flex h-[58px] items-center justify-center rounded-[22px] border border-brand/20 bg-brand/10 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <input
                type="text"
                value={otp}
                onChange={(event) => onOtpChange(event.target.value)}
                className="w-full bg-transparent text-center font-display text-[1.7rem] tracking-[0.42em] text-app-text outline-none placeholder:text-app-muted"
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
            </div>
          </Field>
        ) : null}

        {mode !== "forgot-password" && mode !== "verify-signup" ? (
          <div className={`grid gap-4 ${mode === "signup" || mode === "reset-password" ? "sm:grid-cols-2" : ""}`}>
            <Field label={mode === "reset-password" ? "New password" : "Password"}>
              <InputRow icon={Lock}>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  className="w-full bg-transparent text-[15px] text-app-text outline-none placeholder:text-app-muted"
                  placeholder="Minimum 6 characters"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                />
              </InputRow>
            </Field>

            {mode === "signup" || mode === "reset-password" ? (
              <Field label="Confirm password">
                <InputRow icon={ShieldCheck}>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => onConfirmPasswordChange(event.target.value)}
                    className="w-full bg-transparent text-[15px] text-app-text outline-none placeholder:text-app-muted"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </InputRow>
              </Field>
            ) : null}
          </div>
        ) : null}
        {mode === "signup" ? (
          <div className="flex items-start gap-3 rounded-[22px] border border-app-border bg-app-secondary/60 p-3.5 transition-all hover:bg-brand/5">
            <input
              id="tos-check"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => onAgreedToTermsChange(e.target.checked)}
              className="mt-1 h-5 w-5 cursor-pointer rounded border-app-border bg-app-card text-brand focus:ring-brand/20 focus:ring-offset-0"
              required
            />
            <label htmlFor="tos-check" className="cursor-pointer text-[13px] leading-relaxed text-app-muted">
              I agree to the{" "}
              <a href="/term-and-condition" target="_blank" rel="noopener noreferrer" className="font-bold text-brand hover:underline">
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-bold text-brand hover:underline">
                Privacy Policy
              </a>.
            </label>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy || !configured}
          className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[20px] bg-gradient-to-br from-[#4c71f0] to-[#315fe3] px-5 text-[15px] font-semibold text-white shadow-[0_18px_38px_-18px_rgba(49,95,227,0.82)] transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ActionIcon className="h-4 w-4" />
          {busy ? "Working..." : submitLabel}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-1">
        {mode === "login" ? (
          <button
            type="button"
            onClick={() => onModeChange("forgot-password")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-brand-dark"
          >
            <KeyRound className="h-4 w-4" />
            Forgot password
          </button>
        ) : mode === "forgot-password" ? (
          <button
            type="button"
            onClick={() => onModeChange("login")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>
        ) : mode === "verify-signup" ? (
          <button
            type="button"
            onClick={() => onModeChange("signup")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Edit signup
          </button>
        ) : mode === "reset-password" ? (
          <button
            type="button"
            onClick={() => onModeChange("forgot-password")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Use another email
          </button>
        ) : null}

        {isVerificationMode ? (
          <button
            type="button"
            onClick={() => void onResendCode()}
            disabled={busy || !configured}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Resend code
          </button>
        ) : null}
      </div>
    </section>
  );
}
