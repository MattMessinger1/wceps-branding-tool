import { z } from "zod";

export const ArtifactTypeSchema = z.enum([
  "flyer",
  "one-pager",
  "landing-page",
  "website",
  "social-graphic",
  "email-header",
  "html-email-announcement",
  "html-email-newsletter",
  "html-email-event-invite",
  "conference-handout",
  "proposal-cover",
]);

export const ContextAttachmentSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  dataUrl: z.string().min(1),
});

export const ArtifactRequestSchema = z.object({
  artifactType: ArtifactTypeSchema.default("flyer"),
  brand: z.string().optional().default(""),
  audience: z.string().min(1).default("education leaders"),
  keyMessage: z.string().optional().default(""),
  goal: z.string().min(1).default("explain the offering and drive inquiry"),
  topic: z.string().min(1).default("program overview"),
  cta: z.string().optional().default("Connect with WCEPS"),
  format: z.string().optional().default(""),
  toneModifier: z.string().optional().default("professional, warm, practical"),
  notes: z.string().optional().default(""),
  visualInstruction: z.string().optional().default(""),
  logoVariant: z.string().optional().default(""),
  colorTheme: z.string().optional().default(""),
  contextAttachments: z.array(ContextAttachmentSchema).max(2).optional().default([]),
  strictlySourceGrounded: z.boolean().default(true),
  generateVisual: z.boolean().default(false),
});

export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;
export type ContextAttachment = z.infer<typeof ContextAttachmentSchema>;
export type ArtifactRequest = z.infer<typeof ArtifactRequestSchema>;
