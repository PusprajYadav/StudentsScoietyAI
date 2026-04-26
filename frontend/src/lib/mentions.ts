import { normalizeUsername } from "./usernames";

export interface InteractiveTextToken {
  kind: "text" | "url" | "mention";
  text: string;
  href?: string;
  username?: string;
}

const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const usernameCharPattern = /^[a-z0-9_]$/i;

function isUsernameChar(character: string | undefined) {
  return Boolean(character && usernameCharPattern.test(character));
}

function tokenizePlainTextSegment(value: string): InteractiveTextToken[] {
  if (!value) {
    return [];
  }

  const tokens: InteractiveTextToken[] = [];
  let cursor = 0;
  let plainTextStart = 0;

  while (cursor < value.length) {
    if (value[cursor] !== "@") {
      cursor += 1;
      continue;
    }

    const previousCharacter = cursor > 0 ? value[cursor - 1] : undefined;
    if (isUsernameChar(previousCharacter)) {
      cursor += 1;
      continue;
    }

    let mentionEnd = cursor + 1;
    while (mentionEnd < value.length && isUsernameChar(value[mentionEnd])) {
      mentionEnd += 1;
    }

    const rawUsername = value.slice(cursor + 1, mentionEnd);
    const normalizedUsername = normalizeUsername(rawUsername);
    const nextCharacter = mentionEnd < value.length ? value[mentionEnd] : undefined;
    const isValidMention =
      rawUsername.length >= 3 &&
      rawUsername.length <= 24 &&
      normalizedUsername.length === rawUsername.length &&
      !isUsernameChar(nextCharacter);

    if (!isValidMention) {
      cursor += 1;
      continue;
    }

    if (cursor > plainTextStart) {
      tokens.push({
        kind: "text",
        text: value.slice(plainTextStart, cursor),
      });
    }

    tokens.push({
      kind: "mention",
      text: value.slice(cursor, mentionEnd),
      username: normalizedUsername,
    });

    cursor = mentionEnd;
    plainTextStart = mentionEnd;
  }

  if (plainTextStart < value.length) {
    tokens.push({
      kind: "text",
      text: value.slice(plainTextStart),
    });
  }

  return tokens;
}

export function tokenizeInteractiveText(value: string): InteractiveTextToken[] {
  if (!value) {
    return [];
  }

  const matches = Array.from(value.matchAll(urlPattern));
  if (matches.length === 0) {
    return tokenizePlainTextSegment(value);
  }

  const tokens: InteractiveTextToken[] = [];
  let cursor = 0;

  matches.forEach((match) => {
    const matchText = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > cursor) {
      tokens.push(...tokenizePlainTextSegment(value.slice(cursor, matchIndex)));
    }

    const href = /^https?:\/\//i.test(matchText) ? matchText : `https://${matchText}`;
    tokens.push({
      kind: "url",
      text: matchText,
      href,
    });

    cursor = matchIndex + matchText.length;
  });

  if (cursor < value.length) {
    tokens.push(...tokenizePlainTextSegment(value.slice(cursor)));
  }

  return tokens;
}

export function extractMentionUsernames(
  ...values: Array<string | null | undefined>
) {
  const usernames = new Set<string>();

  values.forEach((value) => {
    tokenizeInteractiveText(value || "").forEach((token) => {
      if (token.kind === "mention" && token.username) {
        usernames.add(token.username);
      }
    });
  });

  return Array.from(usernames);
}
