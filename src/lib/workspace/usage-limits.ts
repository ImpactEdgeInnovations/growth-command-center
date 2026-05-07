import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type UsageMetric =
  | "members"
  | "plans"
  | "targets"
  | "milestones"
  | "tasks"
  | "investors"
  | "marketingActivities"
  | "weeklyReviews"
  | "aiBriefs";

export const USAGE_METRIC_LABELS: Record<UsageMetric, string> = {
  members: "team seats",
  plans: "growth plans",
  targets: "targets",
  milestones: "milestones",
  tasks: "team tasks",
  investors: "investor records",
  marketingActivities: "marketing logs",
  weeklyReviews: "weekly reviews",
  aiBriefs: "AI briefs",
};

type UsageLimitMap = Record<UsageMetric, number | null>;
export type UsageLimitResult =
  | { ok: true }
  | { ok: false; status: number; code: string; error: string };

const PLAN_LIMITS: Record<string, UsageLimitMap> = {
  trial: {
    members: 3,
    plans: 3,
    targets: 10,
    milestones: 15,
    tasks: 50,
    investors: 50,
    marketingActivities: 75,
    weeklyReviews: 12,
    aiBriefs: 30,
  },
  starter: {
    members: 6,
    plans: 8,
    targets: 30,
    milestones: 60,
    tasks: 250,
    investors: 250,
    marketingActivities: 400,
    weeklyReviews: 52,
    aiBriefs: 150,
  },
  growth: {
    members: 15,
    plans: 25,
    targets: 100,
    milestones: 200,
    tasks: 1000,
    investors: 1500,
    marketingActivities: 2500,
    weeklyReviews: 156,
    aiBriefs: 750,
  },
  enterprise: {
    members: null,
    plans: null,
    targets: null,
    milestones: null,
    tasks: null,
    investors: null,
    marketingActivities: null,
    weeklyReviews: null,
    aiBriefs: null,
  },
};

const metricTable: Record<UsageMetric, string> = {
  members: "workspace_members",
  plans: "growth_plans",
  targets: "growth_targets",
  milestones: "growth_milestones",
  tasks: "team_tasks",
  investors: "investor_outreach",
  marketingActivities: "marketing_activities",
  weeklyReviews: "weekly_reviews",
  aiBriefs: "ai_briefs",
};

function applyCustomLimitOverrides(base: UsageLimitMap, settings: any): UsageLimitMap {
  const overrides = settings?.usage_limits || settings?.usageLimits || {};
  return (Object.keys(base) as UsageMetric[]).reduce((next, metric) => {
    const raw = overrides?.[metric];
    if (raw === null || raw === "unlimited") {
      next[metric] = null;
      return next;
    }
    const numeric = Number(raw);
    next[metric] = Number.isFinite(numeric) && numeric >= 0 ? numeric : base[metric];
    return next;
  }, { ...base });
}

export function resolveWorkspaceUsageLimits(workspace: any): UsageLimitMap {
  const plan = String(workspace?.plan || "trial");
  const base = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
  return applyCustomLimitOverrides(base, workspace?.settings || {});
}

export async function countUsageMetric(supabase: any, workspaceId: string, metric: UsageMetric) {
  let query = supabase
    .from(metricTable[metric])
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (metric === "members") query = query.neq("status", "removed");
  if (metric === "plans") query = query.neq("status", "archived");
  if (metric === "targets") query = query.neq("status", "closed");
  if (metric === "milestones") query = query.neq("status", "cancelled");
  if (metric === "tasks") query = query.neq("status", "cancelled");
  if (metric === "investors") query = query.neq("status", "archived");
  if (metric === "weeklyReviews") query = query.neq("status", "archived");
  if (metric === "aiBriefs") query = query.neq("status", "archived");

  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
}

export async function getWorkspaceUsageSnapshot(workspaceId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id,plan,settings")
    .eq("id", workspaceId)
    .maybeSingle();

  const limits = resolveWorkspaceUsageLimits(workspace || {});
  const metrics = Object.keys(USAGE_METRIC_LABELS) as UsageMetric[];
  const countsList = await Promise.all(metrics.map((metric) => countUsageMetric(supabase, workspaceId, metric)));
  const counts = metrics.reduce((next, metric, index) => {
    next[metric] = countsList[index] || 0;
    return next;
  }, {} as Record<UsageMetric, number>);

  return { plan: workspace?.plan || "trial", counts, limits, labels: USAGE_METRIC_LABELS };
}

export async function assertUsageLimit(workspaceId: string, metric: UsageMetric, increment = 1): Promise<UsageLimitResult> {
  const supabase = createSupabaseAdminClient();
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id,plan,settings")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error || !workspace) {
    return { ok: false, status: 404, code: "WORKSPACE_NOT_FOUND", error: "Workspace not found." };
  }

  const limits = resolveWorkspaceUsageLimits(workspace);
  const limit = limits[metric];
  if (limit === null) return { ok: true };

  const current = await countUsageMetric(supabase, workspaceId, metric);
  if (current + increment > limit) {
    return {
      ok: false,
      status: 402,
      code: "PLAN_LIMIT_REACHED",
      error: `Plan limit reached: ${workspace.plan} allows ${limit} ${USAGE_METRIC_LABELS[metric]}. Ask the super admin to upgrade or adjust the limit.`,
    };
  }

  return { ok: true };
}
