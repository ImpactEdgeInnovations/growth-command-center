import { z } from "zod";

export const applicationSchema = z.object({
  companyName: z.string().trim().min(2).max(140),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(180),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z.string().trim().max(180).optional().or(z.literal("")),
  useCase: z.string().trim().min(20).max(1200),
  expectedTeamSize: z.coerce.number().int().min(1).max(10000).optional(),
});

export const loginCodeSchema = z.object({
  email: z.string().trim().email().max(180),
});

export const verifyCodeSchema = z.object({
  email: z.string().trim().email().max(180),
  code: z.string().trim().regex(/^\d{6}$/),
});
