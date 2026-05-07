-- Growth Command Center plan upload storage.
-- Run this only in the separate Growth Command Center Supabase project.
-- Do not run this in the CaseReady Supabase project.

insert into storage.buckets (id, name, public)
values ('growth-plans', 'growth-plans', false)
on conflict (id) do update set public = false;

comment on table public.growth_plans is
  'Growth plans saved by paste or private file upload. Original files live in the private growth-plans storage bucket.';
