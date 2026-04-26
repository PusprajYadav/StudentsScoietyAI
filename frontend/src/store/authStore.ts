import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { buildAvatarSeed, getSeededAvatarPath, isLegacyDefaultAvatarUrl } from "../lib/avatar";
import { enforceActionRateLimit } from "../lib/actionRateLimit";
import { unregisterCurrentPushDevice } from "../lib/pushDevices";
import { supabase } from "../lib/supabase";
import { isUsernameValid, normalizeUsername, validateUsername } from "../lib/usernames";
import type { ProfileRow } from "../types/database";

interface SignUpInput {
  email: string;
  password: string;
  username: string;
  fullName: string;
  referralCode?: string;
}

interface VerifyOtpInput {
  email: string;
  token: string;
}

interface VerifyPasswordResetOtpInput extends VerifyOtpInput {
  newPassword: string;
}

interface AuthStore {
  user: User | null;
  profile: ProfileRow | null;
  isAdmin: boolean;
  loading: boolean;
  hydrateSession: (session: Session | null) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ emailVerificationRequired: boolean }>;
  requestSignUpOtp: (input: SignUpInput) => Promise<{ emailVerificationRequired: boolean }>;
  verifySignUpOtp: (input: VerifyOtpInput) => Promise<void>;
  resendSignUpOtp: (email: string) => Promise<void>;
  requestPasswordResetOtp: (email: string) => Promise<void>;
  verifyPasswordResetOtp: (input: VerifyPasswordResetOtpInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileRow>) => Promise<ProfileRow>;
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
  );
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeOtpToken(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function normalizeReferralCode(value?: string) {
  return (value || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 16);
}

const SIGN_IN_RATE_LIMIT = {
  action: "auth:sign-in",
  actionLabel: "trying to sign in again",
  cooldownMs: 1500,
  windows: [{ maxAttempts: 8, windowMs: 5 * 60 * 1000 }],
} as const;
const SIGN_UP_RATE_LIMIT = {
  action: "auth:sign-up",
  actionLabel: "requesting another signup code",
  cooldownMs: 20 * 1000,
  windows: [
    { maxAttempts: 3, windowMs: 30 * 60 * 1000 },
    { maxAttempts: 6, windowMs: 24 * 60 * 60 * 1000 },
  ],
} as const;
const VERIFY_SIGN_UP_RATE_LIMIT = {
  action: "auth:verify-sign-up",
  actionLabel: "verifying another signup code",
  cooldownMs: 2 * 1000,
  windows: [{ maxAttempts: 10, windowMs: 10 * 60 * 1000 }],
} as const;
const RESEND_SIGN_UP_RATE_LIMIT = {
  action: "auth:resend-sign-up-otp",
  actionLabel: "sending another verification code",
  cooldownMs: 45 * 1000,
  windows: [
    { maxAttempts: 4, windowMs: 30 * 60 * 1000 },
    { maxAttempts: 8, windowMs: 24 * 60 * 60 * 1000 },
  ],
} as const;
const REQUEST_PASSWORD_RESET_RATE_LIMIT = {
  action: "auth:request-password-reset",
  actionLabel: "sending another password reset code",
  cooldownMs: 60 * 1000,
  windows: [
    { maxAttempts: 4, windowMs: 30 * 60 * 1000 },
    { maxAttempts: 8, windowMs: 24 * 60 * 60 * 1000 },
  ],
} as const;
const VERIFY_PASSWORD_RESET_RATE_LIMIT = {
  action: "auth:verify-password-reset",
  actionLabel: "verifying another password reset code",
  cooldownMs: 2 * 1000,
  windows: [{ maxAttempts: 10, windowMs: 10 * 60 * 1000 }],
} as const;
const SIGN_OUT_RATE_LIMIT = {
  action: "auth:sign-out",
  actionLabel: "signing out again",
  cooldownMs: 2 * 1000,
  windows: [{ maxAttempts: 8, windowMs: 60 * 1000 }],
} as const;

async function insertProfile(user: User, username: string) {
  const fullName = (user.user_metadata.full_name as string | undefined) || "";
  const seededAvatar = getSeededAvatarPath(
    buildAvatarSeed({ id: user.id, username, full_name: fullName })
  );

  const { data: createdProfile, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username,
      full_name: fullName,
      avatar_url: seededAvatar,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return createdProfile;
}

async function fetchOrCreateProfile(user: User) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    if (!existingProfile.avatar_url || isLegacyDefaultAvatarUrl(existingProfile.avatar_url)) {
      const seededAvatar = getSeededAvatarPath(buildAvatarSeed(existingProfile));
      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update({ avatar_url: seededAvatar })
        .eq("id", user.id)
        .select("*")
        .single();

      if (!error && updatedProfile) {
        return updatedProfile;
      }
    }

    return existingProfile;
  }

  const requestedUsername = normalizeUsername((user.user_metadata.username as string | undefined) || "");
  const fallbackUsername = `student_${user.id.slice(0, 8)}`;
  const safeUsername = isUsernameValid(requestedUsername) ? requestedUsername : fallbackUsername;

  try {
    return await insertProfile(user, safeUsername);
  } catch (error) {
    if (safeUsername !== fallbackUsername && isUniqueViolation(error)) {
      return insertProfile(user, fallbackUsername);
    }

    throw error;
  }
}

async function fetchIsAdmin(userId: string) {
  const { data } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  return Boolean(data && data.length > 0);
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  hydrateSession: async (session) => {
    const current = get();

    if (!session?.user) {
      set({ user: null, profile: null, isAdmin: false, loading: false });
      return;
    }

    if (current.user?.id === session.user.id && current.profile && !current.loading) {
      set({ user: session.user, loading: false });
      void fetchIsAdmin(session.user.id)
        .then((isAdmin) => {
          if (get().user?.id === session.user.id) {
            set({ isAdmin });
          }
        })
        .catch((error) => {
          console.error("Failed to refresh admin status", error);
        });
      return;
    }

    const shouldShowBlockingLoader =
      current.loading || current.user?.id !== session.user.id || !current.profile;

    if (shouldShowBlockingLoader) {
      set({ loading: true });
    }

    try {
      const [profile, isAdmin] = await Promise.all([
        fetchOrCreateProfile(session.user),
        fetchIsAdmin(session.user.id),
      ]);

      set({
        user: session.user,
        profile,
        isAdmin,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to hydrate session", error);
      set({
        user: session.user,
        profile: shouldShowBlockingLoader ? null : current.profile,
        isAdmin: shouldShowBlockingLoader ? false : current.isAdmin,
        loading: false,
      });
    }
  },
  signIn: async (email, password) => {
    const normalizedEmail = normalizeEmail(email);
    enforceActionRateLimit(SIGN_IN_RATE_LIMIT, normalizedEmail);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      throw error;
    }

    if (data.session) {
      await get().hydrateSession(data.session);
    } else {
      set({ loading: false });
    }
  },
  signUp: async ({ email, password, username, fullName }) => {
    return get().requestSignUpOtp({ email, password, username, fullName });
  },
  requestSignUpOtp: async ({ email, password, username, fullName, referralCode }) => {
    const validation = validateUsername(username);
    const normalizedEmail = normalizeEmail(email);
    const normalizedReferralCode = normalizeReferralCode(referralCode);

    if (!validation.valid) {
      throw new Error(validation.message || "Please choose a valid username.");
    }

    enforceActionRateLimit(SIGN_UP_RATE_LIMIT, normalizedEmail);

    const { data: usernameTaken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", validation.normalized)
      .maybeSingle();

    if (usernameTaken) {
      throw new Error("That username is already taken.");
    }

    if (normalizedReferralCode) {
      const { data: referrer, error: referralLookupError } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", normalizedReferralCode)
        .maybeSingle();

      if (referralLookupError) {
        throw referralLookupError;
      }

      if (!referrer) {
        throw new Error("That referral code is not valid.");
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          username: validation.normalized,
          full_name: fullName,
          referral_code: normalizedReferralCode || undefined,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      await get().hydrateSession(data.session);
      return { emailVerificationRequired: false };
    }

    set({ loading: false });
    return { emailVerificationRequired: true };
  },
  verifySignUpOtp: async ({ email, token }) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedToken = normalizeOtpToken(token);

    if (normalizedToken.length !== 6) {
      throw new Error("Enter the 6-digit verification code from your email.");
    }

    enforceActionRateLimit(VERIFY_SIGN_UP_RATE_LIMIT, normalizedEmail);

    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedToken,
      type: "signup",
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      await get().hydrateSession(data.session);
    } else {
      set({ loading: false });
    }
  },
  resendSignUpOtp: async (email) => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      throw new Error("Enter your email before requesting another code.");
    }

    enforceActionRateLimit(RESEND_SIGN_UP_RATE_LIMIT, normalizedEmail);

    const { error } = await supabase.auth.resend({
      email: normalizedEmail,
      type: "signup",
    });

    if (error) {
      throw error;
    }
  },
  requestPasswordResetOtp: async (email) => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      throw new Error("Enter your email address to receive a reset code.");
    }

    enforceActionRateLimit(REQUEST_PASSWORD_RESET_RATE_LIMIT, normalizedEmail);

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

    if (error) {
      throw error;
    }

    set({ loading: false });
  },
  verifyPasswordResetOtp: async ({ email, token, newPassword }) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedToken = normalizeOtpToken(token);

    if (normalizedToken.length !== 6) {
      throw new Error("Enter the 6-digit password reset code from your email.");
    }

    enforceActionRateLimit(VERIFY_PASSWORD_RESET_RATE_LIMIT, normalizedEmail);

    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedToken,
      type: "recovery",
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error("We could not verify the reset code. Please request a new one.");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    await get().hydrateSession(session || data.session);
  },
  signOut: async () => {
    enforceActionRateLimit(SIGN_OUT_RATE_LIMIT);

    await unregisterCurrentPushDevice().catch(() => undefined);

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }

    set({ user: null, profile: null, isAdmin: false, loading: false });
  },
  refreshProfile: async () => {
    const { user } = get();
    if (!user) {
      return;
    }

    const profile = await fetchOrCreateProfile(user);
    const isAdmin = await fetchIsAdmin(user.id);
    set({ profile, isAdmin });
  },
  updateProfile: async (updates) => {
    const { user, profile } = get();
    if (!user) {
      throw new Error("You need to be signed in to update your profile.");
    }

    const nextUpdates = { ...updates };

    if (typeof nextUpdates.username === "string") {
      const validation = validateUsername(nextUpdates.username);

      if (!validation.valid) {
        throw new Error(validation.message || "Please choose a valid username.");
      }

      if (validation.normalized !== profile?.username) {
        const { data: usernameTaken } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", validation.normalized)
          .neq("id", user.id)
          .maybeSingle();

        if (usernameTaken) {
          throw new Error("That username is already taken.");
        }
      }

      nextUpdates.username = validation.normalized;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(nextUpdates)
      .eq("id", user.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    set({ profile: data });
    return data;
  },
}));
