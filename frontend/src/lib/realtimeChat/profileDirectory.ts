import type { ProfileRow } from "../../types/database";
import { supabase } from "../supabase";
import type { RealtimePeerProfile, SearchableChatProfile } from "./types";

function sanitizeSearchTerm(value: string) {
  return value.trim().replace(/[%_,]/g, " ").slice(0, 40);
}

function sanitizeUsernameLookup(value: string) {
  return value.trim().replace(/^@+/, "").slice(0, 40);
}

export function profileToRealtimePeerProfile(profile: SearchableChatProfile | RealtimePeerProfile) {
  if ("fullName" in profile) {
    return profile;
  }

  return {
    id: profile.id,
    username: profile.username,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    isVerified: profile.is_verified,
    updatedAt: profile.updated_at,
  } satisfies RealtimePeerProfile;
}

export function currentProfileToRealtimePeer(profile: ProfileRow): RealtimePeerProfile {
  return {
    id: profile.id,
    username: profile.username,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    isVerified: profile.is_verified,
    updatedAt: profile.updated_at,
  };
}

export async function searchRealtimeChatProfiles(currentUserId: string, query: string) {
  const term = sanitizeSearchTerm(query);
  if (term.length < 2) {
    return [] as RealtimePeerProfile[];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, is_verified, updated_at")
    .neq("id", currentUserId)
    .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
    .limit(8);

  if (error) {
    throw error;
  }

  return (data || []).map((profile) => profileToRealtimePeerProfile(profile as SearchableChatProfile));
}

export async function findRealtimeChatProfileByUsername(currentUserId: string, username: string) {
  const normalizedUsername = sanitizeUsernameLookup(username);
  if (!normalizedUsername) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, is_verified, updated_at")
    .neq("id", currentUserId)
    .ilike("username", normalizedUsername)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? profileToRealtimePeerProfile(data as SearchableChatProfile) : null;
}
