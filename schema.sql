-- =====================================================
-- Neighbor Help App - database schema (Supabase / Postgres)
-- Owner: Ahmed. Run this once in Supabase > SQL Editor.
-- Table and column names match the agreed project map.
-- =====================================================

-- ---------- TABLES ----------

-- users: profile row linked to Supabase Auth (auth.users)
create table if not exists public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text not null default '',
  phone_verified boolean not null default false,
  rating         numeric(3,2) not null default 0,
  created_at     timestamptz not null default now()
);

-- requests: help requests posted by neighbors
create table if not exists public.requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  description text not null default '',
  category    text not null default 'Other'
              check (category in ('Groceries','Rides','Tools','Lost and Found','Other')),
  status      text not null default 'open'
              check (status in ('open','matched','done')),
  scam_flag   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- responses: a helper offering to help on a request
create table if not exists public.responses (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests(id) on delete cascade,
  helper_id   uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (request_id, helper_id)
);

-- messages: chat inside a request
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests(id) on delete cascade,
  sender_id   uuid not null references public.users(id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);

-- reports: users reporting a request
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests(id) on delete cascade,
  reason      text not null,
  reporter_id uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------- OPTIONAL (TELL THE GROUP BEFORE USING) ----------
-- The flow ends with "Rating" but the agreed data only has users.rating.
-- This extra table stores individual ratings; the trigger below keeps
-- users.rating as the average.
create table if not exists public.ratings (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests(id) on delete cascade,
  rater_id    uuid not null references public.users(id) on delete cascade,
  rated_id    uuid not null references public.users(id) on delete cascade,
  stars       int  not null check (stars between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (request_id, rater_id)
);

create or replace function public.update_user_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.users
     set rating = coalesce((select round(avg(stars)::numeric, 2)
                              from public.ratings where rated_id = new.rated_id), 0)
   where id = new.rated_id;
  return new;
end $$;

drop trigger if exists trg_update_user_rating on public.ratings;
create trigger trg_update_user_rating
  after insert or update on public.ratings
  for each row execute function public.update_user_rating();

-- ---------- AUTO-CREATE PROFILE ON SIGNUP ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- INDEXES ----------
create index if not exists idx_requests_status_created on public.requests (status, created_at desc);
create index if not exists idx_requests_category       on public.requests (category);
create index if not exists idx_messages_request        on public.messages (request_id, created_at);
create index if not exists idx_responses_request       on public.responses (request_id);

-- ---------- ROW LEVEL SECURITY ----------
alter table public.users     enable row level security;
alter table public.requests  enable row level security;
alter table public.responses enable row level security;
alter table public.messages  enable row level security;
alter table public.reports   enable row level security;
alter table public.ratings   enable row level security;

-- users: anyone logged in can read profiles; you can edit only your own
create policy "users_read"   on public.users for select to authenticated using (true);
create policy "users_update" on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- requests: everyone logged in sees them; you create/edit/delete only your own
create policy "requests_read"   on public.requests for select to authenticated using (true);
create policy "requests_insert" on public.requests for insert to authenticated
  with check (user_id = auth.uid());
create policy "requests_update" on public.requests for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "requests_delete" on public.requests for delete to authenticated
  using (user_id = auth.uid());

-- responses: you offer help as yourself; visible to the helper and the request owner
create policy "responses_read" on public.responses for select to authenticated
  using (helper_id = auth.uid()
         or exists (select 1 from public.requests r
                    where r.id = request_id and r.user_id = auth.uid()));
create policy "responses_insert" on public.responses for insert to authenticated
  with check (helper_id = auth.uid()
              and not exists (select 1 from public.requests r
                              where r.id = request_id and r.user_id = auth.uid()));

-- messages: only the request owner and helpers who responded can read or write
create policy "messages_read" on public.messages for select to authenticated
  using (
    exists (select 1 from public.requests r where r.id = request_id and r.user_id = auth.uid())
    or exists (select 1 from public.responses p where p.request_id = messages.request_id and p.helper_id = auth.uid())
  );
create policy "messages_insert" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid() and (
      exists (select 1 from public.requests r where r.id = request_id and r.user_id = auth.uid())
      or exists (select 1 from public.responses p where p.request_id = messages.request_id and p.helper_id = auth.uid())
    )
  );

-- reports: any logged-in user can file one; no one can read them from the app
-- (view them in the Supabase dashboard)
create policy "reports_insert" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- ratings: anyone logged in can read; you rate as yourself
create policy "ratings_read"   on public.ratings for select to authenticated using (true);
create policy "ratings_insert" on public.ratings for insert to authenticated
  with check (rater_id = auth.uid() and rater_id <> rated_id);

-- ---------- REALTIME (for live chat) ----------
alter publication supabase_realtime add table public.messages;
