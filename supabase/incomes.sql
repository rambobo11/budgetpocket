-- PocketBudget — table incomes
-- À coller dans Supabase → SQL Editor → Run

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  source text not null,
  description text,
  budget_month date not null,
  created_at timestamptz not null default now()
);

create index incomes_user_created_at_idx
  on public.incomes (user_id, created_at desc);

create index incomes_user_budget_month_idx
  on public.incomes (user_id, budget_month desc);

alter table public.incomes enable row level security;

create policy "Users can view own incomes"
  on public.incomes for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own incomes"
  on public.incomes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own incomes"
  on public.incomes for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own incomes"
  on public.incomes for delete to authenticated
  using (auth.uid() = user_id);
