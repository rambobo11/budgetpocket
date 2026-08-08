-- PocketBudget — table credits (créances / crédits)
-- À coller dans Supabase → SQL Editor → Run

create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person text not null,
  kind text not null check (kind in ('On me doit', 'Crédit')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'EUR' check (currency in ('EUR', 'MAD')),
  notes text,
  status text not null default 'open' check (status in ('open', 'repaid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credits_user_status_idx
  on public.credits (user_id, status, created_at desc);

alter table public.credits enable row level security;

drop policy if exists "Users can view own credits" on public.credits;
drop policy if exists "Users can insert own credits" on public.credits;
drop policy if exists "Users can update own credits" on public.credits;
drop policy if exists "Users can delete own credits" on public.credits;

create policy "Users can view own credits"
  on public.credits for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own credits"
  on public.credits for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own credits"
  on public.credits for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own credits"
  on public.credits for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.credits from anon;
grant select, insert, update, delete on public.credits to authenticated;
