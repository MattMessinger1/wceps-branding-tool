import assert from "node:assert/strict";
import test from "node:test";
import { artifactTypeOptions } from "@/lib/artifacts/artifactOptions";
import { getStarterExample, starterExamples, validateStarterExamples } from "@/lib/examples/starterExamples";

test("starter registry contains the six confidence examples", () => {
  assert.equal(starterExamples.length, 6);
  assert.deepEqual(
    starterExamples.map((example) => example.id),
    [
      "care-flyer-el-leaders",
      "webbalign-social-curriculum",
      "call-flyer-principals",
      "ccna-executive-handout",
      "wida-prime-email-publishers",
      "wceps-institutional-one-pager",
    ],
  );
  assert.equal(validateStarterExamples(), true);
});

test("starter examples map to valid form defaults", () => {
  const artifactTypes = new Set(artifactTypeOptions.map((option) => option.value));

  for (const example of starterExamples) {
    assert.ok(example.brand.length > 0);
    assert.ok(artifactTypes.has(example.artifactType));
    assert.ok(example.audience.length > 0);
    assert.ok(example.keyMessage.length > 0);
    assert.ok(example.cta.length > 0);
  }
});

test("create query example ids resolve to the correct starter setup", () => {
  const example = getStarterExample("wida-prime-email-publishers");

  assert.ok(example);
  assert.equal(example.brand, "WIDA PRIME");
  assert.equal(example.artifactType, "html-email-announcement");
  assert.match(example.keyMessage, /PRIME process/i);
});
