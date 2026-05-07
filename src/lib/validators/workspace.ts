import { z } from "zod";

export const planSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  sourceType: z.enum(["manual", "md_upload", "pdf_upload", "docx_upload"]).default("manual"),
  extractedText: z.string().trim().min(20).max(80000),
});

export const targetSchema = z.object({
  workspaceId: z.string().uuid(),
  growthPlanId: z.string().uuid().optional().nullable(),
  label: z.string().trim().min(2).max(160),
  metricKey: z.string().trim().max(80).optional(),
  targetValue: z.coerce.number().min(0),
  currentValue: z.coerce.number().min(0).default(0),
  ownerName: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1200).optional(),
});

export const milestoneSchema = z.object({
  workspaceId: z.string().uuid(),
  growthPlanId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1200).optional(),
  ownerName: z.string().trim().max(120).optional(),
  dueAt: z.string().trim().optional(),
});

export const adviceSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  growthPlanId: z.string().uuid().optional(),
  briefType: z
    .enum(["general_advice", "plan_summary", "task_suggestions", "investor_followup", "weekly_review", "research_note"])
    .default("general_advice"),
  prompt: z.string().trim().min(8).max(12000),
  context: z.string().trim().max(40000).optional(),
});
