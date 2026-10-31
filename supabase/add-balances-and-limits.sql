-- Soldes saisis (banque + carte Swile) et plafonds par catégorie.
-- Supabase → SQL Editor → Run

create table if not exists public.user_balances (
  user_id uuid not null references auth.users (id) on delete cascade,
  budget_month date not null,
  bank_eur numeric(12, 2),
  swile_eur numeric(12, 2),
  updated_at timestamptz not null default now(),
  primary key (user_id, budget_month)
);

alter table public.user_balances enable row level security;

drop policy if exists "Users can view own balances" on public.user_balances;
drop policy if exists "Users can insert own balances" on public.user_balances;
drop policy if exists "Users can update own balances" on public.user_balances;
drop policy if exists "Users can delete own balances" on public.user_balances;

create policy "Users can view own balances"
  on public.user_balances for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own balances"
  on public.user_balances for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own balances"
  on public.user_balances for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own balances"
  on public.user_balances for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_balances from anon;
grant select, insert, update, delete on public.user_balances to authenticated;

create table if not exists public.category_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists category_limits_user_idx
  on public.category_limits (user_id);

alter table public.category_limits enable row level security;

drop policy if exists "Users can view own category limits" on public.category_limits;
drop policy if exists "Users can insert own category limits" on public.category_limits;
drop policy if exists "Users can update own category limits" on public.category_limits;
drop policy if exists "Users can delete own category limits" on public.category_limits;

create policy "Users can view own category limits"
  on public.category_limits for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own category limits"
  on public.category_limits for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own category limits"
  on public.category_limits for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own category limits"
  on public.category_limits for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.category_limits from anon;
grant select, insert, update, delete on public.category_limits to authenticated;
