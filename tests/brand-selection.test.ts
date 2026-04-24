import assert from "node:assert/strict";
import test from "node:test";
import { loadAllBrandPacks } from "@/lib/brands/loadBrandPack";
import { selectBrand } from "@/lib/brands/selectBrand";
import { ArtifactRequestSchema, type ArtifactRequest } from "@/lib/schema/artifactRequest";

async function resolveBrand(input: Partial<ArtifactRequest>) {
  const packs = await loadAllBrandPacks();
  const request = ArtifactRequestSchema.parse(input);
  return selectBrand(request, packs).selectedBrand.brandName;
}

test("selects CARE Coaching for coaching and multilingual learner requests", async () => {
  const brand = await resolveBrand({
    brand: "",
    artifactType: "flyer",
    audience: "district EL leaders",
    goal: "support multilingual learner professional learning",
    topic: "district coaching and customized workshops",
  });

  assert.equal(brand, "CARE Coaching");
});

test("selects WebbAlign for DOK and alignment requests", async () => {
  const brand = await resolveBrand({
    brand: "",
    artifactType: "one-pager",
    audience: "curriculum teams",
    goal: "review assessment coherence",
    topic: "DOK alignment across standards, curriculum, and instructional materials",
  });

  assert.equal(brand, "WebbAlign");
});

test("selects CALL for leadership growth and school improvement requests", async () => {
  const brand = await resolveBrand({
    brand: "",
    artifactType: "landing-page",
    audience: "principals",
    goal: "leadership development and professional growth",
    topic: "school improvement planning with leadership feedback",
  });

  assert.equal(brand, "CALL");
});

test("selects CCNA explicitly and for needs-assessment requests", async () => {
  assert.equal(
    await resolveBrand({
      brand: "CCNA",
      artifactType: "one-pager",
      audience: "district EL leaders",
      goal: "share action-based data with leadership teams",
      topic: "Care Coaching Needs Assessment",
    }),
    "CCNA",
  );

  assert.equal(
    await resolveBrand({
      brand: "",
      artifactType: "flyer",
      audience: "instructional leaders",
      goal: "use actionable reporting for school improvement planning",
      topic: "CCNA sample report and instructional practice focus",
    }),
    "CCNA",
  );
});

test("selects WIDA PRIME explicitly and for instructional materials requests", async () => {
  assert.equal(
    await resolveBrand({
      brand: "WIDA PRIME",
      artifactType: "html-email-announcement",
      audience: "publishers and correlators",
      goal: "explain the PRIME process",
      topic: "PRIME 2020 instructional materials correlations",
    }),
    "WIDA PRIME",
  );

  assert.equal(
    await resolveBrand({
      brand: "",
      artifactType: "one-pager",
      audience: "publisher teams",
      goal: "explain Spanish Language Development correlations",
      topic: "WIDA PRIME V2 Español instructional materials",
    }),
    "WIDA PRIME",
  );
});
