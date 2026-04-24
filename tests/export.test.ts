import assert from "node:assert/strict";
import test from "node:test";
import { getBrandLogoPublicPathForArtifact, getBrandLogoVariants } from "@/lib/brands/brandAssets";
import { artifactExportBaseName, exportHtml, exportReactSection, isOfficialExportEnabled } from "@/lib/export";
import { generateArtifact } from "@/lib/generation/generateArtifact";

test("exports deterministic HTML and reusable React strings", async () => {
  const artifact = await generateArtifact({
    artifactType: "one-pager",
    brand: "WebbAlign",
    audience: "curriculum teams",
    goal: "explain DOK alignment support",
    topic: "DOK, coherence, standards, assessments, curricula, and instructional materials",
    cta: "Contact WebbAlign",
  });

  const html = exportHtml(artifact);
  const react = exportReactSection(artifact);

  assert.ok(html.includes("<!doctype html>"));
  assert.ok(html.includes("WebbAlign"));
  assert.ok(react.includes("export function WebbAlignArtifactSection"));
  assert.ok(react.includes("Contact WebbAlign"));
});

test("html export keeps app-owned copy when a generated visual exists", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "CCNA",
    audience: "district EL leaders",
    keyMessage: "Use action-based data to guide multilingual learner support.",
    cta: "Request a CCNA conversation",
  });
  const withVisual = {
    ...artifact,
    imageResults: [
      {
        prompt: "test",
        model: "gpt-image-2",
        size: "1024x1536",
        quality: "high",
        outputFormat: "webp",
        dataUrl: "data:image/webp;base64,AAAA",
      },
    ],
  };

  const html = exportHtml(withVisual);
  assert.ok(html.includes("Use action-based data"));
  assert.ok(html.includes("Request a CCNA conversation"));
  assert.ok(html.includes("hero-img"));
  assert.ok(html.includes("campaign-flyer"));
  assert.equal(html.includes('class="card"'), false);
  assert.equal(html.includes("Source-grounded support"), false);
  assert.equal(html.includes("Brand and claims check"), false);
});

test("html email exports table-based inline markup", async () => {
  const artifact = await generateArtifact({
    artifactType: "html-email-newsletter",
    brand: "WIDA PRIME",
    audience: "publisher teams",
    keyMessage: "Plan your PRIME instructional materials correlation.",
    cta: "Start the PRIME process",
  });

  const html = exportHtml(artifact);
  assert.ok(html.includes('<table role="presentation"'));
  assert.ok(html.includes("style="));
  assert.ok(html.includes("Plan your PRIME instructional materials correlation"));
  assert.ok(html.includes("Start the PRIME process"));
  assert.equal(html.includes("Brand and claims check"), false);
});

test("html email exports fitted copy without repeating raw body text", async () => {
  const artifact = await generateArtifact({
    artifactType: "html-email-announcement",
    brand: "WIDA PRIME",
    audience: "publishers",
    keyMessage: "Explore WIDA PRIME correlations and alignments.",
    cta: "Start the PRIME process",
  });
  const withRawBody = {
    ...artifact,
    copy: {
      ...artifact.copy,
      body: "RAW BODY SHOULD NOT APPEAR IN EMAIL EXPORT.",
    },
  };

  const html = exportHtml(withRawBody);
  assert.equal(html.includes("RAW BODY SHOULD NOT APPEAR"), false);
  assert.ok(html.includes(artifact.fittedCopy?.deck ?? ""));
});

test("exports honor selected logo variant", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "CARE Coaching",
    audience: "district EL leaders",
    keyMessage: "Every voice, every classroom, every learner.",
    cta: "Request a CARE Coaching conversation",
  });
  const selected = getBrandLogoVariants("CARE Coaching").find((variant) => variant.colorMode === "black");
  assert.ok(selected);
  const withLogoOverride = {
    ...artifact,
    request: {
      ...(artifact.request as object),
      logoVariant: selected.id,
    },
  };

  const logoPath = getBrandLogoPublicPathForArtifact("CARE Coaching", "flyer", selected.id);
  const html = exportHtml(withLogoOverride);
  const react = exportReactSection(withLogoOverride);

  assert.ok(html.includes(logoPath));
  assert.ok(react.includes(logoPath));
});

test("flyer export keeps comma-led campaign headline phrases together", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "CARE Coaching",
    audience: "district EL leaders",
    keyMessage: "Every voice, every classroom, every learner.",
    cta: "Request a CARE Coaching conversation",
  });

  const html = exportHtml(artifact);
  const react = exportReactSection(artifact);

  assert.ok(html.includes('<span class="headline-line">Every voice,</span>'));
  assert.ok(html.includes('<span class="headline-line">every classroom,</span>'));
  assert.ok(react.includes('<span className="block whitespace-nowrap">every classroom,</span>'));
  assert.ok(react.includes("max-w-[78%]"));
});

test("export filenames use fitted headlines instead of raw copy", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "WCEPS",
    audience: "education leaders",
    keyMessage: "Create a useful brand-safe artifact.",
    cta: "Start a conversation",
  });
  const withRawHeadline = {
    ...artifact,
    copy: {
      ...artifact.copy,
      headlineOptions: ["Raw internal instruction should not win"],
    },
  };

  assert.equal(artifactExportBaseName(withRawHeadline).includes("raw-internal-instruction"), false);
  assert.ok(artifactExportBaseName(withRawHeadline).includes("customized-support"));
});

test("official exports stay approval-gated", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "CARE Coaching",
    audience: "district EL leaders",
    keyMessage: "Every voice, every classroom, every learner.",
    cta: "Request a CARE Coaching conversation",
  });

  assert.equal(isOfficialExportEnabled(artifact), false);
  assert.equal(
    isOfficialExportEnabled({
      ...artifact,
      review: {
        ...artifact.review,
        approved: true,
        approvedAt: new Date().toISOString(),
      },
    }),
    true,
  );
});
