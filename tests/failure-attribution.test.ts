import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCopyQualityQa, evaluateRenderQa, evaluateVisualQa, fitCopy, resolveCompositionTemplate } from "@/lib/composition";
import { generateArtifact } from "@/lib/generation/generateArtifact";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { FittedCopy, GeneratedCopy } from "@/lib/schema/generatedArtifact";

const careRequest: ArtifactRequest = {
  artifactType: "flyer",
  brand: "CARE Coaching",
  audience: "district EL leaders",
  keyMessage: "Every voice, every classroom, every learner.",
  goal: "explain CARE Coaching and drive inquiry",
  topic: "customized coaching for multilingual learner support",
  cta: "Request a CARE Coaching conversation",
  format: "Letter portrait",
  toneModifier: "warm, practical",
  notes: "",
  visualInstruction: "",
  logoVariant: "",
  colorTheme: "",
  contextAttachments: [],
  strictlySourceGrounded: true,
  generateVisual: false,
};

const badCopy: GeneratedCopy = {
  headlineOptions: ["Every Voice, Every Classroom, Every Learner"],
  subheadOptions: ["Tailored professional learning helps educators reflect and take research-based action."],
  body: "CARE Coaching supports educators.",
  bullets: ["Support multilingual learner success alongside family engagement and standards-aligned teaching, learning."],
  cta: "Request a CARE Coaching conversation",
};

test("CARE flyer copy-fit avoids semantic drift, awkward truncation, and duplicate CTA detail", async () => {
  const artifact = await generateArtifact(careRequest);

  assert.equal(artifact.fittedCopy?.deck, "Support educators through Consulting, Coaching, and Continuous Learning.");
  assert.equal(artifact.fittedCopy?.cta, "Request a CARE Coaching conversation");
  assert.equal(artifact.fittedCopy?.ctaDetail, undefined);
  assert.equal(artifact.fittedCopy?.proofPoints.some((point) => /teaching,\s*learning\.$/i.test(point)), false);
  assert.equal(artifact.copyQualityQa?.status === "block", false);
  assert.equal(artifact.failureModes?.some((failure) => failure.id === "duplicate_cta_detail"), false);
});

test("copy quality QA attributes duplicate CTA detail and clipped phrases to fitCopy", () => {
  const fittedCopy: FittedCopy = {
    headline: "Every Voice, Every Classroom, Every Learner",
    deck: "Tailored professional learning helps educators reflect and take research-based action.",
    proofPoints: ["Support multilingual learner success alongside family engagement and standards-aligned teaching, learning."],
    cta: "Request a conversation",
    ctaDetail: "Request a CARE Coaching conversation",
  };
  const qa = evaluateCopyQualityQa({ copy: badCopy, fittedCopy, request: careRequest });

  assert.equal(qa.status, "block");
  assert.ok(qa.failureModes.some((failure) => failure.id === "duplicate_cta_detail" && failure.introducedAt === "fitCopy"));
  assert.ok(qa.failureModes.some((failure) => failure.id === "awkward_truncation" && failure.missedBy === "layoutQa"));
  assert.ok(qa.failureModes.some((failure) => failure.id === "semantic_drift"));
});

test("copy quality QA blocks internal scaffold language in visible copy", () => {
  const fittedCopy: FittedCopy = {
    headline: "Every Voice, Every Classroom, Every Learner",
    deck: "Support educators through Consulting, Coaching, and Continuous Learning.",
    proofPoints: ["Provide source-grounded CARE Coaching support."],
    cta: "Request a CARE Coaching conversation",
  };
  const qa = evaluateCopyQualityQa({ copy: badCopy, fittedCopy, request: careRequest });

  assert.equal(qa.status, "block");
  assert.ok(qa.failureModes.some((failure) => failure.id === "scaffolded_visible_copy" && failure.introducedAt === "fitCopy"));
});

test("copy-fit fallback proof lines are production copy for every active brand", () => {
  const template = resolveCompositionTemplate("flyer");
  const rawCopy: GeneratedCopy = {
    headlineOptions: ["Support education teams with focused planning"],
    subheadOptions: ["Use practical support to make the work clearer."],
    body: "Use practical support to make the work clearer.",
    bullets: [],
    cta: "Start a conversation",
  };
  const scaffoldPattern = /\b(source-grounded|source-backed|brand-safe|brand-specific guidance|clear next steps|useful artifact|production artifact)\b/i;

  for (const brand of ["CARE Coaching", "CCNA", "WebbAlign", "CALL", "WIDA PRIME", "WCEPS"]) {
    const fitted = fitCopy(rawCopy, { ...careRequest, brand }, template);
    assert.equal(fitted.proofPoints.length, 2, `${brand} should receive two flyer proof points`);
    assert.equal(fitted.proofPoints.some((point) => scaffoldPattern.test(point)), false, `${brand} should not expose scaffolded fallback copy`);
  }
});

test("visual QA distinguishes requested missing art from intentional fallback diagnostics", () => {
  const template = resolveCompositionTemplate("flyer");
  const requested = evaluateVisualQa({
    request: { ...careRequest, generateVisual: true },
    template,
    imageResults: [],
    imagePrompts: ["CARE Coaching for district EL leaders"],
  });
  const fallback = evaluateVisualQa({
    request: { ...careRequest, generateVisual: false },
    template,
    imageResults: [],
    imagePrompts: ["CARE Coaching for district EL leaders"],
  });

  assert.equal(requested.status, "block");
  assert.ok(requested.failureModes.some((failure) => failure.id === "missing_art_plate" && failure.introducedAt === "imageJob"));
  assert.equal(fallback.status, "warn");
  assert.ok(fallback.failureModes.some((failure) => failure.id === "fallback_art_used"));
});

test("render QA catches failures that line-count layout QA can miss", () => {
  const template = resolveCompositionTemplate("flyer");
  const fittedCopy: FittedCopy = {
    headline: "Every Voice, Every Classroom, Every Learner",
    deck: "Support educators through Consulting, Coaching, and Continuous Learning.",
    proofPoints: ["Support multilingual learner success alongside family engagement and standards-aligned teaching, learning."],
    cta: "Request a conversation",
    ctaDetail: "Request a CARE Coaching conversation",
  };
  const visualQa = evaluateVisualQa({
    request: careRequest,
    template,
    imageResults: [],
    imagePrompts: ["CARE Coaching for district EL leaders"],
    fallbackTone: "dark",
  });
  const renderQa = evaluateRenderQa({ fittedCopy, template, request: careRequest, visualQa });

  assert.equal(renderQa.status, "block");
  assert.ok(renderQa.failureModes.some((failure) => failure.id === "duplicate_cta_detail"));
  assert.ok(renderQa.failureModes.some((failure) => failure.id === "dark_edge_bleed"));
});

test("all active brands receive the shared failure attribution fields", async () => {
  for (const brand of ["CARE Coaching", "CCNA", "WebbAlign", "CALL", "WIDA PRIME", "WCEPS"]) {
    const artifact = await generateArtifact({
      ...careRequest,
      brand,
      topic: "brand-specific support",
      keyMessage: `${brand} support for education teams.`,
      cta: `Start a ${brand} conversation`,
    });

    assert.ok(artifact.copyQualityQa, `${brand} should include copyQualityQa`);
    assert.ok(artifact.visualQa, `${brand} should include visualQa`);
    assert.ok(artifact.renderQa, `${brand} should include renderQa`);
    assert.ok(artifact.modelQa, `${brand} should include modelQa`);
    assert.ok(Array.isArray(artifact.failureModes), `${brand} should include attributed failure modes`);
  }
});
