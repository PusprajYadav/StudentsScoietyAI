export const DEFAULT_PROFILE_BIO =
  "I am part of Student Society, where we learn together, support each other, and grow from learning to earning.";

export function resolveProfileBio(bio?: string | null) {
  const trimmed = bio?.trim();
  return trimmed ? trimmed : DEFAULT_PROFILE_BIO;
}
