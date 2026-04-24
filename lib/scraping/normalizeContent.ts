export type NormalizedPage = {
  title: string;
  url: string;
  headings: string[];
  text: string;
  links: Array<{ href: string; label: string }>;
};

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, "\"")
    .replace(/&ndash;|&mdash;/g, "-");
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function normalizeContent(snapshot: { url: string; html: string }): NormalizedPage {
  const titleMatch = snapshot.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const headings = Array.from(snapshot.html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)).map((match) =>
    stripTags(match[1] ?? ""),
  );
  const links = Array.from(snapshot.html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => ({
      href: match[1] ?? "",
      label: stripTags(match[2] ?? ""),
    }))
    .filter((link) => link.href && link.label);

  return {
    title: titleMatch ? stripTags(titleMatch[1] ?? "") : headings[0] ?? snapshot.url,
    url: snapshot.url,
    headings,
    text: stripTags(snapshot.html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")),
    links,
  };
}
