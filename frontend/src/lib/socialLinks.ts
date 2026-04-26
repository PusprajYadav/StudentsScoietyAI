import {
  Globe,
  Instagram,
  Link2,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { SocialLinks } from "../types/database";

export const emptySocialLinks: SocialLinks = {
  instagram: null,
  linkedin: null,
  email: null,
  mobile_number: null,
  whatsapp: null,
  youtube: null,
  telegram: null,
  website: null,
  other_links: [],
};

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function ensureUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

export function coerceSocialLinks(raw: unknown): SocialLinks {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...emptySocialLinks };
  }

  const value = raw as Partial<SocialLinks> & { other_links?: unknown };
  const otherLinks = Array.isArray(value.other_links)
    ? value.other_links.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    instagram: cleanText(value.instagram),
    linkedin: cleanText(value.linkedin),
    email: cleanText(value.email),
    mobile_number: cleanText(value.mobile_number),
    whatsapp: cleanText(value.whatsapp),
    youtube: cleanText(value.youtube),
    telegram: cleanText(value.telegram),
    website: cleanText(value.website),
    other_links: otherLinks.map((entry) => entry.trim()).filter(Boolean).slice(0, 10),
  };
}

export function normalizeSocialLinksInput(input: Partial<SocialLinks>): SocialLinks {
  return coerceSocialLinks({
    ...emptySocialLinks,
    ...input,
  });
}

function resolveInstagram(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://instagram.com/${value.replace(/^@/, "")}`;
}

function resolveLinkedin(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://www.linkedin.com/in/${value.replace(/^@/, "")}`;
}

function resolveEmail(value: string) {
  if (/^mailto:/i.test(value)) {
    return value;
  }

  return `mailto:${value}`;
}

function resolveMobile(value: string) {
  if (/^tel:/i.test(value)) {
    return value;
  }

  const normalized = value.replace(/[^\d+]/g, "");
  return `tel:${normalized}`;
}

function resolveWhatsapp(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const normalized = value.replace(/[^\d]/g, "");
  return `https://wa.me/${normalized}`;
}

function resolveYoutube(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const cleaned = value.trim();
  if (cleaned.startsWith("@")) {
    return `https://www.youtube.com/${cleaned}`;
  }

  return `https://www.youtube.com/@${cleaned}`;
}

function resolveTelegram(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://t.me/${value.replace(/^@/, "")}`;
}

function resolveWebsite(value: string) {
  return ensureUrl(value);
}

export interface SocialLinkItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export function getSocialLinkItems(links: SocialLinks): SocialLinkItem[] {
  const entries: SocialLinkItem[] = [];

  if (links.instagram) {
    entries.push({
      key: "instagram",
      label: "Instagram",
      href: resolveInstagram(links.instagram),
      icon: Instagram,
    });
  }

  if (links.linkedin) {
    entries.push({
      key: "linkedin",
      label: "LinkedIn",
      href: resolveLinkedin(links.linkedin),
      icon: Linkedin,
    });
  }

  if (links.email) {
    entries.push({
      key: "email",
      label: "Email",
      href: resolveEmail(links.email),
      icon: Mail,
    });
  }

  if (links.mobile_number) {
    entries.push({
      key: "mobile_number",
      label: "Mobile",
      href: resolveMobile(links.mobile_number),
      icon: Phone,
    });
  }

  if (links.whatsapp) {
    entries.push({
      key: "whatsapp",
      label: "WhatsApp",
      href: resolveWhatsapp(links.whatsapp),
      icon: MessageCircle,
    });
  }

  if (links.youtube) {
    entries.push({
      key: "youtube",
      label: "YouTube",
      href: resolveYoutube(links.youtube),
      icon: Youtube,
    });
  }

  if (links.telegram) {
    entries.push({
      key: "telegram",
      label: "Telegram",
      href: resolveTelegram(links.telegram),
      icon: Send,
    });
  }

  if (links.website) {
    entries.push({
      key: "website",
      label: "Website",
      href: resolveWebsite(links.website),
      icon: Globe,
    });
  }

  links.other_links.forEach((link, index) => {
    entries.push({
      key: `other-${index}`,
      label: "Other link",
      href: ensureUrl(link),
      icon: Link2,
    });
  });

  return entries;
}
