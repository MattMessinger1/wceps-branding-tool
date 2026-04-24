import assert from "node:assert/strict";
import test from "node:test";
import { loadBrandPack } from "@/lib/brands/loadBrandPack";
import { validateClaims } from "@/lib/brands/validateClaims";
import type { GeneratedCopy } from "@/lib/schema/generatedArtifact";

test("blocks invented guarantee claims", async () => {
  const pack = await loadBrandPack("CARE Coaching");
  const copy: GeneratedCopy = {
    headlineOptions: ["Guaranteed test score gains with CARE Coaching"],
    subheadOptions: ["A certified solution for every district"],
    body: "This draft guarantees improvement and invents a promise.",
    bullets: ["Guaranteed outcomes"],
    cta: "Call us",
  };

  const review = validateClaims(pack, copy);
  assert.equal(review.status, "block");
  assert.ok(review.issues.some((issue) => issue.toLowerCase().includes("guarantee")));
});

test("passes conservative source-grounded copy", async () => {
  const pack = await loadBrandPack("WebbAlign");
  const copy: GeneratedCopy = {
    headlineOptions: ["Use DOK to strengthen alignment"],
    subheadOptions: ["Support coherent conversations about standards, curriculum, and assessment."],
    body: "WebbAlign helps teams use the lens of DOK to evaluate standards, learning objectives, assessments, curricula, and instructional materials.",
    bullets: ["Promotes effective and accurate use of Depth of Knowledge language."],
    cta: "Contact WebbAlign",
  };

  const review = validateClaims(pack, copy);
  assert.equal(review.status, "pass");
  assert.deepEqual(review.issues, []);
});

test("blocks WIDA PRIME endorsement and effectiveness claims", async () => {
  const pack = await loadBrandPack("WIDA PRIME");
  const copy: GeneratedCopy = {
    headlineOptions: ["WIDA endorses your instructional materials"],
    subheadOptions: ["PRIME proves curriculum effectiveness."],
    body: "The PRIME process guarantees effective curriculum and student outcomes.",
    bullets: ["WIDA endorsement for publishers"],
    cta: "Start PRIME",
  };

  const review = validateClaims(pack, copy);
  assert.equal(review.status, "block");
  assert.ok(review.issues.some((issue) => /endorse|effectiveness|outcomes/i.test(issue)));
});
