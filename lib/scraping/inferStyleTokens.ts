import type { NormalizedPage } from "./normalizeContent";

export function inferStyleTokens(_pages: NormalizedPage[]) {
  return {
    source: "Inferred from WCEPS Pathways and linked program sites; replace with official brand kit when available.",
    colorTokens: [
      { name: "deepTeal", value: "#0a3f49", usage: "Primary headings and dark panels" },
      { name: "pathwayTeal", value: "#126c75", usage: "Primary actions and brand accents" },
      { name: "warmCoral", value: "#d45d4c", usage: "Secondary highlights and calls to action" },
      { name: "gold", value: "#e7b94c", usage: "Small emphasis, badges, and dividers" },
      { name: "sage", value: "#8fb79e", usage: "Supportive education-sector accents" },
      { name: "paper", value: "#f7f4ee", usage: "Warm background" },
    ],
    typographyMood: ["clear", "human", "professional", "approachable"],
    layoutKeywords: ["sectioned", "card-supported", "generous whitespace", "evidence-forward"],
    imageKeywords: ["educators collaborating", "bright learning spaces", "inclusive classrooms", "document review"],
    iconographyFeel: ["simple line icons", "service comparison icons", "navigation cues"],
  };
}
