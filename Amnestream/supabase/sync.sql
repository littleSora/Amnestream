-- Amnestream cloud sync: run this ONCE in Supabase (Dashboard > SQL Editor > New query > paste > Run).
-- It stores each account's list, favourites, continue-watching progress and watch history in one row,
-- so every device you log in on shows the same data. Row-level security means a user can only read and write their own row.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "user_data select own" on public.user_data;
drop policy if exists "user_data insert own" on public.user_data;
drop policy if exists "user_data update own" on public.user_data;
drop policy if exists "user_data delete own" on public.user_data;

create policy "user_data select own" on public.user_data for select to authenticated using (auth.uid() = user_id);
create policy "user_data insert own" on public.user_data for insert to authenticated with check (auth.uid() = user_id);
create policy "user_data update own" on public.user_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_data delete own" on public.user_data for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_data to authenticated;
