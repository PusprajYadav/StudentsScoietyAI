import { BookOpen, Mail, MessageSquare, Monitor, Moon, Sun, User, Users } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { PrimaryMobileNav } from "../components/PrimaryMobileNav";
import { AuthHighlights } from "../features/auth/AuthHighlights";
import { AuthPanel } from "../features/auth/AuthPanel";
import { useAuthFlow } from "../features/auth/useAuthFlow";
import { resolvePostAuthPath } from "../lib/authRedirect";
import { isSupabaseConfigured } from "../lib/supabase";
import { useThemeStore } from "../store/themeStore";
import type { ThemePreference } from "../types/database";

const authThemeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function AuthPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useThemeStore();
  const redirectTarget = useMemo(
    () => resolvePostAuthPath(searchParams.get("redirectTo")),
    [searchParams]
  );
  const authFlow = useAuthFlow({
    initialReferralCode: searchParams.get("ref") || searchParams.get("referral") || "",
  });
  const authTabs = [
    {
      label: "Discussion",
      mobileLabel: "Discuss",
      icon: MessageSquare,
      to: "/app/discussions/study",
      matchPrefixes: ["/app/discussions"],
    },
    {
      label: "Community",
      mobileLabel: "Community",
      icon: Users,
      to: "/app/communities",
      matchPrefixes: ["/app/communities"],
    },
    {
      label: "My Room",
      mobileLabel: "My Room",
      icon: BookOpen,
      to: "/app/tools?view=my-room",
      matchPrefixes: ["/app/tools", "/app/myroom"],
    },
    {
      label: "Emails",
      mobileLabel: "Emails",
      icon: Mail,
      to: "/app/emails",
      matchPrefixes: ["/app/emails"],
    },
    {
      label: "Profile",
      mobileLabel: "Profile",
      icon: User,
      to: "/auth",
      matchPrefixes: ["/auth", "/profile"],
    },
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-app px-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+6.2rem)] pt-[calc(env(safe-area-inset-top,0px)+0.4rem)] sm:px-5 sm:pb-6 sm:pt-[calc(env(safe-area-inset-top,0px)+0.65rem)] lg:px-8 lg:py-6 xl:px-10 2xl:px-14">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at top, rgb(var(--brand) / 0.18), transparent 34%), radial-gradient(circle at bottom, rgb(var(--app-card) / 0.78), transparent 52%), radial-gradient(circle at bottom right, rgb(var(--brand) / 0.12), transparent 34%)",
        }}
      />

      <div className="mx-auto flex max-w-[1440px] justify-end pb-2 sm:pb-3">
        <div className="inline-flex items-center gap-1 rounded-full border border-app-border/80 bg-app-card/90 p-1 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl">
          {authThemeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => void setTheme(option.value)}
              aria-pressed={theme === option.value}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold transition sm:text-xs ${
                theme === option.value
                  ? "bg-brand text-white shadow-[0_12px_28px_-18px_rgba(37,99,235,0.72)]"
                  : "text-app-muted hover:bg-app-secondary hover:text-app-text"
              }`}
            >
              <option.icon className="h-3.5 w-3.5" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid min-h-[calc(100dvh-env(safe-area-inset-top,0px)-1.25rem)] max-w-[1440px] items-start gap-4 py-1.5 sm:gap-5 sm:py-2.5 lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:items-center lg:gap-8 lg:py-0 xl:gap-12">
        <div className="hidden lg:block">
          <AuthHighlights />
        </div>

        <div className="mx-auto w-full max-w-none sm:max-w-[560px] lg:justify-self-end">
          <AuthPanel
            mode={authFlow.mode}
            busy={authFlow.busy}
            configured={isSupabaseConfigured}
            email={authFlow.email}
            password={authFlow.password}
            confirmPassword={authFlow.confirmPassword}
            username={authFlow.username}
            fullName={authFlow.fullName}
            referralCode={authFlow.referralCode}
            otp={authFlow.otp}
            redirectTarget={redirectTarget}
            onModeChange={authFlow.setMode}
            onPrimaryModeChange={authFlow.handlePrimaryModeChange}
            onEmailChange={authFlow.setEmail}
            onPasswordChange={authFlow.setPassword}
            onConfirmPasswordChange={authFlow.setConfirmPassword}
            onUsernameChange={authFlow.setUsername}
            onFullNameChange={authFlow.setFullName}
            onReferralCodeChange={authFlow.setReferralCode}
            onOtpChange={authFlow.setOtp}
            onResendCode={authFlow.handleResendCode}
            agreedToTerms={authFlow.agreedToTerms}
            onAgreedToTermsChange={authFlow.setAgreedToTerms}
            onSubmit={authFlow.handleSubmit}
          />
        </div>
      </div>

      <PrimaryMobileNav pathname={location.pathname} tabs={authTabs} />
    </div>
  );
}
