import type { NormalizedPage } from "./normalizeContent";

export function extractLearningLibraryAssets(pages: NormalizedPage[]) {
  const libraryPages = pages.filter((page) => page.url.includes("learning-library") || /learning library/i.test(page.text));

  return libraryPages.flatMap((page) =>
    page.links
      .filter((link) => /pdf|video|blog|article|flyer|learn more|download/i.test(`${link.label} ${link.href}`))
      .map((link) => ({
        title: link.label,
        url: link.href.startsWith("http") ? link.href : new URL(link.href, page.url).toString(),
        sourcePage: page.url,
      })),
  );
}
