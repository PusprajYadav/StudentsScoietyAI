export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
export const USERNAME_HINT =
  "Use 3-24 characters with lowercase letters, numbers, and underscores only.";

export function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
}

export function isUsernameValid(value: string) {
  return USERNAME_PATTERN.test(value);
}

export function validateUsername(value: string) {
  const normalized = normalizeUsername(value.trim());

  if (!normalized) {
    return {
      normalized,
      valid: false,
      message: "Enter a username to continue.",
    };
  }

  if (!isUsernameValid(normalized)) {
    return {
      normalized,
      valid: false,
      message: USERNAME_HINT,
    };
  }

  return {
    normalized,
    valid: true,
    message: null,
  };
}
