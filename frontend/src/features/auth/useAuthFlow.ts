import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { normalizeReferralCode } from "../../lib/coins";
import { validateUsername } from "../../lib/usernames";
import { useAuthStore } from "../../store/authStore";
import type { AuthMode } from "./AuthPanel";

function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function useAuthFlow(options?: {
  initialMode?: AuthMode;
  initialReferralCode?: string;
}) {
  const [
    signIn,
    requestSignUpOtp,
    verifySignUpOtp,
    resendSignUpOtp,
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
  ] = useAuthStore((state) => [
    state.signIn,
    state.requestSignUpOtp,
    state.verifySignUpOtp,
    state.resendSignUpOtp,
    state.requestPasswordResetOtp,
    state.verifyPasswordResetOtp,
  ]);

  const [mode, setMode] = useState<AuthMode>(options?.initialMode || "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState(() =>
    normalizeReferralCode(options?.initialReferralCode || "")
  );
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const resetOtpState = () => {
    setOtp("");
  };

  const handlePrimaryModeChange = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    resetOtpState();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      if (mode === "login") {
        await signIn(email, password);
        toast.success("Welcome back to Student Society.");
        return;
      }

      if (mode === "signup") {
        const validation = validateUsername(username);

        if (!validation.valid) {
          throw new Error(validation.message || "Please choose a valid username.");
        }

        if (password.length < 6) {
          throw new Error("Use a password with at least 6 characters.");
        }

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match yet.");
        }

        if (!agreedToTerms) {
          throw new Error("Please agree to the Terms and Conditions and Privacy Policy.");
        }

        const result = await requestSignUpOtp({
          email,
          password,
          username: validation.normalized,
          fullName,
          referralCode,
        });

        if (result.emailVerificationRequired) {
          setMode("verify-signup");
          setOtp("");
          toast.success("We sent a 6-digit verification code to your email.");
        } else {
          toast.success("Account created successfully.");
        }

        return;
      }

      if (mode === "verify-signup") {
        await verifySignUpOtp({ email, token: otp });
        toast.success("Email verified. Your account is ready.");
        return;
      }

      if (mode === "forgot-password") {
        await requestPasswordResetOtp(email);
        setMode("reset-password");
        setPassword("");
        setConfirmPassword("");
        setOtp("");
        toast.success("We sent a 6-digit password reset code to your email.");
        return;
      }

      if (password.length < 6) {
        throw new Error("Use a password with at least 6 characters.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match yet.");
      }

      await verifyPasswordResetOtp({
        email,
        token: otp,
        newPassword: password,
      });
      toast.success("Password updated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleResendCode = async () => {
    setBusy(true);

    try {
      if (mode === "verify-signup") {
        await resendSignUpOtp(email);
        toast.success("A new verification code has been sent.");
        return;
      }

      await requestPasswordResetOtp(email);
      toast.success("A new password reset code has been sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send another code.");
    } finally {
      setBusy(false);
    }
  };

  return {
    mode,
    busy,
    email,
    password,
    confirmPassword,
    username,
    fullName,
    referralCode,
    otp,
    agreedToTerms,
    setMode,
    setEmail,
    setPassword,
    setConfirmPassword,
    setUsername,
    setFullName,
    setReferralCode: (value: string) => setReferralCode(normalizeReferralCode(value)),
    setOtp: (value: string) => setOtp(normalizeOtp(value)),
    setAgreedToTerms,
    handlePrimaryModeChange,
    handleSubmit,
    handleResendCode,
  };
}
