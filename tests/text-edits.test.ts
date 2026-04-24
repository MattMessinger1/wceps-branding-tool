import assert from "node:assert/strict";
import test from "node:test";
import { exportHtml, exportReactSection } from "@/lib/export";
import { generateArtifact } from "@/lib/generation/generateArtifact";
import { applyTextOnlyEdits, getArtifactAudienceLabel, textEditStateFromArtifact } from "@/lib/review/textEdits";

test("text-only edits preserve visual, prompt, logo, and template state", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "CARE Coaching",
    audience: "district EL leaders",
    keyMessage: "Every voice, every classroom, every learner.",
    cta: "Request a CARE Coaching conversation",
    visualInstruction: "Warm educator coaching scene.",
  });
  const imageResults = [
    {
      prompt: "test prompt",
      model: "gpt-image-2",
      size: "1024x1536",
      quality: "auto",
      outputFormat: "webp",
      dataUrl: "data:image/webp;base64,AAAA",
    },
  ];
  const approved = {
    ...artifact,
    imageResults,
    request: {
      ...(artifact.request as object),
      logoVariant: "care-horizontal-black",
      visualInstruction: "Warm educator coaching scene.",
    },
    review: {
      ...artifact.review,
      approved: true,
      approvedAt: new Date().toISOString(),
    },
  };
  const edits = {
    ...textEditStateFromArtifact(approved),
    headline: "Go",
    deck: "Exact deck stays exactly as typed.",
    showAudienceLabel: false,
    audienceLabel: "",
    proofPoints: ["Mention coaching.", "Do not mention professional learning."],
    cta: "Email Yvonne",
  };

  const edited = applyTextOnlyEdits(approved, edits);

  assert.equal(edited.fittedCopy?.headline, "Go");
  assert.equal(edited.fittedCopy?.deck, "Exact deck stays exactly as typed.");
  assert.deepEqual(edited.fittedCopy?.proofPoints, ["Mention coaching.", "Do not mention professional learning."]);
  assert.equal(edited.fittedCopy?.cta, "Email Yvonne");
  assert.equal(getArtifactAudienceLabel(edited), "");
  assert.deepEqual(edited.imageResults, imageResults);
  assert.deepEqual(edited.imagePrompts, approved.imagePrompts);
  assert.deepEqual(edited.compositionTemplate, approved.compositionTemplate);
  assert.equal((edited.request as { logoVariant?: string }).logoVariant, "care-horizontal-black");
  assert.equal((edited.request as { visualInstruction?: string }).visualInstruction, "Warm educator coaching scene.");
  assert.equal(edited.review.approved, false);
});

test("exports use exact text-only edits and omit hidden audience labels", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "CARE Coaching",
    audience: "district EL leaders",
    keyMessage: "Every voice, every classroom, every learner.",
    cta: "Request a CARE Coaching conversation",
  });
  const edited = applyTextOnlyEdits(artifact, {
    ...textEditStateFromArtifact(artifact),
    headline: "A precise edited headline",
    deck: "A precise edited deck.",
    showAudienceLabel: false,
    audienceLabel: "",
    proofPoints: ["A precise first point.", "A precise second point."],
    cta: "Email Yvonne",
  });
  const html = exportHtml(edited);
  const react = exportReactSection(edited);

  assert.ok(html.includes("A precise edited headline"));
  assert.ok(html.includes("A precise edited deck."));
  assert.ok(html.includes("A precise first point."));
  assert.ok(html.includes("Email Yvonne"));
  assert.equal(html.includes("For district EL leaders"), false);
  assert.equal(react.includes("For district EL leaders"), false);
});
