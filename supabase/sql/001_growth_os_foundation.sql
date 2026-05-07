-- Growth Command Center standalone schema.
-- IMPORTANT: This belongs to the separate Growth Command Center app, not CaseReady.
-- No CaseReady loan/legal/payment/admin tables are referenced here.

create extension if not exists "pgcrypto";

create table if not exists public.platform_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  phone text,
  role text not null default 'user'
    check (role in ('super_admin', 'workspace_owner', 'workspace_admin', 'member', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.super_admin_emails (
  email text primary key,
  added_by uuid references public.platform_users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  purpose text not null default 'login'
    check (purpose in ('login', 'invite', 'workspace_claim')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users(id) on delete cascade,
  email text not null,
  role text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  slug text not null unique,
  website text,
  owner_email text,
  owner_phone text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'suspended', 'rejected')),
  plan text not null default 'trial'
    check (plan in ('trial', 'starter', 'growth', 'enterprise')),
  subscription_enabled boolean not null default false,
  subscription_status text not null default 'off'
    check (subscription_status in ('off', 'trial', 'active', 'past_due', 'cancelled')),
  billing_notes text,
  approved_at timestamptz,
  approved_by uuid references public.platform_users(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  contact_email text not null,
  contact_phone text,
  website text,
  use_case text,
  expected_team_size integer,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  workspace_id uuid references public.workspaces(id) on delete set null,
  reviewed_at timestamptz,
  reviewed_by uuid references public.platform_users(id) on delete set null,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.platform_users(id) on delete set null,
  email text,
  full_name text,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended', 'removed')),
  invited_by uuid references public.platform_users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_members_identity_check check (user_id is not null or email is not null)
);

create table if not exists public.growth_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'md_upload', 'pdf_upload', 'docx_upload')),
  original_file_path text,
  extracted_text text,
  summary text,
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'active', 'archived')),
  ai_status text not null default 'not_requested'
    check (ai_status in ('not_requested', 'requested', 'draft_ready', 'approved', 'failed')),
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_targets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  growth_plan_id uuid references public.growth_plans(id) on delete set null,
  label text not null,
  metric_key text,
  target_value numeric(14, 2) not null default 0,
  current_value numeric(14, 2) not null default 0,
  period_start date,
  period_end date,
  owner_name text,
  status text not null default 'active'
    check (status in ('active', 'at_risk', 'hit', 'missed', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  growth_plan_id uuid references public.growth_plans(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  owner_name text,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'blocked', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  growth_plan_id uuid references public.growth_plans(id) on delete set null,
  title text not null,
  lane text not null default 'growth'
    check (lane in ('founder', 'marketing', 'sales', 'investor', 'ops', 'content', 'growth')),
  assignee_name text,
  assignee_email text,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investor_outreach (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  investor_name text not null,
  company_name text,
  contact_name text,
  contact_email text,
  stage text not null default 'identified'
    check (stage in ('identified', 'contacted', 'warm', 'meeting', 'diligence', 'committed', 'passed')),
  status text not null default 'open'
    check (status in ('open', 'follow_up', 'warm', 'closed', 'archived')),
  source text,
  last_response text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel text not null,
  activity_type text not null,
  title text not null,
  owner_name text,
  metric_name text,
  metric_value numeric(14, 2),
  activity_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  headline text,
  wins text,
  blockers text,
  numbers text,
  next_focus text,
  founder_note text,
  ai_summary text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'reviewed', 'archived')),
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, week_start)
);

create table if not exists public.ai_briefs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  growth_plan_id uuid references public.growth_plans(id) on delete set null,
  brief_type text not null default 'general_advice'
    check (brief_type in ('general_advice', 'plan_summary', 'task_suggestions', 'investor_followup', 'weekly_review', 'research_note')),
  prompt text not null,
  response text,
  model text,
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'approved', 'archived', 'failed')),
  created_by uuid references public.platform_users(id) on delete set null,
  reviewed_by uuid references public.platform_users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_user_id uuid references public.platform_users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_users_email_idx on public.platform_users(lower(email));
create index if not exists auth_codes_email_idx on public.auth_codes(lower(email), expires_at desc);
create index if not exists platform_sessions_expires_idx on public.platform_sessions(expires_at);
create index if not exists workspaces_status_idx on public.workspaces(status, created_at desc);
create index if not exists workspace_applications_status_idx on public.workspace_applications(status, created_at desc);
create index if not exists workspace_members_workspace_idx on public.workspace_members(workspace_id, status);
create index if not exists growth_plans_workspace_idx on public.growth_plans(workspace_id, status, updated_at desc);
create index if not exists growth_targets_workspace_idx on public.growth_targets(workspace_id, status, updated_at desc);
create index if not exists growth_milestones_workspace_idx on public.growth_milestones(workspace_id, status, due_at);
create index if not exists team_tasks_workspace_idx on public.team_tasks(workspace_id, status, due_at);
create index if not exists investor_outreach_followup_idx on public.investor_outreach(workspace_id, status, next_follow_up_at);
create index if not exists marketing_activities_workspace_date_idx on public.marketing_activities(workspace_id, activity_date desc);
create index if not exists weekly_reviews_workspace_week_idx on public.weekly_reviews(workspace_id, week_start desc);
create index if not exists weekly_reviews_workspace_status_idx on public.weekly_reviews(workspace_id, status, updated_at desc);
create index if not exists ai_briefs_workspace_idx on public.ai_briefs(workspace_id, status, created_at desc);
create index if not exists audit_logs_workspace_idx on public.audit_logs(workspace_id, created_at desc);

alter table public.platform_users enable row level security;
alter table public.super_admin_emails enable row level security;
alter table public.auth_codes enable row level security;
alter table public.platform_sessions enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_applications enable row level security;
alter table public.workspace_members enable row level security;
alter table public.growth_plans enable row level security;
alter table public.growth_targets enable row level security;
alter table public.growth_milestones enable row level security;
alter table public.team_tasks enable row level security;
alter table public.investor_outreach enable row level security;
alter table public.marketing_activities enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.ai_briefs enable row level security;
alter table public.audit_logs enable row level security;

-- RLS policies intentionally omitted in MVP because Next.js API routes use service-role access checks.
-- The default-deny posture prevents accidental browser/client reads until tenant RLS is added.
