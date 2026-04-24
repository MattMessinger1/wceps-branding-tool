export const crawlTargets = [
  "https://www.wcepspathways.org/",
  "https://www.wcepspathways.org/products-services/",
  "https://www.wcepspathways.org/service-offerings/care-coaching/",
  "https://www.wcepspathways.org/service-offerings/care-coaching-needs-assessment-ccna/",
  "https://www.wcepspathways.org/service-offerings/care-coaching-team/",
  "https://www.wcepspathways.org/learning-library/",
  "https://www.wcepspathways.org/about-us/",
  "https://www.wcepspathways.org/contact-us/",
  "https://www.webbalign.org/",
  "https://www.webbalign.org/services/districts-educators",
  "https://www.webbalign.org/about/dok-explained",
  "https://www.leadershipforlearning.org/",
  "https://www.leadershipforlearning.org/what-we-do",
  "https://www.leadershipforlearning.org/learn-more",
] as const;

export async function crawlSite(targets: readonly string[] = crawlTargets) {
  const snapshots = [];

  for (const url of targets) {
    const response = await fetch(url, {
      headers: {
        "user-agent": "WCEPS Branding Tool source-grounded MVP",
      },
    });

    snapshots.push({
      url,
      status: response.status,
      fetchedAt: new Date().toISOString(),
      html: await response.text(),
    });
  }

  return snapshots;
}
