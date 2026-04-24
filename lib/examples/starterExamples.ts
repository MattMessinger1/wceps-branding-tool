import { ArtifactTypeSchema, type ArtifactType } from "@/lib/schema/artifactRequest";

export type StarterExample = {
  id: string;
  title: string;
  brand: string;
  artifactType: ArtifactType;
  audience: string;
  keyMessage: string;
  cta: string;
  description: string;
  visualInstruction?: string;
};

export const starterExamples = [
  {
    id: "care-flyer-el-leaders",
    title: "CARE flyer",
    brand: "CARE Coaching",
    artifactType: "flyer",
    audience: "district EL leaders",
    keyMessage: "Every voice, every classroom, every learner.",
    cta: "Request a CARE Coaching conversation",
    description: "A district-facing flyer for coaching and professional learning.",
    visualInstruction: "Warm professional learning scene, educator reflection, multilingual learner planning materials.",
  },
  {
    id: "webbalign-social-curriculum",
    title: "WebbAlign social square",
    brand: "WebbAlign",
    artifactType: "social-graphic",
    audience: "curriculum teams",
    keyMessage: "Use DOK to strengthen alignment conversations.",
    cta: "Request a WebbAlign conversation",
    description: "A concise social post for alignment and DOK conversations.",
    visualInstruction: "Clean standards and curriculum review atmosphere, no fake diagrams or readable text.",
  },
  {
    id: "call-flyer-principals",
    title: "CALL leadership flyer",
    brand: "CALL",
    artifactType: "flyer",
    audience: "principals",
    keyMessage: "Focus leadership conversations around school improvement.",
    cta: "Request a CALL demo",
    description: "A leadership-focused flyer for principals and school teams.",
    visualInstruction: "Leadership team planning session with improvement notes and calm executive tone.",
  },
  {
    id: "ccna-executive-handout",
    title: "CCNA executive handout",
    brand: "CCNA",
    artifactType: "conference-handout",
    audience: "instructional leaders",
    keyMessage: "Use action-based data to guide instructional planning.",
    cta: "Request a CCNA conversation",
    description: "An executive-brief-style handout for needs assessment conversations.",
    visualInstruction: "Data debrief and action-planning scene, instructional practice review, no fake dashboards.",
  },
  {
    id: "wida-prime-email-publishers",
    title: "WIDA PRIME email",
    brand: "WIDA PRIME",
    artifactType: "html-email-announcement",
    audience: "publishers and correlators",
    keyMessage: "Clarify the PRIME process for instructional materials.",
    cta: "Discuss the PRIME process",
    description: "An email announcement for publisher and correlator audiences.",
    visualInstruction: "K-12 instructional materials, curriculum binders, grade-band packets, no random novels or fake seals.",
  },
  {
    id: "wceps-institutional-one-pager",
    title: "WCEPS one-pager",
    brand: "WCEPS",
    artifactType: "one-pager",
    audience: "education leaders",
    keyMessage: "Connect education teams with customized support.",
    cta: "Start a WCEPS conversation",
    description: "An institutional one-pager for broad WCEPS pathways support.",
    visualInstruction: "Inclusive school and district collaboration, research-informed planning, broad institutional tone.",
  },
] as const satisfies readonly StarterExample[];

const starterExampleMap: Map<string, StarterExample> = new Map(starterExamples.map((example) => [example.id, example]));

export function getStarterExample(id: string | null | undefined): StarterExample | undefined {
  return id ? starterExampleMap.get(id) : undefined;
}

export function validateStarterExamples() {
  return starterExamples.every((example) => ArtifactTypeSchema.safeParse(example.artifactType).success);
}
