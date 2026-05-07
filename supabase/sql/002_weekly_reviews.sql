-- Growth Command Center weekly founder reviews.
-- Run after 001_growth_os_foundation.sql in the separate Growth Command Center Supabase project.

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

create index if not exists weekly_reviews_workspace_week_idx
  on public.weekly_reviews(workspace_id, week_start desc);
create index if not exists weekly_reviews_workspace_status_idx
  on public.weekly_reviews(workspace_id, status, updated_at desc);

alter table public.weekly_reviews enable row level security;
