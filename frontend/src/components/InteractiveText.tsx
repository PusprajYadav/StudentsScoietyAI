import { Link } from "react-router-dom";
import { tokenizeInteractiveText } from "../lib/mentions";

const defaultUrlClassName =
  "font-medium text-sky-600 underline decoration-sky-300 underline-offset-4 transition hover:text-sky-500 dark:text-sky-300 dark:decoration-sky-500/50";

const defaultMentionClassName =
  "font-semibold text-brand underline decoration-brand/30 underline-offset-4 transition hover:text-brand-dark dark:text-brand-light";

export function renderInteractiveText(
  value: string,
  options: {
    mentionClassName?: string;
    urlClassName?: string;
  } = {}
) {
  const tokens = tokenizeInteractiveText(value);

  if (tokens.length === 0) {
    return [value];
  }

  return tokens.map((token, index) => {
    if (token.kind === "url" && token.href) {
      return (
        <a
          key={`url-${index}-${token.href}`}
          href={token.href}
          target="_blank"
          rel="noreferrer"
          className={options.urlClassName || defaultUrlClassName}
        >
          {token.text}
        </a>
      );
    }

    if (token.kind === "mention" && token.username) {
      return (
        <Link
          key={`mention-${index}-${token.username}`}
          to={`/profile/${token.username}`}
          className={options.mentionClassName || defaultMentionClassName}
        >
          {token.text}
        </Link>
      );
    }

    return token.text;
  });
}
