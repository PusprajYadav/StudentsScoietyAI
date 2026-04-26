import { z } from "zod";
import type { PortfolioTemplateKey } from "./types";

const portfolioTemplateKeySchema = z.enum(["minimal_hero", "bold_cards", "creative_timeline"]);

const portfolioThemeSchema = z.record(z.string(), z.unknown());

const portfolioSectionSchema = z.record(z.string(), z.unknown()).and(
  z.object({
    id: z.string(),
    type: z.string(),
    enabled: z.boolean().optional(),
  })
);

const portfolioDocumentSchema = z.object({
  version: z.number().optional(),
  profile: z
    .object({
      fullName: z.string().optional(),
      username: z.string().optional(),
      headline: z.string().optional(),
      avatarUrl: z.string().nullable().optional(),
    })
    .optional(),
  sections: z.array(portfolioSectionSchema).optional(),
}).catchall(z.unknown());

export const portfolioImportSchema = z.object({
  version: z.number().optional(),
  title: z.string().optional(),
  template_key: portfolioTemplateKeySchema.optional(),
  content: portfolioDocumentSchema.optional(),
  theme: portfolioThemeSchema.optional(),
});

export function parsePortfolioImportPayload(input: unknown): {
  title?: string;
  templateKey?: PortfolioTemplateKey;
  content?: Record<string, unknown>;
  theme?: Record<string, unknown>;
} {
  const parsed = portfolioImportSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid portfolio JSON format.");
  }

  const payload = parsed.data;
  return {
    title: payload.title,
    templateKey: payload.template_key,
    content: payload.content as Record<string, unknown> | undefined,
    theme: payload.theme as Record<string, unknown> | undefined,
  };
}
