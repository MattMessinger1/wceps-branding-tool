import assert from "node:assert/strict";
import test from "node:test";
import { artifactTypeOptions } from "@/lib/artifacts/artifactOptions";
import {
  getBrandLogoForArtifact,
  getBrandLogoPublicPathForArtifact,
  getBrandLogoVariants,
  LOGO_SOURCE_FOLDERS,
  selectOptimalBrandLogo,
} from "@/lib/brands/brandAssets";
import { getAllBrandBoundaryRules, getBrandBoundaryRule } from "@/lib/brands/brandBoundary";
import { getAllBrandVisualProfiles, getBrandVisualProfile } from "@/lib/brands/brandVisualProfiles";
import { fitCopy, resolveCompositionTemplate, scoreComposition } from "@/lib/composition";
import { resolveArtifactFormat } from "@/lib/generation/artifactFormat";
import { critiqueLayoutContract } from "@/lib/generation/critiqueArtifact";
import { generateArtifact } from "@/lib/generation/generateArtifact";

test("logo source folders are configured", () => {
  assert.deepEqual(
    LOGO_SOURCE_FOLDERS.map((folder) => folder.folderId),
    ["1SgL4c_ACulFF4D5Rn9q5DR3KmIn8c8nr", "1Cl_mXicY_w6yOlp1iOL60WyN8B4LBXl7", "1ot2hL4NELhEQZYb5E47GBNOlfN5jUJtD"],
  );
});

test("each active brand has logo variants", () => {
  for (const brand of ["CARE Coaching", "CCNA", "WebbAlign", "CALL", "WIDA PRIME", "WCEPS"]) {
    const variants = getBrandLogoVariants(brand);
    assert.ok(variants.length >= 1, `${brand} should have at least one logo variant`);
    assert.ok(variants.every((variant) => variant.label.includes("·")));
  }
});

test("each active brand has a visual intelligence profile", () => {
  const profiles = getAllBrandVisualProfiles();
  const brands = ["CARE Coaching", "CCNA", "WebbAlign", "CALL", "WIDA PRIME", "WCEPS"];

  for (const brand of brands) {
    const profile = getBrandVisualProfile(brand);
    assert.equal(profile.brandName, brand);
    assert.ok(profile.preferredSubjects.length >= 4, `${brand} should have concrete preferred subjects`);
    assert.ok(profile.contextProps.length >= 4, `${brand} should have context props`);
    assert.ok(profile.avoidSubjects.length >= 4, `${brand} should have visual avoid rules`);
    assert.ok(profile.appOwnedBrandElements.some((item) => /logo|seal|headline|CTA/i.test(item)));
  }

  assert.equal(profiles.length >= brands.length, true);
});

test("each active brand has a boundary rule", () => {
  const rules = getAllBrandBoundaryRules();
  const brands = ["CARE Coaching", "CCNA", "WebbAlign", "CALL", "WIDA PRIME", "WCEPS"];

  for (const brand of brands) {
    const rule = getBrandBoundaryRule(brand);
    assert.equal(rule.brandName, brand);
    assert.ok(rule.preferredTerms.length >= 5, `${brand} should have preferred boundary terms`);
    assert.ok(rule.blockedTerms.length >= 5, `${brand} should have sibling-brand blocked terms`);
  }

  assert.equal(rules.length >= brands.length, true);
});

test("optimal logo selection prefers transparent full-color horizontal logos on light backgrounds", () => {
  const logo = selectOptimalBrandLogo({ brandName: "CARE Coaching", background: "light", placement: "header" });
  assert.equal(logo?.lockup, "horizontal");
  assert.equal(logo?.colorMode, "full-color");
  assert.equal(logo?.hasTransparentBackground, true);
  assert.ok(logo?.publicPath.includes("/brand-logos/care-coaching/"));
});

test("dark and image backgrounds prefer white or high-contrast variants", () => {
  const logo = selectOptimalBrandLogo({ brandName: "CARE Coaching", background: "dark", placement: "hero" });
  assert.equal(logo?.colorMode, "white");
  assert.ok(logo?.backgroundSuitability.includes("dark"));
});

test("reviewer-selected logo variant overrides automatic logo selection", () => {
  const variant = getBrandLogoVariants("CARE Coaching").find((logo) => logo.colorMode === "black");
  assert.ok(variant);
  const selected = getBrandLogoForArtifact("CARE Coaching", "flyer", variant.id);
  assert.equal(selected?.id, variant.id);
});

test("missing brand falls back to WCEPS parent logo", () => {
  const logo = getBrandLogoForArtifact("Unknown Brand", "flyer");
  assert.equal(logo?.brandName, "WCEPS");
});

test("social square can use compact logo-safe placement", () => {
  const logo = getBrandLogoForArtifact("CARE Coaching", "social-graphic");
  assert.ok(["stacked", "vertical", "horizontal", "icon", "wordmark"].includes(logo?.lockup ?? ""));
  assert.ok(getBrandLogoPublicPathForArtifact("CARE Coaching", "social-graphic"));
});

test("generates a complete creative brief and artifact copy", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "CARE Coaching",
    audience: "district EL leaders",
    goal: "explain offering and drive inquiry",
    topic: "customized coaching and professional learning",
    cta: "Request a CARE Coaching conversation",
    strictlySourceGrounded: true,
  });

  assert.equal(artifact.brand, "CARE Coaching");
  assert.equal(artifact.artifactType, "flyer");
  assert.ok(artifact.brief.keyMessages.length >= 2);
  assert.ok(artifact.copy.headlineOptions.length >= 2);
  assert.ok(artifact.layoutContract);
  assert.ok(artifact.pipelineTrace);
  assert.ok(artifact.critique);
  assert.ok(artifact.fittedCopy);
  assert.ok(artifact.compositionTemplate);
  assert.ok(artifact.compositionScore);
  assert.equal(artifact.artPlatePromptVersion, "campaign-art-plate-v5");
  assert.ok(artifact.imagePrompts.every((prompt) => prompt.includes("CONTRACT=campaign-art-plate-v5")));
  assert.ok(artifact.imagePrompts.every((prompt) => prompt.includes("MODE=campaign-art-plate")));
  assert.equal(artifact.review.issues.length, 0);
});

test("preserves required CTA fields", async () => {
  const artifact = await generateArtifact({
    artifactType: "landing-page",
    brand: "CALL",
    audience: "principals",
    goal: "introduce CALL",
    topic: "leadership for learning",
    cta: "Request a CALL demo",
  });

  assert.equal(artifact.copy.cta, "Request a CALL demo");
  assert.equal(artifact.brief.cta, "Request a CALL demo");
});

test("infers a MECE output format from artifact type", () => {
  assert.equal(resolveArtifactFormat("social-graphic"), "Social square 1:1");
  assert.equal(resolveArtifactFormat("landing-page"), "Web page landscape");
  assert.equal(resolveArtifactFormat("one-pager"), "Letter portrait");
  assert.equal(resolveArtifactFormat("html-email-announcement"), "HTML email announcement");
});

test("artifact dropdown contains every supported production type", () => {
  assert.deepEqual(
    artifactTypeOptions.map((option) => option.value),
    [
      "flyer",
      "one-pager",
      "social-graphic",
      "landing-page",
      "conference-handout",
      "proposal-cover",
      "email-header",
      "html-email-announcement",
      "html-email-newsletter",
      "html-email-event-invite",
    ],
  );
});

test("builds social square prompts without brochure leakage", async () => {
  const artifact = await generateArtifact({
    artifactType: "social-graphic",
    brand: "CARE Coaching",
    audience: "district EL leaders",
    goal: "drive inquiry",
    topic: "customized coaching",
    cta: "Request a conversation",
  });

  const prompt = artifact.imagePrompts[0];
  assert.ok(prompt.includes("out:social-graphic"));
  assert.ok(prompt.includes("1:1 square social campaign tile"));
  assert.ok(prompt.includes("never brochure/flyer/one-pager/handout/webpage/contact card"));
  assert.equal(prompt.includes("brochure page"), false);
  assert.ok((artifact.pipelineTrace?.promptLength ?? 0) <= (artifact.pipelineTrace?.promptTokenBudget ?? 0));
});

test("image prompts include all create form inputs that affect generation", async () => {
  const artifact = await generateArtifact({
    artifactType: "social-graphic",
    brand: "WebbAlign",
    audience: "curriculum teams",
    goal: "invite teams to request an alignment conversation",
    topic: "DOK alignment audit",
    cta: "Request a WebbAlign conversation",
    toneModifier: "clear, expert, practical",
    notes: "Use a restrained visual system with no classroom stock-photo feel.",
    strictlySourceGrounded: true,
    generateVisual: true,
  });

  const prompt = artifact.imagePrompts[0];
  assert.ok(prompt.includes("out:social-graphic"));
  assert.ok(prompt.includes("WebbAlign"));
  assert.ok(prompt.includes("aud:curriculum teams"));
  assert.ok(prompt.includes("theme:["));
  assert.ok(prompt.includes("alignment"));
  assert.ok(prompt.includes("audit"));
  assert.ok(prompt.includes("MESSAGE_CUES=["));
  assert.ok(prompt.includes("cta_intent:request/webbalign/conversation"));
  assert.ok(prompt.includes("tone:clear, expert, practical"));
  assert.ok(prompt.includes("USER_NOTE=Use a restrained visual system with no classroom stock-photo feel."));
  assert.ok(prompt.includes("ground:strict"));
});

test("larger artifact prompts use studio quality and app-owned official logos", async () => {
  const artifact = await generateArtifact({
    artifactType: "one-pager",
    brand: "WebbAlign",
    audience: "curriculum teams",
    goal: "invite teams to request an alignment conversation",
    topic: "DOK alignment audit",
    cta: "Request a WebbAlign conversation",
  });

  const prompt = artifact.imagePrompts[0];
  assert.ok(prompt.includes("NY media/ad-agency quality"));
  assert.ok(prompt.includes("app renders official logo once"));
  assert.ok(prompt.includes("do not render any WebbAlign logo"));
  assert.ok(prompt.includes("TEXT_RULE=absolutely no readable text"));
  assert.ok(prompt.includes("MARKS_RULE=official logos, seals, badges"));
  assert.ok(prompt.includes("BRAND_VISUAL_PROFILE={"));
  assert.equal(prompt.includes("/brand-logos/webbalign.png"), false);
  assert.equal(prompt.includes("sourceUrl"), false);
  assert.equal(artifact.pipelineTrace?.logoAsset?.publicPath, "/brand-logos/webbalign/webbalign.png");
  assert.ok(artifact.layoutContract?.appOwnedElements.some((item) => item.includes("Official WebbAlign logo")));
});

test("WIDA PRIME prompts require K-12 instructional materials and forbid random books", async () => {
  const artifact = await generateArtifact({
    artifactType: "one-pager",
    brand: "WIDA PRIME",
    audience: "publisher teams",
    keyMessage: "Clarify the PRIME process for instructional materials.",
    cta: "Discuss the PRIME process",
  });

  const prompt = artifact.imagePrompts[0];
  assert.ok(prompt.includes("K-12 content-area instructional materials"));
  assert.ok(prompt.includes("teacher editions and student workbooks"));
  assert.ok(prompt.includes("curriculum binders and grade-band packets"));
  assert.ok(prompt.includes("random novels"));
  assert.ok(prompt.includes("trade books"));
  assert.ok(prompt.includes("library stacks"));
  assert.ok(prompt.includes("fake book titles"));
  assert.ok(prompt.includes("fake publisher brands"));
  assert.ok(prompt.includes("fake PRIME seals"));
  assert.ok(prompt.includes("MARKS_RULE=official logos, seals, badges"));
  assert.ok((artifact.compositionScore?.brandRelevance ?? 0) >= 88);
});

test("brand prompts include product-specific visual cues across all brands", async () => {
  const cases = [
    {
      brand: "CARE Coaching",
      artifactType: "flyer",
      keyMessage: "Support multilingual learner success through coaching.",
      expected: ["coaching conversation between educators", "professional learning facilitation"],
    },
    {
      brand: "CCNA",
      artifactType: "conference-handout",
      keyMessage: "Use action-based data for instructional planning.",
      expected: ["school team data debrief", "instructional practice review"],
    },
    {
      brand: "WebbAlign",
      artifactType: "social-graphic",
      keyMessage: "Strengthen DOK alignment conversations.",
      expected: ["curriculum team reviewing standards", "DOK calibration workshop table"],
    },
    {
      brand: "CALL",
      artifactType: "flyer",
      keyMessage: "Plan leadership growth with school improvement teams.",
      expected: ["principal and leadership team planning", "school improvement conversation"],
    },
    {
      brand: "WCEPS",
      artifactType: "one-pager",
      keyMessage: "Connect teams with customized education support.",
      expected: ["research-informed professional learning", "inclusive school and district collaboration"],
    },
  ] as const;

  for (const item of cases) {
    const artifact = await generateArtifact({
      artifactType: item.artifactType,
      brand: item.brand,
      audience: "education leaders",
      keyMessage: item.keyMessage,
      cta: "Start a conversation",
    });
    const prompt = artifact.imagePrompts[0];
    for (const expected of item.expected) {
      assert.ok(prompt.includes(expected), `${item.brand} prompt should include "${expected}"`);
    }
    assert.ok((artifact.compositionScore?.brandRelevance ?? 0) >= 88, `${item.brand} should score brand relevance`);
  }
});

test("flyer generation enforces brand boundaries and two subpoints for every active brand", async () => {
  const cases = [
    {
      brand: "CARE Coaching",
      keyMessage: "Support educator reflection through coaching.",
      include: /coaching|professional learning|continuous learning/i,
      exclude: /CCNA|Needs Assessment|action-based data|actionable reporting/i,
    },
    {
      brand: "CCNA",
      keyMessage: "Use action-based data for instructional planning.",
      include: /CCNA|action-based data|instructional practice|actionable reporting/i,
      exclude: /Three Cs|Consulting, Coaching, and Continuous Learning|educator-friendly scheduling/i,
    },
    {
      brand: "WebbAlign",
      keyMessage: "Strengthen DOK alignment across curriculum teams.",
      include: /DOK|alignment|standards|assessment|curricul/i,
      exclude: /CARE Coaching|CCNA|CALL|WIDA PRIME|leadership for learning|action-based data/i,
    },
    {
      brand: "CALL",
      keyMessage: "Support leadership growth and school improvement planning.",
      include: /leadership|feedback|school improvement|professional growth/i,
      exclude: /WebbAlign|DOK|CCNA|WIDA PRIME|PRIME process|action-based data/i,
    },
    {
      brand: "WIDA PRIME",
      keyMessage: "Clarify the PRIME process for instructional materials.",
      include: /PRIME|instructional materials|publisher|correlator|alignment/i,
      exclude: /WIDA Workshops|workshops and webinars|sole source provider|CARE Coaching|CCNA|CALL|WebbAlign|DOK/i,
    },
    {
      brand: "WCEPS",
      keyMessage: "Connect education teams with customized support.",
      include: /WCEPS|customized|schools|districts|educators|research/i,
      exclude: /CARE Coaching|CCNA|WebbAlign|CALL|WIDA PRIME|DOK|PRIME process|action-based data/i,
    },
  ] as const;

  for (const item of cases) {
    const artifact = await generateArtifact({
      artifactType: "flyer",
      brand: item.brand,
      audience: "education leaders",
      keyMessage: item.keyMessage,
      cta: "Start a conversation",
      strictlySourceGrounded: true,
    });
    const fitted = artifact.fittedCopy;
    assert.ok(fitted, `${item.brand} should have fitted copy`);
    assert.equal(fitted.proofPoints.length, 2, `${item.brand} flyer should have exactly two subpoints`);

    const copyText = [fitted.headline, fitted.deck, ...fitted.proofPoints, fitted.cta].join(" ");
    assert.match(copyText, item.include, `${item.brand} should preserve its own proof language`);
    assert.doesNotMatch(copyText, item.exclude, `${item.brand} should not leak sibling-brand language`);
    assert.equal(artifact.compositionScore?.brandBoundary, 100, `${item.brand} should score clean brand boundary`);
    assert.equal(artifact.review.issues.some((issue) => issue.includes("sibling-brand")), false);
  }
});

test("flyer subpoints are polished complete lines for every active brand", async () => {
  const weakStarts =
    /^(educators through|multilingual learner success|instructional practice focus|actionable reporting|professional growth|school improvement planning|information about|reviewed prime|users understand how|the program helps|a wceps program that|pathways programs help|wceps tailors|unique tools and customized services)\b/i;
  const brands = ["CARE Coaching", "CCNA", "WebbAlign", "CALL", "WIDA PRIME", "WCEPS"];

  for (const brand of brands) {
    const artifact = await generateArtifact({
      artifactType: "flyer",
      brand,
      audience: "education leaders",
      keyMessage: "Create a useful brand-safe artifact.",
      cta: "Start a conversation",
      strictlySourceGrounded: true,
    });

    const points = artifact.fittedCopy?.proofPoints ?? [];
    assert.equal(points.length, 2, `${brand} should have exactly two flyer subpoints`);
    for (const point of points) {
      assert.doesNotMatch(point, weakStarts, `${brand} has a clipped or database-like subpoint: ${point}`);
      assert.match(point, /^(Support|Provide|Use|Guide|Create|Build|Align|Show|Clarify|Connect|Help|Tailor|Promote|Inform|Focus|Work|Give)\b/i);
      assert.ok(point.endsWith("."), `${brand} subpoint should be sentence-like`);
    }
  }
});

test("generic production instructions do not become visible campaign headlines", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "WCEPS",
    audience: "education leaders",
    keyMessage: "Create a useful brand-safe artifact.",
    cta: "Start a conversation",
    strictlySourceGrounded: true,
  });

  assert.equal(artifact.copy.headlineOptions[0].includes("brand-safe artifact"), false);
  assert.equal(artifact.fittedCopy?.headline.includes("brand-safe artifact"), false);
  assert.match(artifact.fittedCopy?.headline ?? "", /WCEPS|support|schools|districts|pathways|research/i);
});

test("WIDA PRIME fitted copy preserves variant names without duplicated phrases", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "WIDA PRIME",
    audience: "publisher teams",
    keyMessage: "Create a useful brand-safe artifact.",
    cta: "Start a conversation",
    strictlySourceGrounded: true,
  });

  const copyText = [artifact.fittedCopy?.deck, ...(artifact.fittedCopy?.proofPoints ?? [])].join(" ");
  assert.match(copyText, /PRIME V1|PRIME V2|PRIME 2020/);
  assert.doesNotMatch(copyText, /PRIME v1|PRIME v2|materials correlated with materials correlated with/);
  assert.doesNotMatch(copyText, /\bfit in their\./i);
  assert.doesNotMatch(copyText, /\bEnglish Language Development\./i);
});

test("sendability brand boundary catches sibling leakage for every active brand", () => {
  const template = resolveCompositionTemplate("flyer");
  const leakyTerms = {
    "CARE Coaching": "CCNA action-based data from the CARE Coaching Needs Assessment.",
    CCNA: "The Three Cs are Consulting, Coaching, and Continuous Learning.",
    WebbAlign: "CARE Coaching and CALL support the PRIME process.",
    CALL: "WebbAlign DOK alignment and WIDA PRIME instructional materials.",
    "WIDA PRIME": "WIDA Workshops and webinars are the sole source provider.",
    WCEPS: "CARE Coaching CCNA WebbAlign CALL WIDA PRIME DOK PRIME process.",
  };

  for (const [brand, leakedText] of Object.entries(leakyTerms)) {
    const score = scoreComposition({
      artifactType: "flyer",
      fittedCopy: {
        headline: "Focused support for education teams",
        deck: "A concise source-grounded message for review.",
        proofPoints: [leakedText, "Clear next steps for teams."],
        cta: "Start a conversation",
        footer: "Internal review.",
      },
      template,
      prompt:
        "CONTRACT=campaign-art-plate-v5 MODE=campaign-art-plate NO=document layouts, blank boxes, mock ui, cards, brochure scaffolding, fake text, fake logos, malformed ui; app renders official logo once.",
      request: {
        artifactType: "flyer",
        brand,
        audience: "education leaders",
        keyMessage: "",
        goal: "drive inquiry",
        topic: "support",
        cta: "Start a conversation",
        format: "Letter portrait",
        toneModifier: "professional",
        notes: "",
        visualInstruction: "",
        logoVariant: "",
        colorTheme: "",
        contextAttachments: [],
        strictlySourceGrounded: true,
        generateVisual: true,
      },
    });

    assert.equal(score.status, "block", `${brand} should block sibling leakage`);
    assert.ok(score.brandBoundary < 100, `${brand} should lose boundary score`);
    assert.ok(score.issues.some((issue) => issue.includes("sibling-brand term")));
  }
});

test("key message drives the headline and image prompt", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "CARE Coaching",
    audience: "district EL leaders",
    keyMessage: "Build confidence for multilingual learner support.",
    cta: "Start a CARE Coaching conversation",
  });

  assert.equal(artifact.copy.headlineOptions[0], "Build confidence for multilingual learner support.");
  assert.ok(artifact.brief.objective.includes("Build confidence for multilingual learner support."));
  assert.ok(artifact.imagePrompts[0].includes("confidence"));
  assert.ok(artifact.imagePrompts[0].includes("multilingual"));
  assert.equal(artifact.imagePrompts[0].includes("Build confidence for multilingual learner support."), false);
});

test("context attachments are included in image prompt context", async () => {
  const artifact = await generateArtifact({
    artifactType: "one-pager",
    brand: "WebbAlign",
    audience: "curriculum teams",
    keyMessage: "Use DOK to strengthen alignment conversations.",
    cta: "Request a WebbAlign conversation",
    contextAttachments: [
      {
        name: "district-priority.pdf",
        type: "application/pdf",
        dataUrl: "data:application/pdf;base64,JVBERi0xLjQ=",
      },
    ],
  });

  assert.ok(artifact.imagePrompts[0].includes("REFS=district-priority.pdf"));
  assert.equal(artifact.imagePrompts[0].includes("data:application/pdf"), false);
  assert.equal(artifact.imagePrompts[0].includes("base64"), false);
  assert.deepEqual(artifact.pipelineTrace?.contextAttachmentNames, ["district-priority.pdf"]);
});

test("prompt contracts filter evidence and stay under length targets", async () => {
  const artifact = await generateArtifact({
    artifactType: "one-pager",
    brand: "CARE Coaching",
    audience: "district EL leaders",
    keyMessage: "Support multilingual learner success through coaching and professional learning.",
    cta: "Request a CARE Coaching conversation",
    notes: "Make this feel like an executive-ready campaign sheet, not a generic school flyer.",
  });

  assert.ok(artifact.pipelineTrace);
  assert.ok(artifact.pipelineTrace.evidenceIds.length <= 2);
  assert.ok(artifact.pipelineTrace.promptLength <= artifact.pipelineTrace.promptTokenBudget);
  assert.ok(artifact.imagePrompts[0].includes("evid_ids:["));
  assert.equal(artifact.imagePrompts[0].includes("sourceOfTruth"), false);
});

test("studio prompts forbid generated text, logos, and contact details", async () => {
  const artifact = await generateArtifact({
    artifactType: "flyer",
    brand: "CARE Coaching",
    audience: "district EL leaders",
    keyMessage: "Every voice, every classroom, every learner.",
    cta: "Request a CARE Coaching conversation",
  });

  const prompt = artifact.imagePrompts[0];
  assert.ok(prompt.includes("MODE=campaign-art-plate"));
  assert.ok(prompt.includes("TEXT_RULE=absolutely no readable text"));
  assert.ok(prompt.includes("do not render any CARE Coaching logo"));
  assert.ok(prompt.includes("chevron/mountain mark"));
  assert.ok(prompt.includes("VISUAL_STYLE=authentic editorial photography"));
  assert.ok(prompt.includes("stock-photo workshop posing"));
  assert.ok(prompt.includes("email addresses"));
  assert.ok(prompt.includes("NO=document layouts, panels, blank boxes, placeholder modules, mock UI, cards"));
  assert.ok(prompt.includes("fake seals"));
  assert.ok(prompt.includes("fake book titles"));
  assert.equal(prompt.includes("blank copy zones"), false);
  assert.equal(prompt.includes("COPY_SLOTS"), false);
  assert.equal(prompt.includes("three-part pathway"), false);
  assert.equal(prompt.includes("coaching cards"), false);
  assert.equal(prompt.includes("Every voice, every classroom, every learner."), false);
  assert.equal(prompt.includes("Request a CARE Coaching conversation"), false);
});

test("email artifacts use email-safe prompt contracts", async () => {
  const artifact = await generateArtifact({
    artifactType: "html-email-announcement",
    brand: "WIDA PRIME",
    audience: "publishers and correlators",
    keyMessage: "Understand the PRIME process for instructional materials.",
    cta: "Learn about WIDA PRIME",
    visualInstruction: "Make it polished, publisher-facing, and calm.",
  });

  const prompt = artifact.imagePrompts[0];
  assert.equal(artifact.brand, "WIDA PRIME");
  assert.equal(artifact.artifactType, "html-email-announcement");
  assert.ok(prompt.includes("FORMAT=email-safe campaign art plate"));
  assert.ok(prompt.includes("VISUAL_INSTRUCTION=Make it polished"));
  assert.ok(prompt.includes("do not render any WIDA PRIME logo"));
});

test("copy fit enforces concise production text limits", async () => {
  const template = resolveCompositionTemplate("one-pager");
  const fitted = fitCopy(
    {
      headlineOptions: ["This is a very long headline that should be reduced into a more disciplined production-ready line"],
      subheadOptions: ["This is a first sentence with useful context. This second sentence should not appear."],
      body: "Body copy.",
      bullets: [
        "CARE Coaching provides customized learning opportunities for administrators, teachers, school leaders, and district leaders.",
        "The CARE Coaching Needs Assessment identifies strengths, uncovers growth areas, and guides education leaders with action-based data.",
        "CARE Coaching can support multilingual learner success alongside family engagement and standards-aligned teaching, learning, and assessment.",
        "This extra proof point should not fit.",
      ],
      cta: "Request a CARE Coaching conversation about possible next steps",
    },
    {
      artifactType: "one-pager",
      brand: "CARE Coaching",
      audience: "district EL leaders",
      keyMessage: "",
      goal: "drive inquiry",
      topic: "coaching",
      cta: "Request a CARE Coaching conversation about possible next steps",
      format: "Letter portrait",
      toneModifier: "professional",
      notes: "",
      visualInstruction: "",
      logoVariant: "",
      colorTheme: "",
      contextAttachments: [],
      strictlySourceGrounded: true,
      generateVisual: true,
    },
    template,
  );

  assert.ok(fitted.headline.split(/\s+/).length <= 12);
  assert.equal((fitted.deck.match(/[.!?]/g) ?? []).length, 1);
  assert.ok(fitted.proofPoints.length >= 2 && fitted.proofPoints.length <= 3);
  assert.ok(fitted.cta.split(/\s+/).length <= 5);
});

test("copy fit does not truncate decks at common abbreviations", () => {
  const template = resolveCompositionTemplate("flyer");
  const fitted = fitCopy(
    {
      headlineOptions: ["Use DOK to strengthen alignment"],
      subheadOptions: ["WebbAlign works in collaboration with Dr. Norman Webb. This second sentence should not appear."],
      body: "WebbAlign works in collaboration with Dr. Norman Webb. This second sentence should not appear.",
      bullets: [
        "WebbAlign promotes effective and accurate use of Depth of Knowledge language.",
        "The program helps education teams work toward an aligned, coherent system.",
      ],
      cta: "Contact WebbAlign",
    },
    {
      artifactType: "flyer",
      brand: "WebbAlign",
      audience: "curriculum teams",
      keyMessage: "",
      goal: "drive inquiry",
      topic: "DOK alignment",
      cta: "Contact WebbAlign",
      format: "Letter portrait",
      toneModifier: "professional",
      notes: "",
      visualInstruction: "",
      logoVariant: "",
      colorTheme: "",
      contextAttachments: [],
      strictlySourceGrounded: true,
      generateVisual: true,
    },
    template,
  );

  assert.equal(fitted.deck, "WebbAlign works in collaboration with Dr. Norman Webb.");
});

test("copy fit removes repetitive deck and proof language", () => {
  const template = resolveCompositionTemplate("flyer");
  const fitted = fitCopy(
    {
      headlineOptions: ["Every voice, every classroom, every learner."],
      subheadOptions: [
        "CARE Coaching provides customized learning opportunities for administrators, teachers, school leaders, and district leaders.",
        "CARE Coaching supports educators through Consulting, Coaching, and Continuous Learning.",
      ],
      body: "CARE Coaching provides customized learning opportunities for administrators, teachers, school leaders, and district leaders.",
      bullets: [
        "CARE Coaching provides customized learning opportunities for administrators, teachers, school leaders, and district leaders.",
        "The CARE Coaching Needs Assessment identifies strengths, uncovers growth areas, and guides education leaders with action-based data.",
        "CARE Coaching can support multilingual learner success alongside family engagement and standards-aligned teaching, learning, and assessment.",
      ],
      cta: "Request a CARE Coaching conversation",
    },
    {
      artifactType: "flyer",
      brand: "CARE Coaching",
      audience: "district EL leaders",
      keyMessage: "Every voice, every classroom, every learner.",
      goal: "drive inquiry",
      topic: "customized coaching",
      cta: "Request a CARE Coaching conversation",
      format: "Letter portrait",
      toneModifier: "professional",
      notes: "",
      visualInstruction: "",
      logoVariant: "",
      colorTheme: "",
      contextAttachments: [],
      strictlySourceGrounded: true,
      generateVisual: true,
    },
    template,
  );

  assert.equal(fitted.proofPoints.some((point) => point === fitted.deck), false);
  assert.equal(new Set([fitted.deck, ...fitted.proofPoints]).size, fitted.proofPoints.length + 1);
  assert.equal(fitted.proofPoints.length, 2);
  assert.equal(fitted.proofPoints.some((point) => /CCNA|Needs Assessment|action-based data/i.test(point)), false);
});

test("artifact types map to deterministic composition templates", () => {
  assert.equal(resolveCompositionTemplate("flyer").id, "campaign-flyer");
  assert.equal(resolveCompositionTemplate("proposal-cover").id, "campaign-flyer");
  assert.equal(resolveCompositionTemplate("one-pager").id, "magazine-one-pager");
  assert.equal(resolveCompositionTemplate("conference-handout").id, "executive-brief");
  assert.equal(resolveCompositionTemplate("social-graphic").id, "social-announcement");
  assert.equal(resolveCompositionTemplate("html-email-announcement").id, "email-hero");
});

test("sendability scoring flags old document scaffolding prompts", () => {
  const template = resolveCompositionTemplate("flyer");
  const fittedCopy = {
    headline: "Every voice, every classroom, every learner",
    deck: "CARE Coaching supports practical professional learning.",
    proofPoints: ["Customized support for educators.", "Action-based guidance for teams."],
    cta: "Request a conversation",
    footer: "Internal review.",
  };
  const score = scoreComposition({
    artifactType: "flyer",
    fittedCopy,
    template,
    prompt: "COPY_SLOTS=[headline]; reserve attractive blank copy zones; brochure concept with cards and mock UI",
    request: {
      artifactType: "flyer",
      brand: "CARE Coaching",
      audience: "district EL leaders",
      keyMessage: "",
      goal: "drive inquiry",
      topic: "coaching",
      cta: "Request a conversation",
      format: "Letter portrait",
      toneModifier: "professional",
      notes: "",
      visualInstruction: "",
      logoVariant: "",
      colorTheme: "",
      contextAttachments: [],
      strictlySourceGrounded: true,
      generateVisual: true,
    },
  });

  assert.equal(score.status, "block");
  assert.ok(score.issues.some((issue) => issue.includes("document scaffolding")));
});

test("sendability brand relevance catches generic prompts for every active brand", () => {
  const template = resolveCompositionTemplate("flyer");
  const fittedCopy = {
    headline: "Focused support for education teams",
    deck: "A concise source-grounded message for review.",
    proofPoints: ["Useful support for teams.", "Clear planning for next steps."],
    cta: "Start a conversation",
    footer: "Internal review.",
  };
  const brands = ["CARE Coaching", "CCNA", "WebbAlign", "CALL", "WIDA PRIME", "WCEPS"];
  const genericPrompt =
    "CONTRACT=campaign-art-plate-v5 MODE=campaign-art-plate NO=document layouts, blank boxes, mock ui, cards, brochure scaffolding, fake text, fake logos, malformed ui; app renders official logo once.";

  for (const brand of brands) {
    const score = scoreComposition({
      artifactType: "flyer",
      fittedCopy,
      template,
      prompt: genericPrompt,
      request: {
        artifactType: "flyer",
        brand,
        audience: "education leaders",
        keyMessage: "",
        goal: "drive inquiry",
        topic: "support",
        cta: "Start a conversation",
        format: "Letter portrait",
        toneModifier: "professional",
        notes: "",
        visualInstruction: "",
        logoVariant: "",
        colorTheme: "",
        contextAttachments: [],
        strictlySourceGrounded: true,
        generateVisual: true,
      },
    });

    assert.equal(score.status, "block", `${brand} should block a generic visual prompt`);
    assert.ok(score.brandRelevance < 72, `${brand} should receive a low relevance score`);
    assert.ok(score.issues.some((issue) => issue.includes(`${brand} visual relevance`)));
    assert.ok(score.warnings.some((warning) => warning.includes("missing visual subject cue")));
    assert.ok(score.warnings.some((warning) => warning.includes("missing avoid guardrail")));
  }
});

test("sendability brand relevance passes profile-complete prompts for every active brand", () => {
  const template = resolveCompositionTemplate("flyer");
  const fittedCopy = {
    headline: "Focused support for education teams",
    deck: "A concise source-grounded message for review.",
    proofPoints: ["Useful support for teams.", "Clear planning for next steps."],
    cta: "Start a conversation",
    footer: "Internal review.",
  };
  const brands = ["CARE Coaching", "CCNA", "WebbAlign", "CALL", "WIDA PRIME", "WCEPS"];
  const basePrompt =
    "CONTRACT=campaign-art-plate-v5 MODE=campaign-art-plate NO=document layouts, blank boxes, mock ui, cards, brochure scaffolding, fake text, fake logos, malformed ui; app renders official logo once.";

  for (const brand of brands) {
    const profile = getBrandVisualProfile(brand);
    const score = scoreComposition({
      artifactType: "flyer",
      fittedCopy,
      template,
      prompt: `${basePrompt} ${profile.relevanceRequiredTerms.join(" ")} ${profile.relevanceForbiddenTerms.join(" ")}`,
      request: {
        artifactType: "flyer",
        brand,
        audience: "education leaders",
        keyMessage: "",
        goal: "drive inquiry",
        topic: "support",
        cta: "Start a conversation",
        format: "Letter portrait",
        toneModifier: "professional",
        notes: "",
        visualInstruction: "",
        logoVariant: "",
        colorTheme: "",
        contextAttachments: [],
        strictlySourceGrounded: true,
        generateVisual: true,
      },
    });

    assert.ok(score.brandRelevance >= 94, `${brand} should pass a profile-complete relevance check`);
    assert.equal(score.issues.some((issue) => issue.includes("visual relevance")), false);
    assert.equal(score.warnings.some((warning) => warning.includes("missing visual")), false);
    assert.equal(score.warnings.some((warning) => warning.includes("missing avoid")), false);
  }
});

test("logo duplication guard is triggered when ownership conflicts", () => {
  const critique = critiqueLayoutContract({
    artifactType: "flyer",
    canvas: "1024x1536 portrait",
    safeZones: ["Reserve logo zone."],
    exactTextPriority: ["Headline", "CTA"],
    appOwnedElements: ["Official CARE Coaching logo overlay from approved asset."],
    imageGenOwnedElements: ["Final logo lockup and full-page art direction."],
  });

  assert.ok(critique.warnings.some((warning) => warning.includes("Logo duplication risk")));
});
