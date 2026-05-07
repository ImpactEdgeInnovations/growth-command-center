import { z } from "zod";

export const planSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  sourceType: z.enum(["manual", "md_upload", "pdf_upload", "docx_upload"]).default("manual"),
  extractedText: z.string().trim().min(20).max(80000),
});

export const planDraftRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  companyName: z.string().trim().min(2).max(160),
  businessType: z.string().trim().min(2).max(160),
  stage: z.enum(["idea", "early", "growing", "fundraising", "scaling"]).default("early"),
  topGoal: z.string().trim().min(8).max(600),
  market: z.string().trim().max(240).optional(),
  channels: z.string().trim().max(400).optional(),
  context: z.string().trim().max(4000).optional(),
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

export const taskSchema = z.object({
  workspaceId: z.string().uuid(),
  growthPlanId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(180),
  lane: z
    .enum(["founder", "marketing", "sales", "investor", "ops", "content", "growth"])
    .default("growth"),
  assigneeName: z.string().trim().max(120).optional(),
  assigneeEmail: z.string().trim().email().max(180).optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueAt: z.string().trim().optional(),
  notes: z.string().trim().max(1200).optional(),
});

export const investorSchema = z.object({
  workspaceId: z.string().uuid(),
  investorName: z.string().trim().min(2).max(180),
  companyName: z.string().trim().max(180).optional(),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().max(180).optional().or(z.literal("")),
  stage: z
    .enum([
      "identified",
      "contacted",
      "warm",
      "meeting",
      "diligence",
      "committed",
      "passed",
    ])
    .default("identified"),
  status: z.enum(["open", "follow_up", "warm", "closed", "archived"]).default("open"),
  source: z.string().trim().max(140).optional(),
  lastResponse: z.string().trim().max(1200).optional(),
  nextFollowUpAt: z.string().trim().optional(),
  notes: z.string().trim().max(1200).optional(),
});

export const marketingSchema = z.object({
  workspaceId: z.string().uuid(),
  channel: z.string().trim().min(2).max(100),
  activityType: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(180),
  ownerName: z.string().trim().max(120).optional(),
  metricName: z.string().trim().max(100).optional(),
  metricValue: z.coerce.number().min(0).optional(),
  activityDate: z.string().trim().optional(),
  notes: z.string().trim().max(1200).optional(),
});

export const weeklyReviewSchema = z.object({
  workspaceId: z.string().uuid(),
  weekStart: z.string().trim().min(8),
  weekEnd: z.string().trim().min(8),
  headline: z.string().trim().max(180).optional(),
  wins: z.string().trim().max(4000).optional(),
  blockers: z.string().trim().max(4000).optional(),
  numbers: z.string().trim().max(4000).optional(),
  nextFocus: z.string().trim().max(4000).optional(),
  founderNote: z.string().trim().max(4000).optional(),
  status: z.enum(["draft", "submitted"]).default("submitted"),
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

export const planSuggestionRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  growthPlanId: z.string().uuid(),
});

export const planSuggestionApproveSchema = z.object({
  workspaceId: z.string().uuid(),
  growthPlanId: z.string().uuid(),
  briefId: z.string().uuid().optional().nullable(),
  targets: z
    .array(
      z.object({
        label: z.string().trim().min(2).max(160),
        metricKey: z.string().trim().max(80).optional(),
        targetValue: z.coerce.number().min(0),
        notes: z.string().trim().max(1200).optional(),
      })
    )
    .max(5)
    .default([]),
  milestones: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(180),
        description: z.string().trim().max(1200).optional(),
        ownerName: z.string().trim().max(120).optional(),
      })
    )
    .max(5)
    .default([]),
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(180),
        lane: z
          .enum(["founder", "marketing", "sales", "investor", "ops", "content", "growth"])
          .default("growth"),
        assigneeName: z.string().trim().max(120).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        notes: z.string().trim().max(1200).optional(),
      })
    )
    .max(12)
    .default([]),
}).refine((data) => data.targets.length + data.milestones.length + data.tasks.length > 0, {
  message: "Approve at least one AI suggestion before saving.",
});
