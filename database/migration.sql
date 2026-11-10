-- =====================================================
-- migration_001.sql - run ONCE in Supabase > SQL Editor
-- (do NOT re-run schema.sql; this file only adds what is missing)
-- Tell the group before running: it adds one column to responses
-- and one to ratings, and tightens the ratings policy.
-- =====================================================

-- 1. Remember WHICH helper the owner accepted
--    (the prototype's "Accept" button needs somewhere to save this).
alter table public.responses
add column if not exists accepted boolean not null default false;

-- Only the request owner may accept a helper (update responses).
drop policy if exists "responses_update_owner" on public.responses;
create policy "responses_update_owner" on public.responses
for update to authenticated
using (exists (select 1 from public.requests r
where r.id = request_id and r.user_id = auth.uid()))
with check (exists (select 1 from public.requests r
where r.id = request_id and r.user_id = auth.uid()));

-- 2. The prototype has an optional written review next to the stars.
alter table public.ratings
add column if not exists review text;

-- 3. Tighten ratings: only the request owner can rate, only the
--    accepted helper, and only after the request is matched or done.
--    (Before this, any logged-in user could rate any other user.)
drop policy if exists "ratings_insert" on public.ratings;
create policy "ratings_insert" on public.ratings
for insert to authenticated
with check (
rater_id = auth.uid()
and exists (select 1 from public.requests r
where r.id = request_id
and r.user_id = auth.uid()
and r.status in ('matched','done'))
and exists (select 1 from public.responses p
where p.request_id = ratings.request_id
and p.helper_id = rated_id
and p.accepted)
);
