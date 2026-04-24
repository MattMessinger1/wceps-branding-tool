import { z } from "zod";

export const StyleTokensSchema = z.object({
  source: z.string().optional(),
  basis: z.string().optional(),
  confidence: z.string().optional(),
  colorTokens: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        usage: z.string(),
      }),
    )
    .optional(),
  palette: z.record(z.string(), z.string()).optional(),
  typographyMood: z.array(z.string()).optional(),
  typography: z.record(z.string(), z.unknown()).optional(),
  layoutKeywords: z.array(z.string()).optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
  imageKeywords: z.array(z.string()).optional(),
  interaction: z.record(z.string(), z.unknown()).optional(),
  iconographyFeel: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
});

export type StyleTokens = z.infer<typeof StyleTokensSchema>;
