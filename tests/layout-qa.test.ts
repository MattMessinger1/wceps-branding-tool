import assert from "node:assert/strict";
import test from "node:test";
import { evaluateLayoutQa, resolveCompositionTemplate } from "@/lib/composition";
import { generateArtifact } from "@/lib/generation/generateArtifact";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";

function request(overrides: Partial<ArtifactRequest> = {}): ArtifactRequest {
  return {
    artifactType: "one-pager",
    brand: "CCNA",
    audience: "district EL leaders",
    keyMessage: "Get specific guidance to improve MLL instruction.",
    goal: "drive inquiry",
    topic: "instructional practice",
    cta: "Email Yvonne.Williams@wceps.org to discuss your district's CCNA next steps",
    format: "Letter portrait",
    toneModifier: "professional",
    notes: "",
    visualInstruction: "",
    logoVariant: "",
    colorTheme: "",
    contextAttachments: [],
    strictlySourceGrounded: true,
    generateVisual: true,
    ...overrides,
  };
}

test("CCNA one-pager with long email CTA avoids CTA collision and proof ladders", async () => {
  const artifact = await generateArtifact(request());

  assert.equal(artifact.compositionTemplate?.id, "magazine-one-pager");
  assert.equal(artifact.fittedCopy?.cta, "Email Yvonne");
  assert.ok(artifact.fittedCopy?.ctaDetail?.includes("Yvonne.Williams@wceps.org"));
  assert.equal(artifact.layoutQa?.issues.length, 0);
  assert.ok((artifact.layoutQa?.proofLineWidth ?? 0) >= 78);
  assert.ok((artifact.layoutQa?.metrics.maxProofLines ?? 99) <= 4);
  assert.equal(artifact.review.issues.some((issue) => issue.includes("Layout QA")), false);
});

test("layout QA fails cramped proof copy before approval/export", () => {
  const template = resolveCompositionTemplate("one-pager");
  const qa = evaluateLayoutQa({
    artifactType: "one-pager",
    template,
    request: request(),
    fittedCopy: {
      headline: "Get specific guidance to improve MLL instruction",
      deck: "Use action-based data to guide school improvement and professional development planning.",
      proofPoints: [
        "Use a structured needs assessment to identify strengths and growth areas across instruction, leadership planning, professional development, and multilingual learner support.",
        "Guide action planning through assessment and data analysis with shared reporting routines that become too narrow inside the current column.",
        "Give educators shared, actionable starting points for improving instruction and supporting all learners across multiple work sessions.",
      ],
      cta: "Email Yvonne.Williams@wceps.org to discuss your district's CCNA next steps",
      footer: "Internal review.",
    },
  });

  assert.equal(qa.status, "block");
  assert.ok(qa.issues.some((issue) => /Proof copy|CTA/.test(issue)));
  assert.ok(qa.exportReady < 90);
});

test("social square format ignores unused proof stack when scoring layout", async () => {
  const artifact = await generateArtifact({
    artifactType: "social-graphic",
    brand: "WebbAlign",
    audience: "curriculum teams",
    keyMessage: "Strengthen DOK alignment conversations.",
    cta: "Request a WebbAlign conversation",
    strictlySourceGrounded: true,
  });

  assert.equal(artifact.compositionTemplate?.id, "social-announcement");
  assert.equal(artifact.layoutQa?.artifactFormatMatch, 100);
  assert.equal(artifact.layoutQa?.issues.some((issue) => issue.includes("Proof copy")), false);
});
