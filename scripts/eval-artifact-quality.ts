import { readFile } from "node:fs/promises";
import path from "node:path";
import { Eval } from "braintrust";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";

type BraintrustScore = {
  name: string;
  score: number | null;
  metadata?: Record<string, unknown>;
};

type Scenario = {
  input: Partial<ArtifactRequest>;
  expected: {
    brand: string;
    artifactType: string;
    templateId: string;
  };
  metadata: {
    scenario: string;
    risk: string;
  };
};

const scenarios: Scenario[] = [
  {
    input: {
      artifactType: "flyer",
      brand: "CARE Coaching",
      audience: "district EL leaders",
      keyMessage: "Every voice, every classroom, every learner.",
      cta: "Request a CARE Coaching conversation",
      strictlySourceGrounded: true,
    },
    expected: { brand: "CARE Coaching", artifactType: "flyer", templateId: "campaign-flyer" },
    metadata: { scenario: "CARE flyer for district EL leaders", risk: "brand boundary and flyer density" },
  },
  {
    input: {
      artifactType: "one-pager",
      brand: "CCNA",
      audience: "district EL leaders",
      keyMessage: "Get specific guidance to improve MLL instruction.",
      cta: "Email Yvonne.Williams@wceps.org to discuss your district's CCNA next steps",
      strictlySourceGrounded: true,
    },
    expected: { brand: "CCNA", artifactType: "one-pager", templateId: "magazine-one-pager" },
    metadata: { scenario: "CCNA one-pager with long CTA/email", risk: "CTA collision and proof ladders" },
  },
  {
    input: {
      artifactType: "social-graphic",
      brand: "WebbAlign",
      audience: "curriculum teams",
      keyMessage: "Strengthen DOK alignment conversations.",
      cta: "Request a WebbAlign conversation",
      strictlySourceGrounded: true,
    },
    expected: { brand: "WebbAlign", artifactType: "social-graphic", templateId: "social-announcement" },
    metadata: { scenario: "WebbAlign social square for curriculum teams", risk: "format mismatch" },
  },
  {
    input: {
      artifactType: "flyer",
      brand: "CALL",
      audience: "principals",
      keyMessage: "Plan leadership growth with school improvement teams.",
      cta: "Request a CALL demo",
      strictlySourceGrounded: true,
    },
    expected: { brand: "CALL", artifactType: "flyer", templateId: "campaign-flyer" },
    metadata: { scenario: "CALL flyer for principals", risk: "brand relevance" },
  },
  {
    input: {
      artifactType: "html-email-announcement",
      brand: "WIDA PRIME",
      audience: "publishers",
      keyMessage: "Plan your PRIME instructional materials correlation.",
      cta: "Start the PRIME process",
      strictlySourceGrounded: true,
    },
    expected: { brand: "WIDA PRIME", artifactType: "html-email-announcement", templateId: "email-hero" },
    metadata: { scenario: "WIDA PRIME email announcement for publishers", risk: "email format and PRIME guardrails" },
  },
  {
    input: {
      artifactType: "one-pager",
      brand: "WCEPS",
      audience: "education leaders",
      keyMessage: "Connect teams with customized education support.",
      cta: "Start a WCEPS conversation",
      strictlySourceGrounded: true,
    },
    expected: { brand: "WCEPS", artifactType: "one-pager", templateId: "magazine-one-pager" },
    metadata: { scenario: "WCEPS institutional one-pager", risk: "generic product drift" },
  },
];

function loadEnvLocal() {
  return readFile(path.join(process.cwd(), ".env.local"), "utf8")
    .then((contents) => {
      for (const line of contents.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
        process.env[key] ??= value;
      }
    })
    .catch(() => undefined);
}

function score(name: string, value: number | undefined, metadata?: Record<string, unknown>): BraintrustScore {
  return {
    name,
    score: Math.max(0, Math.min(1, Number.isFinite(value) ? value ?? 0 : 0)),
    metadata,
  };
}

function percent(value: number | undefined) {
  return typeof value === "number" ? value / 100 : 0;
}

function layoutMetadata(output: GeneratedArtifact) {
  return {
    layoutStatus: output.layoutQa?.status,
    layoutIssues: output.layoutQa?.issues ?? [],
    layoutWarnings: output.layoutQa?.warnings ?? [],
    reviewIssues: output.review.issues,
    reviewWarnings: output.review.warnings,
    templateId: output.compositionTemplate?.id,
  };
}

async function main() {
  const shouldSend = process.argv.includes("--braintrust");
  await loadEnvLocal();

  process.env.BRAINTRUST_PROJECT_NAME ||= "Brand Building";
  process.env.BRAINTRUST_ORG_NAME ||= "WCEPS";
  process.env.BRAINTRUST_LOGGING_ENABLED = shouldSend ? "true" : "false";

  if (shouldSend && !process.env.BRAINTRUST_API_KEY) {
    throw new Error("BRAINTRUST_API_KEY is required for npm run eval:braintrust.");
  }

  const { generateArtifact } = await import("@/lib/generation/generateArtifact");

  const result = await Eval<Partial<ArtifactRequest>, GeneratedArtifact, Scenario["expected"], Scenario["metadata"]>(
    process.env.BRAINTRUST_PROJECT_NAME,
    {
      experimentName: "Artifact QA Golden Scenarios",
      data: () => scenarios,
      task: async (input) => generateArtifact(input),
      scores: [
        ({ output }) => score("NoTextOverflow", percent(output.layoutQa?.noTextOverflow), layoutMetadata(output)),
        ({ output }) => score("NoCtaCollision", percent(output.layoutQa?.noCtaCollision), layoutMetadata(output)),
        ({ output }) => score("ProofLineWidth", percent(output.layoutQa?.proofLineWidth), layoutMetadata(output)),
        ({ output }) => score("BrandBoundary", percent(output.compositionScore?.brandBoundary), layoutMetadata(output)),
        ({ output }) => score("LogoOnce", percent(output.layoutQa?.logoOnce), layoutMetadata(output)),
        ({ input, output, expected }) =>
          score("ArtifactFormatMatch", percent(output.layoutQa?.artifactFormatMatch), {
            ...layoutMetadata(output),
            requested: input.artifactType,
            expectedTemplate: expected.templateId,
          }),
        ({ output }) =>
          score("ExportReady", output.layoutQa?.status === "block" || output.review.issues.length ? 0 : percent(output.layoutQa?.exportReady), layoutMetadata(output)),
        ({ output }) => {
          const layoutSendability = percent(output.layoutQa?.sendability);
          const compositionSendability = percent(output.compositionScore?.sendability);
          const blocked = output.layoutQa?.status === "block" || output.review.issues.length > 0;
          return score("Sendability", blocked ? Math.min(layoutSendability, compositionSendability, 0.6) : Math.min(layoutSendability, compositionSendability), layoutMetadata(output));
        },
      ],
      metadata: {
        promptVersion: "campaign-art-plate-v5",
        pipeline: "deterministic-composition-layout-qa",
      },
    },
    {
      noSendLogs: !shouldSend,
      returnResults: true,
    },
  );

  const scores = result.summary.scores ?? {};
  console.log(
    JSON.stringify(
      {
        mode: shouldSend ? "braintrust" : "local",
        project: process.env.BRAINTRUST_PROJECT_NAME,
        experiment: "Artifact QA Golden Scenarios",
        scores,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
