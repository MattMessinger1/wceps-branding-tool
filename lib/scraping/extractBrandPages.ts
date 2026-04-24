import type { NormalizedPage } from "./normalizeContent";

export type EvidenceBlock = {
  id: string;
  brand: string;
  url: string;
  label: string;
  excerpt: string;
};

const brandMatchers = [
  { brand: "CARE Coaching", terms: ["care coaching", "ccna", "multilingual learner", "coaching"] },
  { brand: "WebbAlign", terms: ["webbalign", "dok", "depth of knowledge", "alignment"] },
  { brand: "CALL", terms: ["call", "leadership for learning", "school improvement", "leadership assessment"] },
  { brand: "WCEPS", terms: ["wceps", "pathways", "non-profit", "research-based"] },
];

export function extractEvidence(pages: NormalizedPage[]) {
  const blocks: EvidenceBlock[] = [];

  for (const page of pages) {
    const sentences = page.text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 60);
    for (const matcher of brandMatchers) {
      const relevant = sentences.filter((sentence) => {
        const lower = sentence.toLowerCase();
        return matcher.terms.some((term) => lower.includes(term));
      });

      relevant.slice(0, 8).forEach((sentence, index) => {
        blocks.push({
          id: `${matcher.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${blocks.length + 1}`,
          brand: matcher.brand,
          url: page.url,
          label: `${page.title || page.url} evidence ${index + 1}`,
          excerpt: sentence.slice(0, 520),
        });
      });
    }
  }

  return blocks;
}
