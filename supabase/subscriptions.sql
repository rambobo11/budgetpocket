-- PocketBudget — Subscriptions (abonnements récurrents)
-- Supabase → SQL Editor → Run
-- Ex. Free, Netflix, Spotify, salle de sport…

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly', 'yearly')),
  next_billing_date date,
  payment_method text not null default 'cb'
    check (payment_method in ('cb', 'swile')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_status_billing_idx
  on public.subscriptions (user_id, status, next_billing_date asc nulls last);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own subscriptions" on public.subscriptions;
drop policy if exists "Users can insert own subscriptions" on public.subscriptions;
drop policy if exists "Users can update own subscriptions" on public.subscriptions;
drop policy if exists "Users can delete own subscriptions" on public.subscriptions;

create policy "Users can view own subscriptions"
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
  on public.subscriptions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
  on public.subscriptions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
  on public.subscriptions for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.subscriptions from anon;
grant select, insert, update, delete on public.subscriptions to authenticated;
