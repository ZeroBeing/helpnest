-- =====================================================
-- migration_002.sql - HelpNest Phase 2 Database Upgrades
-- =====================================================

-- 1. Add location 'area' field to requests
alter table public.requests
  add column if not exists area text default 'Multan';

-- 2. Add user account status column for banning/restrictions
alter table public.users
  add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended', 'banned'));

-- 3. Create persistent notifications table
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Enable RLS for notifications
alter table public.notifications enable row level security;

-- RLS Policies: Users can only read and update their own notifications
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
