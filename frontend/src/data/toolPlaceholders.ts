export type ToolPlaceholderVariant = "image" | "pdf";

export const plannedTools = [
  {
    title: "Image Tools",
    description: "Image editing and media tools.",
    status: "Ready",
    variant: "image" as ToolPlaceholderVariant,
    artClassName: "from-[#0f172a] via-[#1d4ed8] to-[#60a5fa]",
  },
  {
    title: "PDF Tools",
    description: "PDF actions and document tools.",
    status: "Ready",
    variant: "pdf" as ToolPlaceholderVariant,
    artClassName: "from-[#111827] via-[#14532d] to-[#22c55e]",
  },
] as const;
