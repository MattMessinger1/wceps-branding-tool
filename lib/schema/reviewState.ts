import { z } from "zod";

export const ReviewStatusSchema = z.enum(["pass", "warn", "block"]);

export const ReviewStateSchema = z.object({
  approved: z.boolean(),
  status: ReviewStatusSchema.default("warn"),
  issues: z.array(z.string()),
  warnings: z.array(z.string()),
  suggestedFixes: z.array(z.string()).default([]),
  approvedAt: z.string().optional(),
  reviewerName: z.string().optional(),
});

export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type ReviewState = z.infer<typeof ReviewStateSchema>;
